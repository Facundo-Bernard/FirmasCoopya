import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { crearPdfDocumentacion } from '../../SERVICIOS/crearPdfDocumentacion'
import { firmarPdf } from '../../SERVICIOS/firmarPdf'
import type { RootState } from '../../REDUX/store'
import SelectorPdf from '../SELECTOR_PDF/SelectorPdf'
import CapturaCamara from './CapturaCamara'

const DESTINO_EMAIL = 'info@asistodo.com.ar'
const FORM_SUBMIT_URL = `https://formsubmit.co/${DESTINO_EMAIL}`
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

const validarRespuestaFormSubmit = (respuesta: Response, urlConfirmacion: string) => {
  if (!respuesta.ok) {
    throw new Error(`FormSubmit rechazo el envio (HTTP ${respuesta.status}).`)
  }

  const destino = new URL(respuesta.url)
  const confirmacion = new URL(urlConfirmacion)

  if (destino.origin !== confirmacion.origin || destino.pathname !== confirmacion.pathname) {
    throw new Error('FormSubmit no confirmo el envio de los archivos.')
  }
}

const mensajeDeEnvio = (error: unknown) => {
  if (error instanceof TypeError) {
    return 'No se pudo conectar con el servicio de envio. Revisa tu conexion e intenta nuevamente.'
  }

  return error instanceof Error ? error.message : 'Ocurrio un error desconocido.'
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
  const [fotoGuino, setFotoGuino] = useState<File | null>(null)
  const [dniFrente, setDniFrente] = useState<File | null>(null)
  const [dniDorso, setDniDorso] = useState<File | null>(null)
  const [comprobanteCbu, setComprobanteCbu] = useState<File | null>(null)
  const [procesandoPdf, setProcesandoPdf] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [envioCompleto, setEnvioCompleto] = useState(false)
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false)
  const [mostrarEnvio, setMostrarEnvio] = useState(false)

  useEffect(() => {
    return () => {
      if (documentoUrl) {
        URL.revokeObjectURL(documentoUrl)
      }
    }
  }, [documentoUrl])

  const cargarPdf = (archivo: File) => {
    setArchivoPdf(archivo)
    setDocumentoBytes(null)
    setDocumentoUrl(URL.createObjectURL(archivo))
    setMensaje('')
    setTroubleshooting('')
    setFotoDni(null)
    setFotoGuino(null)
    setDniFrente(null)
    setDniDorso(null)
    setComprobanteCbu(null)
    setEnvioCompleto(false)
    setMostrarConfirmacion(false)
    setMostrarEnvio(false)
  }

  const unificar = async () => {
    if (procesandoPdf) {
      return
    }

    if (!archivoPdf || !firmaPng) {
      setMensaje('Carga un PDF y asegurate de tener una firma guardada.')
      setTroubleshooting('')
      return
    }

    try {
      setProcesandoPdf(true)
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
    } finally {
      setProcesandoPdf(false)
    }
  }

  const enviarDocumento = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!documentoBytes || !fotoDni || !fotoGuino || !dniFrente || !dniDorso || !comprobanteCbu || enviando) {
      return
    }

    const dniLimpio = dni.replace(/\D/g, '')

    if (dniLimpio.length < 7) {
      setMensaje('Ingresa un DNI valido.')
      return
    }

    const asunto = `PAPELERIA ${dniLimpio}`
    const urlConfirmacion = new URL('/envio-confirmado', window.location.origin).href

    try {
      setEnviando(true)
      setEnvioCompleto(false)
      setMostrarConfirmacion(false)
      setMensaje('Enviando papeleria...')
      setTroubleshooting('')

      const pdfFirmado = new Blob([copiarArrayBuffer(documentoBytes)], { type: 'application/pdf' })
      const documentacionBytes = await crearPdfDocumentacion([
        fotoDni,
        fotoGuino,
        dniFrente,
        dniDorso,
        comprobanteCbu,
      ])
      const documentacion = new Blob([copiarArrayBuffer(documentacionBytes)], { type: 'application/pdf' })
      const totalBytes = pdfFirmado.size + documentacion.size

      if (totalBytes > MAXIMO_ENVIO_BYTES) {
        throw new Error('Los dos archivos superan el limite total de 10 MB.')
      }

      const datos = new FormData()
      datos.append('DNI', dniLimpio)
      datos.append('email', email)
      datos.append('Email informado', email)
      datos.append('_subject', asunto)
      datos.append('_template', 'table')
      datos.append('_captcha', 'false')
      datos.append('_url', window.location.href)
      datos.append('_next', urlConfirmacion)
      datos.append('attachment', pdfFirmado, `${asunto}.pdf`)
      datos.append('attachment_2', documentacion, `DOCUMENTACION_${dniLimpio}.pdf`)

      const respuesta = await fetch(FORM_SUBMIT_URL, {
        method: 'POST',
        body: datos,
        redirect: 'follow',
      })

      validarRespuestaFormSubmit(respuesta, urlConfirmacion)
      setMensaje('')
      setEnvioCompleto(true)
      setMostrarConfirmacion(true)
    } catch (error) {
      setEnvioCompleto(false)
      setMensaje(`No se pudo enviar la papeleria. ${mensajeDeEnvio(error)}`)
      setTroubleshooting(describirError(error))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="min-vh-100 bg-white">
      <div className="container py-4">
        <Link to="/firma-digital" className="btn btn-link text-primary px-0 mb-3">
          Volver
        </Link>

        <h1 className="fw-bold text-dark mb-4">Aplicar firma en papelería</h1>

        <div className="mb-3">
          <p className="fs-5">Selecciona la papelería, coloca la firma y completa tus datos. El documento firmado se enviará automáticamente a {DESTINO_EMAIL}.</p>
          <label htmlFor="pdf" className="form-label fw-semibold">Selecciona un PDF</label>
          <SelectorPdf
            id="pdf"
            archivo={archivoPdf}
            onSeleccionar={cargarPdf}
            onError={(error) => {
              setArchivoPdf(null)
              setDocumentoBytes(null)
              setDocumentoUrl(null)
              setMensaje(error)
              setTroubleshooting('')
            }}
          />
        </div>

        <div className="d-flex flex-wrap gap-2 mb-3">
          <button
            type="button"
            className="btn btn-primary"
            onClick={unificar}
            disabled={procesandoPdf}
            aria-busy={procesandoPdf}
          >
            {procesandoPdf && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
            {procesandoPdf ? 'Colocando firmas...' : 'Colocar firma'}
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setMostrarEnvio(true)}
            disabled={procesandoPdf || !documentoBytes || mostrarEnvio}
          >
            Siguiente
          </button>
        </div>

        {mostrarEnvio && documentoBytes && (
          <form className="border rounded bg-body-tertiary p-3 p-md-4 mb-3" onSubmit={enviarDocumento}>
            <h2 className="h3 mb-2">Último paso</h2>
            <p className="fs-5 text-secondary mb-4">Completa tus datos y las fotos solicitadas.</p>

            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <label htmlFor="dni" className="form-label fw-semibold">Tu DNI</label>
                <input
                  id="dni"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="form-control form-control-lg"
                  value={dni}
                  onChange={(event) => setDni(event.target.value)}
                  placeholder="Ejemplo: 30123456"
                  required
                />
              </div>

              <div className="col-md-6">
                <label htmlFor="email" className="form-label fw-semibold">Tu email</label>
                <input
                  id="email"
                  type="email"
                  className="form-control form-control-lg"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="tuemail@ejemplo.com"
                  required
                />
              </div>
            </div>

            <div className="card mb-3">
              <div className="card-body">
                <h3 className="h4">1. Foto tuya sosteniendo el DNI</h3>
                <p className="fs-5">Tu cara y los datos del DNI deben verse claramente en la misma foto.</p>
                <CapturaCamara
                  foto={fotoDni}
                  nombre="selfie-dni"
                  facingMode="user"
                  textoBoton="foto"
                  onCapture={(foto) => {
                    setFotoDni(foto)
                    setEnvioCompleto(false)
                  }}
                />
                {fotoDni && <p className="mt-3 mb-0 fw-semibold text-success">Foto lista</p>}
              </div>
            </div>

            {fotoDni && (
              <div className="card mb-3">
                <div className="card-body">
                  <h3 className="h4">2. Foto guiñando</h3>
                  <p className="fs-5">Mira a la cámara y guiña un ojo.</p>
                  <CapturaCamara
                    foto={fotoGuino}
                    nombre="selfie-guino"
                    facingMode="user"
                    textoBoton="foto guiñando"
                    onCapture={(foto) => {
                      setFotoGuino(foto)
                      setEnvioCompleto(false)
                    }}
                  />
                  {fotoGuino && <p className="mt-3 mb-0 fw-semibold text-success">Foto lista</p>}
                </div>
              </div>
            )}

            {fotoGuino && (
              <div className="card mb-3">
                <div className="card-body">
                  <h3 className="h4">3. Fotos del DNI</h3>
                  <p className="fs-5">Los datos deben verse claramente.</p>

                  <div className="mb-2">
                    <CapturaCamara
                      foto={dniFrente}
                      nombre="dni-frente"
                      facingMode="environment"
                      textoBoton="foto del frente"
                      onCapture={(foto) => {
                        setDniFrente(foto)
                        setEnvioCompleto(false)
                      }}
                    />
                  </div>
                  {dniFrente && <p className="mb-3 fw-semibold text-success">Frente listo</p>}

                  <CapturaCamara
                    foto={dniDorso}
                    nombre="dni-dorso"
                    facingMode="environment"
                    textoBoton="foto del dorso"
                    onCapture={(foto) => {
                      setDniDorso(foto)
                      setEnvioCompleto(false)
                    }}
                  />
                  {dniDorso && <p className="mt-3 mb-0 fw-semibold text-success">Dorso listo</p>}
                </div>
              </div>
            )}

            {dniFrente && dniDorso && (
              <div className="card mb-3">
                <div className="card-body">
                  <h3 className="h4">4. Comprobante de CBU</h3>
                  <p className="fs-5 mb-1">Saca una foto del ticket, pantalla o comprobante del banco.</p>
                  <p className="text-secondary">Debe verse el nombre del titular y el CBU.</p>
                  <CapturaCamara
                    foto={comprobanteCbu}
                    nombre="comprobante-cbu"
                    facingMode="environment"
                    textoBoton="foto del comprobante"
                    onCapture={(foto) => {
                      setComprobanteCbu(foto)
                      setEnvioCompleto(false)
                    }}
                  />
                  {comprobanteCbu && <p className="mt-3 mb-0 fw-semibold text-success">Comprobante listo</p>}
                </div>
              </div>
            )}

            <p className="small text-secondary">Los archivos pueden pesar hasta 10 MB en total.</p>

            <button
              type="submit"
              className="btn btn-primary btn-lg w-100"
              disabled={enviando || envioCompleto || !fotoDni || !fotoGuino || !dniFrente || !dniDorso || !comprobanteCbu}
              aria-busy={enviando}
            >
              {enviando && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
              {enviando ? 'Enviando...' : envioCompleto ? 'Enviado correctamente' : 'Confirmar y enviar'}
            </button>
          </form>
        )}

        {mensaje && <p className="mb-3">{mensaje}</p>}

        {troubleshooting && (
          <details className="mb-3">
            <summary className="fw-semibold text-primary">Troubleshooting</summary>
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

      {mostrarConfirmacion && (
        <>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content text-center">
                <div className="modal-body p-4">
                  <h2 className="h4 mb-3">Envío confirmado</h2>
                  <p className="fs-5 mb-4">Las firmas, el CBU y el DNI se han enviado correctamente.</p>
                  <Link to="/" className="btn btn-primary btn-lg w-100">
                    Volver al inicio
                  </Link>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" />
        </>
      )}

    </main>
  )
}

export default UnificarPap
