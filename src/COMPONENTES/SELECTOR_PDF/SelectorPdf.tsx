import { useRef } from 'react'
import type { ChangeEvent } from 'react'

type SelectorPdfProps = {
  id: string
  archivo: File | null
  onSeleccionar: (archivo: File) => void
  onError: (mensaje: string) => void
  required?: boolean
}

const esAndroid = (agente = navigator.userAgent) => /Android/i.test(agente)

const esPdf = (archivo: File) => (
  archivo.type === 'application/pdf' || archivo.name.toLowerCase().endsWith('.pdf')
)

function SelectorPdf({ id, archivo, onSeleccionar, onError, required = false }: SelectorPdfProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const android = esAndroid()

  const aceptarArchivo = (pdf: File) => {
    if (!esPdf(pdf)) {
      onError('Selecciona un archivo PDF valido.')
      return false
    }

    onSeleccionar(pdf)
    return true
  }

  const cargarDesdeInput = (event: ChangeEvent<HTMLInputElement>) => {
    const pdf = event.target.files?.[0]

    if (pdf && !aceptarArchivo(pdf)) {
      event.target.value = ''
    }
  }

  const abrirRecientes = () => {
    if (inputRef.current) {
      inputRef.current.value = ''
      inputRef.current.click()
    }
  }

  const input = (
    <input
      ref={inputRef}
      id={id}
      type="file"
      accept="application/pdf"
      className={android ? 'visually-hidden' : 'form-control form-control-lg'}
      onChange={cargarDesdeInput}
      required={required && !android}
    />
  )

  if (!android) {
    return input
  }

  return (
    <div className="d-grid gap-2">
      <button
        type="button"
        className="btn btn-primary btn-lg"
        onClick={abrirRecientes}
      >
        Abrir archivos recientes
      </button>
      <p className="small text-secondary mb-0">Selecciona la papeleria PDF recibida por WhatsApp.</p>
      {archivo && <p className="fw-semibold text-success mb-0">PDF listo: {archivo.name}</p>}
      {input}
    </div>
  )
}

export default SelectorPdf
