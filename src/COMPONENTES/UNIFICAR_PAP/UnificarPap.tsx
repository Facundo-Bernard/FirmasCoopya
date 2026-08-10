import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { firmarPdf } from '../../SERVICIOS/firmarPdf'
import type { RootState } from '../../REDUX/store'

const DESTINO_EMAIL = 'info@asistodo.com.ar'
const RECORDATORIO_ADJUNTO = 'No te olvides colocar la papeleria firmada que se acaba de descargar en el mail !'

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
  const [mostrarEnvio, setMostrarEnvio] = useState(false)
  const [puedeAbrirEmail, setPuedeAbrirEmail] = useState(false)
  const [emailPendiente, setEmailPendiente] = useState<{
    enlace: string
    fallback?: string
    nuevaPestana?: boolean
  } | null>(null)

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
    setPuedeAbrirEmail(false)
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
      setPuedeAbrirEmail(false)
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

    if (!documentoBytes) {
      return
    }

    const dniLimpio = dni.replace(/\D/g, '')

    if (dniLimpio.length < 7) {
      setMensaje('Ingresa un DNI valido.')
      return
    }

    const asunto = `PAPELERIA ${dniLimpio}`
    const blob = new Blob([copiarArrayBuffer(documentoBytes)], { type: 'application/pdf' })
    const archivo = new File([blob], `${asunto}.pdf`, { type: 'application/pdf' })
    const cuerpo = `DNI: ${dniLimpio}\n\nSe adjunta el documento firmado.`
    const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(DESTINO_EMAIL)}&su=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`
    const mailto = `mailto:${DESTINO_EMAIL}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`
    const esMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    const esIphone = /iPhone|iPad|iPod/i.test(navigator.userAgent)
    const descargarArchivo = () => {
      const enlace = document.createElement('a')
      const url = URL.createObjectURL(blob)
      enlace.href = url
      enlace.download = `${asunto}.pdf`
      enlace.rel = 'noopener'
      document.body.appendChild(enlace)
      enlace.click()
      enlace.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    }

    if (esIphone) {
      const enlaceApp = `googlegmail:///co?to=${encodeURIComponent(DESTINO_EMAIL)}&subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`

      if (navigator.share && navigator.canShare?.({ files: [archivo] })) {
        let gmailAbierto = false
        let shareIniciado = false
        const limpiarEventos = () => {
          document.removeEventListener('visibilitychange', abrirGmailAlVolver)
          window.removeEventListener('focus', abrirGmailAlVolver)
        }
        const abrirGmail = () => {
          if (gmailAbierto) {
            return
          }

          gmailAbierto = true
          limpiarEventos()
          setMensaje('PDF guardado. Confirma el aviso para abrir Gmail.')
          setEmailPendiente({ enlace: enlaceApp })
        }
        const abrirGmailAlVolver = () => {
          if (shareIniciado && document.visibilityState === 'visible') {
            abrirGmail()
          }
        }

        document.addEventListener('visibilitychange', abrirGmailAlVolver)
        window.addEventListener('focus', abrirGmailAlVolver)

        try {
          shareIniciado = true
          await navigator.share({
            files: [archivo],
            title: asunto,
            text: `Para: ${DESTINO_EMAIL}\n${cuerpo}`,
          })
          abrirGmail()
        } catch (error) {
          limpiarEventos()

          if (error instanceof DOMException && error.name === 'AbortError') {
            return
          }

          setTroubleshooting(describirError(error))
        }
        return
      }

      descargarArchivo()
      setPuedeAbrirEmail(true)
      setMensaje('Descarga el PDF y luego volve a esta pagina para abrir Gmail.')
      return
    }

    if (!esMobile) {
      descargarArchivo()
      setEmailPendiente({ enlace: gmail, nuevaPestana: true })
    } else {
      const esAndroid = /Android/i.test(navigator.userAgent)
      const enlaceApp = esAndroid
        ? `intent://compose?to=${encodeURIComponent(DESTINO_EMAIL)}&subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}#Intent;scheme=mailto;package=com.google.android.gm;end`
        : `googlegmail:///co?to=${encodeURIComponent(DESTINO_EMAIL)}&subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`
      descargarArchivo()
      setEmailPendiente({ enlace: enlaceApp, fallback: mailto })
    }

    setMensaje('Se descargo el PDF. Confirma el aviso para abrir Gmail.')
  }

  const abrirEmail = () => {
    const dniLimpio = dni.replace(/\D/g, '')

    if (dniLimpio.length < 7) {
      setMensaje('Ingresa un DNI valido.')
      return
    }

    const asunto = `PAPELERIA ${dniLimpio}`
    const cuerpo = `DNI: ${dniLimpio}\n\nSe adjunta el documento firmado.`
    const enlaceApp = `googlegmail:///co?to=${encodeURIComponent(DESTINO_EMAIL)}&subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`

    setPuedeAbrirEmail(false)
    setEmailPendiente({ enlace: enlaceApp })
  }

  const continuarAEmail = () => {
    if (!emailPendiente) {
      return
    }

    const { enlace, fallback, nuevaPestana } = emailPendiente
    setEmailPendiente(null)
    setMensaje('Abriendo Gmail...')

    if (nuevaPestana) {
      window.open(enlace, '_blank', 'noopener,noreferrer')
      return
    }

    if (fallback) {
      let cambioDeAplicacion = false
      const detectarCambio = () => {
        cambioDeAplicacion = true
      }

      document.addEventListener('visibilitychange', detectarCambio, { once: true })
      window.location.href = enlace
      window.setTimeout(() => {
        document.removeEventListener('visibilitychange', detectarCambio)
        if (!cambioDeAplicacion) {
          window.location.href = fallback
        }
      }, 1200)
      return
    }

    window.location.href = enlace
  }

  return (
    <main className="min-vh-100 bg-white">
      <div className="container py-4">
        <Link to="/firma-digital" className="btn btn-link text-danger px-0 mb-3">
          Volver
        </Link>

        <h1 className="fw-bold text-danger mb-4">Aplicar firma en papelería</h1>

        <div className="mb-3">
          <p>En este apartado debes seleccionar el PDF de papelería que deseas aplicarle la firma anterior. Primero selecciona el archivo con el botón de abajo, luego haz clic en "Colocar firma". una vez que se aplique la firma, haz click en siguiente, se descargará el archivo y te abrirá tu mail, adjuntale el archivo descargado y envíalo </p>
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
            <button type="submit" className="btn btn-danger">
              Descargar y Continuar
            </button>
            {puedeAbrirEmail && (
              <button type="button" className="btn btn-outline-danger ms-2" onClick={abrirEmail}>
                Abrir Gmail
              </button>
            )}
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

      {emailPendiente && (
        <>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h2 className="modal-title fs-5">Importante</h2>
                </div>
                <div className="modal-body">
                  <p className="mb-0">{RECORDATORIO_ADJUNTO}</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-danger" autoFocus onClick={continuarAEmail}>
                    Entendido
                  </button>
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
