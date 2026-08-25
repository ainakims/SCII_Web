import API_BASE_URL from "../config";
import { fetchWithAuth } from "../services/api";
import React, { useRef, useEffect, useLayoutEffect, useState, ChangeEvent, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  ChevronRight,
  ChevronLeft,
  ChevronFirst,
  ChevronLast,
  Edit2,
  Trash2,
  UserCog,
  Mail,
  ShieldAlert,
  CircleAlert,
} from "lucide-react";
import Swal from "sweetalert2";
import { useAuth } from "../context/AuthToken";
import { useNavigate } from "react-router-dom";

interface Medico {
  ID: number | null;
  Activo: string;
  UsuarioID: number | null;
  FotoUrl: string;
  Matricula: string | null;
  Usuario: string;
  Correo: string;
  Nombre: string;
  Puesto: string;
  Especialidad: string;
  Categoria_desc: string;
  Cedula: string;
  Id_Rol?: number;
  Rol: string;
  Empl_status?: string;
  Email?: string; // Mapeado desde la API en la tabla
}

interface EmpleadoAPI {
  Empl_Nombres: string;
  Categoria_desc: string;
  Empl_status: string;
  // Descomentar si se usan apellidos
  // Empl_Apellidos: string;
}

// Mismo patrón visual que PacientesTablaSkeleton.tsx (Pacientes.tsx/Reingresos.tsx):
// barra de encabezado con degradado + filas repetidas, para que la tabla de
// Configuración no muestre un spinner suelto dentro del <tbody> mientras carga.
const ConfiguracionTablaSkeleton: React.FC = () => (
  <div className="h-full rounded-lg bg-gray-50 overflow-hidden animate-pulse">
    <div className="h-10 bg-linear-to-r from-white to-gray-100"></div>
    {Array.from({ length: 9 }).map((_, i) => (
      <div key={i} className="flex items-center gap-5 px-5 py-3 border-b border-gray-100 last:border-0">
        <div className="h-3 w-14 rounded bg-gray-200"></div>
        <div className="h-3 w-16 rounded bg-gray-200"></div>
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-40 rounded bg-gray-200"></div>
          <div className="h-2.5 w-24 rounded bg-gray-100"></div>
        </div>
        <div className="h-3 w-28 rounded bg-gray-200"></div>
        <div className="h-3 w-16 rounded bg-gray-200"></div>
        <div className="h-3 w-20 rounded bg-gray-200"></div>
      </div>
    ))}
  </div>
);

