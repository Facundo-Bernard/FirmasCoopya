import { useState } from 'react'
import { Link } from 'react-router-dom'

const PASOS = [
  { hasta: 7, texto: 'Toca Electrónica para comenzar.' },
  { hasta: 16, texto: 'Dibuja tu firma con el dedo y toca Siguiente.' },
  { hasta: 22, texto: 'Selecciona la papelería que descargaste.' },
  { hasta: 29, texto: 'Toca Colocar firma y después Siguiente.' },
  { hasta: 39, texto: 'Completa tu número de DNI.' },
  { hasta: 52, texto: 'Escribe tu correo electrónico.' },
  { hasta: 61, texto: 'Sácate una foto sosteniendo tu DNI.' },
  { hasta: 69, texto: 'Sácate otra foto guiñando un ojo.' },
  { hasta: 76, texto: 'Saca una foto del frente de tu DNI.' },
  { hasta: 84, texto: 'Saca una foto del dorso de tu DNI.' },
  { hasta: 94, texto: 'Saca una foto del comprobante de CBU.' },
  { hasta: 107, texto: 'Revisa todo y toca Confirmar y enviar.' },
  { hasta: Infinity, texto: 'Espera hasta ver Enviado correctamente.' },
]

function Tutorial() {
  const [tiempo, setTiempo] = useState(0)
  const indicacion = PASOS.find((paso) => tiempo < paso.hasta)?.texto

  return (
    <main className="min-vh-100 bg-white">
      <div className="container py-4">
        <Link to="/" className="btn btn-link text-primary px-0 mb-3">
          Volver
        </Link>

        <h1 className="fw-bold text-primary mb-4">Tutorial</h1>

        <video
          controls
          playsInline
          className="w-100 border rounded"
          style={{ maxHeight: '75vh' }}
          onTimeUpdate={(event) => setTiempo(event.currentTarget.currentTime)}
          onSeeked={(event) => setTiempo(event.currentTarget.currentTime)}
        >
          <source src="/tutorial.mp4" type="video/mp4" />
          Tu navegador no puede reproducir este video.
        </video>

        <div className="alert alert-primary text-center fs-5 fw-semibold mt-3 mb-0" role="status" aria-live="polite">
          {indicacion}
        </div>
      </div>
    </main>
  )
}

export default Tutorial
