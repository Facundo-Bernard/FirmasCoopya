import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import SignatureCanvas from 'react-signature-canvas'
import {
  firmarPdf,
  PALABRA_CLAVE_COMERCIALIZADOR,
  type CampoTextoPdf,
  type OpcionMarcadorPlanPdf,
} from '../../SERVICIOS/firmarPdf'
import '../FIRMA_DIGITAL/FirmaDigital.css'

const copiarArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  const copia = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(copia).set(bytes)
  return copia
}

const DESPLAZAMIENTO_TILDE_PLAN = 55

const PLANES = [
  { id: '50', nombre: 'Plan 50', marcadores: [{ marcador: 'fplan_1', desplazamientoX: DESPLAZAMIENTO_TILDE_PLAN }] },
  { id: '70', nombre: 'Plan 70', marcadores: [{ marcador: 'fplan_2', desplazamientoX: DESPLAZAMIENTO_TILDE_PLAN }] },
  { id: '100', nombre: 'Plan 100', marcadores: [{ marcador: 'fplan_3', desplazamientoX: DESPLAZAMIENTO_TILDE_PLAN }] },
  { id: '120', nombre: 'Plan 120', marcadores: [{ marcador: 'fplan_4', aparicion: 1, desplazamientoX: DESPLAZAMIENTO_TILDE_PLAN }] },
  {
    id: '150',
    nombre: 'Plan 150',
    marcadores: [
      { marcador: 'fplan_5', desplazamientoX: DESPLAZAMIENTO_TILDE_PLAN },
      { marcador: 'fplan_4', aparicion: 2, desplazamientoX: DESPLAZAMIENTO_TILDE_PLAN },
    ],
  },
] as const satisfies readonly {
  id: string
  nombre: string
  marcadores: readonly OpcionMarcadorPlanPdf[]
}[]

type PlanId = (typeof PLANES)[number]['id']

type DatoComercializador =
  | 'fecha'
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
  tipo?: 'text' | 'email' | 'tel' | 'date'
  inputMode?: 'text' | 'numeric' | 'email' | 'tel'
  autoComplete?: string
  anclasAlternativas?: CampoTextoPdf['anclasAlternativas']
  anchoMaximo?: number
}

const CAMPOS_COMERCIALIZADOR: readonly DefinicionDatoComercializador[] = [
  {
    clave: 'fecha',
    etiqueta: 'Fecha',
    marcador: 'fecha_aqui',
    tipo: 'date',
    anchoMaximo: 155,
    anclasAlternativas: [{ texto: '.......... de......................de...........', anchoMaximo: 155 }],
  },
  {
    clave: 'nombreApellido',
    etiqueta: 'Nombre y apellido',
    marcador: 'n_a_aqui',
    autoComplete: 'name',
    anchoMaximo: 306,
    anclasAlternativas: [{ texto: 'Nombre y Apellido:', despues: true, desplazamientoX: 6, anchoMaximo: 306 }],
  },
  {
    clave: 'dni',
    etiqueta: 'DNI',
    marcador: 'dni_aqui',
    inputMode: 'numeric',
    anchoMaximo: 174,
    anclasAlternativas: [{ texto: 'D.N.I:', despues: true, desplazamientoX: 6, anchoMaximo: 174 }],
  },
  {
    clave: 'cuit',
    etiqueta: 'CUIT',
    marcador: 'cuit_aqui',
    inputMode: 'numeric',
    anchoMaximo: 128,
    anclasAlternativas: [{ texto: 'CUIT/CUIL:', despues: true, desplazamientoX: 6, anchoMaximo: 128 }],
  },
  {
    clave: 'numeroAsociado',
    etiqueta: 'N.o de asociado',
    marcador: 'n_de_asociado_aqui',
    inputMode: 'numeric',
    anchoMaximo: 122,
    anclasAlternativas: [{ texto: 'Nº de asociado:', despues: true, desplazamientoX: 6, anchoMaximo: 122 }],
  },
  {
    clave: 'correo',
    etiqueta: 'Correo',
    marcador: 'correo_aqui',
    tipo: 'email',
    inputMode: 'email',
    autoComplete: 'email',
    anchoMaximo: 309,
    anclasAlternativas: [{ texto: 'Correo electrónico:', despues: true, desplazamientoX: 6, anchoMaximo: 309 }],
  },
  {
    clave: 'telefono',
    etiqueta: 'Telefono',
    marcador: 'telefono_aqui',
    tipo: 'tel',
    inputMode: 'tel',
    autoComplete: 'tel',
    anchoMaximo: 148,
    anclasAlternativas: [{ texto: 'Teléfono:', despues: true, desplazamientoX: 6, anchoMaximo: 148 }],
  },
  {
    clave: 'titularCuenta',
    etiqueta: 'Titular de la cuenta',
    marcador: 'titular_aqui',
    anchoMaximo: 97,
    anclasAlternativas: [{ texto: 'Titular de la cuenta:', despues: true, desplazamientoX: 6, anchoMaximo: 97 }],
  },
  {
    clave: 'entidad',
    etiqueta: 'Entidad financiera / proveedor de servicios de pago',
    marcador: 'entidad_aqui',
    anchoMaximo: 405,
    anclasAlternativas: [{
      texto: 'Entidad financiera / proveedor de servicios de pago:',
      desplazamientoX: 6,
      desplazamientoY: -15,
      anchoMaximo: 405,
    }],
  },
  {
    clave: 'alias',
    etiqueta: 'Alias',
    marcador: 'alias_aqui',
    marcadoresAlternativos: ['alias_aquí'],
    anchoMaximo: 166,
    anclasAlternativas: [{ texto: 'Alias:', despues: true, desplazamientoX: 6, anchoMaximo: 166 }],
  },
  {
    clave: 'cbuCvu',
    etiqueta: 'CBU / CVU',
    marcador: 'cbu_aqui',
    inputMode: 'numeric',
    anchoMaximo: 148,
    anclasAlternativas: [{ texto: 'CBU/CVU:', despues: true, desplazamientoX: 6, anchoMaximo: 148 }],
  },
]

