type FirmaState = {
  count: number
  firmaPng: string | null
  clavePapeleria: string | null
  datosComercializador: {
    nombre: string
    correo: string
  }
}

type FirmaAction =
  | { type: 'INCREMENT' }
  | { type: 'DECREMENT' }
  | { type: 'GUARDAR_FIRMA'; payload: string }
  | { type: 'LIMPIAR_FIRMA' }
  | { type: 'GUARDAR_CLAVE_PAPELERIA'; payload: string }
  | { type: 'LIMPIAR_CLAVE_PAPELERIA' }
  | { type: 'GUARDAR_DATOS_COMERCIALIZADOR'; payload: FirmaState['datosComercializador'] }
  | { type: 'LIMPIAR_DATOS_COMERCIALIZADOR' }

const initialState: FirmaState = {
  count: 0,
  firmaPng: null,
  clavePapeleria: null,
  datosComercializador: {
    nombre: '',
    correo: '',
  },
}

const reducer = (state = initialState, action: FirmaAction): FirmaState => {
  switch (action.type) {
    case 'INCREMENT':
      return { ...state, count: state.count + 1 }
    case 'DECREMENT':
      return { ...state, count: state.count - 1 }
    case 'GUARDAR_FIRMA':
      return { ...state, firmaPng: action.payload }
    case 'LIMPIAR_FIRMA':
      return { ...state, firmaPng: null }
    case 'GUARDAR_CLAVE_PAPELERIA':
      return { ...state, clavePapeleria: action.payload }
    case 'LIMPIAR_CLAVE_PAPELERIA':
      return { ...state, clavePapeleria: null }
    case 'GUARDAR_DATOS_COMERCIALIZADOR':
      // Comparte el identificador del comercializador entre las pantallas del trámite actual.
      return { ...state, datosComercializador: action.payload }
    case 'LIMPIAR_DATOS_COMERCIALIZADOR':
      // Evita reutilizar datos anteriores cuando el comercializador elige editarlos.
      return { ...state, datosComercializador: { nombre: '', correo: '' } }
    default:
      return state
  }
}

export const guardarFirma = (firmaPng: string): FirmaAction => ({
  type: 'GUARDAR_FIRMA',
  payload: firmaPng,
})

export const limpiarFirma = (): FirmaAction => ({
  type: 'LIMPIAR_FIRMA',
})

export const guardarClavePapeleria = (clave: string): FirmaAction => ({
  type: 'GUARDAR_CLAVE_PAPELERIA',
  payload: clave,
})

export const limpiarClavePapeleria = (): FirmaAction => ({
  type: 'LIMPIAR_CLAVE_PAPELERIA',
})

// Actualiza en Redux el nombre y correo que identifican al comercializador.
export const guardarDatosComercializador = (datos: FirmaState['datosComercializador']): FirmaAction => ({
  type: 'GUARDAR_DATOS_COMERCIALIZADOR',
  payload: datos,
})

// Vacía el identificador compartido antes de que el comercializador ingrese uno nuevo.
export const limpiarDatosComercializador = (): FirmaAction => ({
  type: 'LIMPIAR_DATOS_COMERCIALIZADOR',
})

export default reducer
