import { Routes, Route, Navigate } from './router'
import RutaProtegida from './components/RutaProtegida'

// Vista inicial
import Bienvenida from './pages/Bienvenida'

// Interfaz de alumnos
import LoginAlumno from './pages/alumno/LoginAlumno'
import InicioAlumno from './pages/alumno/InicioAlumno'
import Evaluacion from './pages/alumno/Evaluacion'
import Confirmacion from './pages/alumno/Confirmacion'

// Interfaz de personal
import LoginPersonal from './pages/personal/LoginPersonal'
import LoginArea from './pages/personal/LoginArea'
import PanelDocente from './pages/personal/docente/PanelDocente'
import PanelCoordinacion from './pages/personal/coordinacion/PanelCoordinacion'
import PanelAdministracion from './pages/personal/administracion/PanelAdministracion'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Bienvenida />} />

      {/* ---------- ALUMNOS ---------- */}
      <Route path="/alumno" element={<LoginAlumno />} />
      <Route
        path="/alumno/inicio"
        element={
          <RutaProtegida rol="alumno">
            <InicioAlumno />
          </RutaProtegida>
        }
      />
      <Route
        path="/alumno/evaluar/:crn"
        element={
          <RutaProtegida rol="alumno">
            <Evaluacion />
          </RutaProtegida>
        }
      />
      <Route
        path="/alumno/listo"
        element={
          <RutaProtegida rol="alumno">
            <Confirmacion />
          </RutaProtegida>
        }
      />

      {/* ---------- PERSONAL ---------- */}
      <Route path="/personal" element={<LoginPersonal />} />
      <Route path="/personal/:area/login" element={<LoginArea />} />
      <Route
        path="/personal/docente"
        element={
          <RutaProtegida rol="docente">
            <PanelDocente />
          </RutaProtegida>
        }
      />
      <Route
        path="/personal/coordinacion"
        element={
          <RutaProtegida rol="coordinacion">
            <PanelCoordinacion />
          </RutaProtegida>
        }
      />
      <Route
        path="/personal/administracion"
        element={
          <RutaProtegida rol="administracion">
            <PanelAdministracion />
          </RutaProtegida>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
