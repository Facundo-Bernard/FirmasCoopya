import { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { firmarPdf } from '../../SERVICIOS/firmarPdf'
import type { RootState } from '../../REDUX/store'

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

  const descargar = () => {
    if (!documentoBytes) {
      return
    }

    const url = URL.createObjectURL(new Blob([copiarArrayBuffer(documentoBytes)], { type: 'application/pdf' }))
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = 'documento-firmado.pdf'
    enlace.rel = 'noopener'
    document.body.appendChild(enlace)
    enlace.click()
    enlace.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <main className="min-vh-100 bg-white">
      <div className="container py-4">
        <Link to="/firma-digital" className="btn btn-link text-danger px-0 mb-3">
          Volver
        </Link>

        <h1 className="fw-bold text-danger mb-4">Unificar PAP</h1>

        <div className="mb-3">
          <label htmlFor="pdf" className="form-label">Selecciona un PDF</label>
          <input id="pdf" type="file" accept="application/pdf" className="form-control" onChange={cargarPdf} />
        </div>

        <div className="d-flex flex-wrap gap-2 mb-3">
          <button type="button" className="btn btn-danger" onClick={unificar}>
            Colocar firma
          </button>
          <button type="button" className="btn btn-outline-danger" onClick={descargar} disabled={!documentoBytes}>
            Descargar
          </button>
        </div>

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
