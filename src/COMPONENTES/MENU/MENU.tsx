import { Link } from 'react-router-dom'

function MENU() {
  return (
    <main className="min-vh-100 bg-white d-flex align-items-center">
      <div className="container py-5">
        <header className="text-center mb-5">
          <h1 className="display-5 fw-bold text-danger mb-0">Tipo de firma</h1>
        </header>

        <section className="d-grid gap-3 mx-auto" style={{ maxWidth: '18rem' }} aria-label="Tipos de firma">
          <Link to="/firma-digital" className="btn btn-danger btn-lg rounded-4 shadow-sm">
            Digital
          </Link>
          <button type="button" className="btn btn-danger btn-lg rounded-4 shadow-sm">
            Electronica
          </button>
        </section>

        <footer className="mt-5 text-start">
          <p className="fs-6 mb-1">Cual es la diferencia ?</p>
          <p className="text-secondary mb-0">LOREM</p>
        </footer>
      </div>
    </main>
  )
}

export default MENU
