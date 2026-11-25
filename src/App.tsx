import type { FormEvent } from 'react'
import Rutas from './PANTALLAS/Rutas'

function App() {
  const evitarRecargaPorSubmit = (event: FormEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  return (
    <div onSubmitCapture={evitarRecargaPorSubmit}>
      <Rutas />
    </div>
  )
}

export default App
