import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import SignatureCanvas from 'react-signature-canvas'
import { firmarPdf, PALABRA_CLAVE_COMERCIALIZADOR, type CampoTextoPdf } from '../../SERVICIOS/firmarPdf'
import '../FIRMA_DIGITAL/FirmaDigital.css'

const copiarArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  const copia = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(copia).set(bytes)
  return copia
}

const PLANES = [
  { nombre: 'Plan 50', marcador: 'fplan_1' },
  { nombre: 'Plan 70', marcador: 'fplan_2' },
  { nombre: 'Plan 100', marcador: 'fplan_3' },
  { nombre: 'Plan 120', marcador: 'fplan_4' },
  { nombre: 'Plan 150', marcador: 'fplan_5' },
] as const

type MarcadorPlan = (typeof PLANES)[number]['marcador']

type DatoComercializador =
  | 'nombreApellido'
  | 'dni'
  | 'cuit'
  | 'numeroAsociado'
  | 'correo'
  | 'telefono'
  | 'titularCuenta'
  | 'entidad'
  | 'alias'
  | 'cbuCvu'

type DatosComercializador = Record<DatoComercializador, string>

type DefinicionDatoComercializador = {
  clave: DatoComercializador
  etiqueta: string
  marcador: string
  marcadoresAlternativos?: readonly string[]
  tipo?: 'text' | 'email' | 'tel'
  inputMode?: 'text' | 'numeric' | 'email' | 'tel'
  autoComplete?: string
}

const CAMPOS_COMERCIALIZADOR: readonly DefinicionDatoComercializador[] = [
  { clave: 'nombreApellido', etiqueta: 'Nombre y apellido', marcador: 'n_a_aqui', autoComplete: 'name' },
  { clave: 'dni', etiqueta: 'DNI', marcador: 'dni_aqui', inputMode: 'numeric' },
  { clave: 'cuit', etiqueta: 'CUIT', marcador: 'cuit_aqui', inputMode: 'numeric' },
  { clave: 'numeroAsociado', etiqueta: 'N.o de asociado', marcador: 'n_de_asociado_aqui', inputMode: 'numeric' },
  { clave: 'correo', etiqueta: 'Correo', marcador: 'correo_aqui', tipo: 'email', inputMode: 'email', autoComplete: 'email' },
  { clave: 'telefono', etiqueta: 'Telefono', marcador: 'telefono_aqui', tipo: 'tel', inputMode: 'tel', autoComplete: 'tel' },
  { clave: 'titularCuenta', etiqueta: 'Titular de la cuenta', marcador: 'titular_aqui' },
  { clave: 'entidad', etiqueta: 'Entidad financiera / proveedor de servicios de pago', marcador: 'entidad_aqui' },
  { clave: 'alias', etiqueta: 'Alias', marcador: 'alias_aquí', marcadoresAlternativos: ['alias_aqui'] },
  { clave: 'cbuCvu', etiqueta: 'CBU / CVU', marcador: 'cbu_aqui', inputMode: 'numeric' },
]

const DATOS_INICIALES: DatosComercializador = {
  nombreApellido: '',
  dni: '',
  cuit: '',
  numeroAsociado: '',
  correo: '',
  telefono: '',
  titularCuenta: '',
  entidad: '',
  alias: '',
  cbuCvu: '',
}

