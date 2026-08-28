import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link } from 'react-router-dom'

const MAX_PDF_BYTES = 20 * 1024 * 1024

type UploadRequestResponse = {
  upload: {
    url: string
    fields: Record<string, string>
  }
  expiresIn: number
}

const esPdfValido = (archivo: File) =>
  archivo.type === 'application/pdf' && /\.pdf$/i.test(archivo.name) && archivo.size > 0 && archivo.size <= MAX_PDF_BYTES

const generarCodigoPdf = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  let texto = ''

  bytes.forEach((byte) => {
    texto += String.fromCharCode(byte)
  })

  return btoa(texto).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const crearEnlaceConCodigo = (codigo: string) => {
  const enlace = new URL('/papeleria-aws', window.location.origin)
  // El fragmento no se envía al servidor ni forma parte de las solicitudes a AWS.
  enlace.hash = new URLSearchParams({ codigo }).toString()
  return enlace.toString()
}

const subirDirectamenteAS3 = (archivo: File, upload: UploadRequestResponse['upload'], onProgress: (progreso: number) => void) =>
  new Promise<void>((resolve, reject) => {
    const formulario = new FormData()

    Object.entries(upload.fields).forEach(([campo, valor]) => formulario.append(campo, valor))
    formulario.append('file', archivo)

    const solicitud = new XMLHttpRequest()
    solicitud.open('POST', upload.url)
    solicitud.upload.onprogress = (evento) => {
      if (evento.lengthComputable) {
        onProgress(Math.round((evento.loaded / evento.total) * 100))
      }
    }
    solicitud.onload = () => {
      if (solicitud.status >= 200 && solicitud.status < 300) {
        resolve()
        return
      }
      reject(new Error('S3 rechazó la carga.'))
    }
    solicitud.onerror = () => reject(new Error('No se pudo conectar con S3.'))
    solicitud.send(formulario)
  })

function PapeleriaAws() {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [estado, setEstado] = useState('Seleccioná un PDF para comenzar.')
  const [enviando, setEnviando] = useState(false)
  const [progreso, setProgreso] = useState(0)
  const [codigo, setCodigo] = useState('')
  const [enlace, setEnlace] = useState('')

  const seleccionarArchivo = (evento: ChangeEvent<HTMLInputElement>) => {
    const seleccionado = evento.target.files?.[0] ?? null
    setArchivo(seleccionado)
    setCodigo('')
    setEnlace('')
    setProgreso(0)

    if (!seleccionado) {
      setEstado('Seleccioná un PDF para comenzar.')
      return
    }

    setEstado(
      esPdfValido(seleccionado)
        ? `Listo para enviar: ${seleccionado.name} (${(seleccionado.size / 1024 / 1024).toFixed(2)} MB).`
        : 'Elegí un PDF de hasta 20 MB.',
    )
  }

  const enviarPapeleria = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()

    if (!archivo || !esPdfValido(archivo)) {
      setEstado('Elegí un PDF válido de hasta 20 MB.')
      return
    }

    try {
      setEnviando(true)
      setProgreso(0)
      setCodigo('')
      setEnlace('')
      setEstado('Solicitando autorización para la carga...')
      const codigoGenerado = generarCodigoPdf()

      const respuesta = await fetch('/api/pdf/upload-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: archivo.name,
          contentType: archivo.type,
          size: archivo.size,
          documentKey: codigoGenerado,
        }),
      })

      if (!respuesta.ok) {
        throw new Error('No fue posible autorizar la carga.')
      }

      const solicitud = (await respuesta.json()) as UploadRequestResponse
      if (!solicitud.upload?.url || !solicitud.upload.fields) {
        throw new Error('La autorización recibida no es válida.')
      }

      setEstado('Cargando el PDF directamente en el almacenamiento seguro...')
      await subirDirectamenteAS3(archivo, solicitud.upload, setProgreso)

      setCodigo(codigoGenerado)
      setEnlace(crearEnlaceConCodigo(codigoGenerado))
      setEstado('La papelería fue enviada correctamente.')
    } catch {
      setEstado('No se pudo enviar la papelería. Verificá la clave e intentá nuevamente.')
    } finally {
      setEnviando(false)
    }
  }

  const copiar = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto)
      setEstado('Copiado al portapapeles.')
    } catch {
      setEstado('No se pudo copiar automáticamente. Seleccioná el texto y copialo manualmente.')
    }
  }

  return (
    <main className="min-vh-100 bg-white">
      <div className="container py-4" style={{ maxWidth: '760px' }}>
        <Link to="/" className="btn btn-link px-0 mb-3">Volver al inicio</Link>
        <h1 className="fw-bold mb-2">Enviar papelería</h1>
        <p className="text-secondary mb-4">El PDF se carga directamente en el almacenamiento privado. No se expone ninguna credencial de AWS.</p>

        <form className="border rounded p-3 p-md-4 bg-body-tertiary" onSubmit={enviarPapeleria}>
          <div className="mb-4">
            <label htmlFor="papeleria-pdf" className="form-label fw-semibold">PDF de papelería</label>
            <input
              id="papeleria-pdf"
              type="file"
              accept="application/pdf,.pdf"
              className="form-control form-control-lg"
              onChange={seleccionarArchivo}
              required
            />
            <div className="form-text">Se admite un único archivo PDF de hasta 20 MB.</div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" disabled={enviando} aria-busy={enviando}>
            {enviando ? 'Enviando...' : 'Enviar a AWS'}
          </button>

          {enviando && (
            <div className="mt-3">
              <div className="progress" role="progressbar" aria-label="Progreso de carga" aria-valuenow={progreso} aria-valuemin={0} aria-valuemax={100}>
                <div className="progress-bar" style={{ width: `${progreso}%` }}>{progreso}%</div>
              </div>
            </div>
          )}
        </form>

        <p className="mt-3 mb-0" role="status">{estado}</p>

        {codigo && enlace && (
          <section className="border border-success rounded p-3 p-md-4 mt-4">
            <h2 className="h4">Código y enlace creados</h2>
            <p className="mb-3">El código fue generado al azar en este navegador y enviado para identificar el PDF. Guardá ambos datos; más adelante se definirá qué hará el enlace.</p>

            <label htmlFor="codigo-papeleria" className="form-label fw-semibold">Código del documento</label>
            <div className="input-group mb-3">
              <input id="codigo-papeleria" className="form-control" value={codigo} readOnly />
              <button type="button" className="btn btn-outline-secondary" onClick={() => void copiar(codigo)}>Copiar código</button>
            </div>

            <label htmlFor="enlace-papeleria" className="form-label fw-semibold">Enlace asociado</label>
            <div className="input-group">
              <input id="enlace-papeleria" className="form-control" value={enlace} readOnly />
              <button type="button" className="btn btn-outline-secondary" onClick={() => void copiar(enlace)}>Copiar enlace</button>
            </div>
            <p className="form-text mb-0 mt-2">El código se conserva en el fragmento del enlace, por lo que no se envía al servidor al abrirlo.</p>
          </section>
        )}
      </div>
    </main>
  )
}

export default PapeleriaAws
