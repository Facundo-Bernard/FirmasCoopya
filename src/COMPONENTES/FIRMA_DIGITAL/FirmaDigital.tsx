import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import SignatureCanvas from 'react-signature-canvas'
import { guardarFirma, limpiarFirma } from '../../REDUX/reducer'
import type { AppDispatch, RootState } from '../../REDUX/store'

function FirmaDigital() {
  const signatureRef = useRef<SignatureCanvas | null>(null)
  const dispatch = useDispatch<AppDispatch>()
  const firmaPng = useSelector((state: RootState) => state.firmaPng)

  useEffect(() => {
    if (firmaPng) {
      signatureRef.current?.fromDataURL(firmaPng)
    }
  }, [firmaPng])

  const borrarFirma = () => {
    signatureRef.current?.clear()
    dispatch(limpiarFirma())
  }

  const guardarFirmaActual = () => {
    const signaturePad = signatureRef.current

    if (!signaturePad || signaturePad.isEmpty()) {
      return null
    }

    const firma = signaturePad.getCanvas().toDataURL('image/png')

    dispatch(guardarFirma(firma))

    return firma
  }

  const descargarFirma = () => {
    const firma = guardarFirmaActual()

    if (!firma) {
      return
    }

    const link = document.createElement('a')

    link.href = firma
    link.download = 'firma.png'
    link.click()
  }

  return (
    <main className="min-vh-100 bg-white">
      <div className="container py-4">
        <Link to="/" className="btn btn-link text-danger px-0 mb-3">
          Volver
        </Link>

        <h1 className="fw-bold text-danger mb-2">Firma digital</h1>
        <p className="fs-5 mb-2">Dibuja con el dedo debajo</p>

        <div className="border rounded-4 bg-light overflow-hidden mb-3 mx-auto" style={{ maxWidth: '720px' }}>
          <SignatureCanvas
            ref={signatureRef}
            penColor="#000000"
            onEnd={guardarFirmaActual}
            canvasProps={{
              width: 720,
              height: 320,
              className: 'd-block',
              style: {
                width: '100%',
                maxWidth: '720px',
                height: '320px',
                touchAction: 'none',
              },
            }}
          />
        </div>

        <div className="d-flex flex-wrap gap-2 mb-4">
          <button type="button" className="btn btn-outline-danger" onClick={borrarFirma}>
            Limpiar
          </button>
          <button type="button" className="btn btn-danger" onClick={descargarFirma}>
            Descargar
          </button>
          <Link to="/unificarpap" className="btn btn-outline-danger">
            Siguiente
          </Link>
        </div>

        {firmaPng && (
          <div>
            <p className="fw-semibold mb-2">Firma aceptada</p>
            <img src={firmaPng} alt="Firma aceptada" className="img-fluid border rounded bg-white p-2" />
          </div>
        )}
      </div>
    </main>
  )
}

export default FirmaDigital