const Configuracion: React.FC = () => {
  const { user } = useAuth() as { user: { rol?: string; matricula?: string } };
  const navigate = useNavigate();

  useEffect(() => {
    if ((user?.rol ?? "").toLowerCase().trim() !== "admin") {
      navigate("/Agenda");
    }
  }, [user, navigate]);

  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showFiltros, setShowFiltros] = useState<boolean>(true);
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(false);
  const [emailEdit, setEmailEdit] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMat, setLoadingMat] = useState<boolean>(false);
  const [alerta, setAlerta] = useState<string | null>(null);
  const [matriculaDuplicada, setMatriculaDuplicada] = useState<boolean>(false);
  const [matriculaNoEncontrada, setMatriculaNoEncontrada] = useState<boolean>(false);
  const [cuentaNoEncontrada, setCuentaNoEncontrada] = useState<boolean>(false);

  const [formData, setFormData] = useState<Medico>({
    ID: null,
    UsuarioID: null,
    FotoUrl: "",
    Matricula: "",
    Usuario: "",
    Correo: "",
    Nombre: "",
    Puesto: "",
    Especialidad: "",
    Categoria_desc: "",
    Cedula: "",
    Id_Rol: undefined,
    Activo: "",
    Rol: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const correoRef = useRef<HTMLInputElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const [pageHeight, setPageHeight] = useState<number>(() => Math.max(window.innerHeight - 150, 400));

  useEffect(() => {
    ObtenerUsuarios();
  }, []);

  // Mide el espacio real disponible hasta el borde inferior de la ventana,
  // en vez de adivinarlo con un número fijo (evita cortes/espacios en blanco
  // al cambiar el zoom o el alto del navegador).
  useLayoutEffect(() => {
    const updateHeight = () => {
      if (!pageContainerRef.current) return;
      const top = pageContainerRef.current.getBoundingClientRect().top;
      const mainEl = pageContainerRef.current.closest("main");
      const bottomPad = mainEl ? parseFloat(getComputedStyle(mainEl).paddingBottom) || 0 : 0;
      setPageHeight(Math.max(Math.floor(window.innerHeight - top - bottomPad), 400));
    };
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  const ObtenerUsuarios = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/Configuracion/ObtenerUsuarios`, {
        method: "POST",
      });
      if (res.ok) {
        const json = await res.json();
        setMedicos(json.data ?? []);
      }
    } catch (error) {
      console.error("Error fetching medicos", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (formData.ID !== null) return;
    setMatriculaDuplicada(false);
    setMatriculaNoEncontrada(false);
    setFormData((prev) => ({ ...prev, Nombre: "", Puesto: "" }));

    if (!formData.Matricula) return;

    const delay = setTimeout(async () => {
      try {
        setLoadingMat(true);
        setAlerta(null);
        await new Promise(r => setTimeout(r, 2000));

        const res = await fetchWithAuth(`${API_BASE_URL}/Configuracion/BuscarIdUsuario`, {
          method: "POST",
          body: JSON.stringify({ matricula: formData.Matricula }),
        });

        const json = await res.json();

        if (!res.ok || !json || json.data.length === 0) {
          setAlerta("La matrícula no está ligada a un empleado.");
          setMatriculaNoEncontrada(true);
          return;
        }

        if (json.data[0].Empl_status !== "A") {
          setAlerta("La matrícula se encuentra dada de baja.");
          setMatriculaNoEncontrada(true);
          return;
        }

        setMatriculaNoEncontrada(false);
        setFormData((prev) => ({
          ...prev,
          Nombre: json.data![0].Empl_Nombres || "",
          Puesto: json.data![0].Categoria_desc || "",
        }));

        const dupRes = await fetchWithAuth(`${API_BASE_URL}/Configuracion/VerificarMatricula`, {
          method: "POST",
          body: JSON.stringify({ matricula: formData.Matricula }),
        });
        const dupJson = await dupRes.json();
        setMatriculaDuplicada(dupJson.duplicada === true);

      } catch (error) {
        setAlerta("Error de conexión con el servidor.");
      } finally {
        setLoadingMat(false);
      }
    }, 1000);

    return () => clearTimeout(delay);
  }, [formData.Matricula]);

  // const handleInputChange = (
  //   e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  // ) => {
  //   const { name, value } = e.target;
  //   if (name === "Usuario") {
  //     const generatedEmail = `${value}@tnghph.com.mx`;
  //     setFormData((prev) => ({ ...prev, Usuario: value, Correo: emailEdit ? prev.Correo : generatedEmail, }));
  //   } else {
  //     setFormData((prev) => ({ ...prev, [name]: value }));
  //   }
  // };

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (name === "Usuario") {
      const generatedEmail = `${value}@tnghph.com.mx`;
      setFormData((prev) => ({ 
        ...prev, 
        Usuario: value, 
        Correo: emailEdit ? prev.Correo : generatedEmail 
      }));
    } 
    else if (name === "Matricula") {
      const soloNumeros = value.replace(/\D/g, ""); // Elimina cualquier cosa que no sea número
      setFormData((prev) => ({ ...prev, [name]: soloNumeros }));
    }
    else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  useEffect(() => {
    if (!formData.Matricula || formData.ID !== null) return;
    setCuentaNoEncontrada(false);

    const delay = setTimeout(() => {
      obtenerCuenta(formData.Matricula);
    }, 1500);
    return () => clearTimeout(delay);
  }, [formData.Matricula]);

  const obtenerCuenta = async (matricula: string | null) => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/Configuracion/ObtenerCuentaAD`, {
        method: "POST",
        body: JSON.stringify({ matricula }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.data && json.data.length > 0) {
          setCuentaNoEncontrada(false);
          setFormData((prev) => ({ ...prev, Usuario: json.data[0].sAMAccountName, Correo: json.data[0].userPrincipalName }));
        } else {
          setCuentaNoEncontrada(true);
          setFormData((prev) => ({ ...prev, Usuario: "", Correo: "" }));
        }
      } else {
        setCuentaNoEncontrada(true);
        setFormData((prev) => ({ ...prev, Usuario: "", Correo: "" }));
      }
    } catch (error) {
      console.error('Error: ', error);
    }
  };

  const toggleEmailEdit = () => {
    setEmailEdit((prev) => {
      const newState = !prev;
      if (!newState) {
        setFormData((prevData) => ({
          ...prevData,
          Correo: `${prevData.Usuario}@tnghph.com.mx`,
        }));
      }
      return newState;
    });
  };

  useEffect(() => {
    if (emailEdit) {
      correoRef.current?.focus();
    }
  }, [emailEdit]);

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          FotoUrl: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const resetForm = () => {
    setFormData({
      ID: null,
      UsuarioID: null,
      FotoUrl: "",
      Matricula: "",
      Usuario: "",
      Correo: "",
      Nombre: "",
      Puesto: "",
      Especialidad: "",
      Categoria_desc: "",
      Cedula: "",
      Activo: "",
      Rol: "",
    });
  };

  const openPanelNew = () => {
    resetForm();
    setIsPanelOpen(true);
  };

  const openPanelEdit = (medico: Medico) => {
    setFormData({
      ...medico,
      UsuarioID: medico.UsuarioID || null,
      FotoUrl: medico.FotoUrl || "",
      Matricula: medico.Matricula || "",
      Usuario: medico.Usuario || "",
      Correo: medico.Correo || medico.Email || "",
      Nombre: medico.Nombre || "",
      Puesto: medico.Puesto || medico.Categoria_desc || "",
      Especialidad: medico.Especialidad || "",
      Cedula: medico.Cedula || "",
      Rol: medico.Rol || "",
    });
    setIsPanelOpen(true);
  };

  const closePanel = () => {
    setIsPanelOpen(false);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (matriculaDuplicada) {
      errorModal("Matrícula duplicada", "La matrícula ingresada <b>ya está registrada</b> en el sistema.");
      return;
    }
    if (!formData.Usuario) {
      errorModal("Campo requerido", "La matrícula debe tener una <b>usuario</b> asociado para continuar.");
      return;
    }
    if (!formData.Correo) {
      errorModal("Campo requerido", "La matrícula debe tener una <b>correo</b> asociado para continuar.");
      return;
    }
    if (!formData.Id_Rol) {
      errorModal("Campo requerido", "Debe seleccionar el <b>rol de permisos</b> con los que contará el usuario.");
    }

    try {
      const isEditing = formData.ID != null;
      const url = isEditing ? `${API_BASE_URL}/Configuracion/EdicionUsuarios` : `${API_BASE_URL}/Configuracion/GenerarUsuarios`;

      const res = await fetchWithAuth(url, {
        method: "POST",
        body: JSON.stringify(formData),
      });

      const json = await res.json();

      if (res.ok) {
        exitoModal(`${isEditing ? "Usuario actualizado" : "Usuario registrado"}`, `La cuenta de usuario <b>${formData.Usuario}</b> se ha ${isEditing ? "actualizado" : "registrado"} correctamente.`);
        ObtenerUsuarios();
        closePanel();
      } else {
        // errorModal("Error al guardar", "No se puede registrar matrículas o cuentas repetidas.");
      }
    } catch (error) {
      alert(error);
    }
  };

  const handleDelete = async (estado: number | null, id: number | null, nombre: string) => {
    const result = await confirmModal(estado == 0 ? "exclamation" : "question", `${estado == 0 ? "¿Eliminar usuario?" : "¿Reactivar usuario?"}`, `Si confirma esta acción se ${estado == 0 ? "dará de baja" : "reactivará"} el usuario </br><b>${nombre}</b>.`);

    if (!result.isConfirmed) {
      return;
    } else {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/Configuracion/ModificaUsuario`, {
          method: "POST",
          body: JSON.stringify({ ID: id, estado: estado }),
        });

        if (res.ok) {
          exitoModal(`${estado == 0 ? "Usuario eliminado" : "Usuario reactivado"}`, `Se ha ${estado == 0 ? "dado de baja" : "reactivado"} la cuenta de usuario de </br><b>${nombre}</b>.`);
          ObtenerUsuarios();
        }
      } catch (error) {
        console.error("Error", error);
      }
    }
  };

  const exitoModal = (title: string, message: string) => {
    Swal.fire({
      title: `<p style="font-size: 18px" class="font-bold uppercase text-gray-800">${title}</p>`,
      html: `<p style="font-size: 16px; padding: 0 40px">${message}</p>`,
      iconHtml: `<i class="fa-solid fa-check success-icon"></i><style> .success-icon { color: #545454; font-size: 90px; animation: pop 0.4s ease-out forwards, popPeriodic 4s ease-in-out 1.5s infinite; } @keyframes pop { 0% { transform: scale(0.5); opacity: 0; } 70% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); } } @keyframes popPeriodic { 0%, 85%, 100% { transform: scale(1); } 90% { transform: scale(1.15); } 95% { transform: scale(0.95); } } </style>`,
      didOpen: (p) => { const el = p.querySelector(".swal2-icon") as HTMLElement; if (el) Object.assign(el.style, { border:"none", background:"transparent", boxShadow:"none", width:"auto", height:"auto" }); },
      buttonsStyling: false,
      confirmButtonText: `<i class="fa-solid fa-check mr-1"></i> OK`,
      customClass:
      { 
        confirmButton: "flex items-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer"
      },
    })
  };

  const errorModal = (title: string, message: string) => {
    Swal.fire({
      title: `<p style="font-size: 18px" class="font-bold uppercase text-gray-800">${title}</p>`,
      html: `<p style="font-size: 16px; padding: 0 40px">${message}</p>`,
      iconHtml: `
      <i class="fa-solid fa-exclamation aviso-exclamation"></i>
      <style>
        .aviso-exclamation {
          font-size: 90px;
          animation: shakeInitial 0.6s ease-in-out,
                     shakePeriodic 4s ease-in-out 1.5s infinite;
        }
        @keyframes shakeInitial {
          0%   { transform: scale(0.5) rotate(0deg); opacity: 0; }
          20%  { transform: scale(1.15) rotate(-12deg); opacity: 1; }
          40%  { transform: scale(1.05) rotate(10deg); }
          60%  { transform: scale(1.05) rotate(-7deg); }
          80%  { transform: scale(1) rotate(5deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes shakePeriodic {
          0%, 85%, 100% { transform: rotate(0deg); }
          87% { transform: rotate(-10deg); }
          89% { transform: rotate(10deg); }
          91% { transform: rotate(-8deg); }
          93% { transform: rotate(8deg); }
          95% { transform: rotate(-4deg); }
          97% { transform: rotate(4deg); }
        }
      </style>
      `,
      didOpen: (p) => {
        const el = p.querySelector(".swal2-icon") as HTMLElement; if (el) Object.assign(el.style, { border:"none", background:"transparent", boxShadow:"none", width:"auto", height:"auto" });
      },
      buttonsStyling: false,
      confirmButtonText: `<i class="fa-solid fa-check mr-1"></i> OK`,
      customClass:
      {
        confirmButton: "flex items-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer"
      },
    });
  };

  const confirmModal = (icon: "exclamation" | "question", title: string, message: string) => {
    const iconHtml = icon === "exclamation" ? `
      <i class="fa-solid fa-exclamation aviso-exclamation"></i>
      <style>
        .aviso-exclamation {
          font-size: 90px;
          animation: shakeInitial 0.6s ease-in-out,
                     shakePeriodic 4s ease-in-out 1.5s infinite;
        }
        @keyframes shakeInitial {
          0%   { transform: scale(0.5) rotate(0deg); opacity: 0; }
          20%  { transform: scale(1.15) rotate(-12deg); opacity: 1; }
          40%  { transform: scale(1.05) rotate(10deg); }
          60%  { transform: scale(1.05) rotate(-7deg); }
          80%  { transform: scale(1) rotate(5deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes shakePeriodic {
          0%, 85%, 100% { transform: rotate(0deg); }
          87% { transform: rotate(-10deg); }
          89% { transform: rotate(10deg); }
          91% { transform: rotate(-8deg); }
          93% { transform: rotate(8deg); }
          95% { transform: rotate(-4deg); }
          97% { transform: rotate(4deg); }
        }
      </style>
      ` : `
      <i class="fa-solid fa-question aviso-question"></i>
      <style>
        .aviso-question {
          font-size: 90px;
          animation: pop 0.4s ease-out forwards,
                     popPeriodic 4s ease-in-out 1.5s infinite;
        }
        @keyframes pop {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes popPeriodic {
          0%, 85%, 100% { transform: scale(1); }
          90% { transform: scale(1.15); }
          95% { transform: scale(0.95); }
        }
      </style>
      `;
    return Swal.fire({
      title: `<p style="font-size: 18px" class="font-bold uppercase text-gray-800">${title}</p>`,
      html: `<p style="font-size: 16px; padding: 0 30px">${message}</p>`,
      iconHtml,
      didOpen: (p) => {
        const el = p.querySelector(".swal2-icon") as HTMLElement;
        if (el) Object.assign(el.style, { border:"none", background:"transparent", boxShadow:"none", width:"auto", height:"auto" });
      },
      buttonsStyling: false,
      confirmButtonText: `<i class="fa-solid fa-check mr-1"></i> OK`,
      customClass: {
        confirmButton: "flex items-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer"
      },
    })
  };

  const filteredMedicos = medicos.filter(
    (m) =>
      m.Nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.Especialidad || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.Cedula || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Ordenamiento por columna, mismo patrón que PacientesTabla.tsx (cycleSort/sortIcon).
  type SortCol = "estado" | "matricula" | "nombre" | "especialidad" | "rol" | null;
  type SortDir = "asc" | "desc" | "none";
  const [sortCol, setSortCol] = useState<SortCol>(null);
  const [sortDir, setSortDir] = useState<SortDir>("none");

  const cycleSort = (col: SortCol) => {
    if (sortCol !== col) { setSortCol(col); setSortDir("asc"); return; }
    setSortDir((d) => (d === "asc" ? "desc" : d === "desc" ? "none" : "asc"));
    if (sortDir === "desc") setSortCol(null);
  };

  const sortIcon = (col: SortCol) => {
    if (sortCol !== col || sortDir === "none") return "fa-sort";
    return sortDir === "asc" ? "fa-sort-up" : "fa-sort-down";
  };

  const medicosOrdenados = (() => {
    if (!sortCol || sortDir === "none") return filteredMedicos;
    const factor = sortDir === "asc" ? 1 : -1;
    const valor = (m: Medico): string => {
      if (sortCol === "estado") return m.Activo === "true" ? "1" : "0";
      if (sortCol === "matricula") return m.Matricula ?? "";
      if (sortCol === "nombre") return m.Nombre ?? "";
      if (sortCol === "especialidad") return m.Categoria_desc ?? "";
      if (sortCol === "rol") return m.Rol ?? "";
      return "";
    };
    return [...filteredMedicos].sort((a, b) => factor * valor(a).localeCompare(valor(b), "es", { numeric: true }));
  })();

  // Paginado client-side, mismo criterio que PacientesTabla.tsx.
  const ITEMS_POR_PAGINA = 100;
  const [pagina, setPagina] = useState(1);
  useEffect(() => { setPagina(1); }, [searchTerm, sortCol, sortDir]);
  const totalPaginas = Math.max(1, Math.ceil(medicosOrdenados.length / ITEMS_POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const indiceInicio = (paginaSegura - 1) * ITEMS_POR_PAGINA;
  const medicosMostrados = medicosOrdenados.slice(indiceInicio, indiceInicio + ITEMS_POR_PAGINA);

  // Mismo criterio que getPageNumbers() en Pacientes.tsx/PacientesTabla.tsx:
  // ventana de 3 números centrada en la página actual.
  const getPageNumbers = (): number[] => {
    const pages: number[] = [];
    const maxVisible = 3;
    let start = Math.max(1, paginaSegura - 2);
    const end = Math.min(totalPaginas, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <div className="relative flex w-full overflow-hidden">
      <div className="flex-1 mt-14 transition-all duration-300 ease-in-out">
        <div
          className="max-w-7xl mx-auto px-4 pb-0 flex flex-col gap-6"
          style={{ height: pageHeight }}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 sm:p-6 rounded-xl shadow-xs shadow-restore gap-4 shrink-0">
            <div>
              <h1 className="text-2xl font-bold bg-linear-to-r from-sea-blue to-sky-blue bg-clip-text text-transparent flex items-center">
                Configuración
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Alta, baja y modificación de personal.
              </p>
            </div>
            <button
              onClick={openPanelNew}
              className="w-35 flex items-center justify-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer"
            >
              <i className="fa-solid fa-plus text-xs mr-2"></i>
              Nuevo
            </button>
          </div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl shadow-xs overflow-hidden p-6 mb-1 flex flex-col flex-1 min-h-0"
          >
            <h2 className="text-sm font-bold text-gray-800 flex items-center mb-4 shrink-0">
              <i className="fa-solid fa-user-gear text-sea-blue mr-3"></i>
              Usuarios
            </h2>

            <div className="flex-1 min-h-0">
              {loading ? (
                <ConfiguracionTablaSkeleton />
              ) : (
                <div className="flex flex-col h-full min-h-0 bg-white rounded-lg shadow-xs pb-0">
                  <div className="flex-1 min-h-0 overflow-auto rounded-lg">
                    <table className="w-full text-xs table-fixed">
                      <thead className="sticky top-0 z-10 bg-gray-50">
                        <tr className="text-gray-700 text-left">
                          <th onClick={() => cycleSort("estado")} className="px-5 py-3 font-semibold w-[100px] cursor-pointer select-none group">
                            <span className="flex items-center gap-1">
                              <i className="fa-solid fa-shield-halved text-[10px] text-gray-400 group-hover:text-gray-500 mr-1"></i>
                              Estado
                              <i className={`fa-solid ${sortIcon("estado")} text-[10px] transition-colors ${sortCol === "estado" && sortDir !== "none" ? "text-sea-blue" : "text-gray-300 group-hover:text-gray-400"}`}></i>
                            </span>
                          </th>
                          <th onClick={() => cycleSort("matricula")} className="px-5 py-3 font-semibold w-[100px] cursor-pointer select-none group">
                            <span className="flex items-center gap-1">
                              <i className="fa-brands fa-slack text-[10px] text-gray-400 group-hover:text-gray-500 mr-1"></i>
                              Matrícula
                              <i className={`fa-solid ${sortIcon("matricula")} text-[10px] transition-colors ${sortCol === "matricula" && sortDir !== "none" ? "text-sea-blue" : "text-gray-300 group-hover:text-gray-400"}`}></i>
                            </span>
                          </th>
                          <th onClick={() => cycleSort("nombre")} className="px-5 py-3 font-semibold cursor-pointer select-none group">
                            <span className="flex items-center gap-1">
                              <i className="fa-solid fa-user text-[10px] text-gray-400 group-hover:text-gray-500 mr-1"></i>
                              Nombre
                              <i className={`fa-solid ${sortIcon("nombre")} text-[10px] transition-colors ${sortCol === "nombre" && sortDir !== "none" ? "text-sea-blue" : "text-gray-300 group-hover:text-gray-400"}`}></i>
                            </span>
                          </th>
                          <th onClick={() => cycleSort("especialidad")} className="px-5 py-3 font-semibold w-[220px] cursor-pointer select-none group">
                            <span className="flex items-center gap-1">
                              <i className="fa-solid fa-screwdriver-wrench text-[10px] text-gray-400 group-hover:text-gray-500 mr-1"></i>
                              Especialidad / Puesto
                              <i className={`fa-solid ${sortIcon("especialidad")} text-[10px] transition-colors ${sortCol === "especialidad" && sortDir !== "none" ? "text-sea-blue" : "text-gray-300 group-hover:text-gray-400"}`}></i>
                            </span>
                          </th>
                          <th onClick={() => cycleSort("rol")} className="px-5 py-3 font-semibold w-[110px] cursor-pointer select-none group">
                            <span className="flex items-center gap-1">
                              <i className="fa-solid fa-user-shield text-[10px] text-gray-400 group-hover:text-gray-500 mr-1"></i>
                              Rol
                              <i className={`fa-solid ${sortIcon("rol")} text-[10px] transition-colors ${sortCol === "rol" && sortDir !== "none" ? "text-sea-blue" : "text-gray-300 group-hover:text-gray-400"}`}></i>
                            </span>
                          </th>
                          <th className="px-5 py-3 font-semibold w-[110px]">
                            <span className="flex items-center gap-1.5"><i className="fa-solid fa-arrow-pointer text-[10px] text-gray-400"></i>Acciones</span>
                          </th>
                          <th className="w-8 pl-1 pr-3 py-3 text-center">
                            <i
                              onClick={(e) => { e.stopPropagation(); setShowFiltros((v) => !v); }}
                              title={showFiltros ? "Ocultar filtros" : "Mostrar filtros"}
                              className={`fa-solid ${showFiltros ? "fa-filter-circle-xmark" : "fa-filter"} cursor-pointer text-xs transition-colors ${showFiltros || searchTerm ? "text-sea-blue" : "text-gray-300 hover:text-gray-400"}`}
                            ></i>
                          </th>
                        </tr>
                        {showFiltros && (
                          <tr className="bg-gray-50 text-left">
                            <td colSpan={3} className="px-5 py-2">
                              <div className="relative w-94">
                                <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                                <input
                                  type="text"
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                                  placeholder="Buscar por nombre o cuenta"
                                  className="w-full h-7 pl-8 pr-7 py-1 rounded-md text-xs shadow-xs bg-white outline-none focus:ring-1 focus:ring-sea-blue"
                                />
                                {searchTerm && (
                                  <button
                                    type="button"
                                    onClick={() => setSearchTerm("")}
                                    title="Limpiar búsqueda"
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                                  >
                                    <i className="fa-solid fa-circle-xmark text-xs"></i>
                                  </button>
                                )}
                              </div>
                            </td>
                            <td colSpan={4} className="px-5 py-2"></td>
                          </tr>
                        )}
                      </thead>
                      <tbody>
                        {medicosMostrados.length > 0 ? (
                          medicosMostrados.map((medico) => (
                            <motion.tr
                              initial={{ opacity: 0, y: -1 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: -20 }}
                              transition={{ duration: 0.2 }}
                              key={`${medico.ID || Math.random()}`}
                              className="group border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors"
                            >
                              <td className="px-5 py-2 text-left font-bold text-gray-700">
                                <span className="inline-flex items-center gap-1.5">
                                  <i className={`fa-solid ${medico.Activo == "true" ? "fa-circle-check text-aqua-green" : "fa-triangle-exclamation text-red-500"} text-xs shrink-0`}></i>
                                  {medico.Activo == "true" ? "Activo" : "Baja"}
                                </span>
                              </td>
                              <td className="px-5 py-0 text-left font-bold tracking-wide text-gray-700 group-hover:text-sea-blue transition-colors">
                                {medico.Matricula === "0" ? "" : medico.Matricula}
                              </td>
                              <td className="px-5 py-0">
                                <p title={medico.Nombre} className="font-bold uppercase text-gray-600 truncate group-hover:text-sea-blue transition-colors">
                                  {medico.Nombre}
                                </p>
                                <p className="text-[10px] text-gray-400 uppercase truncate group-hover:font-semibold transition-all">
                                  {medico.Usuario || "Sin cuenta"}
                                </p>
                              </td>
                              <td className="px-5 py-2 text-gray-500 truncate group-hover:font-semibold transition-all">
                                {medico.Categoria_desc || "EXTERNO"}
                              </td>
                              <td className="px-5 py-2 text-gray-500 truncate group-hover:font-semibold transition-all">
                                {medico.Rol || "Usuario"}
                              </td>
                              <td className="px-2 pr-0 whitespace-nowrap">
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => openPanelEdit(medico)}
                                    className="w-6 text-gray-400 hover:text-sky-blue transition-all cursor-pointer"
                                    title="Editar"
                                  >
                                    <i className="fa-solid fa-pencil text-xs"></i>
                                  </button>
                                  {medico.Activo == "true" ?
                                    <button
                                      onClick={() => handleDelete(0, medico.ID, medico.Nombre)}
                                      className="w-6 text-gray-400 hover:text-red-400 transition-all cursor-pointer"
                                      title="Dar de Baja"
                                    >
                                      <i className="fa-solid fa-ban text-xs"></i>
                                    </button>
                                  :
                                    <button
                                      className="w-6 text-gray-400 hover:text-sky-blue transition-all cursor-pointer"
                                      onClick={() => handleDelete(1, medico.ID, medico.Nombre)}
                                      title="Reactivar"
                                    >
                                      <i className="fa-solid fa-rotate-right text-xs"></i>
                                    </button>
                                  }
                                </div>
                              </td>
                              <td className="w-8 pl-1 pr-3 py-2"></td>
                            </motion.tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                              <div className="flex flex-col items-center gap-2">
                                <div className="bg-linear-to-b from-gray-200/50 to-gray-50 shadow-md w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                  <CircleAlert className="h-8 w-8 text-gray-400/50" />
                                </div>
                                <p className="text-gray-500 text-xs">
                                  No se encontraron usuarios registrados
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid grid-cols-2 gap-4 items-center px-5 py-3 shrink-0">
                    <div className="col-span-1 flex items-center">
                      <span className="text-xs font-bold text-gray-400">
                        {paginaSegura} de {totalPaginas} páginas · {filteredMedicos.length.toLocaleString("es-MX")} resultados
                      </span>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setPagina(1)}
                          disabled={paginaSegura === 1}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-linear-to-b hover:from-gray-100 hover:to-gray-50 text-gray-600 hover:text-sea-blue disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                          title="Primera página"
                        >
                          <ChevronFirst className="h-4 w-4" />
                        </button>
                        <button
                          title="Anterior"
                          onClick={() => setPagina((p) => Math.max(p - 1, 1))}
                          disabled={paginaSegura === 1}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-linear-to-b hover:from-gray-100 hover:to-gray-50 text-gray-600 hover:text-sea-blue disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>

                        <div className="flex gap-1 items-center">
                          {getPageNumbers()[0] > 1 && <span className="text-slate-400 px-1 text-xs">...</span>}
                          {getPageNumbers().map((page) => (
                            <button
                              title={`Pág. ${page}`}
                              key={page}
                              onClick={() => setPagina(page)}
                              className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs cursor-pointer shadow-xs font-semibold transition-all ${paginaSegura === page ? "text-white bg-linear-to-b from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80" : "hover:bg-gray-100"}`}
                            >
                              {page}
                            </button>
                          ))}
                          {getPageNumbers()[getPageNumbers().length - 1] < totalPaginas && (
                            <span className="text-slate-400 px-1 text-xs">...</span>
                          )}
                        </div>

                        <button
                          title="Siguiente"
                          onClick={() => setPagina((p) => Math.min(p + 1, totalPaginas))}
                          disabled={paginaSegura === totalPaginas}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-linear-to-b hover:from-gray-100 hover:to-gray-50 hover:text-sea-blue text-gray-600 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setPagina(totalPaginas)}
                          disabled={paginaSegura === totalPaginas}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-linear-to-b hover:from-gray-100 hover:to-gray-50 hover:text-sea-blue text-gray-600 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                          title="Última página"
                        >
                          <ChevronLast className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {isPanelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsPanelOpen(false)}></div>
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
              <div className="min-w-0">
                <p className="text-sm font-bold text-sea-blue truncate">
                  {formData.ID ? "Editar Usuario" : "Nuevo Usuario"}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {formData.ID ? "Edición de cuenta de usuario" : "Registro de cuenta de usuario."}
                </p>
              </div>
              <button
                title="Cerrar"
                className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-sea-blue hover:bg-gray-100 rounded-lg transition-all cursor-pointer shrink-0"
                onClick={() => setIsPanelOpen(false)}
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <form
              id="medicoForm"
              onSubmit={handleSave}
              className="flex-1 overflow-y-auto px-3 py-4 flex flex-col"
            >
              <div className="flex-1 overflow-y-auto p-2 space-y-3">
                <div>
                  <h3 className="text-xs font-bold text-gray-800 mb-2 flex items-center">
                    <i className="fa-solid fa-lock-open mr-2"></i>
                    Acceso al Sistema
                  </h3>
                  <div className="grid grid-cols-11 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Matrícula
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          name="Matricula"
                          value={formData.Matricula || ""}
                          onChange={handleInputChange}
                          placeholder="5 dígitos"
                          disabled={loadingMat || formData.ID !== null}
                          maxLength={5}
                          className={`w-full border rounded-lg px-3 py-2 pr-8 text-xs shadow-xs outline-none ${loadingMat || formData.ID !== null ? "bg-gray-50 text-gray-800 border-gray-50" : matriculaDuplicada || matriculaNoEncontrada ? "border-red-200 bg-red-50 text-red-500" : "border-gray-50 focus:border-clinical-blue focus:ring-1 focus:ring-clinical-blue"}`}
                        />
                        {loadingMat && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <i className="fa-solid fa-spinner fa-spin text-gray-400 text-sm"></i>
                          </div>
                        )}
                        {!loadingMat && matriculaDuplicada && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 group/mat">
                            <i className="fa-solid fa-circle-exclamation text-red-400 text-sm cursor-pointer"></i>
                            <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover/mat:block z-50 w-40">
                              <div className="bg-red-500 text-white text-[10px] rounded-md px-2 py-1.5 shadow-lg leading-tight">
                                La matrícula ingresada ya se encuentra registrada.
                                <div className="absolute right-2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-red-600"></div>
                              </div>
                            </div>
                          </div>
                        )}
                        {matriculaNoEncontrada && (
                          <p className={`text-xs mt-1 ${matriculaNoEncontrada ? "text-red-400" : "text-red-500"}`}>
                            Matrícula inválida o no existe.
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Permisos
                      </label>
                      <select
                        name="Rol"
                        value={formData.Id_Rol || ""}
                        onChange={(e) => {
                          const selectedOption = e.target.options[e.target.selectedIndex];
                          setFormData((prev) => ({  ...prev,  Id_Rol: parseInt(e.target.value),  Rol: selectedOption.text  }));
                        }}
                        className="w-full border border-gray-50 shadow-xs rounded-lg p-2 text-xs focus:ring-1 focus:ring-sea-blue outline-none"
                      >
                        <option value="" disabled hidden>Seleccionar</option>
                        <option value="1">Admin</option>
                        <option value="2">Médico</option>
                        {/*<option value="3">Enfermero</option>*/}
                        <option value="4">Usuario</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-11 md:grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Usuario
                      </label>
                      <input
                        type="text"
                        name="Usuario"
                        value={formData.Usuario}
                        onChange={handleInputChange}
                        placeholder="Cuenta"
                        className={`w-full border rounded-lg px-3 py-2 pr-10 text-xs shadow-xs outline-none ${cuentaNoEncontrada ? "border-red-200 bg-red-50 text-red-500" : "border-gray-50 bg-gray-50 text-gray-800"}`}
                        disabled
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Correo
                      </label>
                      <div className="relative">
                        <input
                          ref={correoRef}
                          type="email"
                          name="Correo"
                          value={formData.Correo}
                          onChange={handleInputChange}
                          disabled={!emailEdit}
                          className={`w-full border rounded-lg px-3 py-2 text-xs shadow-xs outline-none ${cuentaNoEncontrada ? "border-red-200 bg-red-50 text-red-500" : !emailEdit ? "border-gray-50 bg-gray-50 text-gray-800" : "border-gray-50 focus:ring-1 focus:ring-sea-blue"}`}
                          // pr-10
                          placeholder="Correo"
                        />
                        {/* <button type="button" onClick={toggleEmailEdit} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-sky-blue cursor-pointer hidden">
                          <i className="mdi mdi-pencil text-lg"></i>
                        </button> */}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-gray-800 mt-6 mb-2 flex items-center">
                  <i className="fa-solid fa-circle-info mr-2"></i>
                    Datos Personales
                  </h3>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Nombre(s)
                    </label>
                    <input
                      type="text"
                      name="Nombre"
                      value={formData.Nombre}
                      disabled={true}
                      className="w-full border border-gray-50 shadow-xs rounded-lg px-3 py-2 text-xs bg-gray-50 text-gray-800"
                      placeholder="Nombre(s)"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Puesto
                    </label>
                    <input
                      type="text"
                      name="Puesto"
                      value={formData.Puesto}
                      disabled={true}
                      className="w-full border border-gray-50 shadow-xs rounded-lg px-3 py-2 text-xs bg-gray-50 text-gray-800"
                      placeholder="Puesto"
                    />
                  </div>
                </div>
                {(formData.Id_Rol == 1 || formData.Id_Rol == 2) && (
                  <>
                    <h3 className="text-xs font-bold text-gray-800 mt-6 mb-2 flex items-center">
                      <i className="fa-solid fa-award mr-2"></i>
                      Datos Profesionales
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Especialidad</label>
                        <input
                          type="text"
                          name="Especialidad"
                          value={formData.Especialidad}
                          onChange={handleInputChange}
                          placeholder="Especialidad"
                          className="w-full border border-gray-50 shadow-xs rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-sea-blue outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Cédula Profesional</label>
                        <input
                          type="text"
                          name="Cedula"
                          value={formData.Cedula}
                          onChange={handleInputChange}
                          placeholder="Número de cédula"
                          className="w-full border border-gray-50 shadow-xs rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-sea-blue outline-none"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
              {/* {alerta && (
                <div className="px-3.5 py-3.5 font-bold rounded-lg bg-red-100 border border-red-100 text-red-600 text-xs">
                  <i className="mdi mdi-alert mr-3"></i> {alerta}
                </div>
              )} */}
            </form>
            <div className="px-5 py-4 border-t border-gray-100 shrink-0 flex justify-end">
              <button
                form="medicoForm"
                className="w-full flex items-center justify-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 rounded-lg text-xs font-semibold shadow-md shadow-blue-500/30 transition-all cursor-pointer whitespace-nowrap"
              >
                <i className="fa-solid fa-user-check mr-2"></i>
                Guardar Usuario
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Configuracion;