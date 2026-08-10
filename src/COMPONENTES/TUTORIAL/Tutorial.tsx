import { Link } from 'react-router-dom'

function Tutorial() {
  return (
    <main className="min-vh-100 bg-white">
      <div className="container py-4">
        <Link to="/" className="btn btn-link text-danger px-0 mb-3">
          Volver
        </Link>

        <h1 className="fw-bold text-danger mb-4">Tutorial</h1>

        <video controls playsInline className="w-100 border rounded" style={{ maxHeight: '75vh' }}>
          <source src="/tutorial.mp4" type="video/mp4" />
          Tu navegador no puede reproducir este video.
        </video>
      </div>
    </main>
  )
}

export default Tutorial
