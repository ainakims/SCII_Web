import API_BASE_URL from "../config";
import { fetchWithAuth } from "../services/api";
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import Swal from "sweetalert2";

import { RegistroValidado } from "../features/saludPoblacional/types";
import ExpedienteContenido from "../features/saludPoblacional/components/ExpedienteContenido";

const errorModal = (title: string, message: string) => {
  Swal.fire({
    title: `<p style="font-size: 18px" class="font-bold uppercase text-gray-800">${title}</p>`,
    html: `<p style="font-size: 16px; padding: 0 40px">${message}</p>`,
    iconHtml: `<i class="mdi mdi-alert-circle-outline" style="font-size: 90px"></i>`,
    didOpen: (p) => { const el = p.querySelector(".swal2-icon") as HTMLElement; if (el) Object.assign(el.style, { border: "none", background: "transparent", boxShadow: "none", width: "auto", height: "auto" }); },
    buttonsStyling: false,
    confirmButtonText: `<i class="mdi mdi-check-bold mr-1"></i> OK`,
    customClass: { confirmButton: "flex items-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer" },
  });
};

// Ventana específica de un departamento: mismas secciones del expediente
// general, filtradas por el nombre de departamento recibido en la URL.
const ExpedienteDepartamento: React.FC = () => {
  const { nombre } = useParams<{ nombre: string }>();
  const nombreDepto = nombre ? decodeURIComponent(nombre) : "";

  const [registros, setRegistros] = useState<RegistroValidado[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/SaludPoblacional/ObtenerDatos`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        const json = await res.json();
        if (json?.ok && Array.isArray(json.data)) {
          setRegistros(json.data);
        } else {
          errorModal("Error al cargar", json?.message || "No se pudo obtener la información poblacional.");
        }
      } catch (err) {
        console.error("Error al obtener información del departamento:", err);
        errorModal("Error de conexión", "Ocurrió un error al obtener la información poblacional.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const registrosDepto = useMemo(
    () => registros.filter((r) => (r.Depto_nombre ?? "").trim() === nombreDepto),
    [registros, nombreDepto]
  );

  return (
    <div className="relative flex w-full overflow-hidden">
      <div className="flex-1 mt-14 transition-all duration-300 ease-in-out">
        <div className="max-w-7xl mx-auto px-4 space-y-6 pb-5.5">
          {loading ? (
            <div className="flex items-center justify-center py-24 text-sea-blue">
              <i className="mdi mdi-loading mdi-spin text-3xl mr-3"></i>
              Cargando información del departamento...
            </div>
          ) : (
            <ExpedienteContenido historico={registrosDepto} mensajeVacio="No hay información disponible para este departamento." />
          )}
        </div>
      </div>
    </div>
  );
};

export default ExpedienteDepartamento;
