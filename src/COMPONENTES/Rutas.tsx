import { Route, Routes } from 'react-router-dom'

import FirmaComercializador from './FIRMA_COMERCIALIZADOR/FirmaComercializador'
import FirmaDigital from './FIRMA_DIGITAL/FirmaDigital'
import MENU from './MENU/MENU'
import PapeleriaAws from './PAPELERIA_AWS/PapeleriaAws'
import Tutorial from './TUTORIAL/Tutorial'
import UnificarPap from './UNIFICAR_PAP/UnificarPap'

function Rutas() {

  return (
    <>
    <Routes>
      <Route path='/' element={<MENU/>}></Route>
      <Route path="/firma-digital" element={<FirmaDigital/>}></Route>
      <Route path="/firma-comercializador" element={<FirmaComercializador/>}></Route>
      <Route path="/unificarpap" element={<UnificarPap/>}></Route>
      <Route path="/papeleria-aws" element={<PapeleriaAws/>}></Route>
      <Route path="/tutorial" element={<Tutorial/>}></Route>
    </Routes>     
    </>
  )
}

export default Rutas
