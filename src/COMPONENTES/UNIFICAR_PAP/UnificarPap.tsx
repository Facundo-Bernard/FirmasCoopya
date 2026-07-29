import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { firmarPdf } from '../../SERVICIOS/firmarPdf'
import type { RootState } from '../../REDUX/store'

const DESTINO_EMAIL = 'info@asistodo.com.ar'

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

  const descargar = async () => {
    if (!documentoBytes) {
      return
    }

    const blob = new Blob([copiarArrayBuffer(documentoBytes)], { type: 'application/pdf' })
    const archivo = new File([blob], 'documento-firmado.pdf', { type: 'application/pdf' })

    if (navigator.share && navigator.canShare?.({ files: [archivo] })) {
      try {
        await navigator.share({
          files: [archivo],
          title: 'Documento firmado',
        })
        setMensaje('Documento listo para guardar desde el menu de compartir.')
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        setTroubleshooting(describirError(error))
      }
      return
    }

    const url = URL.createObjectURL(blob)
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = 'documento-firmado.pdf'
    enlace.rel = 'noopener'
    document.body.appendChild(enlace)
    enlace.click()
    enlace.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
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
          setMensaje('PDF guardado. Abriendo Gmail...')
          window.location.href = enlaceApp
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
      window.open(gmail, '_blank', 'noopener,noreferrer')
    } else {
      const esAndroid = /Android/i.test(navigator.userAgent)
      const enlaceApp = esAndroid
        ? `intent://compose?to=${encodeURIComponent(DESTINO_EMAIL)}&subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}#Intent;scheme=mailto;package=com.google.android.gm;end`
        : `googlegmail:///co?to=${encodeURIComponent(DESTINO_EMAIL)}&subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`
      let cambioDeAplicacion = false
      const detectarCambio = () => {
        cambioDeAplicacion = true
      }

      document.addEventListener('visibilitychange', detectarCambio, { once: true })
      window.location.href = enlaceApp
      window.setTimeout(() => {
        document.removeEventListener('visibilitychange', detectarCambio)
        if (!cambioDeAplicacion) {
          window.location.href = mailto
        }
      }, 1200)

    }

    descargarArchivo()
    setMensaje('Se abrio Gmail y se descargo el PDF. Adjuntalo al correo antes de enviarlo.')
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
    window.location.href = enlaceApp
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

          <button type="button" className="btn btn-danger" onClick={() => setMostrarEnvio(true)} disabled={!documentoBytes}>
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
              Descargar PDF
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
    </main>
  )
}

export default UnificarPap
