import API_BASE_URL from "../config";
import { fetchWithAuth } from "../services/api";
import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronFirst,
  ChevronLast,
  Settings,
  Trash2,
  Camera,
  Upload,
  UserCog,
  ShieldAlert,
  CircleAlert,
} from "lucide-react";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthToken";
// import { EdicionPaciente } from "../../../backend/controllers/PacientesController";

interface Paciente {
  IdPaciente?: number;
  Empl_matricula: string;
  Empl_Nombres: string;
  Categoria_desc?: string;
  Especialidad: string;
  Compania?: string;
  Depto_nombre?: string;
  Id_Compania?: number;
  Tipo?: "S" | "C" | "H" | "E" | "P";
  Sexo?: "M" | "F";
  FechaNacimiento?: string;
  TipoSanguineo?: string;
  FechaConsulta?: string;
  Empl_fecha_baja?: string;
  CURP?: string;
  NSS?: string;
  RFC?: string;
  Alergias?: string;
  AlergiasMedicamento?: string;
  Enfermedades?: string;
  Tratamientos?: string;
  Cirugias?: string;
  Fracturas?: string;
  Riesgo: string;
  Empl_tipo_empleado?: string;
  Empl_tipo_contrato?: string;
}

interface Proveedor {
  Id_Compania: number;
  Razon: string;
}

type TipoSanguineo = "O+" | "O-" | "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-";
type NivelRiesgo = "Bajo" | "Medio" | "Alto";

interface FormData {
  curp: string;
  nss: string;
  categoria: string;
  compania: string;
  nombre: string;
  matricula: string;
  fechaConsulta: string;
  fechaNacimiento: string;
  proveedor: number | string;
  proveedorTexto: string;
  rfc: string;
  sexo: "M" | "F" | "";
  tipoSanguineo: TipoSanguineo | "";
  riesgo: NivelRiesgo;
  alergias: string;
  alergiasMedicamentos: string;
  enfermedadesCronicas: string;
  tratamientosActuales: string;
  cirugias: string;
  fracturas: string;
  foto: File | null;
  fotoPrevia: string | null;
  edad?: number;
}

const calcularEdad = (fechaNacimiento: string): number => {
  if (!fechaNacimiento) return 0;
  const hoy = new Date();
  const cumpleanos = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - cumpleanos.getFullYear();
  const m = hoy.getMonth() - cumpleanos.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < cumpleanos.getDate())) {
    edad--;
  }
  return edad;
};

const DEFAULT_FORM: FormData = {
  curp: "",
  nss: "",
  categoria: "",
  compania: "",
  nombre: "",
  matricula: "",
  fechaConsulta: "",
  fechaNacimiento: "",
  proveedor: "",
  proveedorTexto: "",
  rfc: "",
  sexo: "",
  tipoSanguineo: "",
  riesgo: "Bajo",
  alergias: "",
  alergiasMedicamentos: "",
  enfermedadesCronicas: "",
  tratamientosActuales: "",
  cirugias: "",
  fracturas: "",
  foto: null,
  fotoPrevia: null,
};

