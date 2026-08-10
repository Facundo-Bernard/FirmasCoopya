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
  const [fotoDni, setFotoDni] = useState<File | null>(null)
  const [comprobanteCbu, setComprobanteCbu] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [envioCompleto, setEnvioCompleto] = useState(false)
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
    setFotoDni(null)
    setComprobanteCbu(null)
    setEnvioCompleto(false)
    setMostrarEnvio(false)
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
      setMostrarEnvio(true)
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

    if (!documentoBytes || !fotoDni || !comprobanteCbu || enviando) {
      return
    }

    const dniLimpio = dni.replace(/\D/g, '')

    if (dniLimpio.length < 7) {
      setMensaje('Ingresa un DNI valido.')
      return
    }

    const asunto = `PAPELERIA ${dniLimpio}`
    const blob = new Blob([copiarArrayBuffer(documentoBytes)], { type: 'application/pdf' })
    const totalBytes = blob.size + fotoDni.size + comprobanteCbu.size

    if (totalBytes > MAXIMO_ENVIO_BYTES) {
      setMensaje('El PDF y los archivos adicionales superan el limite total de 10 MB.')
      return
    }

    const datos = new FormData()
    datos.append('DNI', dniLimpio)
    datos.append('email', email)
    datos.append('Email informado', email)
    datos.append('_subject', asunto)
    datos.append('_template', 'table')
    datos.append('Papeleria firmada', blob, `${asunto}.pdf`)
    datos.append('Foto de la persona con su DNI', fotoDni, fotoDni.name)
    datos.append('Comprobante de CBU', comprobanteCbu, comprobanteCbu.name)

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

      setMensaje('')
      setEnvioCompleto(true)
    } catch (error) {
      setMensaje('No se pudo enviar la papeleria.')
      setTroubleshooting(describirError(error))
    } finally {
      setEnviando(false)
    }
  }

  const dniValido = dni.replace(/\D/g, '').length >= 7
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  return (
    <main className="min-vh-100 bg-white">
      <div className="container py-4 text-center">
        <div className="col-12 col-md-8 col-lg-6 mx-auto">
          <Link to="/firma-digital" className="btn btn-link text-danger mb-3">Volver</Link>

          <h1 className="fw-bold text-dark mb-3">Firmar papelería</h1>
          <p className="fs-5 mb-4">Selecciona el PDF.</p>

          <label htmlFor="pdf" className="btn btn-secondary btn-lg w-100 mb-2">Elegir PDF</label>
          <input id="pdf" type="file" accept="application/pdf" className="d-none" onChange={cargarPdf} />
          {archivoPdf && <p className="text-success fw-semibold">PDF listo</p>}

          <button
            type="button"
            className="btn btn-danger btn-lg w-100 mb-4"
            onClick={unificar}
            disabled={!archivoPdf || !firmaPng || Boolean(documentoBytes)}
          >
            {documentoBytes ? 'Firma colocada' : 'Colocar firma'}
          </button>

          {mensaje && <p className="mb-3">{mensaje}</p>}

          {mostrarEnvio && documentoBytes && (
            <form className="border rounded bg-body-tertiary p-3 p-md-4 mb-4" onSubmit={enviarDocumento}>
              <p className="fw-semibold text-success mb-4">Papelería firmada lista</p>

              <div>
                <label htmlFor="dni" className="form-label h4">DNI</label>
                <input
                  id="dni"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="form-control form-control-lg text-center"
                  value={dni}
                  onChange={(event) => setDni(event.target.value)}
                  placeholder="30123456"
                  required
                />
              </div>

              {dniValido && (
                <div className="border-top pt-4 mt-4">
                  <label htmlFor="email" className="form-label h4">Email</label>
                  <input
                    id="email"
                    type="email"
                    className="form-control form-control-lg text-center"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="tuemail@ejemplo.com"
                    required
                  />
                </div>
              )}

              {emailValido && (
                <div className="border-top pt-4 mt-4">
                  <h2 className="h4">Foto con tu DNI</h2>
                  <p>Tu cara y el DNI deben verse juntos.</p>
                  <label htmlFor="foto-dni" className="btn btn-secondary btn-lg w-100">
                    {fotoDni ? 'Cambiar foto' : 'Sacar foto'}
                  </label>
                  <input
                    id="foto-dni"
                    type="file"
                    accept="image/*"
                    capture="user"
                    className="d-none"
                    onChange={(event) => {
                      setFotoDni(event.target.files?.[0] ?? null)
                      setEnvioCompleto(false)
                    }}
                    required
                  />
                  {fotoDni && <p className="mt-2 mb-0 text-success fw-semibold">Foto lista</p>}
                </div>
              )}

              {fotoDni && (
                <div className="border-top pt-4 mt-4">
                  <h2 className="h4">Comprobante de CBU</h2>
                  <p>Ticket, captura bancaria o comprobante.</p>
                  <label htmlFor="comprobante-cbu" className="btn btn-secondary btn-lg w-100">
                    {comprobanteCbu ? 'Cambiar comprobante' : 'Elegir comprobante'}
                  </label>
                  <input
                    id="comprobante-cbu"
                    type="file"
                    accept="image/*,application/pdf"
                    className="d-none"
                    onChange={(event) => {
                      setComprobanteCbu(event.target.files?.[0] ?? null)
                      setEnvioCompleto(false)
                    }}
                    required
                  />
                  {comprobanteCbu && <p className="mt-2 mb-0 text-success fw-semibold">Comprobante listo</p>}

                  <button
                    type="submit"
                    className="btn btn-danger btn-lg w-100 mt-4"
                    disabled={enviando || envioCompleto || !comprobanteCbu}
                  >
                    {enviando ? 'Enviando...' : envioCompleto ? 'Enviado' : 'Confirmar envío'}
                  </button>
                </div>
              )}
            </form>
          )}

          {envioCompleto && (
            <div className="alert alert-success" role="alert">
              <h2 className="h4">Envío confirmado</h2>
              <p className="mb-0">Documentación enviada correctamente.</p>
            </div>
          )}

          {troubleshooting && (
            <details className="mb-3 text-start">
              <summary className="fw-semibold text-danger">Ver error</summary>
              <pre className="bg-light border rounded p-3 mt-2 small text-break text-wrap">{troubleshooting}</pre>
            </details>
          )}
        </div>

        {documentoUrl && (
          <iframe
            title="Previsualizacion del PDF"
            src={documentoUrl}
            className="w-100 border rounded mt-4"
            style={{ height: '70vh' }}
          />
        )}
      </div>
    </main>
  )
}

export default UnificarPap
