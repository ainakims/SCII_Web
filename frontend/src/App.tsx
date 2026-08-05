import React from 'react';
// import { BrowserRouter, Routes, Route } from 'react-router-dom';
// import { HashRouter as Router, BrowserRouter, Routes, Route, Link, useLocation, matchPath, Navigate, } from "react-router-dom";
import { BrowserRouter as Router, Routes, Route, Link, useLocation, matchPath, Navigate, } from "react-router-dom";
// import { HashRouter as Router, Routes, Route, Link, useLocation, matchPath, Navigate, } from "react-router-dom";
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';

import Perfil from './pages/Perfil';
import Agenda from './pages/Agenda';
import Consultas from './pages/Consultas';
import Indicadores from './pages/Indicadores';
import Evaluacion from './pages/Evaluacion';
import Recetas from './pages/Recetas';
import Inventario from './pages/Inventario';
import Documentos from './pages/Documentos';
import Pacientes from './pages/Pacientes';
import Configuracion from './pages/Configuracion';
import SaludPoblacional from './pages/SaludPoblacional';

import { AuthProvider } from './context/AuthToken';
import TitleManager from './components/layout/TitleManager';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Login from './pages/LoginToken';

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
            <Route index element={<Dashboard />} />
            <Route path="Dashboard" element={<Dashboard />} />
            <Route path="Perfil" element={<Perfil />} />
            <Route path="Agenda" element={<Agenda />} />
            <Route path="Consultas" element={<Consultas />} />
            <Route path="Indicadores" element={<Indicadores />} />
            <Route path="Evaluacion" element={<Evaluacion />} />
            <Route path="Recetas" element={<Recetas />} />
            <Route path="Inventario" element={<Inventario />} />
            <Route path="Documentos" element={<Documentos />} />
            <Route path="Pacientes" element={<Pacientes />} />
            <Route path="Configuracion" element={<Configuracion />} />
            <Route path="SaludPoblacional" element={<SaludPoblacional />} />
            <Route path="*" element={<div className="p-8 text-center text-gray-500">Módulo en construcción</div>} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
