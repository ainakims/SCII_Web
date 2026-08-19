import React, { useState, useEffect, useCallback, useRef } from "react";
import API_BASE_URL from "../config";
import { fetchWithAuth } from "../services/api";
import { useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthToken";
import { useSidebarWidth } from "../context/SidebarContext";

// Mismo tope que DocumentosController.ts (10 MB de PDF crudo). El archivo
// viaja como Base64 hacia el servicio SOAP externo (~33% más grande en el
// request real), así que si el servicio sigue rechazando con "Maximum
// request length exceeded" dentro de este límite, hay que revisar el
// httpRuntime.maxRequestLength de ese servicio (ver nota en el controller).
const MAX_UPLOAD_MB = 10;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

// El nombre del archivo se usa tal cual como nombre de carpeta/ruta en disco
// (DocumentosController.ts) y para armar la URL de /uploads/:matricula/:nombre.
// Acentos, ñ, etc. son texto Unicode normal y no rompen nada — lo que sí
// rompe una ruta de archivo son los caracteres reservados del sistema y los
// de control invisibles, así que solo esos se bloquean.
const CARACTERES_PROHIBIDOS_NOMBRE = /[\\/:*?"<>|\x00-\x1F]/;

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
  // El listado (ObtenerArchivos) ya no trae los bytes del archivo (pesaban
  // varios MB por documento y hacían muy lenta la consulta); solo indica si
  // hay respaldo en BD. Los bytes reales se piden bajo demanda a
  // ObtenerArchivoBytes cuando el archivo físico no está disponible.
  TieneFileBytes: boolean;
}

type FileBytesPayload = { data: number[] } | number[] | string | null;

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

// Respaldo para documentos que solo existen como bytes en la BD (subidos
// antes de que DocumentosController.ts empezara a guardar el archivo físico
// en /uploads): arma un Blob a partir de FileBytes tal como lo regresa el
// stored procedure, que en la práctica llega como string base64 (aunque
// también se contemplan los formatos { data: number[] } / number[] por si
// mssql llega a serializar la columna como Buffer).
const fileBytesToBlob = (fileBytes: FileBytesPayload): Blob | null => {
  if (!fileBytes) return null;

  if (typeof fileBytes === "string") {
    if (fileBytes.length === 0) return null;
    try {
      const binary = atob(fileBytes);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return new Blob([bytes], { type: "application/pdf" });
    } catch {
      return null;
    }
  }

  const bytes = Array.isArray(fileBytes) ? fileBytes : fileBytes.data;
  if (!bytes || bytes.length === 0) return null;
  return new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
};

// Arma la URL de descarga a partir de Direccion (la ruta física real que se
// guardó al momento de subir el documento) en vez de matricula + Nombre.
// Necesario porque documentos subidos antes de corregir DocumentosController.ts
// tienen Nombre (BD) distinto al nombre real del archivo en disco (se le
// quitaban espacios/acentos), así que reconstruir la ruta con Nombre da 404.
// Direccion nunca tuvo ese problema: siempre reflejó el nombre real del archivo.
const buildUploadUrl = (doc: Pick<Document, "Direccion" | "Nombre">, matricula: string): string => {
  if (doc.Direccion) {
    const marker = "uploads";
    const idx = doc.Direccion.toLowerCase().lastIndexOf(marker);
    if (idx !== -1) {
      const relative = doc.Direccion.slice(idx + marker.length).replace(/^[\\/]+/, "");
      const parts = relative.split(/[\\/]+/).filter(Boolean);
      if (parts.length > 0) {
        return `${API_BASE_URL}/uploads/${parts.map(encodeURIComponent).join("/")}`;
      }
    }
  }
  return `${API_BASE_URL}/uploads/${encodeURIComponent(matricula)}/${encodeURIComponent(doc.Nombre)}`;
};

const VisorPDFInline = ({ pdfId, pdfName, pdfDate, pdfUrl, isFullscreen, onClose, onDelete, onToggleFullscreen }: { pdfId: number; pdfName: string; pdfDate: string; pdfUrl: string; isFullscreen: boolean; onClose: () => void, onDelete: (id: number) => void; onToggleFullscreen: () => void; }) => {
  const { user } = useAuth() as { user: { rol?: string; matricula?: string } };

  const esPrivilegiado = ["admin", "médico", "medico"].includes(
    (user?.rol ?? "").toLowerCase().trim()
  );

  if (!pdfUrl) return null;

  return (
    <div className="flex flex-col h-full bg-white animate-in slide-in-from-right duration-200">
      <div className="py-4 px-5 flex justify-between items-center shrink-0">
        <div className="flex items-center justify-between gap-3 overflow-hidden w-full">
          <div className="flex-1 min-w-0">
            {/* <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
              <i className="fa-regular fa-calendar mr-1"></i>
              {formatDate(pdfDate)}
            </p>
            <p className="text-xs font-bold text-gray-800 truncate uppercase">
              {pdfName}
            </p> */}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              title={isFullscreen ? "Salir de pantalla completa" : "Ampliar"}
              onClick={(e) => { e.stopPropagation(); onToggleFullscreen(); }}
              className="w-10 h-10 text-gray-400 hover:text-sea-blue rounded-xl flex items-center justify-center transition-all group cursor-pointer"
            >
              <i className={`fa-solid ${isFullscreen ? "fa-compress" : "fa-expand"} text-lg`}></i>
            </button>
            {esPrivilegiado &&
              <button
                title="Eliminar"
                // onClick={onClose}
                onClick={(e) => { e.stopPropagation(); onDelete(pdfId); }}
                className="w-10 h-10 text-gray-400 hover:text-red-400 rounded-xl flex items-center justify-center transition-all group cursor-pointer"
              >
                <i className="fa-solid fa-trash-arrow-up"></i>
              </button>
            }
          </div>
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
  const [isPdfFullscreen, setIsPdfFullscreen] = useState(false);

  // Ancho real del sidebar (vía contexto, reactivo al colapsar/expandir) para que el panel
  // en pantalla completa deje siempre el espacio correcto — "md:left-64" por sí solo no
  // reacciona si el sidebar está colapsado (w-20) en vez de expandido (w-64).
  const sidebarW = useSidebarWidth();
  const [viewportW, setViewportW] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1280));
  useEffect(() => {
    const onResize = () => setViewportW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const fullscreenLeft = viewportW >= 768 ? sidebarW : 0;
  // Ancho del visor de PDF (no fullscreen): se ajusta al espacio real disponible
  // (viewport - sidebar - la columna de 300px de la izquierda), en vez de un
  // valor fijo que se veía cortado con zoom alto o pantallas chicas.
  const pdfViewerWidth = Math.max(400, Math.min(800, viewportW - sidebarW - 300 - 48));

  const fileInputRef = useRef<HTMLInputElement>(null);
  // IDs cuyo tamaño ya se intentó obtener, para no repetir el HEAD request
  // cada vez que se reabre la misma categoría.
  const fetchedSizesRef = useRef<Set<number>>(new Set());

  // Igual que Evaluacion.tsx: alto fijo por fórmula, calculado una sola vez
  // al montar (sin listener de resize).
  const [pageHeight] = useState<number>(() => Math.max(window.innerHeight - 150, 400));

  const categories = [
    { id: 1, label: "Consentimientos",      icon: "fa-solid fa-file-signature" },
    { id: 2, label: "Evaluaciones Médicas", icon: "fa-solid fa-clipboard-list" },
    { id: 3, label: "Exámenes Clínicos",    icon: "fa-solid fa-file-waveform" },
    { id: 4, label: "Laboratorio",          icon: "fa-solid fa-flask" },
    { id: 5, label: "RX / Imagenología",    icon: "fa-solid fa-x-ray" },
    { id: 6, label: "Audiometría",          icon: "fa-solid fa-ear-deaf" },
    { id: 7, label: "Electrocardiograma",   icon: "fa-solid fa-heart-pulse" },
    { id: 8, label: "Espirometria",         icon: "fa-solid fa-lungs" },
    { id: 9, label: "Recetas Externas",     icon: "fa-solid fa-file-prescription" },
    { id: 10, label: "Otros",               icon: "fa-solid fa-file-circle-question" },
  ];

  const getCategoriaLabel = (id: number) => categories.find(c => c.id === id)?.label || "Sin categoría";
  const getCategoriaIcon  = (id: number) => categories.find(c => c.id === id)?.icon  || "fa-regular fa-folder";

  // Respaldo bajo demanda para documentos sin archivo físico en /uploads:
  // pide los bytes solo cuando hacen falta, en vez de traerlos siempre en
  // el listado (eso volvía muy lenta cada consulta de ObtenerArchivos).
  const fetchFileBytes = async (matricula: string, idDocumento: number): Promise<FileBytesPayload> => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/Documentos/ObtenerArchivoBytes`, {
        method: "POST",
        body: JSON.stringify({ matricula, idDocumento })
      });
      const data = await res.json();
      return data?.fileBytes ?? null;
    } catch {
      return null;
    }
  };

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
          TieneFileBytes: !!d.TieneFileBytes,
        }));
        setDocuments(mapped);
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
        errorModal("No se pudo guardar", res?.error || "Ocurrió un error al intentar almacenar el documento en el expediente.");
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
      <i class="fa-solid fa-check success-icon"></i>
      <style>
        .success-icon {
          color: #545454;
          font-size: 70px;
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
      `,
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
          font-size: 70px;
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

  const confirmModal = (title: string, message: string) => {
    return Swal.fire({
      title: `<p style="font-size: 18px" class="font-bold uppercase text-gray-800">${title}</p>`,
      html: `<p style="font-size: 16px; padding: 0 40px">${message}</p>`,
      iconHtml: `
      <i class="fa-solid fa-question success-icon"></i>
      <style>
        .success-icon {
          color: #545454;
          font-size: 70px;
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
      `,
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

    // Tamaños bajo demanda: solo se piden los de los documentos que el
    // usuario realmente va a ver, y solo una vez por documento.
    const mat = patient?.Matricula;
    if (!mat) return;

    docs
      .filter((doc) => !fetchedSizesRef.current.has(doc.IdDoc))
      .forEach(async (doc) => {
        fetchedSizesRef.current.add(doc.IdDoc);
        try {
          const headRes = await fetch(buildUploadUrl(doc, mat), { method: "HEAD" });
          if (headRes.ok) {
            const size = parseInt(headRes.headers.get("content-length") ?? "0", 10);
            if (size > 0) {
              setDocuments(prev => prev.map(d => d.IdDoc === doc.IdDoc ? { ...d, Tamano: size } : d));
              return;
            }
          }
        } catch { /* ignorar, se intenta con FileBytes abajo */ }

        if (!doc.TieneFileBytes) return;
        const fileBytes = await fetchFileBytes(mat, doc.IdDoc);
        const blob = fileBytesToBlob(fileBytes);
        if (blob) {
          setDocuments(prev => prev.map(d => d.IdDoc === doc.IdDoc ? { ...d, Tamano: blob.size } : d));
        }
      });
  };

  const handleOpenPdf = async (doc: Document) => {
    try {
      let blob: Blob | null = null;

      try {
        const response = await fetch(buildUploadUrl(doc, patient!.Matricula));
        if (response.ok) blob = await response.blob();
      } catch { /* sin archivo en disco, se intenta con FileBytes abajo */ }

      if (!blob && doc.TieneFileBytes) {
        const fileBytes = await fetchFileBytes(patient!.Matricula, doc.IdDoc);
        blob = fileBytesToBlob(fileBytes);
      }

      if (!blob) {
        errorModal("Archivo no disponible", "No se encontró el archivo en el servidor ni en la base de datos.");
        return;
      }

      const url = URL.createObjectURL(blob);
      // actualizar tamaño real del archivo
      setDocuments(prev => prev.map(d => d.IdDoc === doc.IdDoc ? { ...d, Tamano: blob!.size } : d));
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
    setIsPdfFullscreen(false);
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

  const handleToggleFullscreen = () => setIsPdfFullscreen((prev) => !prev);

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
        className="flex-1 mt-14 transition-all duration-300 ease-in-out"
        style={{ marginRight: isAsideOpen ? 300 : 0 }}
      >
        <div
          className="max-w-7xl mx-auto px-4 pb-0 flex flex-col gap-6"
          style={{ height: pageHeight }}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 sm:p-6 rounded-xl shadow-xs shadow-restore gap-4 shrink-0">
            <div>
              <h1 className="text-2xl font-bold bg-linear-to-r from-sea-blue to-sky-blue bg-clip-text text-transparent flex items-center">
                Documentos
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Almacenamiento y organización de expedientes.
              </p>
            </div>

            <form
              // onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
              className="mt-0 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="relative w-[318px]">
                <i className={`fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-xs transition-colors ${notFound ? "text-red-500" : "text-gray-400"}`}></i>
                <input
                  type="text"
                  value={matricula}
                  onChange={(e) => { if (!esPrivilegiado) return; setMatricula(e.target.value); setNotFound(false); }}
                  placeholder="Matrícula (5 dígitos)"
                  maxLength={5}
                  disabled={loading}
                  readOnly={!esPrivilegiado}
                  className={`w-full border border-gray-50 pl-8 pr-3 py-2 rounded-md text-xs shadow-xs outline-none transition-colors focus:ring-1 focus:ring-sea-blue ${notFound  ? "bg-red-50 text-red-500" : !esPrivilegiado ? "bg-white text-gray-400 cursor-not-allowed" : loading ? "bg-white cursor-not-allowed" : "bg-white" }`}
                />
                {loading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <i className="fa-solid fa-spinner fa-spin text-gray-400 text-lg"></i>
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
                  className="w-35 flex items-center justify-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-lg shadow-blue-500/30 transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none disabled:shadow-none disabled:translate-y-0"
                >
                  <i className="fa-solid fa-magnifying-glass mr-2"></i>
                  Buscar
                </button>
              }
            </form>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
            <div className={`lg:w-100 flex flex-col gap-6 min-h-0`}>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`bg-white rounded-xl shrink-0 shadow-xs p-6`}
              >
                <h2 className="text-sm font-bold text-gray-800 flex items-center mb-4 shrink-0">
                  <i className="fa-solid fa-user text-sea-blue mr-3"></i>
                  Información del Paciente
                </h2>
                {patient ? (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Nombre
                      </label>
                      <div title={`${patient.Nombres} ${patient.Apellidos}`} className="w-full px-3 py-2 border border-gray-100 shadow-xs rounded-lg text-xs bg-gray-50 text-gray-400 font-small outline-none truncate">
                        {patient.Nombres} {patient.Apellidos}
                      </div>
                    </div>
                    <div className="grid grid-cols-11 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1 mt-1.5">
                          CURP
                        </label>
                        <div title={patient.CURP || "N-A"} className="w-full px-3 py-2 border border-gray-100 shadow-xs rounded-lg text-xs bg-gray-50 text-gray-400 font-small outline-none truncate">
                          {patient.CURP || "N-A"}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1 mt-1.5">
                          No. IMSS
                        </label>
                        <div title={patient.NSS || "N-A"} className="w-full px-3 py-2 border border-gray-100 shadow-xs rounded-lg text-xs bg-gray-50 text-gray-400 font-small outline-none truncate">
                          {patient.NSS || "N-A"}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-11 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1 mt-1.5">
                          Género
                        </label>
                        <div className="flex justify-between w-full px-3 py-2 border border-gray-100 shadow-xs rounded-lg text-xs bg-gray-50 text-gray-400 font-semibold outline-none">
                          <i className={`fa-solid ${patient.Sexo === "M" ? "fa-mars" : "fa-venus"} mr-1`}></i>
                          {patient.Sexo || "-"}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1 mt-1">
                          Tipo sanguíneo
                        </label>
                        <div className="flex justify-between w-full px-3 py-2 border border-gray-100 shadow-xs rounded-lg text-xs bg-gray-50 text-red-600 font-semibold outline-none">
                          <i className="fa-solid fa-droplet mr-1 text-red-600"></i>
                          {patient.TipoSanguineo ?? "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex flex-col items-center justify-center py-10.5 text-gray-500 mt-7">
                      <div className="bg-gray-100 shadow-xs w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fa-solid fa-magnifying-glass text-2xl text-gray-400/50 leading-none flex items-center justify-center"></i>
                      </div>
                      <p className="text-xs font-semibold text-gray-700">
                        Realice la búsqueda de una matrícula primero.
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
                  className="bg-white rounded-xl shadow-xs p-6 flex-1 min-h-0 flex flex-col"
                >
                  <h2 className="text-sm font-bold text-gray-800 flex items-center mb-4 shrink-0">
                    <i className="fa-solid fa-cloud-arrow-up text-sea-blue mr-3"></i>
                    Subir Documento
                  </h2>
                  <form onSubmit={handleFileUpload} className="flex-1 min-h-0 flex flex-col gap-4">
                    <div className="shrink-0">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Clasificación
                      </label>
                      <select
                        className={`w-full border rounded-lg p-2 text-xs shadow-xs outline-none transition-colors ${selectError ? "border-red-200 bg-red-50 text-red-500" : "border-gray-100 focus:border-clinical-blue focus:ring-1" } ${!patient ? "bg-gray-50" : ""}`}
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

                    <div className={`relative border-2 border-dashed rounded-xl p-3 flex-1 min-h-0 flex flex-col items-center justify-center transition-colors group text-center ${
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
                            if (CARACTERES_PROHIBIDOS_NOMBRE.test(selected.name)) {
                              errorModal(
                                "Nombre de archivo inválido",
                                `El nombre <b>${selected.name}</b> tiene caracteres no permitidos ( \\ / : * ? " &lt; &gt; | ). Renómbralo y vuelve a intentar.`
                              );
                              e.target.value = "";
                              setFile(null);
                              return;
                            }
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
                            if (selected.size > MAX_UPLOAD_BYTES) {
                              errorModal(
                                "Archivo demasiado grande",
                                `El PDF supera el tamaño máximo permitido (<b>${MAX_UPLOAD_MB} MB</b>).`
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
                      <i className={`fa-solid fa-file-arrow-up text-3xl mx-auto mb-2 block w-fit transition-colors ${
                        file      ? "text-sea-blue" :
                        fileError ? "text-red-300" :
                        patient   ? "text-gray-300 group-hover:text-sea-blue" :
                                    "text-gray-300"
                      }`}></i>
                      <label className={`block text-xs font-semibold truncate mb-1 ${fileError && !file ? "text-red-500" : "text-gray-700"}`}>
                        {file ? file.name : fileError ? "Seleccionar PDF (obligatorio)" : "Seleccionar PDF o arrastrar aquí"}
                      </label>
                      <p className={`text-xs ${fileError && !file ? "text-red-300" : "text-gray-400"} mt-1`}>
                        Máximo {MAX_UPLOAD_MB} MB
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={uploading}
                      className={`w-full shrink-0 items-center ${patient ? "bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white cursor-pointer" : "bg-linear-to-r from-sea-blue/80 to-sky-blue/80 text-white"} px-5 py-2.5 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all`}
                    >
                      {uploading ? <><i className="fa-solid fa-spinner fa-spin mr-2"></i>Cargando...</> : "Cargar Documento"}
                    </button>
                  </form>
                </motion.div>
              }
            </div>

            <div className={"flex-1 min-h-0 flex flex-col"}>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex-1 min-h-0 bg-white rounded-xl flex flex-col shadow-xs overflow-hidden mb-1"
              >
                <div className="flex items-center justify-between px-6 pt-6 mb-4 shrink-0">
                  <h2 className="text-sm font-bold text-gray-800 flex items-center shrink-0">
                    <i className="fa-solid fa-file text-sea-blue mr-3"></i>
                    Documentos
                  </h2>
                  <span className="text-xs font-bold text-gray-400">
                    {documents.length} archivos
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 px-6 pb-6 overflow-y-auto flex-1 content-start">
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
                          relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all text-center shadow-xs
                          ${isEmpty || !patient ? "border-gray-100 bg-gray-50 cursor-not-allowed opacity-50"
                          : isActive  ? "border-sea-blue/30 bg-sea-blue/10 cursor-pointer"
                          : "border-gray-100 bg-white hover:border-sea-blue/30 hover:bg-gray-50/50 hover:shadow-xs hover:-translate-y-0.5 cursor-pointer"}
                        `}
                      >
                        {!isEmpty && (
                          <span className={`
                            absolute top-2.5 right-2.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full
                            ${isActive ? "bg-linear-to-b from-sea-blue to-sky-blue text-white" : "bg-horz-blue/20 text-gray-500"}
                          `}>
                            {count}
                          </span>
                        )}
                        
                        <div className={`
                          w-12 h-12 rounded-xl flex items-center justify-center text-2xl
                            ${isEmpty ? "bg-gray-100 text-gray-300"
                            : isActive ? "bg-linear-to-b from-sea-blue to-sky-blue text-white"
                            : "bg-horz-blue/20 text-sea-blue"
                          }
                        `}>
                          <i className={`${cat.icon} text-[18px]`}></i>
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
        className={`fixed top-[64px] h-[calc(100vh-64px)] bg-white shadow-xs transition-all duration-300 ease-in-out z-40 ${ isAsideOpen ? "" : "translate-x-full" }`}
        // Siempre se define left y width juntos (nunca se quita ninguno de los dos entre
        // renders) para que la transición a pantalla completa sea animada por CSS en vez
        // de saltar de golpe — mezclar "right:0 + width" con "left" (como antes) no se
        // puede animar porque una propiedad aparece/desaparece de un frame a otro.
        style={(() => {
          const asideWidth = isPdfFullscreen
            ? viewportW - fullscreenLeft
            : (isAsideOpen ? (isPdfOpen ? 300 + pdfViewerWidth : 300) : 300);
          const asideLeft = isPdfFullscreen ? fullscreenLeft : viewportW - asideWidth;
          return { left: asideLeft, width: asideWidth };
        })()}
      >
        <div className="flex h-full w-full">
          <div className="flex flex-col bh-full shrink-0" style={{ width: 300 }}>
            <div className="px-3 py-4 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    title="Regresar"
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-linear-to-b hover:from-gray-100 hover:to-gray-50 text-gray-600 hover:text-sea-blue transition-all cursor-pointer"
                    onClick={handleCloseAside}
                  >
                    {isPdfOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  <div>
                    <p className="text-xs font-bold text-gray-800 truncate uppercase max-w-[320px]">
                      <i className={`${activeCategory ? getCategoriaIcon(activeCategory) : "fa-regular fa-folder"} mr-1.5`}></i>
                      {activeCategory ? getCategoriaLabel(activeCategory) : ""}
                    </p>
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
                    className={`group px-3 py-2 rounded-xl transition-all cursor-pointer ${isSelected ? "bg-sea-blue/5" : "border-gray-200 hover:border-sea-blue/30 hover:bg-gray-50"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`px-1 rounded flex items-center justify-center transition-colors ${isSelected ? "text-sea-blue" : "text-gray-400 group-hover:text-sea-blue/60"}`}>
                        <i className="fa-solid fa-file-pdf text-sm"></i>
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

          <div
            className={`bg-white transition-all duration-300 overflow-hidden ${isPdfOpen ? "opacity-100" : "opacity-0"}`}
            style={{ width: isPdfOpen ? (isPdfFullscreen ? viewportW - fullscreenLeft - 300 : pdfViewerWidth) : 0 }}
          >
            {isPdfOpen && selectedPdf && (
              <VisorPDFInline
                pdfId={selectedPdf.id}
                pdfUrl={selectedPdf.url}
                pdfName={selectedPdf.nombre}
                pdfDate={selectedPdf.date}
                isFullscreen={isPdfFullscreen}
                onClose={handleClosePdf}
                onDelete={handleDelete}
                onToggleFullscreen={handleToggleFullscreen}
              />
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};

export default Documentos;
