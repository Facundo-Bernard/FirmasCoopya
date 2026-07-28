import './MENU.css'

const signatureOptions = [
  {
    id: 'digital',
    label: 'Digital',
  },
  {
    id: 'electronica',
    label: 'Electronica',
  },
]

function SignatureIcon() {
  return (
    <span className="menu-option__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 7.7l1.4 2.9 3.2.5-2.3 2.2.5 3.2L12 15.8l-2.8 1.5.5-3.2-2.3-2.2 3.2-.5L12 7.7z" fill="currentColor" />
      </svg>
    </span>
  )
}

function MENU() {
  return (
    <main className="menu-page">
      <div className="container menu-shell py-4 py-md-5">
        <header className="text-center pt-2 pt-md-3">
          <h1 className="menu-title mb-0">Tipo de firma</h1>
        </header>

        <section className="menu-options" aria-label="Tipos de firma">
          {signatureOptions.map((option) => (
            <button key={option.id} type="button" className="menu-option btn">
              <SignatureIcon />
              <span className="menu-option__label">{option.label}</span>
            </button>
          ))}
        </section>

        <footer className="menu-footer">
          <p className="menu-footer__question mb-2">Cual es la diferencia ?</p>
          <p className="menu-footer__copy mb-0">LOREM</p>
        </footer>
      </div>
    </main>
  )
}

export default MENU
