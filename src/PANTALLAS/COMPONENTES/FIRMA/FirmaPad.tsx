import { useRef } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { recortarFirma } from '../../../SERVICIOS/recortarFirma'
import './FirmaPad.css'

type FirmaPadProps = {
  firma: string | null
  onChange: (firma: string | null) => void
  etiquetaLimpiar?: string
}

function FirmaPad({ firma, onChange, etiquetaLimpiar = 'Limpiar firma' }: FirmaPadProps) {
  const signatureRef = useRef<SignatureCanvas | null>(null)

  const guardarTrazo = () => {
    const signaturePad = signatureRef.current
    if (!signaturePad || signaturePad.isEmpty()) {
      return
    }

    // Solo se entrega el trazo recortado: la posición dentro del recuadro no altera la firma final.
    const firmaRecortada = recortarFirma(signaturePad.getCanvas())
    if (firmaRecortada) {
      onChange(firmaRecortada)
    }
  }

  const limpiar = () => {
    signatureRef.current?.clear()
    onChange(null)
  }

  return (
    <>
      <div className="firma-pad border rounded-4 bg-light overflow-hidden mb-3 mx-auto">
        <SignatureCanvas
          ref={signatureRef}
          penColor="#000000"
          onEnd={guardarTrazo}
          // Preserva el trazo si el navegador móvil redimensiona el viewport al rotar o abrir el teclado.
          clearOnResize={false}
          canvasProps={{
            className: 'firma-canvas d-block w-100',
            style: { touchAction: 'none' },
            'aria-label': 'Área para dibujar la firma',
          }}
        />
      </div>

      <button type="button" className="btn btn-outline-primary" onClick={limpiar} disabled={!firma}>
        {etiquetaLimpiar}
      </button>
    </>
  )
}

export default FirmaPad
