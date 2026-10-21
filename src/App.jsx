import { Routes, Route, Navigate } from 'react-router-dom'
import RutaProtegida from './components/RutaProtegida.jsx'

// Inicio
import Bienvenida from './pages/Bienvenida.jsx'

// Interfaz de alumnos
import LoginAlumno from './pages/alumno/LoginAlumno.jsx'
import InicioAlumno from './pages/alumno/InicioAlumno.jsx'
import Evaluacion from './pages/alumno/Evaluacion.jsx'
import Confirmacion from './pages/alumno/Confirmacion.jsx'

// Interfaz de personal
import LoginPersonal from './pages/personal/LoginPersonal.jsx'
import LoginArea from './pages/personal/LoginArea.jsx'
import PanelDocente from './pages/personal/docente/PanelDocente.jsx'
import PanelCoordinacion from './pages/personal/coordinacion/PanelCoordinacion.jsx'
import PanelAdministracion from './pages/personal/administracion/PanelAdministracion.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Bienvenida />} />

      {/* ---------- ALUMNOS ---------- */}
      <Route path="/alumno" element={<LoginAlumno />} />
      <Route path="/alumno/inicio" element={<RutaProtegida rol="alumno"><InicioAlumno /></RutaProtegida>} />
      <Route path="/alumno/evaluar/:crn" element={<RutaProtegida rol="alumno"><Evaluacion /></RutaProtegida>} />
      <Route path="/alumno/listo" element={<RutaProtegida rol="alumno"><Confirmacion /></RutaProtegida>} />

      {/* ---------- PERSONAL ---------- */}
      <Route path="/personal" element={<LoginPersonal />} />
      <Route path="/personal/:area/login" element={<LoginArea />} />
      <Route path="/personal/docente" element={<RutaProtegida rol="docente"><PanelDocente /></RutaProtegida>} />
      <Route path="/personal/coordinacion" element={<RutaProtegida rol="coordinacion"><PanelCoordinacion /></RutaProtegida>} />
      <Route path="/personal/administracion" element={<RutaProtegida rol="administracion"><PanelAdministracion /></RutaProtegida>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
