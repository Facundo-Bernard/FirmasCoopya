import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useLocation } from 'react-router-dom'
import SignatureCanvas from 'react-signature-canvas'
import { guardarFirma, limpiarFirma } from '../../REDUX/reducer'
import type { AppDispatch, RootState } from '../../REDUX/store'
import './FirmaDigital.css'

function FirmaDigital() {
  const signatureRef = useRef<SignatureCanvas | null>(null)
  const dispatch = useDispatch<AppDispatch>()
  const location = useLocation()
  const firmaPng = useSelector((state: RootState) => state.firmaPng)
  const [disabled, setDisabled] = useState(!firmaPng)

  useEffect(() => {
    if (firmaPng) {
      signatureRef.current?.fromDataURL(firmaPng)
    }

    setDisabled(!firmaPng)
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
    if (!firmaPng) {
      return
    }

    const link = document.createElement('a')
    link.href = firmaPng
    link.download = 'firma.png'
    link.click()
  }

  return (
    <main className="min-vh-100 bg-white">
      <div className="container py-4">
        <Link to="/" className="btn btn-link text-primary px-0 mb-3">
          Volver
        </Link>

        <h1 className="fw-bold text-primary mb-2">Firma Electrónica</h1>
        <p className="fs-5 mb-2">Dibuja con el dedo debajo</p>

        <div className="firma-pad border rounded-4 bg-light overflow-hidden mb-3 mx-auto">
          <SignatureCanvas
            ref={signatureRef}
            penColor="#000000"
            onEnd={guardarFirmaActual}
            canvasProps={{
              className: 'firma-canvas d-block w-100',
              style: { touchAction: 'none' },
            }}
          />
        </div>

        <div className="d-flex flex-wrap gap-2 mb-4">
          <button type="button" className="btn btn-outline-primary" onClick={borrarFirma}>
            Limpiar
          </button>

          {!disabled ? (
            <Link to={`/unificarpap${location.hash}`} className="btn btn-primary">
              Siguiente
            </Link>
          ) : (
            <button type="button" className="btn btn-primary" disabled>
              Siguiente
            </button>
          )}
        </div>

        {firmaPng && (
          <details className="mb-3">
            <summary className="fw-semibold text-primary">Firma aceptada ! (Opcionalmente, haz click para ver)</summary>
            <div className="pt-3 d-flex flex-column align-items-start gap-2">
              <img src={firmaPng} alt="Firma aceptada" className="img-fluid border rounded bg-white p-2" />
              <button type="button" className="btn btn-primary" onClick={descargarFirma}>
                (Opcional) Descargar firma
              </button>
            </div>
          </details>
        )}
      </div>
    </main>
  )
}

export default FirmaDigital
