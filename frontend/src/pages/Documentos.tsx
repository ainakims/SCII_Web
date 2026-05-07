import React, { useState, useEffect, useCallback, useRef } from "react";
import API_BASE_URL from "../config";
import { fetchWithAuth } from "../services/api";
import { useLocation } from "react-router-dom";
import {
  Search,
  FileText,
  Upload,
  Trash2,
  Download,
  AlertCircle,
  CheckCircle2,
  FileUp,
  Folder,
  User,
  Trash,
  TextSelect,
} from "lucide-react";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthToken";

interface Patient {
  Matricula: string;
  Nombres: string;
  Apellidos: string;
  FechaNacimiento: string;
  CURP: string;
  NSS: string;
  Sexo: string;
  TipoSanguineo?: string;
}

interface Document {
  IdDoc: number;
  Nombre: string;
  Categoria: number;
  Tamano: number;
  FechaCarga: string;
  Direccion: string;
  FileBytes: { data: number[] } | number[] | null;
}

interface LocationState {
  matricula?: string;
}

// const formatDate = (d: string | number | Date) => {
//   if (!d) return "-";
//   return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
// };

const formatDate = (d: string | number | Date) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const VisorPDFInline = ({ pdfId, pdfName, pdfDate, pdfUrl, onClose, onDelete }: { pdfId: number; pdfName: string; pdfDate: string; pdfUrl: string; onClose: () => void, onDelete: (id: number) => void; }) => {
  const { user } = useAuth() as { user: { rol?: string; matricula?: string } };
  
  const esPrivilegiado = ["admin", "médico", "medico"].includes(
    (user?.rol ?? "").toLowerCase().trim()
  );

  if (!pdfUrl) return null;

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-100 animate-in slide-in-from-right duration-200">
      <div className="py-4 px-5 border-b border-gray-100 flex justify-between items-center shrink-0">
        <div className="flex items-center justify-between gap-3 overflow-hidden w-full">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
              <i className="mdi mdi-calendar-blank mr-1"></i>
              {formatDate(pdfDate)}
            </p>
            <p className="text-xs font-bold text-gray-800 truncate uppercase">
              {pdfName}
            </p>
          </div>
          {esPrivilegiado &&
            <button 
              title="Eliminar"
              // onClick={onClose} 
              onClick={(e) => { e.stopPropagation(); onDelete(pdfId); }}
              className="w-10 h-10 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl flex items-center justify-center transition-all group cursor-pointer"
            >
              <i className="mdi mdi-trash-can-outline"></i>
            </button>
          }
        </div>
      </div>
      <div className="flex-1 bg-slate-100">
        <iframe
          src={`${pdfUrl}#zoom=65`}
          className="w-full h-full border-none"
        />
      </div>
    </div>
  );
};

