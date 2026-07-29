import { Route, Routes } from 'react-router-dom'

import FirmaDigital from './FIRMA_DIGITAL/FirmaDigital'
import MENU from './MENU/MENU'
import UnificarPap from './UNIFICAR_PAP/UnificarPap'

function Rutas() {

  return (
    <>
    <Routes>
      <Route path='/' element={<MENU/>}></Route>
      <Route path="/firma-digital" element={<FirmaDigital/>}></Route>
      <Route path="/unificarpap" element={<UnificarPap/>}></Route>
    </Routes>     
    </>
  )
}

export default Rutas
