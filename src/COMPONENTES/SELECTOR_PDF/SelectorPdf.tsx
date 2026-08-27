import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'

type ManejadorPdf = {
  getFile: () => Promise<File>
}

type VentanaConSelectorPdf = Window & {
  showOpenFilePicker?: (opciones: {
    id: string
    startIn: 'downloads'
    multiple: boolean
    excludeAcceptAllOption: boolean
    types: { description: string, accept: Record<string, string[]> }[]
  }) => Promise<ManejadorPdf[]>
}

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
  const [abriendo, setAbriendo] = useState(false)
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

  const abrirRecientes = async () => {
    const ventana = window as VentanaConSelectorPdf

    if (!ventana.showOpenFilePicker) {
      inputRef.current?.click()
      return
    }

    try {
      setAbriendo(true)
      const [manejador] = await ventana.showOpenFilePicker({
        id: 'papeleria-asistodo',
        startIn: 'downloads',
        multiple: false,
        excludeAcceptAllOption: true,
        types: [{ description: 'Papeleria PDF', accept: { 'application/pdf': ['.pdf'] } }],
      })

      if (manejador) {
        aceptarArchivo(await manejador.getFile())
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        onError('No se pudo abrir Descargas. Usa "Elegir otro PDF".')
      }
    } finally {
      setAbriendo(false)
    }
  }

  const input = (
    <input
      ref={inputRef}
      id={id}
      type="file"
      accept=".pdf,application/pdf"
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
        disabled={abriendo}
      >
        {abriendo && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
        {abriendo ? 'Abriendo...' : 'Abrir PDF reciente'}
      </button>
      <p className="small text-secondary mb-0">Toca el primer PDF de la lista.</p>
      <label htmlFor={id} className="btn btn-outline-primary">Elegir otro PDF</label>
      {archivo && <p className="fw-semibold text-success mb-0">PDF listo: {archivo.name}</p>}
      {input}
    </div>
  )
}

export default SelectorPdf
