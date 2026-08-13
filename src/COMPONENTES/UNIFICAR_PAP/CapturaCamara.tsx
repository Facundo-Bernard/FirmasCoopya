import { useEffect, useRef, useState } from 'react'

type CapturaCamaraProps = {
  foto: File | null
  nombre: string
  facingMode: 'user' | 'environment'
  textoBoton: string
  onCapture: (foto: File) => void
}

const ERROR_CAMARA = 'No tienes cámara disponible. Utiliza una webcam o celular.'
const MAXIMO_ANCHO = 1600
const MAXIMO_FOTO_BYTES = 5_000_000

const detenerCamara = (stream: MediaStream | null) => {
  stream?.getTracks().forEach((track) => track.stop())
}

function CapturaCamara({ foto, nombre, facingMode, textoBoton, onCapture }: CapturaCamaraProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [abierta, setAbierta] = useState(false)
  const [lista, setLista] = useState(false)

  useEffect(() => {
    if (!abierta) {
      return
    }

    let activa = true

    const iniciarCamara = async () => {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('La API de cámara no está disponible.')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
        },
      })

      if (!activa) {
        detenerCamara(stream)
        return
      }

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    }

    iniciarCamara().catch(() => {
      if (activa) {
        setAbierta(false)
        window.alert(ERROR_CAMARA)
      }
    })

    return () => {
      activa = false
      detenerCamara(streamRef.current)
      streamRef.current = null
    }
  }, [abierta, facingMode])

  const capturar = () => {
    const video = videoRef.current

    if (!video || !lista || video.videoWidth < 320 || video.videoHeight < 240) {
      window.alert('La cámara todavía no está lista. Intenta nuevamente.')
      return
    }

    const escala = Math.min(1, MAXIMO_ANCHO / video.videoWidth)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(video.videoWidth * escala)
    canvas.height = Math.round(video.videoHeight * escala)
    const contexto = canvas.getContext('2d')

    if (!contexto) {
      window.alert(ERROR_CAMARA)
      return
    }

    contexto.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob((blob) => {
      if (!blob || blob.type !== 'image/jpeg' || blob.size > MAXIMO_FOTO_BYTES) {
        window.alert('No se pudo guardar la foto. Intenta nuevamente con mejor iluminación.')
        return
      }

      onCapture(new File([blob], `${nombre}-${Date.now()}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      }))
      setAbierta(false)
    }, 'image/jpeg', 0.85)
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-primary btn-lg w-100"
        onClick={() => {
          setLista(false)
          setAbierta(true)
        }}
      >
        {foto ? `Volver a sacar ${textoBoton}` : `Sacar ${textoBoton}`}
      </button>

      {abierta && (
        <>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h2 className="modal-title h5 mb-0">{textoBoton}</h2>
                  <button type="button" className="btn-close" aria-label="Cerrar cámara" onClick={() => setAbierta(false)} />
                </div>
                <div className="modal-body p-2 p-md-3">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="d-block w-100 rounded bg-dark"
                    style={{ maxHeight: '65vh', objectFit: 'contain' }}
                    onLoadedMetadata={() => setLista(true)}
                  />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setAbierta(false)}>
                    Cancelar
                  </button>
                  <button type="button" className="btn btn-primary" disabled={!lista} onClick={capturar}>
                    Tomar foto
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" />
        </>
      )}
    </>
  )
}

export default CapturaCamara
