import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useLocation } from 'react-router-dom'
import { guardarClavePapeleria, guardarFirma, limpiarClavePapeleria, limpiarFirma } from '../../REDUX/reducer'
import type { AppDispatch, RootState } from '../../REDUX/store'
import FirmaPad from '../FIRMA/FirmaPad'

const DOCUMENT_KEY_PATTERN = /^[A-Za-z0-9_-]{43}$/

function FirmaDigital() {
  const dispatch = useDispatch<AppDispatch>()
  const location = useLocation()
  const firmaPng = useSelector((state: RootState) => state.firmaPng)

  useEffect(() => {
    const codigoDelEnlace = new URLSearchParams(location.hash.slice(1)).get('codigo')

    if (codigoDelEnlace && DOCUMENT_KEY_PATTERN.test(codigoDelEnlace)) {
      dispatch(guardarClavePapeleria(codigoDelEnlace))
      return
    }

    dispatch(limpiarClavePapeleria())
  }, [dispatch, location.hash])

  const actualizarFirma = (firma: string | null) => {
    // Redux conserva la firma para el siguiente paso, sin volver a pintarla sobre el canvas.
    dispatch(firma ? guardarFirma(firma) : limpiarFirma())
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

        <div className="mb-4">
          <FirmaPad firma={firmaPng} onChange={actualizarFirma} etiquetaLimpiar="Limpiar" />

          <div className="d-flex flex-wrap gap-2 mt-3">
            {firmaPng ? (
              <Link to={`/unificarpap${location.hash}`} className="btn btn-primary">
                Siguiente
              </Link>
            ) : (
              <button type="button" className="btn btn-primary" disabled>
                Siguiente
              </button>
            )}
          </div>
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
