import API_BASE_URL from "../config";
import { fetchWithAuth } from "../services/api";
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthToken";
// import { ActivitySquare, Lock, Mail, ArrowRight, ShieldCheck, ChevronLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { motion } from "framer-motion";
// import { ConexionSql } from "../services/Conexion";
import hphLogo from "../assets/img/hph-logo.png";
import hospital from "../assets/img/hospital.png";
import tngsano from "../assets/img/logo_tngsano.png";
import microsoft from "../assets/img/microsoft.png";
// import appStore from "../assets/img/app-store.png";
import google from "../assets/img/google.png";
// import playStore from "../assets/img/play-store.png";
import qr from "../assets/img/qr.png";
import { Shield } from "lucide-react";
// ../assets/img/hutchison-ports.png


// interface LoginProps {
//   onLogin: () => void;
// }

const CrossBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef  = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    interface Particle { x: number; y: number; size: number; vx: number; vy: number }

    const make = (): Particle => {
      const a = Math.random() * Math.PI * 2;
      const s = 0.2 + Math.random() * 0.45;
      return {
        x:    Math.random() * canvas.width,
        y:    Math.random() * canvas.height,
        size: 8 + Math.random() * 12,
        vx:   Math.cos(a) * s,
        vy:   Math.sin(a) * s,
      };
    };

    const items: Particle[] = Array.from({ length: 45 }, make);

    const drawPlus = (x: number, y: number, size: number, color: string) => {
      const h  = size / 2;
      const th = Math.max(1.5, size * 0.20);
      ctx.fillStyle = color;
      ctx.fillRect(x - h,  y - th / 2, size, th);
      ctx.fillRect(x - th / 2, y - h,  th,   size);
    };

    let raf: number;

    const frame = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.fillStyle = "#f9fafb";
      ctx.fillRect(0, 0, W, H);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      for (const p of items) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -20)      p.x = W + 20;
        else if (p.x > W + 20) p.x = -20;
        if (p.y < -20)      p.y = H + 20;
        else if (p.y > H + 20) p.y = -20;

        const dist = Math.hypot(p.x - mx, p.y - my);
        const hf   = dist < 110 ? Math.max(0, 1 - dist / 110) : 0;

        const color = hf > 0
          ? `rgba(215,50,50,${(0.18 + hf * 0.72).toFixed(2)})`
          : "rgba(180,185,195,0.28)";

        drawPlus(p.x, p.y, p.size, color);
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0"
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mouseRef.current = { x: e.clientX - r.left, y: e.clientY - r.top };
      }}
      onMouseLeave={() => { mouseRef.current = { x: -9999, y: -9999 }; }}
    />
  );
};