const Documentos: React.FC = () => {
  const { user } = useAuth() as { user: { id: number; rol?: string; matricula?: string } };

  const esPrivilegiado = ["admin", "médico", "medico"].includes(
    (user?.rol ?? "").toLowerCase().trim()
  );

  const location = useLocation();
  const state = location.state as LocationState | null;
  const [matricula, setMatricula] = useState<string>(
    !esPrivilegiado ? (user?.matricula ?? "") : ""
  );
  const [patient, setPatient] = useState<Patient | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  // const [error, setError] = useState<string | null>(null);
  // const [message, setMessage] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [selectDoc, setSelectDoc] = useState<number | 0>(0);
  const [selectError, setSelectError] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState(false);

  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [selectedPdf, setSelectedPdf] = useState<{ id: number; nombre: string; date: string; url: string } | null>(null);
  const [isPdfOpen, setIsPdfOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    { id: 1, label: "Consentimientos",      icon: "mdi-file-sign" },
    { id: 2, label: "Evaluaciones médicas", icon: "mdi-file-document-outline" },
    { id: 3, label: "Exámenes clínicos",    icon: "mdi-stethoscope" },
    { id: 4, label: "Laboratorio",          icon: "mdi-flask-outline" },
    { id: 5, label: "RX / Imagenología",    icon: "mdi-radiology-box" },
    { id: 6, label: "Audiometría",          icon: "mdi-ear-hearing" },
    { id: 7, label: "Electrocardiograma",   icon: "mdi-pulse" },
    { id: 8, label: "Espirometria",         icon: "mdi-lungs" },
    { id: 9, label: "Recetas externas",     icon: "mdi-prescription" },
    { id: 10, label: "Otros",               icon: "mdi-file-question" },
  ];

  const getCategoriaLabel = (id: number) => categories.find(c => c.id === id)?.label || "Sin categoría";
  const getCategoriaIcon  = (id: number) => categories.find(c => c.id === id)?.icon  || "mdi-folder-outline";

  const fetchDocuments = useCallback(async (mat: string): Promise<void> => {
    try {
      const cons = await fetchWithAuth(`${API_BASE_URL}/Documentos/ObtenerArchivos`, {
        method: "POST",
        body: JSON.stringify({ matricula: mat })
      });

      const res = await cons.json();

      if (res && res.data && res.data.length > 0) {
        const mapped = res.data.map((d: any) => ({
          IdDoc: d.IdDocumento,
          Nombre: d.NombrePDF,
          Categoria: Number(d.TipoDoc),
          Tamano: 0,
          FechaCarga: d.FechaCarga,
          Direccion: d.Direccion,
          FileBytes: null,
        }));
        setDocuments(mapped);

        // Obtener tamaños en background con HEAD requests
        mapped.forEach(async (doc: any) => {
          try {
            const headRes = await fetch(`${API_BASE_URL}/uploads/${mat}/${doc.Nombre}`, { method: "HEAD" });
            const size = parseInt(headRes.headers.get("content-length") ?? "0", 10);
            if (size > 0) {
              setDocuments(prev => prev.map(d => d.IdDoc === doc.IdDoc ? { ...d, Tamano: size } : d));
            }
          } catch { /* ignorar si falla */ }
        });
      } else {
        setDocuments([]);
      }
    } catch (err) {
      console.error("Error fetching documents:", err);
    }
  }, []);

  const handleSearch = useCallback(
    async (forcedMatricula: string | null = null): Promise<void> => {
      const queryMatricula = forcedMatricula || matricula;
      if (!queryMatricula.trim()) return;

      setLoading(true);
      // setError(null);
      setPatient(null);
      setDocuments([]);
      setActiveCategory(null);
      setSelectedPdf(null);
      setIsPdfOpen(false);

      try {
        await new Promise(r => setTimeout(r, 2000));
        
        const cons = await fetchWithAuth(`${API_BASE_URL}/Documentos/ObtenerPaciente`, {
          method: "POST",
          body: JSON.stringify({ matricula: queryMatricula })
        });

        const res = await cons.json();

        if (res && res.data.length > 0) {
          setNotFound(false);
          setPatient(res.data[0]);
          fetchDocuments(res.data[0].Matricula);
        } else {
          setNotFound(true);
          setPatient(null);
        }
      } catch (err) {
        setNotFound(true);
        setPatient(null);
      } finally {
        setLoading(false);
      }
    },
    [matricula, fetchDocuments],
  );

  useEffect(() => {
    if (state?.matricula) {
      const incomingMatricula = state.matricula;
      setMatricula(incomingMatricula);
      handleSearch(incomingMatricula);
      window.history.replaceState({}, document.title);
    } else if (!esPrivilegiado && user?.matricula) {
      handleSearch(user.matricula);
    }
  }, [location.state, handleSearch]);

  useEffect(() => {
    if (!esPrivilegiado) return;
    if (!matricula.trim()) {
      setPatient(null);
      setDocuments([]);
      setNotFound(false);
      setLoading(false);
      return;
    }
    const delay = setTimeout(() => {
      handleSearch();
    }, 1000);
    return () => clearTimeout(delay);
  }, [matricula]);

  const handleFileUpload = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    // if (!file || !patient) return;
    if (!patient) return;
    
    let hasError = false;

    if (selectDoc === 0) {
      setSelectError(true);
      hasError = true;
    }

    if (!file) {
      setFileError(true);
      hasError = true;
    }

    if (hasError) return;

    setSelectError(false);
    setUploading(true);
    // setError(null);
    // setMessage(null);

    const formData = new FormData();
    formData.append("matricula", patient.Matricula);
    formData.append("categoria", String(selectDoc));
    formData.append("document", file ?? "");

    try {
      await new Promise(r => setTimeout(r, 2000));

      const cons = await fetchWithAuth(`${API_BASE_URL}/Documentos/SubirDocumentos`, {
        method: "POST",
        body: formData
      });

      const res = await cons.json();

      if (res && res.ok === true) {
        exitoModal("Documento guardado", "El documento se ha registrado de forma correcta en el expediente.");
        fetchDocuments(patient!.Matricula);
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setIsPdfOpen(false);
      } else {
        errorModal("No se pudo guardar", "Ocurrió un error al intentar almacenar el documento en el expediente.");
      }
    } catch (err) {
      // setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number): Promise<void> => {
    const result = await confirmModal("¿Eliminar documento?", "Si confirma esta acción se <b>eliminará el documento</b> de forma permanente.");

    if (!result.isConfirmed) {
      return;
    }
    else {
      try {
        const cons = await fetchWithAuth(`${API_BASE_URL}/Documentos/BorraDocumentos`, {
          method: "POST",
          body: JSON.stringify({
            idDocumento: id,
            idModifica: user?.id
          })
        });

        const res = await cons.json();

        if (res && res.ok === true) {
          exitoModal("Documento eliminado", "El documento se ha eliminado del expediente del paciente.");
          handleClosePdf();
          setActiveCategory(null);
          fetchDocuments(String(patient!.Matricula));
        }
        else {
          errorModal("No se pudo eliminar", "Ocurrió un error al intentar eliminar el documento del expediente.");
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
        confirmButton: "flex items-center bg-sea-blue hover:bg-sea-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer"
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
        confirmButton: "flex items-center bg-sea-blue hover:bg-sea-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer"
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
      // showCloseButton: true,
      confirmButtonText: `<i class="mdi mdi-check-bold mr-1"></i> OK`,
      customClass: {
        confirmButton: "flex items-center bg-sea-blue hover:bg-sea-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer"
      },
    })
  };

  const docsForCategory = (catId: number) => documents.filter(d => d.Categoria === catId);

  const handleOpenCategory = (catId: number) => {
    const docs = docsForCategory(catId);

    if (docs.length === 0) return;
    
    if (activeCategory === catId) {
      setActiveCategory(null);
      handleClosePdf();
      return;
    }

    setActiveCategory(catId);
    setSelectedPdf(null);
    setIsPdfOpen(false);
  };

  const handleOpenPdf = async (doc: Document) => {
    try {
      const response = await fetch(`${API_BASE_URL}/uploads/${patient!.Matricula}/${doc.Nombre}`);
      if (!response.ok) throw new Error("Archivo no encontrado");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      // actualizar tamaño real del archivo
      setDocuments(prev => prev.map(d => d.IdDoc === doc.IdDoc ? { ...d, Tamano: blob.size } : d));
      setSelectedPdf({ id: doc.IdDoc, nombre: doc.Nombre, date: doc.FechaCarga, url });
      setIsPdfOpen(true);
    } catch (err) {
      console.error("Error al abrir PDF:", err);
    }
  };

  const handleClosePdf = () => {
    if (selectedPdf?.url?.startsWith("blob:")) URL.revokeObjectURL(selectedPdf.url);
    setIsPdfOpen(false);
    setSelectedPdf(null);
  };

  const handleCloseAside = () => {
    if (isPdfOpen) {
      setSelectedPdf(null);
      handleClosePdf();
    }
    else {
      setActiveCategory(null);
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const isAsideOpen = activeCategory !== null;

  return (
    <div className="relative flex w-full overflow-hidden">
      <div
        className={`flex-1 mt-14 transition-all duration-300 ease-in-out`}
        // style={{ marginRight: isAsideOpen ? 300 : 0 }}
      >
        <div className="max-w-7xl mx-auto px-4 space-y-6 pb-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm gap-4">
            <div>
              <h1 className="text-2xl font-bold text-sea-blue flex items-center">
                Gestión de Documentos
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Almacenamiento y organización de expedientes.
              </p>
            </div>

            <form
              // onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
              className="mt-0 flex flex-col sm:flex-row gap-4"
            >
              <div className="relative -translate-y-[-2px]">
                <Search className={`h-3.5 w-3.5 absolute left-3 top-2.5 transition-colors ${notFound ? "text-red-500" : "text-gray-400"}`} />
                <input
                  type="text"
                  value={matricula}
                  onChange={(e) => { if (!esPrivilegiado) return; setMatricula(e.target.value); setNotFound(false); }}
                  placeholder="Matrícula (5 dígitos)"
                  maxLength={5}
                  disabled={loading}
                  readOnly={!esPrivilegiado}
                  className={`w-[318px] border rounded-lg pl-9 px-3 py-2 text-xs outline-none transition-colors ${notFound  ? "border-red-200 bg-red-50 text-red-500" : !esPrivilegiado ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed" : loading ? "border-gray-300 bg-gray-100 cursor-not-allowed" : "border-gray-300 focus:border-clinical-blue focus:ring-1" }`}
                />
                {loading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <i className="mdi mdi-loading mdi-spin text-gray-400 text-lg"></i>
                  </div>
                )}
                {notFound && (
                  <p className="absolute text-xs mt-1 text-red-500">
                    No se encontró ningún paciente con esa matrícula.
                  </p>
                )}
              </div>
              {esPrivilegiado &&
                <button
                  type="submit"
                  // disabled={loading || !esPrivilegiado}
                  disabled
                  className="w-35 flex items-center justify-center bg-sea-blue hover:bg-sea-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none disabled:shadow-none disabled:translate-y-0"
                  // ${esPrivilegiado
                  //   ? "bg-sea-blue hover:bg-sea-blue/80 hover:-translate-y-1 shadow-blue-500/30 cursor-pointer"
                  //   : "bg-gray-300 shadow-gray-300/30 cursor-not-allowed"
                  // }
                >
                  {/* <i className={`mdi ${loading ? "mdi-loading mdi-spin" : "mdi-magnify"} mr-2`}></i> */}
                  <i className={`mdi mdi-magnify mr-2`}></i>
                  Buscar
                </button>
              }
            </form>
          </div>
           
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className={`lg:col-span-1 space-y-6`}>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`bg-white rounded-xl border h-auto border-gray-200 shadow-sm p-6`}
              >
                <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center">
                  <i className="mdi mdi-account-box mr-4"></i>
                  Información del Paciente
                </h2>
                {patient ? (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Paciente
                      </label>
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-gray-50 text-gray-400 font-small outline-none">
                        {patient.Nombres} {patient.Apellidos}
                      </div>
                    </div>
                    <div className="grid grid-cols-11 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1 mt-1.5">
                          CURP
                        </label>
                        <div className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-gray-50 text-gray-400 font-small outline-none">
                          {patient.CURP || "N-A"}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1 mt-1.5">
                          No. IMSS
                        </label>
                        <div className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-gray-50 text-gray-400 font-small outline-none">
                          {patient.NSS || "N-A"}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-11 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1 mt-1.5">
                          Género
                        </label>
                        <div className="flex justify-between w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-gray-50 text-gray-400 font-semibold outline-none">
                          <i className={`mdi mdi-${patient.Sexo === "M" ? "gender-male" : "gender-female"} mr-1`}></i>
                          {patient.Sexo || "-"}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1 mt-1">
                          Tipo sanguíneo
                        </label>
                        <div className="flex justify-between w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-gray-50 text-red-600 font-semibold outline-none">
                          <i className="mdi mdi-water mr-1 text-red-600"></i>
                          {patient.TipoSanguineo ?? "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex flex-col items-center justify-center py-14 text-gray-500 mt-7.5">
                      <TextSelect className="h-8 w-8 mb-4 opacity-40" />
                      <p className="text-xs">
                        Ingrese una matrícula para mostrar datos del paciente.
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>

              {esPrivilegiado &&
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
                >
                  <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center">
                    <i className="mdi mdi-cloud-upload mr-4"></i>
                    Subir Documento
                  </h2>
                  <form onSubmit={handleFileUpload} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Clasificación
                      </label>
                      <select
                        className={`w-full border rounded-lg p-2 text-xs outline-none transition-colors ${selectError ? "border-red-200 bg-red-50 text-red-500" : "border-gray-300 focus:border-clinical-blue focus:ring-1" } ${!patient ? "bg-gray-50" : ""}`}
                        value={selectDoc}
                        disabled={!patient}
                        onChange={(e) => { setSelectDoc(Number(e.target.value)); setSelectError(false); }}
                      >
                        <option value="0" disabled hidden>Seleccionar</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className={`relative border-2 border-dashed rounded-xl p-3 mb-4.5 mt-4.5 transition-colors group text-center ${
                      file        ? "border-sea-blue/40 bg-sea-blue/5" :
                      fileError   ? "border-red-200 bg-red-50" :
                      patient     ? "border-gray-200 hover:border-sea-blue/40" :
                                    "border-gray-200"
                    }`}>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        className={`absolute inset-0 w-full h-full opacity-0 ${patient ? "cursor-pointer" : ""}`}
                        disabled={patient ? false : true}
                        onChange={patient ? (e) => {
                          const selected = e.target.files?.[0] ?? null;
                          if (selected) {
                            const duplicado = documents.some(
                              (d) => d.Nombre.toLowerCase() === selected.name.toLowerCase()
                            );
                            if (duplicado) {
                              errorModal(
                                "Documento duplicado",
                                `Ya existe un documento con el nombre <b>${selected.name}</b>.`
                              );
                              e.target.value = "";
                              setFile(null);
                              return;
                            }
                          }
                          setFile(selected);
                          setFileError(false);
                        } : undefined}
                      />
                      <FileUp className={`h-8 w-8 mx-auto mb-2 transition-colors ${
                        file      ? "text-sea-blue" :
                        fileError ? "text-red-300" :
                        patient   ? "text-gray-300 group-hover:text-sea-blue" :
                                    "text-gray-300"
                      }`} />
                      <label className={`block text-xs font-medium truncate mb-1 ${fileError && !file ? "text-red-500" : "text-gray-700"}`}>
                        {file ? file.name : fileError ? "Seleccionar PDF (obligatorio)" : "Seleccionar PDF o arrastrar aquí"}
                      </label>
                      <p className={`text-xs ${fileError && !file ? "text-red-300" : "text-gray-400"} mt-1`}>
                        Máximo 10 MB
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={uploading}
                      className={`w-full items-center ${patient ? "bg-sea-blue hover:bg-sea-blue/80 hover:-translate-y-1 text-white cursor-pointer" : "bg-sea-blue/80 text-white"} px-5 py-2.5 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all`}
                    >
                      {uploading ? <><i className="mdi mdi-loading mdi-spin mr-2"></i>Cargando...</> : "Cargar Documento"}
                    </button>
                  </form>
                </motion.div>
              }
            </div>

            <div className={"lg:col-span-2"}>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm h-full flex flex-col"
              >
                <div className="flex items-center justify-between px-6 py-7 border-b border-gray-100">
                  <h2 className="text-sm font-bold text-gray-800 flex items-center">
                    <i className="mdi mdi-folder-open mr-4"></i>
                    Expediente Digital
                  </h2>
                  <span className="text-xs font-bold text-gray-400">
                    {documents.length} archivos
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-6">
                  {categories.map((cat, idx) => {
                    const catDocs = docsForCategory(cat.id);
                    const count   = catDocs.length;
                    const isEmpty = count === 0;
                    const isActive = activeCategory === cat.id;

                    return (
                      <motion.button
                        key={cat.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        onClick={() => handleOpenCategory(cat.id)}
                        disabled={isEmpty}
                        className={` 
                          relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all text-center 
                          ${isEmpty || !patient ? "border-gray-100 bg-gray-50 cursor-not-allowed opacity-50" 
                          : isActive  ? "border-sea-blue/40 bg-sea-blue/5 cursor-pointer" 
                          : "border-gray-100 bg-white hover:border-sea-blue/30 hover:bg-gray-50/50 hover:shadow-sm hover:-translate-y-0.5 cursor-pointer"}  
                        `}
                      >
                        {!isEmpty && (
                          <span className={`
                            absolute top-2.5 right-2.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full
                            ${isActive ? "bg-sea-blue text-white" : "bg-gray-100 text-gray-500"}
                          `}>
                            {count}
                          </span>
                        )}
                        
                        <div className={`
                          w-12 h-12 rounded-xl flex items-center justify-center text-2xl
                            ${isEmpty ? "bg-gray-100 text-gray-300"
                            : isActive ? "bg-sea-blue text-white"
                            : "bg-blue-50 text-sea-blue"
                          }
                        `}>
                          <i className={`mdi ${cat.icon}`}></i>
                        </div>
                        <span className={`text-[11px] font-bold leading-tight ${isEmpty ? "text-gray-300" : isActive ? "text-sea-blue" : "text-gray-600"}`}>
                          {cat.label}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      <aside
        className={`fixed top-[64px] right-0 h-[calc(100vh-64px)] bg-white border-l border-gray-200 transition-all duration-300 ease-in-out z-40 ${ isAsideOpen ? "" : "translate-x-full" }`}
        // style={{ width: isAsideOpen ? (isPdfOpen ? 300 + 420 : 300) : 300 }}
        style={{ width: isAsideOpen ? (isPdfOpen ? 300 + 650 : 300) : 300 }}
      >
        <div className="flex h-full w-full">
          <div className="flex flex-col border-r border-gray-100 h-full shrink-0" style={{ width: 300 }}>
            <div className="px-3 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    title="Regresar"
                    className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-sea-blue hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
                    onClick={handleCloseAside}
                  >
                    <i className={`mdi ${isPdfOpen ? "mdi-chevron-left" : "mdi-chevron-right"} text-2xl`}></i>
                  </button>
                  <div>
                    <h2 className="text-sm font-bold text-gray-800 upp flex items-center">
                      <i className={`mdi ${activeCategory ? getCategoriaIcon(activeCategory) : "mdi-folder-outline"} mr-1.5`}></i>
                      {activeCategory ? getCategoriaLabel(activeCategory) : ""}
                    </h2>
                    <p className="text-xs text-gray-500 truncate max-w-[200px]">
                      {activeCategory ? `${docsForCategory(activeCategory).length} archivo(s)` : ""}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-3">
              {activeCategory && docsForCategory(activeCategory).map((doc, idx) => {
                const isSelected = selectedPdf?.nombre === doc.Nombre;
                const docNombre = doc.Nombre;

                return (
                  <div
                    key={idx}
                    onClick={() => handleOpenPdf(doc)}
                    className={`group px-3 py-2 border rounded-xl transition-all cursor-pointer ${isSelected ? "border-sea-blue/40 bg-sea-blue/5" : "border-gray-200 hover:border-sea-blue/30 hover:bg-gray-50"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`px-1 rounded flex items-center justify-center transition-colors ${isSelected ? "text-red-500" : "text-gray-400 group-hover:text-sea-blue/60"}`}>
                        <i className="mdi mdi-file-pdf-box text-2xl"></i>
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-[10px] text-gray-400 font-medium uppercase">
                          <strong>
                            {formatDate(doc.FechaCarga)}
                          </strong>
                        </p>
                        <p title={docNombre} className="text-[11px] font-bold truncate uppercase text-gray-600">
                          {docNombre}
                        </p>
                        <p className="text-[10px] text-gray-400 font-medium uppercase truncate">
                          {formatSize(doc.Tamano)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={`flex-1 bg-slate-50 transition-all duration-300 overflow-hidden ${isPdfOpen ? 'w-[650px] opacity-100' : 'w-0 opacity-0'}`}>
            {isPdfOpen && selectedPdf && (
              <VisorPDFInline
                pdfId={selectedPdf.id}
                pdfUrl={selectedPdf.url}
                pdfName={selectedPdf.nombre}
                pdfDate={selectedPdf.date}
                onClose={handleClosePdf}
                onDelete={handleDelete}
              />
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};

export default Documentos;
