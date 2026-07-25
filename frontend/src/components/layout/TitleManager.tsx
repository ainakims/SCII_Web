import React, { FC, useEffect } from 'react';
import { useLocation } from "react-router-dom";

const TitleManager: FC = () => {
  const location = useLocation();

  useEffect(() => {
    switch (location.pathname) {
      // case "/":
      //   document.title = "SCII - Dashboard";
      //   break;
      // case "/Dashboard":
      //   document.title = "SCII - Dashboard";
      //   break;
      // case "/Agenda":
      //   document.title = "SCII - Agenda";
      //   break;
      // case "/Perfil":
      //   document.title = "SCII - Perfil";
      //   break;
      // case "/Consultas":
      //   document.title = "SCII - Consultas";
      //   break;
      // case "/Indicadores":
      //   document.title = "SCII - Indicadores";
      //   break;
      // case "/Evaluacion":
      //   document.title = "SCII - Evaluación";
      //   break;
      // case "/Recetas":
      //   document.title = "SCII - Recetas";
      //   break;
      // case "/Inventario":
      //   document.title = "SCII - Inventario";
      //   break;
      // case "/Documentos":
      //   document.title = "SCII - Documentos";
      //   break;
      // case "/Pacientes":
      //   document.title = "SCII - Pacientes";
      //   break;
      // case "/Configuracion":
      //   document.title = "SCII - Configuración";
      //   break;
      default:
        document.title = "TNG Sano - Integrapp";
    }
  }, [location.pathname]);

  return null;
};

export default TitleManager;
