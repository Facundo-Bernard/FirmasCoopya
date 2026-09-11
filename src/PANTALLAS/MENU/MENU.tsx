import { Link } from 'react-router-dom'

function MENU() {
  return (
    <main className="min-vh-100 bg-white">
      <div className="container py-4 py-md-5" style={{ maxWidth: '960px' }}>
        <header className="text-center mb-4 mb-md-5">
          <h1 className="display-5 fw-bold text-primary mb-2">Firma electrónica</h1>
          <p className="fs-5 text-secondary mb-0">Elegí la herramienta que necesitás para continuar.</p>
        </header>

        <section className="row g-3" aria-label="Herramientas disponibles">
          <div className="col-md-6">
            <Link to="/firma-digital" className="card h-100 border-primary shadow-sm text-decoration-none">
              <div className="card-body p-4">
                <h2 className="h4 text-primary mb-2">Firma electrónica</h2>
                <p className="text-secondary mb-0">Dibujá tu firma y completá la papelería desde cualquier dispositivo.</p>
              </div>
            </Link>
          </div>

          <div className="col-md-6">
            <Link to="/firma-comercializador" className="card h-100 border-primary shadow-sm text-decoration-none">
              <div className="card-body p-4">
                <h2 className="h4 text-primary mb-2">Firma del comercializador</h2>
                <p className="text-secondary mb-0">Completá, firmá la papelería y generá un link para la persona.</p>
              </div>
            </Link>
          </div>

          <div className="col-md-6">
            <Link to="/papeleria-aws" className="card h-100 border-primary shadow-sm text-decoration-none">
              <div className="card-body p-4">
                <h2 className="h4 text-primary mb-2">Enviar papelería</h2>
                <p className="text-secondary mb-0">Cargá un PDF y generá un enlace seguro para que la persona lo firme.</p>
              </div>
            </Link>
          </div>

          <div className="col-md-6">
            <article className="card h-100 border-secondary bg-light">
              <div className="card-body p-4">
                <span className="badge text-bg-secondary mb-2">Próximamente</span>
                <h2 className="h4 text-secondary mb-2">Firma digital</h2>
                <p className="text-secondary mb-0">Esta opción todavía no está habilitada.</p>
              </div>
            </article>
          </div>
        </section>

        <div className="text-center mt-4">
          <Link to="/tutorial" className="btn btn-outline-primary">
            Ver tutorial de uso
          </Link>
        </div>
      </div>
    </main>
  )
}

export default MENU