const Login: React.FC = () => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [panelContent, setPanelContent] = useState<2 | 3 | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPass] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [mfaDigits, setMfaDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [setupCode, setSetupCode] = useState("");
  const [setupDigits, setSetupDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [setupError, setSetupError] = useState("");
  const [isValidatingMfa, setIsValidatingMfa] = useState(false);
  const [mfaData, setMfaData] = useState<any>(null);

  // Navegar al panel secundario: poner contenido y abrir el slide
  const goToPanel = (s: 2 | 3) => {
    setPanelContent(s);
    setStep(s);
    setPanelOpen(true);
  };

  // Regresar: cerrar slide primero, limpiar contenido al terminar la animación
  const goBack = () => {
    setPanelOpen(false);
    setStep(1);
    setError("");
    setTimeout(() => setPanelContent(null), 500);
  };

  const { loginStepOne, loginStepTwo, loginDirect } = useAuth();
  const navigate = useNavigate();
  const mfaRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const setupRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const handleSetupDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...setupDigits];
    newDigits[index] = value.substring(value.length - 1);
    setSetupDigits(newDigits);
    setSetupCode(newDigits.join(""));
    if (setupError) setSetupError("");
    if (value && index < 5) {
      setupRefs[index + 1].current?.focus();
    }
  };

  const handleSetupDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !setupDigits[index] && index > 0) {
      setupRefs[index - 1].current?.focus();
    }
  };

  const handleSetupPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const newDigits = [...setupDigits];
    text.split("").forEach((ch, i) => { newDigits[i] = ch; });
    setSetupDigits(newDigits);
    setSetupCode(newDigits.join(""));
    if (setupError) setSetupError("");
    const nextIndex = Math.min(text.length, 5);
    setupRefs[nextIndex].current?.focus();
  };

  const handleFirstStep = async (e: React.FormEvent) => {
    e.preventDefault();

    if (usuario.trim() === "" || password.trim() === "") {
      setError("Ingrese un usuario y contraseña válidos.");
      return;
    }

    setError("");
    setIsLoading(true);

    const startTime = Date.now();

    const result = await loginStepOne(usuario, password);
    // console.table(result);

    const elapsed = Date.now() - startTime;
    const remainingTime = 1000 - elapsed;

    if (remainingTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, remainingTime));
    }

    if (result.success) {
      setUserData(result.user);
      goToPanel(2);
      setTimeout(() => mfaRefs[0].current?.focus(), 400);
    } else if (result.mfaSetup) {
      console.table(result.mfaData);

      setUserData(result.user);
      setMfaData(result.mfaData);
      goToPanel(3);
    } else {
      setError(result.message);
    }

    setIsLoading(false);
  };

  const handleSecondStep = async (e: React.FormEvent) => {
    e.preventDefault();

    const fullCode = mfaDigits.join("");
    if (fullCode.length < 6) {
      setError("Ingrese el código de 6 dígitos.");
      return;
    }

    setIsLoading(true);
    const startTime = Date.now();

    const result = await loginStepTwo(userData, fullCode);

    const elapsed = Date.now() - startTime;
    const remainingTime = 2000 - elapsed;
    
    if (remainingTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, remainingTime));
    }

    if (result.success) {
      navigate("/");
    } else {
      setError(result.message);
    }

    setIsLoading(false);
  };

  const handleMfaChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // solo números
    const newDigits = [...mfaDigits];
    newDigits[index] = value.substring(value.length - 1); // último caracter si sobreescribe
    setMfaDigits(newDigits);
    setError("");
    // auto-focus siguiente
    if (value && index < 5) {
      mfaRefs[index + 1].current?.focus();
    }
  };

  const handleMfaKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !mfaDigits[index] && index > 0) {
      mfaRefs[index - 1].current?.focus();
    }
  };

  const handleMfaPaste = (e: React.ClipboardEvent) => {
    const pasteData = e.clipboardData.getData("text").slice(0, 6);
    if (!/^\d+$/.test(pasteData)) return;
    const newDigits = [...mfaDigits];
    pasteData.split("").forEach((char, i) => {
      if (i < 6) newDigits[i] = char;
    });
    setMfaDigits(newDigits);
    const nextIndex = pasteData.length < 6 ? pasteData.length : 5;
    mfaRefs[nextIndex].current?.focus();
  };

  const fetchValidarMFA = async () => {
    setSetupError("");
    setIsValidatingMfa(true);
    try {
      await new Promise(r => setTimeout(r, 2000));
      
      const payload = {
        id: mfaData?.id,
        account: userData?.usuario,
        secretKey: mfaData?.object?.secretKey,
        manualEntryKey: mfaData?.object?.manualEntryKey,
        qr: mfaData?.object?.authenticationBarCodeImage,
        code: setupCode,
      };

      console.table(payload);

      const res = await fetch(`${API_BASE_URL}/LoginToken/ValidarCodigoMFA`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json().catch(() => null);

      if (!result?.ok) {
        setSetupError(result?.message || "Código incorrecto.");
      } else {
        localStorage.setItem("lastMfaValidation", Date.now().toString());
        localStorage.setItem("user_session", JSON.stringify(result.user));
        localStorage.setItem("auth_token", result.token);
        window.location.href = "/Agenda";
      }
    } catch {
      setSetupError("Error de conexión.");
    } finally {
      setIsValidatingMfa(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden font-sans p-4">
      <CrossBackground />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl bg-white/90 backdrop-blur-2xl rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden z-10 flex flex-col md:flex-row min-h-150"
      >
        <div
          className="hidden md:flex md:w-1/2 relative items-center justify-center p-12 overflow-hidden"
          // style={{
          //   backgroundImage: `url(${tngsano})`,
          //   backgroundSize: "cover",
          //   backgroundPosition: "center",
          // }}
        >
          <style>{`
            @keyframes tunnelPulse {
              0%   { transform: scale(0.6) rotate(0deg);   opacity: 0.55; }
              50%  { transform: scale(1.3) rotate(180deg); opacity: 0.9;  }
              100% { transform: scale(0.6) rotate(360deg); opacity: 0.55; }
            }
            .tunnel-ring {
              position: absolute;
              inset: -20%;
              border-radius: 9999px;
              animation: tunnelPulse 9s ease-in-out infinite;
            }
          `}</style>
          <div className="absolute inset-0 bg-radial from-sky-blue to-sea-blue opacity-90"></div>
          <div className="absolute inset-0 overflow-hidden">
            <div className="tunnel-ring bg-radial from-sky-blue/60 via-sea-blue/40 to-transparent" style={{ animationDelay: "0s" }}></div>
            <div className="tunnel-ring bg-radial from-sea-blue/50 via-sky-blue/30 to-transparent" style={{ animationDelay: "-3s" }}></div>
            <div className="tunnel-ring bg-radial from-sky-blue/40 via-sea-blue/20 to-transparent" style={{ animationDelay: "-6s" }}></div>
          </div>
          <div className="relative z-10 text-center text-white">
            <img
              src={tngsano}
              draggable={false}
              className="w-full h-auto max-w-100 mx-auto rounded-2xl mb-4"
            />
          </div>
        </div>

        <div className="w-full md:w-1/2 flex flex-col bg-linear-to-b from-white to-gray-50">
          <div className="relative flex-1 overflow-hidden">
            <div
              className="flex h-full transition-transform duration-500 ease-in-out"
              style={{ transform: panelOpen ? "translateX(-100%)" : "translateX(0%)" }}
            >
              {/* PASO 1: LOGIN */}
              <div className="w-full shrink-0 px-8 md:px-12 py-8 flex flex-col justify-center">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-black text-primary uppercase tracking-tight mb-2">
                  {/* <h2 className="text-2xl font-black bg-linear-to-r from-sea-blue to-sky-blue bg-clip-text text-transparent uppercase tracking-tight mb-2"> */}
                    Bienvenido
                  </h2>
                  <p className="text-sm text-gray-700 font-semibold mt-2">
                    Ingrese sus credenciales de acceso
                  </p>
                </div>

                <form onSubmit={handleFirstStep} className="space-y-5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">
                      Usuario
                    </label>
                    <div className="relative group">
                      <i className="fa-solid fa-pentagon absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs pointer-events-none group-focus-within:text-clinical-blue transition-colors"></i>
                      <input
                        type="text"
                        value={usuario}
                        onChange={(e) => setUsuario(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 text-xs font-semibold text-slate-400 bg-white border border-gray-50 shadow-xs rounded-md focus:outline-none focus:ring-2 focus:ring-clinical-blue/20 focus:border-clinical-blue transition-all"
                        // className="peer w-full px-6 pt-7 pb-3 bg-slate-50/50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-400 outline-none focus:border-secondary focus:bg-white transition-all shadow-sm"
                        placeholder="Cuenta"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">
                      Contraseña
                    </label>
                    <div className="relative group">
                      <i className="fa-solid fa-key absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs pointer-events-none group-focus-within:text-clinical-blue transition-colors"></i>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-12 py-3 text-xs font-semibold text-slate-400 bg-white border border-gray-50 shadow-xs rounded-md focus:outline-none focus:ring-2 focus:ring-clinical-blue/20 focus:border-clinical-blue transition-all"
                        placeholder="Clave de Acceso"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-sea-blue hover:bg-clinical-blue/5 rounded-lg transition-all focus:outline-none cursor-pointer"
                      >
                        <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"} text-sm`}></i>
                      </button>
                    </div>
                  </div>

                  {error && step === 1 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="px-3.5 py-3.5 font-bold rounded-lg bg-red-100 border border-red-100 text-red-600 text-xs"
                    >
                      <i className="mdi mdi-alert mr-3"></i>
                      {error}
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center font-bold uppercase tracking-[0.2em] mt-6 py-3.5 px-4 bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white rounded-md shadow-lg shadow-blue-500/30 transition-all cursor-pointer disabled:opacity-80 disabled:transform-none focus:outline-none"
                  >
                    Siguiente{" "}
                    {isLoading ? (
                      <i className="mdi mdi-loading animate-spin inline-block ml-2"></i>
                    ) : (
                      <i className="mdi mdi-chevron-right ml-2"></i>
                    )}
                  </button>
                </form>
                
                {/* <a className="mt-6 text-xs font-semibold text-right text-gray-400 cursor-pointer translate-y-1 hover:text-sea-blue hover:translate-y-0.5 transition-colors">
                  Registrarse
                </a> */}
              </div>
              

              <div className="w-full shrink-0 px-8 md:px-12 pt-24.5 pb-8 flex flex-col justify-start">
                {panelContent === 2 && (
                  <>
                    <div className="mb-15">
                      <div className="relative flex items-center justify-center">
                        <button
                          title="Regresar"
                          onClick={goBack}
                          className="absolute left-0 text-gray-400 hover:text-sea-blue transition-colors cursor-pointer"
                        >
                          <i className="mdi mdi-arrow-left-thick text-2xl"></i>
                        </button>
                        <h2 className="text-2xl font-black text-primary uppercase tracking-tight">
                          Verificación
                        </h2>
                      </div>
                      <p className="text-sm text-gray-700 text-center font-semibold mt-2">
                        Abra su aplicación de Authenticator
                        <br />Ingrese el código de un solo uso para continuar
                      </p>
                    </div>

                    <form onSubmit={handleSecondStep} className="space-y-10">
                      <div className="flex justify-between gap-2 max-w-xs mx-auto" onPaste={handleMfaPaste}>
                        {mfaDigits.map((digit, idx) => (
                          <input
                            key={idx}
                            ref={mfaRefs[idx]}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleMfaChange(idx, e.target.value)}
                            onKeyDown={(e) => handleMfaKeyDown(idx, e)}
                            className={`w-10 h-14 text-center text-xl font-bold border-2 rounded-xl outline-none transition-all duration-200 ${
                              digit
                                ? "border-clinical-blue bg-clinical-blue/5 text-clinical-darkBlue"
                                : "border-gray-100 bg-gray-50 text-gray-400 focus:border-sea-blue focus:ring-2 focus:bg-white focus:scale-105"
                            }`}
                          />
                        ))}
                      </div>

                      {error && (
                        <div className="px-3.5 py-3.5 font-bold rounded-lg bg-red-100 border border-red-100 text-red-600 text-xs">
                          <i className="mdi mdi-alert mr-3"></i>
                          {error}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isLoading || mfaDigits.join("").length < 6}
                        className="w-full flex items-center justify-center font-bold uppercase tracking-[0.2em] py-3.5 px-4 bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 hover:-translate-y-1 text-white rounded-md shadow-lg shadow-blue-500/30 transition-all cursor-pointer disabled:opacity-80 disabled:transform-none focus:outline-none"
                      >
                        Continuar{" "}
                        {isLoading
                          ? <i className="mdi mdi-loading animate-spin inline-block ml-2"></i>
                          : <i className="mdi mdi-chevron-right ml-2"></i>
                        }
                      </button>
                    </form>
                  </>
                )}

                {/* Contenido step 3: configuración MFA — por implementar */}
                {panelContent === 3 && (
                  <>
                    <div className="mb-0">
                      <div className="relative flex items-center justify-center">
                        <button
                          title="Regresar"
                          onClick={goBack}
                          className="absolute left-0 text-gray-400 hover:text-sea-blue transition-colors cursor-pointer"
                        >
                          <i className="mdi mdi-arrow-left-thick text-2xl"></i>
                        </button>
                        <h2 className="text-2xl font-black text-primary uppercase tracking-tight">
                          Autenticación
                        </h2>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-5 pb-4 border-b border-gray-100">
                        <div className="md:col-span-3">
                          <p className="text-sm text-gray-700 font-semibold mt-2">
                            Paso 1: Instale un software de autenticación
                          </p>
                          <p className="text-sm text-justify text-gray-500 mt-2">
                            Descargue e instale un software de autenticación en su dispositivo iPhone / iPad / Android.
                            {/* , si aún no está instalado */}
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          <div className="grid grid-cols-2 gap-3 mt-2">
                            <a title="Microsoft Authenticator" className="group" target="_blank" href="https://www.microsoft.com/es-es/account/authenticator">
                              <img
                                  src={microsoft}
                                  draggable={false}
                                  className="w-15 h-auto mx-auto group-hover:-translate-y-1 border border-gray-100 px-2 py-2.5 shadow-lg drop-shadow-2xl transition-all rounded-lg mb-2"
                                />
                              <p className="text-[9px] text-gray-400 font-semibold text-center group-hover:text-sea-blue cursor-pointer">
                                Microsoft Authenticator
                              </p>
                            </a>
                            <a title="Google Authenticator" className="group" target="_blank" href="https://support.google.com/accounts/answer/1066447?co=GENIE.Platform%3DAndroid&hl=es">
                              <img
                                src={google}
                                draggable={false}
                                className="w-15 h-auto mx-auto group-hover:-translate-y-1 border border-gray-100 px-2 py-3 shadow-lg drop-shadow-2xl transition-all rounded-lg mb-2"
                              />
                              <p className="text-[9px] text-gray-400 font-semibold text-center group-hover:text-sea-blue cursor-pointer">
                                Google Authenticator
                              </p>
                            </a>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        <div className="md:col-span-2">
                          <img
                            // src={qr}
                            src={mfaData.object.authenticationBarCodeImage}
                            // src={`data:image/png;base64,${mfaData.object.authenticationBarCodeImage}`}
                            draggable={false}
                            className="border border-gray-100 shadow-lg drop-shadow-2xl rounded-lg"
                          />
                          <p className="text-xs text-center text-gray-700 mt-2">
                            Clave secreta:
                          </p>
                          <p className="text-xs text-center text-gray-700 font-semibold">
                            {mfaData ? mfaData.object.manualEntryKey : "MM3WINZZGM3DINBW"}
                          </p>
                        </div>
                        <div className="md:col-span-3">
                          <p className="text-sm text-justify text-gray-700 font-semibold">
                            Paso 2: Vincula tu dispositivo a tu cuenta
                          </p>
                          <p className="text-sm text-justify text-gray-500 mt-2">
                            Tiene dos opciones para vincular su dispositivo: escanear el código QR o usar la clave secreta.
                          </p>
                          <div>
                            <div className="relative flex items-center mt-3.5">
                              <i className={`mdi mdi-shield-account absolute left-3 ${setupError && "text-red-500"}`}></i>
                              {/* <Shield className={`h-3.5 w-3.5 absolute left-3 top-2.5 ${setupError && "text-red-500"}`} /> */}
                              <input
                                maxLength={6}
                                type="number"
                                value={setupCode}
                                onChange={(e) => { if (e.target.value.length > 6) return; setSetupCode(e.target.value); if (setupError) setSetupError(""); }}
                                // className={`w-full p-2 pl-9 text-center border ${setupError ? "border-red-200 bg-red-50 text-red-500" : "border-gray-300 bg-white"} rounded-tl-lg rounded-bl-lg text-sm font-bold tracking-[18px] focus:ring-1 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                                className={`w-full p-2 pl-8 px-0 text-center border shadow-md ${ setupError ? "border-red-200 bg-red-50 text-red-500" : "border-gray-100 bg-white" } rounded-tl-lg rounded-bl-lg text-sm font-bold tracking-[1em] focus:ring-1 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                                placeholder="••••••"
                              />
                              <button
                                title="Enviar"
                                disabled={setupCode.length < 6 || isValidatingMfa}
                                onClick={() => { fetchValidarMFA(); }}
                                className={`flex items-center justify-center bg-linear-to-r from-sea-blue to-sky-blue hover:from-sea-blue/80 hover:to-sky-blue/80 disabled:opacity-50 text-white px-4 py-[4px] rounded-tr-lg rounded-br-lg text-lg font-semibold shadow-lg shadow-blue-500/30 transition-all cursor-pointer whitespace-nowrap`}
                              >
                                <i className={`mdi ${isValidatingMfa ? "mdi-loading animate-spin" : "mdi-share"}`}></i>
                              </button>
                            </div>
                            {setupError && (
                              <p className={`text-xs mt-1 text-red-400`}>
                                {setupError}
                              </p>
                            )}
                            {/* {setupError && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="px-3.5 py-3.5 font-bold rounded-lg bg-red-100 border border-red-100 text-red-600 text-xs mt-2"
                              >
                                <i className="mdi mdi-alert mr-3"></i>
                                {setupError}
                              </motion.div>
                            )} */}
                          </div>
                          {/* <div className="mt-2 text-right">
                            <a className="text-gray-400 text-xs hover:text-sea-blue cursor-pointer">
                              <i className="mdi mdi-help mr-1"></i>
                              Manual para configuración
                            </a>
                          </div> */}
                        </div>
                      </div>
                    </div>
                  </>
                )}

              </div>

            </div>
          </div>

          {/* Footer con Logo - Tamaño Fijo */}
          <div className="h-20 bg-gray-50/50 border-t border-gray-100 flex items-center justify-center px-6 shrink-0">
            <img
              src={hphLogo}
              className="object-contain opacity-100"
              width="130"
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
