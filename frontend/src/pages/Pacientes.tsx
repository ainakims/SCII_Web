import API_BASE_URL from "../config";
import { fetchWithAuth } from "../services/api";
import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  Upload,
  UserCog,
  ShieldAlert,
} from "lucide-react";
import Swal from "sweetalert2";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthToken";
import PacientesTabla, { PacienteResumen } from "../features/saludPoblacional/components/PacientesTabla";

const PacientesTablaSkeleton: React.FC = () => (
  <div className="h-full rounded-lg bg-gray-50 overflow-hidden animate-pulse">
    <div className="h-10 bg-linear-to-r from-white to-gray-100"></div>
    {Array.from({ length: 9 }).map((_, i) => (
      <div key={i} className="flex items-center gap-5 px-5 py-3 border-b border-gray-100 last:border-0">
        <div className="h-3 w-14 rounded bg-gray-200"></div>
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-40 rounded bg-gray-200"></div>
          <div className="h-2.5 w-24 rounded bg-gray-100"></div>
        </div>
        <div className="h-3 w-28 rounded bg-gray-200"></div>
        <div className="h-3 w-24 rounded bg-gray-200"></div>
        <div className="h-3 w-16 rounded bg-gray-200"></div>
      </div>
    ))}
  </div>
);

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

  const [loadingPacientes, setLoadingPacientes] = useState<boolean>(false);
  const [curpDuplicado, setCurpDuplicado] = useState<boolean>(false);
  const [checkingCurp, setCheckingCurp] = useState<boolean>(false);

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
  }, []);

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
        body: JSON.stringify({ esActivo: "1" }),
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
                Pacientes
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Directorio médico y expedientes clínicos.
              </p>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="w-35 flex items-center justify-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-lg shadow-blue-500/30 transition-all cursor-pointer"
            >
              <i className="fa-solid fa-user-plus text-xs mr-2"></i>
              Agregar
            </button>
          </div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl shadow-xs overflow-hidden p-6 mb-1 flex flex-col flex-1 min-h-0"
          >
            <h2 className="text-sm font-bold text-gray-800 flex items-center mb-4 shrink-0">
              <i className="fa-solid fa-user-group text-sea-blue mr-3"></i>
              Pacientes
            </h2>
            <div className="flex-1 min-h-0">
              {loadingPacientes ? (
                <PacientesTablaSkeleton />
              ) : (
                <PacientesTabla
                  activo={true}
                  pacientes={pacientes as PacienteResumen[]}
                  fillHeight
                  basePath="/Pacientes"
                  showFecha={false}
                  onEdit={(p) => handleOpenModal(p as unknown as Paciente)}
                  onDelete={(p) => handleDelete(p.IdPaciente)}
                  onVerDocumentos={(p) => navigate("/Documentos", { state: { matricula: String(p.Empl_matricula ?? "") } })}
                />
              )}
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