const Pacientes: React.FC = () => {
  const { user } = useAuth() as { user: { rol?: string; matricula?: string } };
  const navigate = useNavigate();

  useEffect(() => {
    if ((user?.rol ?? "").toLowerCase().trim() !== "admin" && (user?.rol ?? "").toLowerCase().trim() !== "médico") {
      navigate("/Agenda");
    }
  }, [user, navigate]);
    
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [proveedor, setProveedor] = useState<Proveedor[]>([]);
  const [showProveedores, setShowProveedores] = useState<boolean>(false);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [editingType, setEditingType] = useState<"internal" | "external" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const originalCurpRef = useRef<string>("");
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const [pageHeight, setPageHeight] = useState<number>(() => Math.max(window.innerHeight - 150, 400));

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [loadingPacientes, setLoadingPacientes] = useState<boolean>(false);
  const [curpDuplicado, setCurpDuplicado] = useState<boolean>(false);
  const [checkingCurp, setCheckingCurp] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 100;
  const [tabView, setTabView] = useState<"activos" | "inactivos">("activos");

  const [showFiltros, setShowFiltros] = useState<boolean>(true);
  const [filtroTipoEmpleado, setFiltroTipoEmpleado] = useState<string>("");
  const [filtroTipoContrato, setFiltroTipoContrato] = useState<string>("");
  const [filtroSexo, setFiltroSexo] = useState<string>("");

  type SortCol = "matricula" | "nombre" | "especialidad" | "consulta" | "perfil" | null;
  type SortDir = "asc" | "desc" | "none";
  const [sortCol, setSortCol] = useState<SortCol>(null);
  const [sortDir, setSortDir] = useState<SortDir>("none");

  const cycleSort = (col: SortCol) => {
    if (sortCol !== col) { setSortCol(col); setSortDir("asc"); return; }
    setSortDir(d => d === "asc" ? "desc" : d === "desc" ? "none" : "asc");
    if (sortDir === "desc") setSortCol(null);
  };

  const sortIcon = (col: SortCol) => {
    if (sortCol !== col || sortDir === "none") return "mdi-sort";
    return sortDir === "asc" ? "mdi-sort-ascending" : "mdi-sort-descending";
  };

  const filtered = pacientes.filter((p) =>
    `${p.Empl_Nombres} ${p.Empl_matricula} ${p.Categoria_desc}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
    && (!filtroTipoEmpleado || p.Empl_tipo_empleado === filtroTipoEmpleado)
    && (!filtroTipoContrato || p.Empl_tipo_contrato === filtroTipoContrato)
    && (!filtroSexo || p.Sexo === filtroSexo),
  );

  const sorted = [...filtered].sort((a, b) => {
    if (!sortCol || sortDir === "none") return 0;
    let va = "", vb = "";
    if (sortCol === "matricula")    { va = a.Empl_matricula ?? ""; vb = b.Empl_matricula ?? ""; }
    if (sortCol === "nombre")       { va = a.Empl_Nombres ?? "";   vb = b.Empl_Nombres ?? ""; }
    if (sortCol === "especialidad") { va = a.Especialidad ?? "";   vb = b.Especialidad ?? ""; }
    if (sortCol === "consulta")     { va = (tabView === "activos" ? a.FechaConsulta : a.Empl_fecha_baja) ?? "";  vb = (tabView === "activos" ? b.FechaConsulta : b.Empl_fecha_baja) ?? ""; }
    if (sortCol === "perfil")     { va = a.FechaNacimiento ?? "";  vb = b.FechaNacimiento ?? ""; }
    const cmp = va.localeCompare(vb, "es", { numeric: true });
    return sortDir === "asc" ? cmp : -cmp;
  });

  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const filterPages = sorted.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM);

  useEffect(() => {
    ObtenerProveedor();
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

  useEffect(() => {
    ObtenerPacientes();
    setCurrentPage(1);
  }, [tabView]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filtroTipoEmpleado, filtroTipoContrato, filtroSexo]);

  useEffect(() => {
    if (formData.fechaNacimiento) {
      const calculada = calcularEdad(formData.fechaNacimiento);
      setFormData((prev) => ({ ...prev, edad: calculada }));
    }
  }, [formData.fechaNacimiento]);

  const ObtenerPacientes = async (prevPacientes?: Paciente[]): Promise<void> => {
    setLoadingPacientes(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/Pacientes/ObtenerPacientes`, {
        method: "POST",
        body: JSON.stringify({ esActivo: tabView === "activos" ? "1" : "0" }),
      });

      if (res.ok) {
        const json = await res.json();
        const data: Paciente[] = Array.isArray(json.data) ? json.data : [];
        // Si el backend devuelve vacío pero teníamos datos, restaurar la lista anterior
        if (data.length === 0 && prevPacientes && prevPacientes.length > 0) {
          setPacientes(prevPacientes);
        } else {
          setPacientes(data);
        }
      }
    } catch (error) {
      console.error("Error al obtener pacientes:", error);
      // En caso de error conservar la lista anterior
      if (prevPacientes) setPacientes(prevPacientes);
    } finally {
      setLoadingPacientes(false);
    }
  };

  const ObtenerProveedor = async (): Promise<void> => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/Pacientes/ObtenerProveedor`, {
        method: "POST",
      });
      if (res.ok) {
        const json = await res.json();
        setProveedor(json.data ?? []);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const resetForm = (): void => {
    setFormData(DEFAULT_FORM);
    setEditingId(null);
    setEditingType(null);
    setCurpDuplicado(false);
    originalCurpRef.current = "";
  };

  // Función pura: devuelve true si el CURP ya existe en otro paciente
  const checkCurpDuplicado = async (curp: string, idPaciente: number | string | null): Promise<boolean> => {
    if (!curp.trim()) return false;
    // Si es el mismo CURP con el que abrió el formulario, no es duplicado
    if (originalCurpRef.current && curp.trim().toUpperCase() === originalCurpRef.current) return false;
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/Pacientes/VerificarCURP`, {
        method: "POST",
        body: JSON.stringify({ curp: curp.trim(), idPaciente }),
      });
      const json = await res.json();
      return json.duplicado === true;
    } catch {
      return false;
    }
  };

  // Versión que actualiza el estado (se usa en onBlur del input)
  const verificarCURP = async (curp: string, idPaciente: number | string | null) => {
    if (!curp.trim()) return;
    setCheckingCurp(true);
    try {
      const duplicado = await checkCurpDuplicado(curp, idPaciente);
      setCurpDuplicado(duplicado);
    } finally {
      setCheckingCurp(false);
    }
  };

  const handleOpenModal = (paciente: Paciente | null = null): void => {
    if (paciente) {
      // Buscar proveedor por ID; si no coincide, intentar por nombre
      const prov = proveedor.find(
        (p) => Number(p.Id_Compania) === Number(paciente.Id_Compania),
      ) ?? proveedor.find(
        (p) => p.Razon.toUpperCase() === (paciente.Compania ?? "").toUpperCase(),
      );

      setFormData({
        ...DEFAULT_FORM,
        curp: (paciente.CURP ?? "").trim(),
        nss: paciente.NSS ?? "",
        categoria: paciente.Categoria_desc ?? "",
        compania: paciente.Compania ?? "",
        nombre: paciente.Empl_Nombres ?? "",
        matricula: paciente.Empl_matricula ?? "",
        fechaNacimiento: paciente.FechaNacimiento
          ? paciente.FechaNacimiento.split("T")[0]
          : "",
        proveedor: prov?.Id_Compania ?? (typeof paciente.Id_Compania === "number" && paciente.Id_Compania > 0 ? paciente.Id_Compania : ""),
        proveedorTexto: prov ? prov.Razon.toUpperCase() : (paciente.Compania ?? "").toUpperCase(),
        rfc: paciente.RFC ?? "",
        sexo: (paciente.Sexo as "M" | "F") ?? "",
        tipoSanguineo: (String(paciente.TipoSanguineo ?? "").trim() as TipoSanguineo | "") || "",
        alergias: paciente.Alergias ?? "",
        alergiasMedicamentos: paciente.AlergiasMedicamento ?? "",
        enfermedadesCronicas: paciente.Enfermedades ?? "",
        tratamientosActuales: paciente.Tratamientos ?? "",
        cirugias: paciente.Cirugias ?? "",
        fracturas: paciente.Fracturas ?? "",
        // Sanitizar Riesgo: el SOAP devuelve objetos para campos vacíos (truthy), por eso ?? no aplica
        riesgo: (typeof paciente.Riesgo === "string" && paciente.Riesgo.trim())
          ? paciente.Riesgo as NivelRiesgo
          : "Bajo",
      });

      setEditingId(paciente.IdPaciente ?? null);
      originalCurpRef.current = (paciente.CURP ?? "").trim().toUpperCase();
      setEditingType(paciente.Empl_matricula && paciente.Empl_matricula !== "0" ? "internal" : "external");
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setFormData((prev) => ({ ...prev, foto: file, fotoPrevia: url }));
    }
  };

  const handleDelete = async (id: number | undefined): Promise<void> => {
    const result = await confirmModal("¿Eliminar paciente?", "Si confirma esta acción se <b>eliminará el registro del paciente</b> de forma permanente.");

    if (!result.isConfirmed) {
      return;
    } else {
      // setPacientes(pacientes.filter((p) => p.IdPaciente !== id));

      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/Pacientes/EliminaPaciente`, {
          method: "POST",
          body: JSON.stringify({
            id: id,
          })
        });

        const data = await res.json();

        if (data) {
          exitoModal("Paciente eliminado", "El registro del paciente se ha eliminado de forma permanente.");
          ObtenerPacientes();
        }
        else {
          errorModal("No se pudo eliminar", "Ocurrió un error al intentar eliminar el paciente.");
        }
      } catch (err) {
        errorModal("Ocurrió un error", (err as Error).message);
      }
    }
  };

  const exitoModal = (title: string, message: string) => {
    Swal.fire({
      title: `<p style="font-size: 18px" class="font-bold uppercase text-gray-800">${title}</p>`,
      html: `<p style="font-size: 16px; padding: 0 40px">${message}</p>`,
      iconHtml: `
      <i class="mdi mdi-check-circle-outline success-icon"></i>
      <style>
        .success-icon {
          color: #54BBAB;
          font-size: 90px;
          animation: pop 0.4s ease-out forwards;
        }
        @keyframes pop {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); }
        }
      </style>
      `,
      didOpen: (p) => { const el = p.querySelector(".swal2-icon") as HTMLElement; if (el) Object.assign(el.style, { border:"none", background:"transparent", boxShadow:"none", width:"auto", height:"auto" }); },
      buttonsStyling: false, 
      confirmButtonText: `<i class="mdi mdi-check-bold mr-1"></i> OK`,
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
      <i class="mdi mdi-alert-circle-outline success-icon"></i>
      <style>
        .success-icon {
          font-size: 90px;
          animation: pop 0.4s ease-out forwards;
        }
        @keyframes pop {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); }
        }
      </style>
      `,
      didOpen: (p) => {
        const el = p.querySelector(".swal2-icon") as HTMLElement; if (el) Object.assign(el.style, { border:"none", background:"transparent", boxShadow:"none", width:"auto", height:"auto" });
      },
      buttonsStyling: false, 
      confirmButtonText: `<i class="mdi mdi-check-bold mr-1"></i> OK`,
      customClass:
      {
        confirmButton: "flex items-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer"
      },
    });
  };

  const confirmModal = (title: string, message: string) => {
    return Swal.fire({
      title: `<p style="font-size: 18px" class="font-bold uppercase text-gray-800">${title}</p>`,
      html: `<p style="font-size: 16px; padding: 0 40px">${message}</p>`,
      iconHtml: `
      <i class="mdi mdi-help-circle-outline success-icon"></i>
      <style>
        .success-icon {
          font-size: 90px;
          animation: pop 0.4s ease-out forwards;
        }
        @keyframes pop {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); }
        }
      </style>
      `,
      didOpen: (p) => {
        const el = p.querySelector(".swal2-icon") as HTMLElement;
        if (el) Object.assign(el.style, { border:"none", background:"transparent", boxShadow:"none", width:"auto", height:"auto" });
      },
      buttonsStyling: false,
      confirmButtonText: `<i class="mdi mdi-check-bold mr-1"></i> OK`,
      customClass: {
        confirmButton: "flex items-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer"
      },
    })
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();

    if (editingType !== "internal" && !formData.proveedor && !formData.proveedorTexto.trim()) {
      errorModal("Campo requerido", "Debe seleccionar una <b>compañía</b> de la lista.");
      return;
    }
    if (editingType !== "internal" && !formData.nombre.trim()) {
      errorModal("Campo requerido", "Debe ingresar el <b>nombre</b> del paciente.");
      return;
    }
    if (!formData.curp.trim()) {
      errorModal("Campo requerido", "Debe ingresar el <b>CURP o pasaporte</b>.");
      return;
    }
    // Verificar CURP en el momento del submit para evitar condiciones de carrera
    const isDuplicate = await checkCurpDuplicado(formData.curp, editingId);
    setCurpDuplicado(isDuplicate);
    if (isDuplicate) {
      errorModal("CURP duplicado", "El <b>CURP / Pasaporte</b> ingresado ya está registrado en el sistema.");
      return;
    }
    if (!formData.sexo) {
      errorModal("Campo requerido", "Debes especificar el <b>sexo</b> del paciente.");
      return;
    }
    if (!formData.fechaNacimiento) {
      errorModal("Campo requerido", "Debe ingresar la <b>fecha de nacimiento</b>.");
      return;
    }

    const payload = {
      Matricula: formData.matricula || "0",
      Proveedor: formData.proveedor,
      CURP: formData.curp ?? "",
      NSS: formData.nss ?? "",
      FechaNacimiento: formData.fechaNacimiento,
      Nombre: formData.nombre,
      Sexo: formData.sexo,
      TipoSanguineo: formData.tipoSanguineo,
      Alergias: formData.alergias,
      EnfermedadesCronicas: formData.enfermedadesCronicas,
      TratamientosActuales: formData.tratamientosActuales,
      AlergiasMedicamentos: formData.alergiasMedicamentos,
      Cirugias: formData.cirugias,
      Fracturas: formData.fracturas,
      Riesgo: formData.riesgo
    };

    try {
      const isEditing = editingId != null;
      const url = isEditing ? `${API_BASE_URL}/Pacientes/EdicionPaciente/${editingId}` : `${API_BASE_URL}/Pacientes/GenerarPaciente`;
      const method = isEditing ? "POST" : "POST";

      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsModalOpen(false);
        const wasEditing = editingId != null;
        const snapshot = [...pacientes]; // captura la lista antes de resetear
        resetForm();
        ObtenerPacientes(snapshot);
        exitoModal(
          wasEditing ? "Paciente actualizado" : "Paciente registrado",
          wasEditing
            ? "Los datos del paciente se han actualizado correctamente."
            : "El nuevo paciente se ha registrado en el sistema."
        );
      } else {
        const errText = await res.text().catch(() => "");
        errorModal("Error al guardar", errText || "Ocurrió un error al guardar los datos del paciente.");
      }
    } catch (error) {
      errorModal("Ocurrió un error", (error as Error).message);
    }
  };

  const getPageNumbers = (): number[] => {
    const pages: number[] = [];
    const maxVisible = 3;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <div className="relative flex w-full overflow-hidden">
      <div className="flex-1 mt-14 transition-all duration-300 ease-in-out"> {/* style={{ marginRight: isModalOpen ? 300 : 0 }} */}
        <div
          // ref={pageContainerRef}
          className="max-w-7xl mx-auto px-4 pb-6 flex flex-col gap-6"
          style={{ height: pageHeight }}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white/70 backdrop-blur-xl p-4 sm:p-6 rounded-xl shadow-xl gap-4 shrink-0">
            {/* bg-linear-to-r from-white to-gray-50 */}
            <div>
              <h1 className="text-2xl font-bold text-sea-blue flex items-center">
                Expediente de Pacientes
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Directorio médico y expedientes clínicos.
              </p>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="w-35 flex items-center justify-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-lg shadow-blue-500/30 transition-all cursor-pointer"
            >
              <i className="mdi mdi-account-plus mr-2"></i>
              Agregar
            </button>
          </div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-linear-to-b from-white to-gray-50 rounded-xl shadow-xl overflow-hidden flex flex-col flex-1 min-h-0"
          >
            <div className="flex items-center justify-between px-6 py-[21px] bg-linear-to-r from-white to-gray-100 rounded-t-xl shrink-0">
              <div className="relative w-92">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  // className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:border-clinical-blue focus:ring-1 focus:ring-clinical-blue outline-none transition-shadow"
                  className={`w-full bg-white border rounded-lg pl-9 px-3 py-2 pr-10 text-xs outline-none transition-colors border-gray-100 shadow-md focus:border-clinical-blue focus:ring-1`}
                  placeholder="Buscar por nombre o matrícula"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                />
              </div>
              <div className="flex items-center gap-1 bg-white border border-gray-100 shadow-md rounded-lg p-1">
                <button
                  onClick={() => setTabView("activos")}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${tabView === "activos" ? "bg-linear-to-r from-sea-blue to-sky-blue text-white shadow-md" : "text-gray-500 hover:text-sea-blue"}`}
                >
                  <i className="mdi mdi-account-check"></i>
                  Activos
                </button>
                <button
                  onClick={() => setTabView("inactivos")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${tabView === "inactivos" ? "bg-linear-to-r from-sea-blue to-sky-blue text-white shadow-md" : "text-gray-500 hover:text-sea-blue"}`}
                >
                  <i className="mdi mdi-account-off"></i>
                  Inactivos
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
              <div className="rounded-lg flex-1 min-h-0 flex flex-col">
                <div className="flex-1 overflow-y-auto">
                  <table className="table-fixed w-full text-xs">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-linear-to-r from-white to-gray-100">
                        {/* <th className="px-3 py-2 text-left font-medium text-gray-700 mb-1">
                          Tipo
                        </th> */}
                        {(["matricula","nombre","especialidad","consulta","perfil"] as SortCol[]).map((col, i) => {
                          const labels: Record<string, string> = { matricula: "Matrícula", nombre: "Paciente", especialidad: "Especialidad", consulta: tabView === "activos" ? "Última consulta" : "Fecha de baja", perfil: "Perfil"};
                          const widths: Record<string, string> = { matricula: "w-[110px]", nombre: "w-auto", especialidad: "w-[210px]", consulta: "w-[145px]", perfil: "w-[142px]" };
                          const active = sortCol === col && sortDir !== "none";
                          return (
                            <th key={col} onClick={() => cycleSort(col)} className={`px-3 py-2 ${i === 0 ? "pl-6" : ""} text-left font-medium text-gray-700 mb-1 ${widths[col!]} cursor-pointer select-none group`}>
                              <span className="flex items-center gap-1">
                                {labels[col!]}
                                <i className={`mdi ${sortIcon(col)} text-sm transition-colors ${active ? "text-sea-blue" : "text-gray-300 group-hover:text-gray-400"}`} />
                                {/* {col === "matricula" && (
                                  
                                )} */}
                              </span>
                            </th>
                          );
                        })}
                        {/* <th className="px-3 py-2 text-left font-medium text-gray-700 mb-1 w-[142px]">
                          Perfil
                        </th> */}
                        <th className="px-3 py-2 text-left font-medium text-gray-700 mb-1 w-[100px]">
                          Riesgo
                        </th>
                        <th className="px-3 py-2 text-center font-medium text-gray-700 mb-1 w-[100px]">
                          Acciones
                        </th>
                        <th className="px-3 py-2 text-center font-medium mb-1 w-[40px]">
                          <i
                            onClick={(e) => { e.stopPropagation(); setShowFiltros((v) => !v); }}
                            title="Filtrar"
                            className={`mdi mdi-filter-variant cursor-pointer text-sm transition-colors ml-0.5 ${showFiltros || filtroTipoEmpleado || filtroTipoContrato || filtroSexo ? "text-sea-blue" : "text-gray-300 hover:text-gray-400"}`}
                          />
                        </th>
                      </tr>
                      {showFiltros && (
                        <tr className="bg-linear-to-r from-white to-gray-100">
                          <td colSpan={8} className="px-6 py-2">
                            <div className="flex items-center justify-end gap-4">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-medium text-gray-500">Tipo de empleado</span>
                                <select
                                  value={filtroTipoEmpleado}
                                  onChange={(e) => setFiltroTipoEmpleado(e.target.value)}
                                  className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white outline-none focus:ring-1 focus:ring-sea-blue cursor-pointer"
                                >
                                  <option value="">Todos</option>
                                  <option value="C">Confianza</option>
                                  <option value="O">Sindicalizado</option>
                                  <option value="EX">Externo</option>
                                </select>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-medium text-gray-500">Tipo de contrato</span>
                                <select
                                  value={filtroTipoContrato}
                                  onChange={(e) => setFiltroTipoContrato(e.target.value)}
                                  className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white outline-none focus:ring-1 focus:ring-sea-blue cursor-pointer"
                                >
                                  <option value="">Todos</option>
                                  <option value="E">Eventual</option>
                                  <option value="P">Planta</option>
                                  <option value="C">Por contrato</option>
                                  <option value="EX">Subcontrato</option>
                                </select>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-medium text-gray-500">Sexo</span>
                                <select
                                  value={filtroSexo}
                                  onChange={(e) => setFiltroSexo(e.target.value)}
                                  className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white outline-none focus:ring-1 focus:ring-sea-blue cursor-pointer"
                                >
                                  <option value="">Todos</option>
                                  <option value="M">Masculino</option>
                                  <option value="F">Femenino</option>
                                </select>
                              </div>
                              {(filtroTipoEmpleado || filtroTipoContrato || filtroSexo) && (
                                <button
                                  onClick={() => { setFiltroTipoEmpleado(""); setFiltroTipoContrato(""); setFiltroSexo(""); }}
                                  className="text-[11px] font-medium text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                                >
                                  <i className="mdi mdi-creation mr-2"></i>Limpiar filtros
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </thead>
                    <tbody>
                      <AnimatePresence mode="wait">
                        {!loadingPacientes && filterPages.map((p, idx) => (
                          <motion.tr
                            initial={{ opacity: 0, y: -1 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                            key={`${p.Empl_matricula}-${idx}`}
                            className="group hover:bg-gray-50/80 transition-colors"
                          >
                            {/* Tipo */}
                            {/* <td className="px-3 py-2 font-medium text-gray-700 mb-1">
                              <div>
                                <span className="inline-flex items-center justify-center px-1.5 py-1 text-[10px] font-semibold text-gray-400 group-hover:text-aqua-green group-hover:bg-aqua-green/10 rounded transition-all">
                                  <i
                                    className={`mdi mdi-${p.Tipo ? TIPO_ICON[p.Tipo] ?? "" : ""} text-[12px] mr-1 group-hover:scale-110 transition-transform`}
                                  ></i>
                                  {p.Tipo ? (TIPO_LABEL[p.Tipo] ?? "") : ""}
                                </span>
                              </div>
                            </td> */}

                            <td className="px-3 pl-6 text-left font-medium text-gray-700 mb-1">
                              {p.Empl_matricula !== "0" ? p.Empl_matricula : 'EXT'}
                            </td>

                            <td className="px-2 py-1.5">
                              <div className="flex items-center justify-between gap-3">
                                <div className="overflow-hidden min-w-0">
                                  {/* {p.Empl_matricula == "0" && p.CURP} */}
                                  <p title={p.Empl_Nombres} className="text-[12px] font-bold uppercase text-gray-600 block truncate">
                                    {p.Empl_Nombres}
                                  </p>
                                  <p title={p.Categoria_desc || p.Compania} className="text-[11px] text-gray-400 font-medium uppercase truncate">
                                    {p.Categoria_desc || p.Compania}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-3 font-medium text-gray-700 mb-1">
                              {p.Especialidad}
                            </td>

                            <td className="px-3 font-medium text-gray-700 mb-1">
                              {(() => {
                                const fecha = tabView === "activos" ? p.FechaConsulta : p.Empl_fecha_baja;
                                return fecha ? new Date(fecha).toLocaleTimeString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";
                              })()}
                            </td>

                            <td className="px-3 font-medium text-gray-700 mb-1">
                              <div className="grid grid-cols-3 gap-0">
                                <div className="col-span-1">
                                  {p.Sexo && (
                                    <span>
                                      <i className={`mdi mdi-${p.Sexo === "M" ? "gender-male" : "gender-female"} mr-1`}></i>
                                      {p.Sexo}
                                    </span>
                                  )}
                                </div>
                                <div className="col-span-2">
                                  {p.FechaNacimiento && (
                                    <span>
                                      <i className="mdi mdi-human-cane mr-1"></i>
                                      {`${Math.floor((Date.now() - new Date(p.FechaNacimiento).getTime()) / 31_557_600_000)} años`}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="px-3 font-medium text-gray-700 mb-1">
                              {p.Riesgo}
                            </td>

                            <td colSpan={2} className="px-2 pr-0 whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                {p.Empl_matricula && Number(p.Empl_matricula) > 0 && p.IdPaciente == null ? (
                                  <button
                                    onClick={() => { handleOpenModal(p); setEditingId(null); }}
                                    // Edit
                                    className="w-9 h-9 text-gray-400 hover:text-sky-blue bg-linear-to-b hover:from-sky-blue/20 hover:to-gray-50 rounded-xl transition-all cursor-pointer"
                                    title="Registrar"
                                  >
                                    <i className="mdi mdi-account-plus-outline text-lg"></i>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleOpenModal(p)}
                                    className="w-9 h-9 text-gray-400 hover:text-sky-blue bg-linear-to-b hover:from-sky-blue/20 hover:to-gray-50 rounded-xl transition-all cursor-pointer"
                                    title="Editar"
                                  >
                                    <i className="mdi mdi-pencil-outline text-lg"></i>
                                  </button>
                                )}
                                {p.Empl_matricula && Number(p.Empl_matricula) === 0 ? (
                                  <button 
                                    onClick={() => handleDelete(p.IdPaciente)}
                                    className="w-9 h-9 text-gray-400 hover:text-red-500 bg-linear-to-b hover:from-red-100 hover:to-gray-50 rounded-xl transition-all cursor-pointer"
                                    title="Eliminar"
                                  >
                                    <i className="mdi mdi-trash-can-outline text-lg"></i>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => navigate("/Documentos", { state: { matricula: String(p.Empl_matricula ?? "") } })}
                                    className="w-9 h-9 text-gray-400 hover:text-sky-blue bg-linear-to-b hover:from-sky-blue/20 hover:to-gray-50 rounded-xl transition-all cursor-pointer"
                                    title="Documentación"
                                  >
                                    <i className="mdi mdi-file-outline text-lg"></i>
                                  </button>
                                )}
                              </div>
                            </td>

                            
                          </motion.tr>
                        ))}
                      </AnimatePresence>

                      {loadingPacientes ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-12 h-12 rounded-full animate-spin bg-linear-to-r from-sea-blue to-sky-blue p-[4px] mt-2">
                                <div className="w-full h-full rounded-full bg-white"></div>
                              </div>
                              <span className="text-xs mt-3">
                                Cargando pacientes...
                              </span>
                            </div>
                          </td>
                        </tr>
                      ) : filtered.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                            <div className="flex flex-col items-center justify-center gap-2">
                              {/* <i className="mdi mdi-loading mdi-spin text-3xl text-sea-blue"></i> */}
                              <div className="bg-linear-to-b from-gray-200/50 to-gray-50 shadow-md w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CircleAlert className="h-8 w-8 text-gray-400/50" />
                                {/* UserCog */}
                              </div>
                              <p className="text-gray-500 text-xs">
                                No se encontraron pacientes que coincidan con la búsqueda
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-gray-100 items-center h-10 shrink-0">
                  <div className="col-span-1 pl-6 flex items-center">
                    <span className="text-xs font-bold text-gray-400">
                      {currentPage} de {totalPages} páginas · {filtered.length} pacientes
                    </span>
                  </div>
                  <div className="col-span-1 flex justify-end pr-6">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded-lg bg-linear-to-b hover:from-gray-100 hover:to-gray-50 text-gray-600 hover:text-sea-blue disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                        title="Primer página"
                      >
                        <ChevronFirst className="h-4 w-4" />
                      </button>
                      <button
                        title="Anterior"
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
                        disabled={currentPage === 1}
                        className="p-1.5 rounded-lg bg-linear-to-b hover:from-gray-100 hover:to-gray-50 text-gray-600 hover:text-sea-blue disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>

                      <div className="flex gap-1 items-center">
                        {getPageNumbers()[0] > 1 && (
                          <span className="text-slate-400 px-1">...</span>
                        )}
                        {getPageNumbers().map((page) => (
                          <button
                            title={`Pág. ${page}`}
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-2 py-1 rounded-lg text-xs border cursor-pointer border-gray-100 shadow-md font-semibold transition-all ${currentPage === page ? "text-white bg-linear-to-b from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80" : "hover:bg-gray-100"}`}
                          >
                            {page}
                          </button>
                        ))}
                        {getPageNumbers()[getPageNumbers().length - 1] <
                          totalPages && (
                          <span className="text-slate-400 px-1">...</span>
                        )}
                      </div>

                      <button
                        title="Siguiente"
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages)) }
                        disabled={currentPage === totalPages}
                        className="p-1.5 rounded-lg bg-linear-to-b hover:from-gray-100 hover:to-gray-50 hover:text-sea-blue text-gray-600 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="p-1.5 rounded-lg bg-linear-to-b hover:from-gray-100 hover:to-gray-50 hover:text-sea-blue text-gray-600 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                        title="Última página"
                      >
                        <ChevronLast className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <aside
        className={`fixed top-[64px] right-0 h-[calc(100vh-64px)] bg-white border-l border-gray-200 transition-all shadow-lg duration-300 ease-in-out z-40 ${ isModalOpen ? "" : "translate-x-full" }`}
        style={{ width: isModalOpen ? 420 : 0}}
      >
        <div className="flex h-full w-full">
          <div className="flex flex-col border-r border-gray-100 h-full shrink-0" style={{ width: 420 }}>
            <div className="px-3 py-4 shrink-0 bg-linear-to-r from-white to-gray-100">
              <div className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <button 
                    title="Regresar"
                    className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-sea-blue bg-linear-to-b hover:from-sea-blue/10 hover:to-gray-50 rounded-xl transition-all cursor-pointer"
                    onClick={() => setIsModalOpen(false)}
                  >
                    <i className={`mdi mdi-chevron-right text-2xl`}></i>
                  </button>
                  <div>
                    <p className="text-[14px] font-bold text-sea-blue truncate max-w-[320px]">
                      {/* <i className={`mdi mdi-${editingId ? "account-edit" : "account-multiple-plus"} mr-2`}></i> */}
                      {editingId ? "Editar Paciente" : "Nuevo Paciente"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {editingType === "internal" ? "Paciente interno / empleado" : "Registro de paciente externo"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <form 
              id="pacienteForm"
              onSubmit={handleSubmit}
              className="flex-1 overflow-y-auto px-3 py-4 flex flex-col"
            >
              <div className="flex-1 overflow-y-auto p-2 space-y-3">
                {editingType === "internal" ? (
                  <div>
                    <h3 className="text-xs font-bold text-gray-800 mb-2 flex items-center">
                      <i className="mdi mdi-help-circle mr-2"></i>
                      Datos del Empleado
                    </h3>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Matrícula
                      </label>
                      <input
                        type="text"
                        value={formData.matricula}
                        disabled
                        readOnly
                        className="w-full border border-gray-100 shadow-md bg-gray-50 text-gray-400 rounded-lg px-3 py-2 text-xs cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mt-3 mb-1">
                        Nombre(s)
                      </label>
                      <input
                        type="text"
                        value={formData.nombre}
                        disabled
                        readOnly
                        className="w-full border border-gray-100 shadow-md bg-gray-50 text-gray-400 rounded-lg px-3 py-2 text-xs cursor-not-allowed"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="text-xs font-bold text-gray-800 mb-2 flex items-center">
                      <i className="mdi mdi-factory mr-2"></i>
                      Datos del Proveedor
                    </h3>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Compañía
                      </label>
                      <input
                        type="text"
                        value={formData.proveedorTexto}
                        onChange={(e) => { setFormData({ ...formData, proveedorTexto: e.target.value, proveedor: "", }); setShowProveedores(true); }}
                        onBlur={() => setTimeout(() => setShowProveedores(false), 150)}
                        onFocus={() => setShowProveedores(true)}
                        placeholder="Seleccionar"
                        className={`w-full border rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-sea-blue outline-none border-gray-100 shadow-md`}
                      />
                      {showProveedores && (
                        <ul className="absolute z-10 w-full bg-white border border-gray-100 rounded-lg mt-1 max-h-40 overflow-y-auto shadow">
                          {proveedor
                            .filter((prov) =>
                              prov.Razon.toLowerCase().includes((formData.proveedorTexto ?? "").toLowerCase())
                            )
                            .map((prov) => (
                              <li
                                key={prov.Id_Compania}
                                onMouseDown={() => {
                                  setFormData({ ...formData, proveedor: prov.Id_Compania, proveedorTexto: prov.Razon.toUpperCase() });
                                  setShowProveedores(false);
                                }}
                                className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100"
                              >
                                {prov.Razon.toUpperCase()}
                              </li>
                            ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Nombre(s)
                      </label>
                      <input
                        type="text"
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        placeholder="Nombre"
                        className="w-full border border-gray-100 shadow-md rounded-lg px-3 py-2 text-xs focus:border-clinical-blue focus:ring-1 focus:ring-clinical-blue outline-none"
                      />
                    </div>
                  </>
                )}
                <h3 className="text-xs font-bold text-gray-800 mt-6 mb-2 flex items-center">
                  <i className="mdi mdi-information-slab-circle mr-2"></i>
                  Información General
                </h3>
                <div className="grid grid-cols-11 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      CURP / Pasaporte
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.curp}
                        maxLength={20}
                        onChange={(e) => { setFormData({ ...formData, curp: e.target.value }); setCurpDuplicado(false); }}
                        onBlur={(e) => verificarCURP(e.target.value, editingId)}
                        placeholder="CURP / Pasaporte"
                        className={`w-full border rounded-lg px-3 py-2 text-xs outline-none shadow-md ${curpDuplicado ? "border-red-100 focus:ring-red-400 bg-red-50 text-red-500" : "border-gray-100 focus:border-clinical-blue focus:ring-1 focus:ring-clinical-blue"}`}
                      />
                      {checkingCurp && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                          <i className="mdi mdi-loading mdi-spin text-gray-400 text-sm"></i>
                        </div>
                      )}
                      {!checkingCurp && curpDuplicado && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 group/curp">
                          <i className="mdi mdi-alert-circle text-red-400 text-sm cursor-pointer"></i>
                          <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover/curp:block z-50 w-40">
                            <div className="bg-red-500 text-white text-[10px] rounded-md px-2 py-1.5 shadow-lg leading-tight">
                              Este CURP / Pasaporte ya se encuentra registrado.
                              <div className="absolute right-2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-red-600"></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    {/* {curpDuplicado && (
                      <p className="text-xs text-red-500 mt-1">CURP / Pasaporte ya registrado.</p>
                    )} */}
                    {/*<p className="text-xs text-gray-400 mt-1">
                      18 caracteres
                    </p>*/}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      No. IMSS
                    </label>
                    <input
                      type="text"
                      value={formData.nss}
                      maxLength={11}
                      onChange={(e) => setFormData({ ...formData, nss: e.target.value, }) }
                      placeholder="No. IMSS"
                      className="w-full border border-gray-100 shadow-md rounded-lg px-3 py-2 text-xs outline-none focus:border-clinical-blue focus:ring-1 focus:ring-clinical-blue"
                    />
                    {/* <p className="text-xs text-gray-400 mt-1">
                      11 caracteres
                    </p> */}
                  </div>
                </div>
                <div className="grid grid-cols-11 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Sexo
                    </label>
                    <select
                      className="w-full border border-gray-100 shadow-md rounded-lg p-2 text-xs focus:ring-1 focus:ring-sea-blue outline-none"
                      value={formData.sexo}
                      onChange={(e) => setFormData({ ...formData, sexo: e.target.value as "M" | "F", })}
                    >
                      <option value="" disabled hidden>Seleccionar</option>
                      <option value="M">Masculino</option>
                      <option value="F">Femenino</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Fecha nacimiento
                    </label>
                    <input
                      type="date"
                      max={new Date().toISOString().split("T")[0]}
                      className="w-full border border-gray-100 shadow-md rounded-lg p-2 text-xs focus:ring-1 focus:ring-sea-blue outline-none"
                      value={formData.fechaNacimiento}
                      onChange={(e) => setFormData({ ...formData, fechaNacimiento: e.target.value, }) }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Riesgo inicial
                    </label>
                    <select
                      className="w-full border border-gray-100 shadow-md rounded-lg p-2 text-xs focus:ring-1 focus:ring-sea-blue outline-none"
                      value={formData.riesgo}
                      onChange={(e) => setFormData({ ...formData, riesgo: e.target.value as NivelRiesgo, }) }
                    >
                      <option value="Bajo">Bajo Riesgo</option>
                      <option value="Medio">Riesgo Medio</option>
                      <option value="Alto">Alto Riesgo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Tipo sanguíneo
                    </label>
                    <select
                      className="w-full border border-gray-100 shadow-md rounded-lg p-2 text-xs focus:ring-1 focus:ring-sea-blue outline-none"
                      value={formData.tipoSanguineo}
                      onChange={(e) => setFormData({ ...formData, tipoSanguineo: e.target.value as TipoSanguineo | "", }) }
                    >
                      <option value="" disabled hidden>Seleccionar</option>
                      {(["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-",] as TipoSanguineo[])
                      .map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <h3 className="text-xs font-bold text-gray-800 mt-6 mb-2 flex items-center">
                  <i className="mdi mdi-heart-pulse mr-2"></i>
                  Antecedentes Médicos
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Alergias general
                    </label>
                    <textarea
                      rows={1}
                      value={formData.alergias}
                      onChange={(e) => setFormData({ ...formData, alergias: e.target.value, }) }
                      placeholder="Alergias general"
                      className="w-full p-2 border border-gray-100 shadow-md rounded-lg text-xs focus:ring-1 outline-none transition-colors resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Alergias fármacos
                    </label>
                    <textarea
                      rows={1}
                      value={formData.alergiasMedicamentos}
                      onChange={(e) => setFormData({ ...formData, alergiasMedicamentos: e.target.value, }) }
                      placeholder="Alergias fármacos"
                      className="w-full p-2 border border-gray-100 shadow-md rounded-lg text-xs focus:ring-1 outline-none transition-colors resize-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Enfermedades
                    </label>
                    <textarea
                      rows={1}
                      value={formData.enfermedadesCronicas}
                      onChange={(e) => setFormData({ ...formData, enfermedadesCronicas: e.target.value, }) }
                      placeholder="Enfermedades"
                      className="w-full p-2 border border-gray-100 shadow-md rounded-lg text-xs focus:ring-1 outline-none transition-colors resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Tratamientos
                    </label>
                    <textarea
                      rows={1}
                      value={formData.tratamientosActuales}
                      onChange={(e) => setFormData({ ...formData, tratamientosActuales: e.target.value, }) }
                      placeholder="Tratamientos"
                      className="w-full p-2 border border-gray-100 shadow-md rounded-lg text-xs focus:ring-1 outline-none transition-colors resize-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Operaciones
                    </label>
                    <textarea
                      rows={1}
                      value={formData.cirugias}
                      onChange={(e) => setFormData({ ...formData, cirugias: e.target.value, }) }
                      placeholder="Operaciones"
                      className="w-full p-2 border border-gray-100 shadow-md rounded-lg text-xs focus:ring-1 outline-none transition-colors resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Fracturas
                    </label>
                    <textarea
                      rows={1}
                      value={formData.fracturas}
                      onChange={(e) => setFormData({ ...formData, fracturas: e.target.value, }) }
                      placeholder="Fracturas"
                      className="w-full p-2 border border-gray-100 shadow-md rounded-lg text-xs focus:ring-1 outline-none transition-colors resize-none"
                    />
                  </div>
                </div>
              </div>
            </form>
            <div className={`px-5 py-4 shrink-0 flex justify-between items-center`}>
              <button
                // onClick={() => handleSubmit()}
                form="pacienteForm"
                className="w-full flex items-center justify-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 rounded-lg text-xs font-semibold shadow-md shadow-blue-500/30 transition-all cursor-pointer whitespace-nowrap"
              >
                <i className="mdi mdi-account-check mr-2"></i>
                Guardar Paciente
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default Pacientes;