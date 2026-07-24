import API_BASE_URL from "../config";
import { fetchWithAuth } from "../services/api";
import React, { useRef, useEffect, useState, ChangeEvent, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Phone,
  ChevronRight,
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

  useEffect(() => {
    ObtenerUsuarios();
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
    const result = await confirmModal(`${estado == 0 ? "alert-circle-outline" : "help-circle-outline"}`, `${estado == 0 ? "¿Eliminar usuario?" : "¿Reactivar usuario?"}`, `Si confirma esta acción se ${estado == 0 ? "dará de baja" : "reactivará"} el usuario </br><b>${nombre}</b>.`);

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

  const confirmModal = (icon: string, title: string, message: string) => {
    return Swal.fire({
      title: `<p style="font-size: 18px" class="font-bold uppercase text-gray-800">${title}</p>`,
      html: `<p style="font-size: 16px; padding: 0 30px">${message}</p>`,
      iconHtml: `
      <i class="mdi mdi-${icon} success-icon"></i>
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

  const filteredMedicos = medicos.filter(
    (m) =>
      m.Nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.Especialidad || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.Cedula || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative flex w-full overflow-hidden">
      <div
        className="flex-1 mt-14 transition-all duration-300 ease-in-out"
        // style={{ marginRight: isPanelOpen ? 420 : 0 }}
      >
        <div className="max-w-7xl mx-auto px-4 space-y-6 pb-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-linear-to-r from-white to-gray-50 p-4 sm:p-6 rounded-xl shadow-xl gap-4">
            <div>
              <h1 className="text-2xl font-bold text-sea-blue flex items-center">
                Gestión de Perfiles
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Alta, baja y modificación de personal.
              </p>
            </div>
            <button
              onClick={openPanelNew}
              className="w-35 flex items-center justify-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-lg shadow-blue-500/30 transition-all cursor-pointer"
            >
              <i className="mdi mdi-plus-thick mr-2"></i>
              Nuevo
            </button>
          </div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl shadow-xl overflow-hidden flex flex-col min-h-125"
          >
            <div className="flex items-center justify-between px-6 py-[21px] bg-linear-to-r from-white to-gray-100 rounded-t-xl">
              <div className="relative w-92">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  className={`w-full border rounded-lg pl-9 px-3 py-2 pr-10 text-xs outline-none transition-colors border-gray-100 shadow-md focus:border-clinical-blue focus:ring-1`}
                  placeholder="Buscar por nombre o cuenta"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <span className="text-xs font-bold text-gray-400">
                {filteredMedicos.length} perfiles
              </span>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg h-[541px] flex flex-col">
                <div className="flex-1 overflow-y-auto">
                  <table className="table-fixed w-full text-xs">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-linear-to-r from-white to-gray-100">
                        <th className="px-3 py-2 pl-6 text-left font-medium text-gray-700 mb-1 w-[108px]">
                          <span className="flex items-center gap-1">
                            Estado
                            <i className={`mdi mdi-sort-ascending text-sm transition-colors text-white group-hover:text-gray-400"}`}></i>
                          </span>
                        </th>
                        <th className="px-3 py-2 pl-6 text-left font-medium text-gray-700 mb-1 w-[100px]">
                          Matrícula
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 mb-1 w-[300px]">
                          Nombre
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 mb-1 w-[300px]">
                          Especialidad / Puesto
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 mb-1 w-[120px]">
                          Cédula
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 mb-1 w-[100px]">
                          Rol
                        </th>
                        <th className="px-3 py-2 text-center font-medium text-gray-700 mb-1 w-[100px]">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-12 h-12 rounded-full animate-spin bg-linear-to-r from-sea-blue to-sky-blue p-[4px] mt-2">
                                <div className="w-full h-full rounded-full bg-white"></div>
                              </div>
                              <span className="text-xs mt-3">
                                Cargando personal...
                              </span>
                            </div>
                          </td>
                        </tr>
                      ) : filteredMedicos.length > 0 ? (
                        filteredMedicos.map((medico) => (
                          <motion.tr
                            initial={{ opacity: 0, y: -1 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                            key={`${medico.ID || Math.random()}`}
                            className="group hover:bg-gray-50/80 transition-colors"
                          >
                            <td className="px-3 pl-6 text-left font-medium text-gray-700 mb-1">
                              {medico.Activo == "true" ?
                                <span className="flex items-center bg-linear-to-r from-sky-blue/20 to-gray-100 text-sea-blue text-xs font-semibold px-1.5 py-0.5 rounded-md">
                                  <i className="mdi mdi-shield-check mr-2"></i>
                                  Activo
                                </span>
                                :
                                <span className="flex items-center bg-linear-to-r from-red-200 to-gray-100 text-red-700 text-xs font-semibold px-1.5 py-0.5 rounded-md">
                                  <i className="mdi mdi-cancel mr-2"></i>
                                  Baja
                                </span>
                              }
                            </td>
                            <td className="px-3 pl-6 text-left font-medium text-gray-700 mb-1">
                              {medico.Matricula}
                            </td>
                            <td className="px-2 py-1.5">
                              <div className="flex items-center justify-between gap-3">
                                <div className="overflow-hidden min-w-0">
                                  <p title={medico.Nombre} className="text-[12px] font-bold uppercase text-gray-600 block truncate">
                                    {medico.Nombre}
                                  </p>
                                  <p className="text-[11px] text-gray-400 font-medium truncate">
                                    {medico.Usuario || "Sin cuenta"}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 text-left font-medium text-gray-700 mb-1">
                              {medico.Categoria_desc || "EXTERNO"}
                            </td>
                            <td className="px-3 text-left font-medium text-gray-700 mb-1">
                              {medico.Cedula || ""}
                            </td>
                            <td className="px-3 text-left font-medium text-gray-700 mb-1">
                              {/* { medico.Id_Rol == 1 ? <i className="mdi mdi-security mr-2"></i>
                              : medico.Id_Rol == 2 ? <i className="mdi mdi-stethoscope mr-2"></i>
                              : medico.Id_Rol == 4 ? <i className="mdi mdi-account mr-2"></i>
                              : <></>
                              } */}
                              {medico.Rol || "Usuario"}
                            </td>
                            <td className="px-2 pr-0 whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => openPanelEdit(medico)}
                                  className="w-9 h-9 text-gray-400 hover:text-sky-blue bg-linear-to-b hover:from-sky-blue/20 hover:to-gray-50 rounded-xl transition-all cursor-pointer"
                                  title="Editar"
                                >
                                  <i className="mdi mdi-account-edit-outline text-lg"></i>
                                </button>
                                {medico.Activo == "true" ?
                                  <button
                                    onClick={() => handleDelete(0, medico.ID, medico.Nombre)}
                                    className="w-9 h-9 text-gray-400 hover:text-red-500 bg-linear-to-b hover:from-red-100 hover:to-gray-50 rounded-xl transition-all cursor-pointer"
                                    title="Dar de Baja"
                                  >
                                    <i className="mdi mdi-trash-can-outline text-lg"></i>
                                  </button>
                                :
                                  <button
                                    className="w-9 h-9 text-gray-400 hover:text-aqua-green bg-linear-to-b hover:from-aqua-green/20 hover:to-gray-50 rounded-xl transition-all cursor-pointer"
                                    onClick={() => handleDelete(1, medico.ID, medico.Nombre)}
                                    title="Reactivar"
                                  >
                                    <i className="mdi mdi-cached text-lg"></i>
                                  </button>
                                }
                              </div>
                            </td>
                          </motion.tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                            <div className="flex flex-col items-center gap-2">
                              {/* <i className="mdi mdi-loading mdi-spin text-3xl text-sea-blue"></i> */}
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
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <aside
        className={`fixed top-[64px] right-0 h-[calc(100vh-64px)] bg-white border-l border-gray-200 transition-all duration-300 ease-in-out z-40 ${ isPanelOpen ? "" : "translate-x-full" }`}
        style={{ width: isPanelOpen ? 420 : 0}}
      >
        <div className="flex h-full w-full">
          <div className="flex flex-col border-r border-gray-100 h-full shrink-0" style={{ width: 420 }}>
            <div className="px-3 py-4 shrink-0 bg-linear-to-r from-white to-gray-100">
              <div className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <button 
                    title="Regresar"
                    className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-sea-blue bg-linear-to-b hover:from-sea-blue/10 hover:to-gray-50 rounded-xl transition-all cursor-pointer"
                    onClick={() => setIsPanelOpen(false)}
                  >
                    <i className={`mdi mdi-chevron-right text-2xl`}></i>
                  </button>
                  <div>
                    <p className="text-xs font-bold text-gray-800 truncate uppercase max-w-[320px]">
                      <i className="mdi mdi-account-multiple-plus mr-2"></i>
                      {formData.ID ? "Editar Usuario" : "Nuevo Usuario"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {formData.ID ? "Edición de cuenta de usuario" : "Registro de cuenta de usuario."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <form 
              id="medicoForm"
              onSubmit={handleSave}
              className="flex-1 overflow-y-auto px-3 py-4 flex flex-col"
            >
              <div className="flex-1 overflow-y-auto p-2 space-y-3">
                <div>
                  <h3 className="text-xs font-bold text-gray-800 mb-2 flex items-center">
                    <i className="mdi mdi-lock-open mr-2"></i>
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
                          className={`w-full border rounded-lg px-3 py-2 pr-8 text-xs shadow-md outline-none ${loadingMat || formData.ID !== null ? "bg-gray-50 text-gray-800 border-gray-100" : matriculaDuplicada || matriculaNoEncontrada ? "border-red-200 bg-red-50 text-red-500" : "border-gray-100 focus:border-clinical-blue focus:ring-1 focus:ring-clinical-blue"}`}
                        />
                        {loadingMat && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <i className="mdi mdi-loading mdi-spin text-gray-400 text-sm"></i>
                          </div>
                        )}
                        {!loadingMat && matriculaDuplicada && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 group/mat">
                            <i className="mdi mdi-alert-circle text-red-400 text-sm cursor-pointer"></i>
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
                        className="w-full border border-gray-100 shadow-md rounded-lg p-2 text-xs focus:ring-1 focus:ring-sea-blue outline-none"
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
                        className={`w-full border rounded-lg px-3 py-2 pr-10 text-xs shadow-md outline-none ${cuentaNoEncontrada ? "border-red-200 bg-red-50 text-red-500" : "border-gray-100 bg-gray-50 text-gray-800"}`}
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
                          className={`w-full border rounded-lg px-3 py-2 text-xs shadow-md outline-none ${cuentaNoEncontrada ? "border-red-200 bg-red-50 text-red-500" : !emailEdit ? "border-gray-100 bg-gray-50 text-gray-800" : "border-gray-100 focus:ring-1 focus:ring-sea-blue"}`}
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
                  <i className="mdi mdi-information-slab-circle mr-2"></i>
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
                      className="w-full border border-gray-100 shadow-md rounded-lg px-3 py-2 text-xs bg-gray-50 text-gray-800"
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
                      className="w-full border border-gray-100 shadow-md rounded-lg px-3 py-2 text-xs bg-gray-50 text-gray-800"
                      placeholder="Puesto"
                    />
                  </div>
                </div>
                {(formData.Id_Rol == 1 || formData.Id_Rol == 2) && (
                  <>
                    <h3 className="text-xs font-bold text-gray-800 mt-6 mb-2 flex items-center">
                      <i className="mdi mdi-medal mr-2"></i>
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
                          className="w-full border border-gray-100 shadow-md rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-sea-blue outline-none"
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
                          className="w-full border border-gray-100 shadow-md rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-sea-blue outline-none"
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
            <div className={`px-5 py-4 shrink-0 flex justify-between items-center `}>
              <button
                // onClick={() => handleSubmit()}
                form="medicoForm"
                className="w-full flex items-center justify-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 rounded-lg text-xs font-semibold shadow-md shadow-blue-500/30 transition-all cursor-pointer whitespace-nowrap"
              >
                <i className="mdi mdi-account-check mr-2"></i>
                Guardar Usuario
              </button>
            </div>

          </div>
        </div>
      </aside>
    </div>
  );
};

export default Configuracion;