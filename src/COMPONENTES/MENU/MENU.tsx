import { Link } from 'react-router-dom'

function MENU() {
  return (
    <main className="min-vh-100 bg-white d-flex align-items-center">
      <div className="container py-5">
        <header className="text-center mb-5">
          <h1 className="display-5 fw-bold text-primary mb-0">Tipo de firma</h1>
        </header>

        <section className="d-grid gap-3 mx-auto" style={{ maxWidth: '18rem' }} aria-label="Tipos de firma">
          <Link to="/firma-digital" className="btn btn-primary btn-lg rounded-4 shadow-sm">
            Electrónica
          </Link>
          <button type="button" className="btn btn-primary btn-lg rounded-4 shadow-sm">
            Digital
          </button>
        </section>

        <footer className="mt-5 text-start">
<footer className="mt-5 text-start">
  <h2 className="h5 text-primary mb-3">¿Cuál debo elegir?</h2>

  <div className="border rounded-4 p-3 mb-3 bg-light">
    <h3 className="h6 fw-bold">Firma Digital</h3>
    <p className="mb-2">
      Elija esta opción únicamente si <strong>ya posee un certificado de firma digital </strong>
      emitido por una autoridad certificante y sabe cómo utilizarlo.
    </p>
    <p className="mb-0 text-secondary">
      Ejemplo: utiliza un certificado digital para firmar documentos oficiales o laborales.
    </p>
  </div>

  <div className="border rounded-4 p-3 bg-light">
    <h3 className="h6 fw-bold">Firma Electrónica</h3>
    <p className="mb-2">
      Elija esta opción si desea <strong>dibujar su firma con el dedo o el mouse </strong>
      sobre el documento.
    </p>
    <p className="mb-0 text-secondary">
      Esta es la opción adecuada para la mayoría de las personas.
    </p>
  </div>

</footer>
        </footer>

        <div className="text-center mt-4">
          <Link to="/tutorial" className="btn btn-outline-primary">
            Tutorial
          </Link>
        </div>
      </div>
    </main>
  )
}

export default MENU
