import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { firmarPdf } from '../../SERVICIOS/firmarPdf'
import type { RootState } from '../../REDUX/store'

const DESTINO_EMAIL = 'info@asistodo.com.ar'
const FORM_SUBMIT_URL = `https://formsubmit.co/ajax/${DESTINO_EMAIL}`
const MAXIMO_ENVIO_BYTES = 10_000_000

const copiarArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  const copia = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(copia).set(bytes)
  return copia
}

const describirError = (error: unknown) => {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}${error.stack ? `\n\n${error.stack}` : ''}`
  }

  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

function UnificarPap() {
  const firmaPng = useSelector((state: RootState) => state.firmaPng)
  const [archivoPdf, setArchivoPdf] = useState<File | null>(null)
  const [documentoBytes, setDocumentoBytes] = useState<Uint8Array | null>(null)
  const [documentoUrl, setDocumentoUrl] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState('')
  const [troubleshooting, setTroubleshooting] = useState('')
  const [dni, setDni] = useState('')
  const [email, setEmail] = useState('')
  const [adjuntos, setAdjuntos] = useState<File[]>([])
  const [enviando, setEnviando] = useState(false)
  const [mostrarEnvio, setMostrarEnvio] = useState(false)

  useEffect(() => {
    return () => {
      if (documentoUrl) {
        URL.revokeObjectURL(documentoUrl)
      }
    }
  }, [documentoUrl])

  const cargarPdf = (event: ChangeEvent<HTMLInputElement>) => {
    const archivo = event.target.files?.[0]

    if (!archivo) {
      return
    }

    setArchivoPdf(archivo)
    setDocumentoBytes(null)
    setDocumentoUrl(URL.createObjectURL(archivo))
    setMensaje('')
    setTroubleshooting('')
  }

  const unificar = async () => {
    if (!archivoPdf || !firmaPng) {
      setMensaje('Carga un PDF y asegurate de tener una firma guardada.')
      setTroubleshooting('')
      return
    }

    try {
      setTroubleshooting('')
      const resultado = await firmarPdf(await archivoPdf.arrayBuffer(), firmaPng)
      const bytes = resultado.bytes.slice()
      const url = URL.createObjectURL(new Blob([copiarArrayBuffer(bytes)], { type: 'application/pdf' }))

      setDocumentoBytes(bytes)
      setDocumentoUrl(url)
      setMensaje(
        resultado.coincidencias
          ? `Firma colocada en ${resultado.coincidencias} lugar${resultado.coincidencias === 1 ? '' : 'es'}.`
          : 'No se encontraron lugares con la palabra clave.',
      )
    } catch (error) {
      setMensaje('No se pudo procesar el PDF.')
      setTroubleshooting(describirError(error))
    }
  }

  const enviarDocumento = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!documentoBytes || enviando) {
      return
    }

    const dniLimpio = dni.replace(/\D/g, '')

    if (dniLimpio.length < 7) {
      setMensaje('Ingresa un DNI valido.')
      return
    }

    const asunto = `PAPELERIA ${dniLimpio}`
    const blob = new Blob([copiarArrayBuffer(documentoBytes)], { type: 'application/pdf' })
    const totalBytes = blob.size + adjuntos.reduce((total, archivo) => total + archivo.size, 0)

    if (totalBytes > MAXIMO_ENVIO_BYTES) {
      setMensaje('El PDF y los archivos adicionales superan el limite total de 10 MB.')
      return
    }

    const datos = new FormData()
    datos.append('dni', dniLimpio)
    datos.append('email', email)
    datos.append('_subject', asunto)
    datos.append('_template', 'table')
    datos.append('documento', blob, `${asunto}.pdf`)
    adjuntos.forEach((archivo) => datos.append('adjuntos', archivo))

    try {
      setEnviando(true)
      setMensaje('Enviando papeleria...')
      setTroubleshooting('')

      const respuesta = await fetch(FORM_SUBMIT_URL, {
        method: 'POST',
        body: datos,
      })
      const resultado = (await respuesta.json()) as {
        success?: boolean | string
        message?: string
        error?: string
      }

      if (!respuesta.ok || resultado.success === false || resultado.success === 'false') {
        throw new Error(resultado.error || resultado.message || `Error HTTP ${respuesta.status}`)
      }

      setMensaje(`Papeleria enviada a ${DESTINO_EMAIL}. Si es el primer envio, confirma el correo de activacion de FormSubmit.`)
    } catch (error) {
      setMensaje('No se pudo enviar la papeleria.')
      setTroubleshooting(describirError(error))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="min-vh-100 bg-white">
      <div className="container py-4">
        <Link to="/firma-digital" className="btn btn-link text-danger px-0 mb-3">
          Volver
        </Link>

        <h1 className="fw-bold text-danger mb-4">Aplicar firma en papelería</h1>

        <div className="mb-3">
          <p>Selecciona la papelería, coloca la firma y completa tus datos. El documento firmado se enviará automáticamente a {DESTINO_EMAIL}.</p>
          <label htmlFor="pdf" className="form-label">Selecciona un PDF</label>
          <input id="pdf" type="file" accept="application/pdf" className="form-control" onChange={cargarPdf} />
        </div>

        <div className="d-flex flex-wrap gap-2 mb-3">
          <button type="button" className="btn btn-danger" onClick={unificar}>
            Colocar firma
          </button>

          <button
            type="button"
            className="btn btn-danger"
            onClick={() => setMostrarEnvio(true)}
            disabled={!documentoBytes || mostrarEnvio}
          >
            Siguiente
          </button>
        </div>

        {mostrarEnvio && documentoBytes && (
          <form className="border rounded p-3 mb-3" onSubmit={enviarDocumento}>
            <label htmlFor="dni" className="form-label">Completa tu DNI</label>
            <input
              id="dni"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className="form-control mb-3"
              value={dni}
              onChange={(event) => setDni(event.target.value)}
              placeholder="DNI"
              required
            />

            <label htmlFor="email" className="form-label">Completa tu email</label>
            <input
              id="email"
              type="email"
              className="form-control mb-3"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tuemail@ejemplo.com"
              required
            />

            <label htmlFor="adjuntos" className="form-label">Fotos o archivos adicionales (opcional)</label>
            <input
              id="adjuntos"
              type="file"
              multiple
              className="form-control mb-2"
              onChange={(event) => setAdjuntos(Array.from(event.target.files ?? []))}
            />
            <div className="form-text mb-3">El PDF y los archivos adicionales pueden pesar hasta 10 MB en total.</div>

            <button type="submit" className="btn btn-danger" disabled={enviando}>
              {enviando ? 'Enviando...' : 'Enviar papelería'}
            </button>
          </form>
        )}

        {mensaje && <p className="mb-3">{mensaje}</p>}

        {troubleshooting && (
          <details className="mb-3">
            <summary className="fw-semibold text-danger">Troubleshooting</summary>
            <pre className="bg-light border rounded p-3 mt-2 small text-break text-wrap">{troubleshooting}</pre>
          </details>
        )}

        {documentoUrl && (
          <iframe
            title="Previsualizacion del PDF"
            src={documentoUrl}
            className="w-100 border rounded"
            style={{ height: '70vh' }}
          />
        )}
      </div>

    </main>
  )
}

export default UnificarPap
