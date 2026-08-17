import API_BASE_URL from "../../../config";
import { fetchWithAuth } from "../../../services/api";
import React, { useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";

// Modal de alta/edición de paciente, extraído de Pacientes.tsx para poder
// reutilizarlo desde otras tablas que envían el mismo tipo de registro (ej.
// Reingresos.tsx): basta con pasarle la matrícula/paciente por props, el
// modal ya sabe distinguir alta vs edición y arma el payload igual que en
// Pacientes.tsx.
export interface Paciente {
  IdPaciente?: number;
  Empl_matricula: string;
  Empl_Nombres: string;
  Categoria_desc?: string;
  Especialidad?: string;
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

interface PacienteRegistroModalProps {
  open: boolean;
  paciente: Paciente | null;
  onClose: () => void;
  onSaved: () => void;
}

const PacienteRegistroModal: React.FC<PacienteRegistroModalProps> = ({ open, paciente, onClose, onSaved }) => {
  const [proveedor, setProveedor] = useState<Proveedor[]>([]);
  const proveedorRef = useRef<Proveedor[]>([]);
  const [showProveedores, setShowProveedores] = useState<boolean>(false);

  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [editingType, setEditingType] = useState<"internal" | "external" | null>(null);
  const originalCurpRef = useRef<string>("");

  const [curpDuplicado, setCurpDuplicado] = useState<boolean>(false);
  const [checkingCurp, setCheckingCurp] = useState<boolean>(false);

  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM);

  // Evita que la consulta se dispare más de una vez (React.StrictMode en
  // desarrollo monta/desmonta/vuelve a montar los efectos a propósito).
  const proveedorSolicitadoRef = useRef(false);
  useEffect(() => {
    if (proveedorSolicitadoRef.current) return;
    proveedorSolicitadoRef.current = true;
    ObtenerProveedor();
  }, []);

  useEffect(() => {
    proveedorRef.current = proveedor;
  }, [proveedor]);

  useEffect(() => {
    if (formData.fechaNacimiento) {
      const calculada = calcularEdad(formData.fechaNacimiento);
      setFormData((prev) => ({ ...prev, edad: calculada }));
    }
  }, [formData.fechaNacimiento]);

  // Puebla el formulario cada vez que se abre el modal (alta o edición),
  // igual que hacía handleOpenModal en Pacientes.tsx. proveedorRef en vez de
  // proveedor directo a propósito: si el catálogo de proveedores llega
  // después de abrir el modal, no queremos re-disparar este efecto y pisar
  // lo que el usuario ya haya escrito.
  useEffect(() => {
    if (!open) return;
    if (paciente) {
      const prov = proveedorRef.current.find(
        (p) => Number(p.Id_Compania) === Number(paciente.Id_Compania),
      ) ?? proveedorRef.current.find(
        (p) => p.Razon.toUpperCase() === (paciente.Compania ?? "").toUpperCase(),
      );

      setFormData({
        ...DEFAULT_FORM,
        // Igual que Riesgo/TipoSanguineo: el SOAP devuelve objetos para campos vacíos (truthy), por eso ?? no aplica
        curp: (typeof paciente.CURP === "string" ? paciente.CURP : "").trim(),
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
      originalCurpRef.current = (typeof paciente.CURP === "string" ? paciente.CURP : "").trim().toUpperCase();
      setEditingType(paciente.Empl_matricula && paciente.Empl_matricula !== "0" ? "internal" : "external");
    } else {
      setFormData(DEFAULT_FORM);
      setEditingId(null);
      setEditingType(null);
      setCurpDuplicado(false);
      originalCurpRef.current = "";
    }
  }, [open, paciente]);

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

      const res = await fetchWithAuth(url, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const wasEditing = editingId != null;
        onClose();
        onSaved();
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="min-w-0">
            <p className="text-sm font-bold text-sea-blue truncate">
              {editingId ? "Editar Paciente" : "Nuevo Paciente"}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {editingType === "internal" ? "Paciente interno / empleado" : "Registro de paciente externo"}
            </p>
          </div>
          <button
            title="Cerrar"
            className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-sea-blue hover:bg-gray-100 rounded-lg transition-all cursor-pointer shrink-0"
            onClick={onClose}
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
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
                  <i className="fa-solid fa-circle-question mr-2"></i>
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
                    className="w-full border border-gray-50 shadow-xs bg-gray-50 text-gray-400 rounded-lg px-3 py-2 text-xs cursor-not-allowed"
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
                    className="w-full border border-gray-50 shadow-xs bg-gray-50 text-gray-400 rounded-lg px-3 py-2 text-xs cursor-not-allowed"
                  />
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-xs font-bold text-gray-800 mb-2 flex items-center">
                  <i className="fa-solid fa-industry mr-2"></i>
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
                    className={`w-full border rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-sea-blue outline-none border-gray-50 shadow-xs`}
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
                    className="w-full border border-gray-50 shadow-xs rounded-lg px-3 py-2 text-xs focus:border-clinical-blue focus:ring-1 focus:ring-clinical-blue outline-none"
                  />
                </div>
              </>
            )}
            <h3 className="text-xs font-bold text-gray-800 mt-6 mb-2 flex items-center">
              <i className="fa-solid fa-circle-info mr-2"></i>
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
                    className={`w-full border rounded-lg px-3 py-2 text-xs outline-none shadow-xs ${curpDuplicado ? "border-red-100 focus:ring-red-400 bg-red-50 text-red-500" : "border-gray-50 focus:border-clinical-blue focus:ring-1 focus:ring-clinical-blue"}`}
                  />
                  {checkingCurp && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <i className="fa-solid fa-spinner fa-spin text-gray-400 text-sm"></i>
                    </div>
                  )}
                  {!checkingCurp && curpDuplicado && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 group/curp">
                      <i className="fa-solid fa-circle-exclamation text-red-400 text-sm cursor-pointer"></i>
                      <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover/curp:block z-50 w-40">
                        <div className="bg-red-500 text-white text-[10px] rounded-md px-2 py-1.5 shadow-lg leading-tight">
                          Este CURP / Pasaporte ya se encuentra registrado.
                          <div className="absolute right-2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-red-600"></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
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
                  className="w-full border border-gray-50 shadow-xs rounded-lg px-3 py-2 text-xs outline-none focus:border-clinical-blue focus:ring-1 focus:ring-clinical-blue"
                />
              </div>
            </div>
            <div className="grid grid-cols-11 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Sexo
                </label>
                <select
                  className="w-full border border-gray-50 shadow-xs rounded-lg p-2 text-xs focus:ring-1 focus:ring-sea-blue outline-none"
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
                  className="w-full border border-gray-50 shadow-xs rounded-lg p-2 text-xs focus:ring-1 focus:ring-sea-blue outline-none"
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
                  className="w-full border border-gray-50 shadow-xs rounded-lg p-2 text-xs focus:ring-1 focus:ring-sea-blue outline-none"
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
                  className="w-full border border-gray-50 shadow-xs rounded-lg p-2 text-xs focus:ring-1 focus:ring-sea-blue outline-none"
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
              <i className="fa-solid fa-heart-pulse mr-2"></i>
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
                  className="w-full p-2 border border-gray-50 shadow-xs rounded-lg text-xs focus:ring-1 outline-none transition-colors resize-none"
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
                  className="w-full p-2 border border-gray-50 shadow-xs rounded-lg text-xs focus:ring-1 outline-none transition-colors resize-none"
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
                  className="w-full p-2 border border-gray-50 shadow-xs rounded-lg text-xs focus:ring-1 outline-none transition-colors resize-none"
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
                  className="w-full p-2 border border-gray-50 shadow-xs rounded-lg text-xs focus:ring-1 outline-none transition-colors resize-none"
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
                  className="w-full p-2 border border-gray-50 shadow-xs rounded-lg text-xs focus:ring-1 outline-none transition-colors resize-none"
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
                  className="w-full p-2 border border-gray-50 shadow-xs rounded-lg text-xs focus:ring-1 outline-none transition-colors resize-none"
                />
              </div>
            </div>
          </div>
        </form>
        <div className="px-5 py-4 border-t border-gray-100 shrink-0 flex justify-end">
          <button
            form="pacienteForm"
            className="w-full flex items-center justify-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 rounded-lg text-xs font-semibold shadow-md shadow-blue-500/30 transition-all cursor-pointer whitespace-nowrap"
          >
            <i className="fa-solid fa-user-check mr-2"></i>
            Guardar Paciente
          </button>
        </div>
      </div>
    </div>
  );
};

export default PacienteRegistroModal;
