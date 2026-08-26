import React from 'react';
// import { BrowserRouter, Routes, Route } from 'react-router-dom';
// import { HashRouter as Router, BrowserRouter, Routes, Route, Link, useLocation, matchPath, Navigate, } from "react-router-dom";
import { BrowserRouter as Router, Routes, Route, Link, useLocation, matchPath, Navigate, } from "react-router-dom";
// import { HashRouter as Router, Routes, Route, Link, useLocation, matchPath, Navigate, } from "react-router-dom";
import MainLayout from './components/layout/MainLayout';

import Perfil from './pages/Perfil';
import Agenda from './pages/Agenda';
import Consultas from './pages/Consultas';
import Indicadores from './pages/Indicadores';
import Evaluacion from './pages/Evaluacion';
import Recetas from './pages/Recetas';
import Inventario from './pages/Inventario';
import Documentos from './pages/Documentos';
import Pacientes from './pages/Pacientes';
import Reingresos from './pages/Reingresos';
import Incapacidad from './pages/Incapacidad';
import Configuracion from './pages/Configuracion';
import SaludPoblacional from './pages/SaludPoblacional';
import Dashboard from './pages/Dashboard';
import DashboardUsuario from './pages/DashboardUsuario';
import DashboardDepartamento from './pages/DashboardDepartamento';
import AnalisisIndividual from './pages/AnalisisIndividual';

import { AuthProvider, useAuth } from './context/AuthToken';
import TitleManager from './components/layout/TitleManager';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Login from './pages/LoginToken';

// Mismo criterio de rol que usan Pacientes/Evaluacion/Consultas para
// restringir sus propias pantallas: admin/médico -> Dashboard, cualquier
// otro rol -> Agenda. Se usa tanto en "/" como en el catch-all ("*") para
// que cualquier ruta desconocida o sin permiso caiga en el inicio correcto
// en vez de una pantalla en blanco.
const InicioRedirect: React.FC = () => {
  const { user } = useAuth() as { user: { rol?: string } | null };
  const esPrivilegiado = (user?.rol ?? "").toLowerCase().trim() === "admin";
  return <Navigate to={esPrivilegiado ? "/Dashboard" : "/Agenda"} replace />;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <TitleManager />
        <Routes>
          {/* Public Route */}
          <Route path="/LoginToken" element={<Login />} />

          {/* Protected Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }>
            {/* Ruta vacía ("/") -> pantalla principal según rol (ver InicioRedirect).
                Redirect explícito (no solo renderizar Dashboard aquí) para que
                la URL se normalice y el breadcrumb/nav activo del Topbar/Sidebar
                la reconozcan igual que si se hubiera navegado ahí directamente. */}
            <Route index element={<InicioRedirect />} />
            <Route path="Perfil" element={<Perfil />} />
            <Route path="Agenda" element={<Agenda />} />
            <Route path="Consultas" element={<Consultas />} />
            <Route path="Indicadores" element={<Indicadores />} />
            <Route path="Indicadores/:matricula" element={<Indicadores />} />
            <Route path="Evaluacion" element={<Evaluacion />} />
            <Route path="Recetas" element={<Recetas />} />
            <Route path="Inventario" element={<Inventario />} />
            <Route path="Documentos" element={<Documentos />} />
            <Route path="Pacientes" element={<Pacientes />} />
            <Route path="Pacientes/:matricula" element={<AnalisisIndividual />} />
            <Route path="Reingresos" element={<Reingresos />} />
            <Route path="Reingresos/:matricula" element={<AnalisisIndividual />} />
            <Route path="Incapacidad" element={<Incapacidad />} />
            <Route path="Configuracion" element={<Configuracion />} />
            <Route path="SaludPoblacional" element={<SaludPoblacional />} />
            <Route path="Dashboard" element={<Dashboard />} />
            <Route path="Dashboard/Usuario" element={<DashboardUsuario />} />
            <Route path="Dashboard/Departamento/:nombre" element={<DashboardDepartamento />} />
            <Route path="*" element={<InicioRedirect />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