function FirmaComercializador() {
  const signatureRef = useRef<SignatureCanvas | null>(null)
  const [firmaPng, setFirmaPng] = useState<string | null>(null)
  const [archivoPdf, setArchivoPdf] = useState<File | null>(null)
  const [documentoUrl, setDocumentoUrl] = useState<string | null>(null)
  const [marcadorPlan, setMarcadorPlan] = useState<MarcadorPlan | null>(null)
  const [datosComercializador, setDatosComercializador] = useState<DatosComercializador>(DATOS_INICIALES)
  const [mensaje, setMensaje] = useState('')
  const [procesando, setProcesando] = useState(false)

  useEffect(() => {
    return () => {
      if (documentoUrl) {
        URL.revokeObjectURL(documentoUrl)
      }
    }
  }, [documentoUrl])

  const guardarFirma = () => {
    const signaturePad = signatureRef.current

    setFirmaPng(signaturePad && !signaturePad.isEmpty()
      ? signaturePad.getCanvas().toDataURL('image/png')
      : null)
    setDocumentoUrl(null)
    setMensaje('')
  }

  const limpiarFirma = () => {
    signatureRef.current?.clear()
    setFirmaPng(null)
    setDocumentoUrl(null)
    setMensaje('')
  }

  const cargarPdf = (event: ChangeEvent<HTMLInputElement>) => {
    const archivo = event.target.files?.[0]

    if (!archivo) {
      return
    }

    if (!archivo.name.toLowerCase().endsWith('.pdf')) {
      setArchivoPdf(null)
      setMensaje('Selecciona un archivo PDF valido.')
      return
    }

    setArchivoPdf(archivo)
    setDocumentoUrl(null)
    setMensaje('')
  }

  const seleccionarPlan = (event: ChangeEvent<HTMLInputElement>) => {
    setMarcadorPlan(event.target.value as MarcadorPlan)
    setDocumentoUrl(null)
    setMensaje('')
  }

  const actualizarDato = (campo: DatoComercializador) => (event: ChangeEvent<HTMLInputElement>) => {
    setDatosComercializador((datosActuales) => ({
      ...datosActuales,
      [campo]: event.target.value,
    }))
    setDocumentoUrl(null)
    setMensaje('')
  }

  const colocarFirma = async () => {
    if (procesando) {
      return
    }

    if (!marcadorPlan) {
      setMensaje('Selecciona un plan antes de firmar y descargar la papeleria.')
      return
    }

    const camposSinCompletar = CAMPOS_COMERCIALIZADOR.filter(
      (campo) => !datosComercializador[campo.clave].trim(),
    )

    if (camposSinCompletar.length) {
      setMensaje(`Completa los siguientes datos: ${camposSinCompletar.map((campo) => campo.etiqueta).join(', ')}.`)
      return
    }

    if (!archivoPdf || !firmaPng) {
      return
    }

    try {
      setProcesando(true)
      setDocumentoUrl(null)
      setMensaje('Colocando firma...')

      const camposTexto: CampoTextoPdf[] = CAMPOS_COMERCIALIZADOR.map((campo) => ({
        marcador: campo.marcador,
        marcadoresAlternativos: campo.marcadoresAlternativos,
        valor: datosComercializador[campo.clave].trim(),
      }))

      const resultado = await firmarPdf(
        await archivoPdf.arrayBuffer(),
        firmaPng,
        PALABRA_CLAVE_COMERCIALIZADOR,
        marcadorPlan,
        camposTexto,
      )

      if (!resultado.coincidencias) {
        setMensaje(`No se encontro la palabra clave ${PALABRA_CLAVE_COMERCIALIZADOR}.`)
        return
      }

      if (!resultado.coincidenciasPlan) {
        setMensaje(`No se encontro la marca ${marcadorPlan} del plan seleccionado.`)
        return
      }

      const camposSinMarca = CAMPOS_COMERCIALIZADOR.filter(
        (campo) => !resultado.coincidenciasDatos[campo.marcador],
      )

      if (camposSinMarca.length) {
        setMensaje(`No se encontraron las marcas para: ${camposSinMarca.map((campo) => campo.etiqueta).join(', ')}.`)
        return
      }

      const blob = new Blob([copiarArrayBuffer(resultado.bytes)], { type: 'application/pdf' })
      setDocumentoUrl(URL.createObjectURL(blob))
      const planSeleccionado = PLANES.find((plan) => plan.marcador === marcadorPlan)
      setMensaje(`Firma, ${planSeleccionado?.nombre ?? 'plan'} y datos colocados correctamente.`)
    } catch (error) {
      setMensaje(`No se pudo firmar el PDF: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setProcesando(false)
    }
  }

  const nombreDescarga = archivoPdf
    ? `${archivoPdf.name.replace(/\.pdf$/i, '')}-firmado-comercializador.pdf`
    : 'papeleria-firmada-comercializador.pdf'
  const datosCompletos = CAMPOS_COMERCIALIZADOR.every(
    (campo) => Boolean(datosComercializador[campo.clave].trim()),
  )

  return (
    <main className="min-vh-100 bg-white">
      <div className="container py-4">
        <Link to="/" className="btn btn-link text-primary px-0 mb-3">
          Volver
        </Link>

        <h1 className="fw-bold text-primary mb-2">Firma del comercializador</h1>
        <p className="fs-5 mb-4">Firma la papelería y descarga el PDF. No se enviará ningún correo.</p>

        <section className="border rounded p-3 p-md-4 mb-4">
          <h2 className="h4 mb-2">1. Dibuja tu firma</h2>
          <div className="firma-pad border rounded-4 bg-light overflow-hidden mb-3 mx-auto">
            <SignatureCanvas
              ref={signatureRef}
              penColor="#000000"
              onEnd={guardarFirma}
              canvasProps={{
                className: 'firma-canvas d-block w-100',
                style: { touchAction: 'none' },
              }}
            />
          </div>

          <button type="button" className="btn btn-outline-primary" onClick={limpiarFirma}>
            Limpiar firma
          </button>
        </section>

        <section className="border rounded p-3 p-md-4 mb-4">
          <h2 className="h4 mb-3">2. Selecciona el plan</h2>
          <p className="text-secondary mb-3">Esta selección es obligatoria y se marcará en la papelería firmada.</p>

          <div className="d-grid gap-2" role="radiogroup" aria-label="Plan seleccionado">
            {PLANES.map((plan) => (
              <label
                key={plan.marcador}
                className={`border rounded p-3 d-flex align-items-center gap-3 ${marcadorPlan === plan.marcador ? 'border-primary bg-primary-subtle' : ''}`}
              >
                <input
                  type="radio"
                  name="plan"
                  value={plan.marcador}
                  checked={marcadorPlan === plan.marcador}
                  onChange={seleccionarPlan}
                  className="form-check-input mt-0"
                />
                <span className="fw-semibold">{plan.nombre}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="border rounded p-3 p-md-4 mb-4">
          <h2 className="h4 mb-3">3. Completa tus datos</h2>
          <p className="text-secondary mb-3">Todos los datos son obligatorios y se incorporarán en la papelería.</p>

          <div className="row g-3">
            {CAMPOS_COMERCIALIZADOR.map((campo) => (
              <div className="col-md-6" key={campo.clave}>
                <label htmlFor={`comercializador-${campo.clave}`} className="form-label fw-semibold">
                  {campo.etiqueta}
                </label>
                <input
                  id={`comercializador-${campo.clave}`}
                  type={campo.tipo ?? 'text'}
                  inputMode={campo.inputMode}
                  autoComplete={campo.autoComplete}
                  className="form-control form-control-lg"
                  value={datosComercializador[campo.clave]}
                  onChange={actualizarDato(campo.clave)}
                  required
                />
              </div>
            ))}
          </div>
        </section>

        <section className="border rounded p-3 p-md-4 mb-4">
          <h2 className="h4 mb-3">4. Selecciona la papelería</h2>
          <input
            type="file"
            accept="application/pdf"
            className="form-control form-control-lg mb-3"
            onChange={cargarPdf}
          />

          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={colocarFirma}
            disabled={!firmaPng || !archivoPdf || !marcadorPlan || !datosCompletos || procesando}
            aria-busy={procesando}
          >
            {procesando && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
            {procesando ? 'Colocando firma...' : 'Firmar PDF'}
          </button>
        </section>

        {mensaje && <p className="fs-5 mb-3">{mensaje}</p>}

        {documentoUrl && (
          <section className="mb-3">
            <a href={documentoUrl} download={nombreDescarga} className="btn btn-primary btn-lg mb-3">
              Descargar PDF firmado
            </a>
            <iframe
              title="Previsualización del PDF firmado"
              src={documentoUrl}
              className="w-100 border rounded"
              style={{ height: '70vh' }}
            />
          </section>
        )}
      </div>
    </main>
  )
}

export default FirmaComercializador
