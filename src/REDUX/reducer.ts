type FirmaState = {
  count: number
  firmaPng: string | null
}

type FirmaAction =
  | { type: 'INCREMENT' }
  | { type: 'DECREMENT' }
  | { type: 'GUARDAR_FIRMA'; payload: string }
  | { type: 'LIMPIAR_FIRMA' }

const initialState: FirmaState = {
  count: 0,
  firmaPng: null,
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

export default reducer
