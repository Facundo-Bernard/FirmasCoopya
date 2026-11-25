import { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { guardarDatosComercializador, limpiarDatosComercializador } from '../../../REDUX/reducer'
import type { AppDispatch, RootState } from '../../../REDUX/store'
import {
  eliminarDatosComercializadorGuardados,
  esCorreoComercializadorValido,
  MAX_CORREO_COMERCIALIZADOR,
  MAX_NOMBRE_COMERCIALIZADOR,
  normalizarDatosComercializador,
  persistirDatosComercializador,
  recuperarDatosComercializador,
  sonDatosComercializadorValidos,
} from './utilidadesComercializador'
import type { DatosComercializador } from './utilidadesComercializador'

type DatosComercializadorProps = {
  datosConfirmados?: boolean
  deshabilitado?: boolean
  idPrefix: string
  onEditar?: () => void
}

function FormularioDatosComercializador({
  datosConfirmados = false,
  deshabilitado = false,
  idPrefix,
  onEditar,
}: DatosComercializadorProps) {
  const dispatch = useDispatch<AppDispatch>()
  const datosEnRedux = useSelector((state: RootState) => state.datosComercializador)
  // Lee localStorage una sola vez al montar el componente para hidratar la sesión actual.
  const [datosGuardados, setDatosGuardados] = useState(recuperarDatosComercializador)
  const datosActuales = sonDatosComercializadorValidos(datosEnRedux)
    ? datosEnRedux
    : (datosGuardados ?? datosEnRedux)
  const [editando, setEditando] = useState(() => !sonDatosComercializadorValidos(datosActuales))
  const correoInvalido = Boolean(datosActuales.correo.trim()) && !esCorreoComercializadorValido(datosActuales.correo)

  useEffect(() => {
    // Hidrata Redux con lo persistido para que las demás pantallas reciban los mismos datos.
    if (!sonDatosComercializadorValidos(datosEnRedux) && datosGuardados) {
      dispatch(guardarDatosComercializador(datosGuardados))
    }
  }, [datosEnRedux, datosGuardados, dispatch])

  useEffect(() => {
    const datosNormalizados = normalizarDatosComercializador(datosEnRedux.nombre, datosEnRedux.correo)
    if (sonDatosComercializadorValidos(datosNormalizados)) {
      // Guarda apenas se completan ambos campos, sin depender de que se envíe un PDF.
      persistirDatosComercializador(datosNormalizados)
    }
  }, [datosEnRedux])

  useEffect(() => {
    // Después de confirmar el envío, deja visibles los datos pero evita modificarlos por accidente.
    if (datosConfirmados) {
      setEditando(false)
    }
  }, [datosConfirmados])

  // Envía cada cambio a Redux; la persistencia se realiza cuando nombre y correo son válidos.
  const actualizarDato = (campo: keyof DatosComercializador) => (evento: ChangeEvent<HTMLInputElement>) => {
    dispatch(guardarDatosComercializador({
      ...datosActuales,
      [campo]: evento.target.value,
    }))
  }

  // Habilita cambios y permite que la pantalla anfitriona descarte un link previo.
  const habilitarEdicion = () => {
    // Elimina la copia persistida y la compartida para que no reaparezcan datos al volver a renderizar.
    eliminarDatosComercializadorGuardados()
    setDatosGuardados(null)
    dispatch(limpiarDatosComercializador())
    setEditando(true)
    onEditar?.()
  }

  const camposDeshabilitados = deshabilitado || !editando

  return (
    <section className="border rounded bg-white p-3">
      <div className="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-3">
        <div>
          <h2 className="h5 mb-1">Datos del comercializador</h2>
          <p className="text-secondary mb-0">Se asociarán a la papelería y se incluirán en el correo final.</p>
        </div>

        {!editando && (
          <button type="button" className="btn btn-outline-secondary" onClick={habilitarEdicion} disabled={deshabilitado}>
            <span aria-hidden="true">✓</span> Editar
          </button>
        )}
      </div>

      <div className="row g-3">
        <div className="col-md-6">
          <label htmlFor={`${idPrefix}-nombre`} className="form-label fw-semibold">Nombre del comercializador</label>
          <input
            id={`${idPrefix}-nombre`}
            type="text"
            autoComplete="name"
            className="form-control"
            value={datosActuales.nombre}
            onChange={actualizarDato('nombre')}
            disabled={camposDeshabilitados}
            maxLength={MAX_NOMBRE_COMERCIALIZADOR}
            required
          />
        </div>

        <div className="col-md-6">
          <label htmlFor={`${idPrefix}-correo`} className="form-label fw-semibold">Correo del comercializador</label>
          <input
            id={`${idPrefix}-correo`}
            type="email"
            autoComplete="email"
            className={`form-control ${correoInvalido ? 'is-invalid' : ''}`}
            value={datosActuales.correo}
            onChange={actualizarDato('correo')}
            disabled={camposDeshabilitados}
            maxLength={MAX_CORREO_COMERCIALIZADOR}
            aria-describedby={correoInvalido ? `${idPrefix}-correo-error` : undefined}
            required
          />
          {correoInvalido && (
            <div id={`${idPrefix}-correo-error`} className="invalid-feedback">
              Ingresá un correo válido, por ejemplo: nombre@dominio.com.
            </div>
          )}
        </div>
      </div>

      <p className="form-text mb-0 mt-3">
        {editando
          ? 'Estos datos se guardan en este dispositivo apenas se completan.'
          : 'Los datos están guardados en este dispositivo. Usá “Editar” para cambiarlos.'}
      </p>
    </section>
  )
}

export default FormularioDatosComercializador
