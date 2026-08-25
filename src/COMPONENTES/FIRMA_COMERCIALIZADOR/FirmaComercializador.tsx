import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import SignatureCanvas from 'react-signature-canvas'
import { firmarPdf, PALABRA_CLAVE_COMERCIALIZADOR } from '../../SERVICIOS/firmarPdf'
import '../FIRMA_DIGITAL/FirmaDigital.css'

const copiarArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  const copia = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(copia).set(bytes)
  return copia
}

function FirmaComercializador() {
  const signatureRef = useRef<SignatureCanvas | null>(null)
  const [firmaPng, setFirmaPng] = useState<string | null>(null)
  const [archivoPdf, setArchivoPdf] = useState<File | null>(null)
  const [documentoUrl, setDocumentoUrl] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState('')
  const [procesando, setProcesando] = useState(false)

  useEffect(() => {
    return () => {
      if (documentoUrl) {
        URL.revokeObjectURL(documentoUrl)
      }
    }
  }, [documentoUrl])

  const guardarFirma = () => {
    const signaturePad = signatureRef.current

    setFirmaPng(signaturePad && !signaturePad.isEmpty()
      ? signaturePad.getCanvas().toDataURL('image/png')
      : null)
    setDocumentoUrl(null)
    setMensaje('')
  }

  const limpiarFirma = () => {
    signatureRef.current?.clear()
    setFirmaPng(null)
    setDocumentoUrl(null)
    setMensaje('')
  }

  const cargarPdf = (event: ChangeEvent<HTMLInputElement>) => {
    const archivo = event.target.files?.[0]

    if (!archivo) {
      return
    }

    if (!archivo.name.toLowerCase().endsWith('.pdf')) {
      setArchivoPdf(null)
      setMensaje('Selecciona un archivo PDF valido.')
      return
    }

    setArchivoPdf(archivo)
    setDocumentoUrl(null)
    setMensaje('')
  }

  const colocarFirma = async () => {
    if (!archivoPdf || !firmaPng || procesando) {
      return
    }

    try {
      setProcesando(true)
      setDocumentoUrl(null)
      setMensaje('Colocando firma...')

      const resultado = await firmarPdf(
        await archivoPdf.arrayBuffer(),
        firmaPng,
        PALABRA_CLAVE_COMERCIALIZADOR,
      )

      if (!resultado.coincidencias) {
        setMensaje(`No se encontro la palabra clave ${PALABRA_CLAVE_COMERCIALIZADOR}.`)
        return
      }

      const blob = new Blob([copiarArrayBuffer(resultado.bytes)], { type: 'application/pdf' })
      setDocumentoUrl(URL.createObjectURL(blob))
      setMensaje(`Firma colocada en ${resultado.coincidencias} lugar${resultado.coincidencias === 1 ? '' : 'es'}.`)
    } catch (error) {
      setMensaje(`No se pudo firmar el PDF: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setProcesando(false)
    }
  }

  const nombreDescarga = archivoPdf
    ? `${archivoPdf.name.replace(/\.pdf$/i, '')}-firmado-comercializador.pdf`
    : 'papeleria-firmada-comercializador.pdf'

  return (
    <main className="min-vh-100 bg-white">
      <div className="container py-4">
        <Link to="/" className="btn btn-link text-primary px-0 mb-3">
          Volver
        </Link>

        <h1 className="fw-bold text-primary mb-2">Firma del comercializador</h1>
        <p className="fs-5 mb-4">Firma la papelería y descarga el PDF. No se enviará ningún correo.</p>

        <section className="border rounded p-3 p-md-4 mb-4">
          <h2 className="h4 mb-2">1. Dibuja tu firma</h2>
          <div className="firma-pad border rounded-4 bg-light overflow-hidden mb-3 mx-auto">
            <SignatureCanvas
              ref={signatureRef}
              penColor="#000000"
              onEnd={guardarFirma}
              canvasProps={{
                className: 'firma-canvas d-block w-100',
                style: { touchAction: 'none' },
              }}
            />
          </div>

          <button type="button" className="btn btn-outline-primary" onClick={limpiarFirma}>
            Limpiar firma
          </button>
        </section>

        <section className="border rounded p-3 p-md-4 mb-4">
          <h2 className="h4 mb-3">2. Selecciona la papelería</h2>
          <input
            type="file"
            accept="application/pdf"
            className="form-control form-control-lg mb-3"
            onChange={cargarPdf}
          />

          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={colocarFirma}
            disabled={!firmaPng || !archivoPdf || procesando}
            aria-busy={procesando}
          >
            {procesando && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
            {procesando ? 'Colocando firma...' : 'Firmar PDF'}
          </button>
        </section>

        {mensaje && <p className="fs-5 mb-3">{mensaje}</p>}

        {documentoUrl && (
          <section className="mb-3">
            <a href={documentoUrl} download={nombreDescarga} className="btn btn-primary btn-lg mb-3">
              Descargar PDF firmado
            </a>
            <iframe
              title="Previsualización del PDF firmado"
              src={documentoUrl}
              className="w-100 border rounded"
              style={{ height: '70vh' }}
            />
          </section>
        )}
      </div>
    </main>
  )
}

export default FirmaComercializador
