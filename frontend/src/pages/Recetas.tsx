import API_BASE_URL from "../config";
import { fetchWithAuth } from "../services/api";
import React, { useState, useRef, useEffect } from 'react';
import { Pill, Printer, AlertTriangle, ShieldCheck, Download, Plus, Search, FileText, User, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useReactToPrint } from 'react-to-print';
import { useAuth } from "../context/AuthToken";
import { useNavigate } from "react-router-dom";

interface Medicamento {
  Farmaco: string;
  Dosis: string;
  Frecuencia: string;
  Duracion: string;
}

interface Receta {
  ID: number;
  Matricula: string;
  Folio: string;
  FechaConsulta: string;
  Nombres: string;
  Apellidos: string;
  CURP: string;
  FechaNacimiento: string;
  Sexo: string;
  Atencion: string;
  Medicamentos?: Medicamento[];
//   Farmacos: string;
  AlergiasMedicamento?: string;
  Diagnostico: string;
  Recomendacion: string;
}

interface SearchResult extends Receta {
  Medicamentos?: Medicamento[];
}

interface User {
  nombre?: string;
  cuenta?: string;
  puesto?: string;
  matricula?: string;
  correo?: string;
  rol: string;
}

const Recetas: React.FC = () => {
  const { user } = useAuth() as { user: User };

  // const { user } = useAuth() as { user: { puesto?: string; matricula?: string } };
  const navigate = useNavigate();

  useEffect(() => {
    if ((user?.rol ?? "").toLowerCase().trim() !== "admin" && (user?.rol ?? "").toLowerCase().trim() !== "médico") {
      navigate("/Agenda");
    }
  }, [user, navigate]);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Receta | null>(null);
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Receta_${selectedRecipe?.Folio || 'Digital'} `,
  });

  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      setNotFound(false);
      setIsSearching(false);
      return;
    }

    const delay = setTimeout(async () => {
      try {
        setIsSearching(true);
        await new Promise(r => setTimeout(r, 2000));

        const res = await fetchWithAuth(`${API_BASE_URL}/Recetas/ObtenerRecetas`, {
          method: "POST",
          body: JSON.stringify({ matricula: searchTerm })
        });

        let data: any[] | null = null;
        try { data = await res.json(); } catch { data = null; }

        if (data && data.length > 0) {
          setResults(data);
          setNotFound(false);
          setSelectedRecipe(null);
          setIsSearching(false);
        } else {
          setResults([]);
          setNotFound(true);
          setSelectedRecipe(null);
          setIsSearching(false);
        }
      } catch {
        setResults([]);
        setNotFound(true);
      } finally {
        setIsSearching(false);
      }
    }, 1000);

    return () => clearTimeout(delay);
  }, [searchTerm]);

  const calculateAge = (dobString: string | undefined): number | string => {
    if (!dobString) return 'Desconocida';
    const dob = new Date(dobString);
    const diffMs = Date.now() - dob.getTime();
    const ageDt = new Date(diffMs);
    return Math.abs(ageDt.getUTCFullYear() - 1970);
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return d.toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  return (
    <div className="relative flex w-full overflow-hidden">
      <div className="flex-1 mt-14 transition-all duration-300 ease-in-out">
        <div className="max-w-7xl mx-auto px-4 space-y-6 pb-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm gap-4">
            <div>
              <h1 className="text-2xl font-bold text-sea-blue flex items-center">
                Recetas Digitales
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Busca e imprime recetas extendidas en las consultas
              </p>
            </div>

            <form
              className="mt-0 flex flex-col sm:flex-row gap-4"
            >
              <div className="relative -translate-y-[-2px]">
                <Search className={`h-3.5 w-3.5 absolute left-3 top-2.5 ${notFound ? "text-red-400" : "text-gray-400"}`} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Matrícula (5 dígitos)"
                  maxLength={5}
                  disabled={isSearching}
                  className={`w-[318px] border rounded-lg pl-9 px-3 py-2 pr-10 text-xs outline-none transition-colors ${notFound ? "border-red-400 bg-red-50 text-red-700" : isSearching ? "border-gray-300 bg-gray-100" : "border-gray-300 focus:border-clinical-blue focus:ring-1"}`}
                  // className={`w-full border rounded-lg pl-9 px-3 py-2 pr-10 text-xs outline-none transition-colors ${editingId ? "bg-gray-50" : ""} ${!formData.matricula ? "border-gray-300" : loadingMat ? "border-gray-300 bg-gray-100" : matriculaNotFound ? "border-red-400 bg-red-50 text-red-700" : matriculaNotRegis ? "border-yellow-400 bg-yellow-50 text-yellow-700" : "border-gray-300 focus:border-clinical-blue focus:ring-1"}`}
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <i className="mdi mdi-loading mdi-spin text-gray-400 text-lg"></i>
                  </div>
                )}
              </div>
                <button
                  onClick={handlePrint}
                  className="w-35 flex items-center justify-center bg-sea-blue hover:bg-sea-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none disabled:shadow-none disabled:translate-y-0"
                  disabled={!selectedRecipe}
                >
                  <i className="mdi mdi-printer-wireless mr-2" />
                  Imprimir
                </button>
            </form>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
            <div className="col-span-1 lg:col-span-4 space-y-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm h-154.5 flex flex-col"
              >
                <div className="relative flex items-center justify-between p-6 border-b border-gray-100">
                  <h2 className="text-sm font-bold text-gray-800 flex items-center">
                    <i className={`mdi mdi-pill mr-2`}></i>
                    Recetas Médicas
                  </h2>
                  {selectedRecipe && (
                    <button
                      title="Regresar"
                      className="absolute right-6 p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                      onClick={() => setSelectedRecipe(null)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="flex-1 flex flex-col overflow-y-auto">
                  {!selectedRecipe ? (
                    <div className="p-6">
                      {results.length === 0 ? (
                        <div className="space-y-2">
                          <div className="flex flex-col items-center justify-center py-30 text-gray-500 mt-7.5">
                            <FileText className={`h-8 w-8 mb-4 opacity-40 ${notFound ? "text-red-400" : ""}`} />
                            <p className="text-xs">
                              {notFound ? "No se encontraron recetas para esa matrícula." : "Realiza una búsqueda para ver las recetas disponibles."}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {results.map((res) => (
                            <div
                              key={res.ID}
                              onClick={() => setSelectedRecipe(res)}
                              className="group px-3 py-2 border rounded-xl transition-all cursor-pointer border-gray-200 hover:border-sea-blue/30 hover:bg-gray-50"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="overflow-hidden">
                                  <p className="text-[11px] text-gray-400 font-medium uppercase">
                                    {formatDate(res.FechaConsulta)}
                                  </p>
                                  <p className="text-[12px] font-bold truncate uppercase text-gray-600">
                                    #{res.ID} - {res.Atencion}
                                  </p>
                                  <p className="text-[11px] text-gray-400 font-medium uppercase truncate">
                                    {res.Nombres} {res.Apellidos}
                                    - {res.CURP}
                                  </p>
                                </div>
                                <span className="text-xs font-bold text-gray-400 group-hover:text-sea-blue/60 transition-colors">
                                  {res.Medicamentos?.length || 0} fármacos
                                </span>
                                {/* <div className={`px-1 rounded flex items-center justify-center transition-colors text-gray-400 group-hover:text-sea-blue/60"}`}>
                                  <span className="w-24 text-center text-xs font-bold text-clinical-blue bg-gray-400 text-white group-hover:bg-sea-blue/60 px-3 py-1 rounded-full  transition-colors">
                                    {res.Medicamentos?.length || 0} fármacos
                                  </span>
                                </div> */}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto flex flex-col">
                      <div className="space-y-4 p-6">
                        <div className="border border-gray-300 rounded-lg overflow-hidden">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-gray-50 border-b border-gray-300">
                                <th className="px-3 py-2 text-left font-medium text-gray-700 mb-1 w-40">
                                  Medicamento
                                </th>
                                <th className="px-3 py-2 text-left font-medium text-gray-700 mb-1 w-20">
                                  Dósis
                                </th>
                                <th className="px-3 py-2 text-left font-medium text-gray-700 mb-1 w-20">
                                  Frecuencia
                                </th>
                                <th className="px-3 py-2 text-left font-medium text-gray-700 mb-1 w-20">
                                  Duración
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedRecipe.Medicamentos && selectedRecipe.Medicamentos.length > 0 ? (
                                selectedRecipe.Medicamentos.map((med, idx) => (
                                  <tr
                                    key={idx}
                                    // className="border-b border-gray-200 last:border-b-0"
                                  >
                                    <td className="px-3 py-2 font-medium text-gray-700 mb-1">
                                      {med.Farmaco}
                                    </td>
                                    <td className="px-3 py-2">
                                      <input
                                        type="text"
                                        value={`${med.Dosis} tab`}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-1 text-gray-800 font-medium outline-none"
                                        disabled
                                      />
                                    </td>
                                    <td className="px-3 py-2">
                                      <input
                                        type="text"
                                        value={`c/ ${med.Frecuencia} hrs`}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-1 text-gray-800 font-medium outline-none"
                                        disabled
                                      />
                                    </td>
                                    <td className="px-3 py-2">
                                      <input
                                        type="text"
                                        value={`${med.Duracion} día(s)`}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-1 text-gray-800 font-medium outline-none"
                                        disabled
                                      />
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={4} className="text-center py-6 text-gray-400">
                                    Esta receta no tiene fármacos registrados.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {selectedRecipe && selectedRecipe.AlergiasMedicamento && (
                        <div className="p-6 pt-0 mt-auto">
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }} 
                            animate={{ opacity: 1, scale: 1 }} 
                            className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start shadow-sm"
                          >
                            {/* <AlertTriangle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5 mr-3" /> */}
                            <i className="mdi mdi-alert mt-5 ml-1 mr-5 text-xl text-yellow-600 flex-shrink-0"></i>
                            <div>
                              <h4 className="text-sm font-bold text-yellow-800">
                                Alerta de Farmacovigilancia
                              </h4>
                              <p className="text-sm text-yellow-700 mt-1 leading-relaxed">
                                El paciente reporta las siguientes alergias a medicamentos en su expediente: <strong>{selectedRecipe.AlergiasMedicamento}</strong>.
                                Valida la prescripción actual basándote en esta información.
                              </p>
                            </div>
                          </motion.div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
            
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="col-span-1 lg:col-span-3"
            >
              <div className="bg-gray-100 rounded-lg border border-gray-200 h-full flex flex-col">
                <div
                  ref={componentRef}
                  className="bg-white rounded-lg shadow-sm flex-1 w-full relative flex flex-col p-6 font-serif print:shadow-none print:p-10 print:w-[210mm] print:mx-auto"
                >
                  <div className="border-b-2 border-clinical-blue pb-4 mb-4 flex justify-between">
                    <div>
                      <div className="text-xl font-bold text-gray-800 tracking-tight">
                        TNG
                      </div>
                      <div className="text-[11px] text-gray-500 leading-tight mt-1">
                        Dr. {user?.nombre}
                        <br />
                        {/* Céd. Prof. {user.cedula} */}
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-gray-500">
                      Fecha: {selectedRecipe ? formatDate(selectedRecipe.FechaConsulta) : formatDate(new Date().toString())}<br />
                      {/* Folio: {selectedRecipe ? selectedRecipe.ID : ''} */}
                    </div>
                  </div>
                  <div className="mb-5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Datos del Paciente
                    </span>
                    <div className="text-base font-bold text-gray-800 border-b border-gray-100 pb-1 mt-0.5">
                      {selectedRecipe && `${selectedRecipe.Nombres}`}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1.5 flex gap-3">
                      <span>Fecha Nacimiento: {selectedRecipe && `${formatDate(selectedRecipe.FechaNacimiento)}`}</span>
                      <span>Edad: {selectedRecipe && `${calculateAge(selectedRecipe.FechaNacimiento)} años`}</span>
                      <span>Sexo: {selectedRecipe && selectedRecipe.Sexo}</span>
                    </div>
                  </div>
                  <div className="flex-1 text-sm text-gray-700 leading-relaxed font-sans space-y-4 print:flex-none print:pb-36">
                    <div className="font-bold font-serif text-2xl mb-3 text-clinical-blue">
                      ℞
                    </div>
                    {selectedRecipe && selectedRecipe.Medicamentos && selectedRecipe.Medicamentos.length > 0 ? (
                      selectedRecipe.Medicamentos.map((med, idx) => (
                        <div key={idx} className="pl-2 border-l-2 border-transparent hover:border-gray-200 transition-colors">
                          <table className="w-full text-xs">
                            <thead>
                              <tr>
                                <th className="pl-2 text-left font-semibold w-1/8">
                                  #{idx + 1}
                                </th>
                                <th className="text-left font-semibold w-1/8">
                                  Cant.
                                </th>
                                <th className="text-left font-semibold w-3/8">
                                  Medicamento
                                </th>
                                <th className="text-left font-semibold w-1/8">
                                  Dosis
                                </th>
                                <th className="text-left font-semibold w-1/8">
                                  Frec.
                                </th>
                                <th className="text-left font-semibold w-1/8">
                                  Duración
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="px-3 py-2 text-center">
                                </td>
                                <td className="px-3 py-2 text-left">
                                  {med.Dosis}
                                </td>
                                <td className="py-2 text-left">
                                  {med.Farmaco}
                                </td>
                                <td className="py-2 text-left">
                                  {med.Dosis} tab
                                </td>
                                <td className="py-2 text-left">
                                  {med.Frecuencia} hrs
                                </td>
                                <td className="py-2 text-left">
                                  {med.Duracion} días
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      ))
                    ) : (
                      <div className="text-gray-400 italic text-center py-10 text-sm">
                        {selectedRecipe ? 'Receta vacía.' : 'Seleccione una receta para previsualizar.'}
                      </div>
                    )}
                  </div>
                  <div className="mt-auto print:fixed print:bottom-0 print:left-0 print:right-0 print:bg-white print:px-10 print:pb-8">
                    <div className="text-xs text-gray-700 font-sans">
                      <p className="pl-5 py-2 italic">
                        {selectedRecipe && selectedRecipe.Recomendacion}
                      </p>
                    </div>
                    <div className="border-t border-gray-200 pt-4 flex items-end justify-between">
                      <div className="text-center w-36">
                        <div className="border-b border-gray-400 mb-1.5">
                        </div>
                        <div className="text-[10px] text-gray-500 font-sans tracking-wide">
                          Firma del Médico
                        </div>
                      </div>
                      <div className="h-16 w-16 bg-gray-50 border border-gray-200 flex items-center justify-center p-1 rounded">
                        {selectedRecipe ? (
                          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${selectedRecipe.ID}`} alt="QR Validador" className="opacity-80 mix-blend-multiply" />
                        ) : (
                          <span className="text-[8px] text-gray-300">Sin QR</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Recetas;
