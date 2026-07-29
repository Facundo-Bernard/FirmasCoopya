import { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { firmarPdf } from '../../SERVICIOS/firmarPdf'
import type { RootState } from '../../REDUX/store'

function UnificarPap() {
  const firmaPng = useSelector((state: RootState) => state.firmaPng)
  const [archivoPdf, setArchivoPdf] = useState<File | null>(null)
  const [documentoUrl, setDocumentoUrl] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState('')

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
    setDocumentoUrl(URL.createObjectURL(archivo))
    setMensaje('')
  }

  const unificar = async () => {
    if (!archivoPdf || !firmaPng) {
      setMensaje('Cargá un PDF y asegurate de tener una firma guardada.')
      return
    }

    try {
      const resultado = await firmarPdf(await archivoPdf.arrayBuffer(), firmaPng)
      const bytes = resultado.bytes.slice().buffer as ArrayBuffer
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))

      setDocumentoUrl(url)
      setMensaje(
        resultado.coincidencias
          ? `Firma colocada en ${resultado.coincidencias} lugar${resultado.coincidencias === 1 ? '' : 'es'}.`
          : 'No se encontraron lugares con la palabra clave.'
      )
    } catch {
      setMensaje('No se pudo procesar el PDF.')
    }
  }

  const descargar = () => {
    if (!documentoUrl) {
      return
    }

    const enlace = document.createElement('a')
    enlace.href = documentoUrl
    enlace.download = 'documento-firmado.pdf'
    enlace.click()
  }

  return (
    <main className="min-vh-100 bg-white">
      <div className="container py-4">
        <Link to="/firma-digital" className="btn btn-link text-danger px-0 mb-3">
          Volver
        </Link>

        <h1 className="fw-bold text-danger mb-4">Unificar PAP</h1>

        <div className="mb-3">
          <label htmlFor="pdf" className="form-label">Seleccioná un PDF</label>
          <input id="pdf" type="file" accept="application/pdf" className="form-control" onChange={cargarPdf} />
        </div>

        <div className="d-flex flex-wrap gap-2 mb-3">
          <button type="button" className="btn btn-danger" onClick={unificar}>
            Colocar firma
          </button>
          <button type="button" className="btn btn-outline-danger" onClick={descargar} disabled={!documentoUrl}>
            Descargar
          </button>
        </div>

        {mensaje && <p className="mb-3">{mensaje}</p>}

        {documentoUrl && (
          <iframe
            title="Previsualización del PDF"
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