const fechaActual = () => {
  const fecha = new Date()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${mes}-${dia}`
}

const DATOS_INICIALES: DatosComercializador = {
  fecha: fechaActual(),
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

const formatearFecha = (fecha: string) => new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format(new Date(`${fecha}T12:00:00`))

function FirmaComercializador() {
  const signatureRef = useRef<SignatureCanvas | null>(null)
  const [firmaPng, setFirmaPng] = useState<string | null>(null)
  const [archivoPdf, setArchivoPdf] = useState<File | null>(null)
  const [archivoUrl, setArchivoUrl] = useState<string | null>(null)
  const [documentoUrl, setDocumentoUrl] = useState<string | null>(null)
  const [planId, setPlanId] = useState<PlanId | null>(null)
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

  useEffect(() => {
    return () => {
      if (archivoUrl) {
        URL.revokeObjectURL(archivoUrl)
      }
    }
  }, [archivoUrl])

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
      setArchivoUrl(null)
      setMensaje('Selecciona un archivo PDF valido.')
      return
    }

    setArchivoPdf(archivo)
    setArchivoUrl(URL.createObjectURL(archivo))
    setDocumentoUrl(null)
    setMensaje('')
  }

  const seleccionarPlan = (event: ChangeEvent<HTMLInputElement>) => {
    setPlanId(event.target.value as PlanId)
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

  const colocarFirma = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (procesando) {
      return
    }

    const planSeleccionado = PLANES.find((plan) => plan.id === planId)

    if (!planSeleccionado) {
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
        anclasAlternativas: campo.anclasAlternativas,
        anchoMaximo: campo.anchoMaximo,
        valor: campo.clave === 'fecha'
          ? formatearFecha(datosComercializador.fecha)
          : datosComercializador[campo.clave].trim(),
      }))

      const resultado = await firmarPdf(
        await archivoPdf.arrayBuffer(),
        firmaPng,
        PALABRA_CLAVE_COMERCIALIZADOR,
        planSeleccionado.marcadores,
        camposTexto,
      )

      if (!resultado.coincidencias) {
        setMensaje(`No se encontro la palabra clave ${PALABRA_CLAVE_COMERCIALIZADOR}.`)
        return
      }

      if (!resultado.coincidenciasPlan) {
        setMensaje(`No se encontro la marca correspondiente a ${planSeleccionado.nombre}.`)
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
      setMensaje(`Firma, ${planSeleccionado.nombre} y todos los datos colocados correctamente.`)
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
  const vistaPreviaUrl = documentoUrl ?? archivoUrl

  return (
    <main className="min-vh-100 bg-white">
      <div className="container py-4">
        <Link to="/" className="btn btn-link text-primary px-0 mb-3">
          Volver
        </Link>

        <h1 className="fw-bold text-primary mb-2">Firma del comercializador</h1>
        <p className="fs-5 mb-4">Firma la papelería y descarga el PDF. No se enviará ningún correo.</p>

        <form onSubmit={colocarFirma}>
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
                key={plan.id}
                className={`border rounded p-3 d-flex align-items-center gap-3 ${planId === plan.id ? 'border-primary bg-primary-subtle' : ''}`}
              >
                <input
                  type="radio"
                  name="plan"
                  value={plan.id}
                  checked={planId === plan.id}
                  onChange={seleccionarPlan}
                  className="form-check-input mt-0"
                  required
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
            required
          />

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={!firmaPng || !archivoPdf || !planId || !datosCompletos || procesando}
            aria-busy={procesando}
          >
            {procesando && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
            {procesando ? 'Colocando firma...' : 'Firmar PDF'}
          </button>
        </section>
        </form>

        {mensaje && <p className="fs-5 mb-3">{mensaje}</p>}

        {vistaPreviaUrl && (
          <section className="mb-3">
            {documentoUrl && (
              <a href={documentoUrl} download={nombreDescarga} className="btn btn-primary btn-lg mb-3">
                Descargar PDF firmado
              </a>
            )}
            <h2 className="h4 mb-3">{documentoUrl ? 'Documento firmado' : 'Vista previa del documento'}</h2>
            <iframe
              title={documentoUrl ? 'Previsualización del PDF firmado' : 'Previsualización del PDF cargado'}
              src={vistaPreviaUrl}
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
