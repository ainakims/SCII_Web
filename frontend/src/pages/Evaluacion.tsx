import API_BASE_URL from "../config";
import { fetchWithAuth } from "../services/api";
import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import {
  Search, Factory, User, Briefcase, Heart, FlaskConical,
  ClipboardList, CheckCircle, AlertTriangle, Weight, Ruler,
  Scale, Activity, HeartPulse, Wind, Bubbles, AudioWaveform,
  Baby, Cigarette, Wine, Syringe, Eye, Ear, Stethoscope,
  Bone, Brain, FileText, Check,
  BriefcaseBusiness,
  Calendar,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  MessageCircleDashed,
  Goal,
} from "lucide-react";
import Swal from "sweetalert2";
import { motion } from 'framer-motion';
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthToken";


// ─── Types ────────────────────────────────────────────────────────────────────

interface PatientData {
  id: number | null;
  matricula: string | null;
  nombre: string;
  tipoPaciente: "I" | "E" | null;
  estatus: string | null;
  especialidad: string;
  edad: string;
}

interface FichaIdentificacion {
  fechaEval: string;
  edad: string;
  genero: string;
  estadoCivil: string;
  fechaNacimiento: string;
  escolaridad: string;
  noImss: string;
  puestoAspira: string;
  contactoEmergencia: string;
  numeroContacto: string;
}

interface AntLaboral {
  empresa: string;
  puesto: string;
  tiempo: string;
}

interface ExposicionAgente {
  tiempo: string;
  puesto: string;
}

interface AntFamiliar {
  abuelos: boolean | null;
  padres: boolean | null;
  hermanos: boolean | null;
  hijos: boolean | null;
  otros: boolean | null;
}

interface AntPersonalPatologico {
  si: boolean;
  observacion: string;
}

interface VacunaInfo {
  inflChk: boolean; toxChk: boolean; hepaChk: boolean; neumoChk: boolean;
  influenza: string; toxoide: string; hepatitisB: string; neumococica: string;
  covid1ra: boolean; covid2da: boolean; covidRF: boolean;
  covid1raFecha: string; covid2daFecha: string; covidRFFecha: string;
}

interface AntNoPatologico {
  toxicomanias: boolean;
  toxicomaniasEsp: string;
  alcoholismo: boolean;
  alcoholismoEsp: string;
  tabaquismo: boolean;
  tabaquismoEsp: string;
}

interface AntGinecoObstetrico {
  menarquia: string;
  ritmo: string;
  fum: string;
  dismenorrea: string;
  incapacitante: string;
  diasDismenorrea: string;
  papanicolau: string;
  mamas: string;
  gestas: string;
  partos: string;
  cesareas: string;
  abortos: string;
  usg: string;
  mastografia: string;
  birads: string;
}

interface VitalSigns {
  Peso: string;
  Talla: string;
  Abdomen: string;
  IMC: string;
  Sistolica: string;
  Diastolica: string;
  TA: string;
  FC: string;
  FR: string;
  SpO2: string;
}

type NormalAnormal = "Normal" | "Anormal" | "";

interface ExpField {
  valor: NormalAnormal;
  descripcion: string;
}

type ExpSection = Record<string, ExpField>;

type SiNo = "Si" | "No" | "";

interface ExploracionSeccion {
  [key: string]: { valor: NormalAnormal; descripcion: string };
}

interface Laboratorios {
  bh: string;
  hto: string;
  gr: string;
  gb: string;
  plaq: string;
  glucosa: string;
  colesterol: string;
  trigliceridos: string;
  urea: string;
  acUrico: string;
}

interface Conclusiones {
  diagnostico1: string;
  diagnostico2: string;
  diagnostico3: string;
  diagnostico4: string;
  recomendacion1: string;
  recomendacion2: string;
  recomendacion3: string;
  resultado: "Sano" | "Riesgo moderado" | "Riesgo alto" | "";
  // gradoSalud: string;
  observaciones: "Optimo" | "Bueno" | "Regular" | "Malo" | "";
}

const STEPS = [
  { label: "Ficha de Identificación", icon: "mdi mdi-account" },
  { label: "Antecedentes Laborales", icon: "mdi mdi-briefcase-variant" },
  { label: "Antecedentes Familiares", icon: "mdi mdi-human-male-female-child" },
  { label: "Antecedentes Personales Patológicos", icon: "mdi mdi-virus" },
  { label: "Antecedentes Personales No Patológicos", icon: "mdi mdi-virus-off-outline" },
  { label: "Antecedentes Gineco-Obstétricos", icon: "mdi mdi-mother-heart" },
  { label: "Antecedentes de Incapacidad", icon: "mdi mdi-heart-pulse" },
  { label: "Exploración Física", icon: "mdi mdi-human-handsdown" },
  { label: "Estudios de Gabinete y Laboratorio", icon: "mdi mdi-flask" },
  { label: "Conclusiones", icon: "mdi mdi-chat-processing" },
];

const VerticalStepper = memo(({ currentStep, onStepClick }: {
  currentStep: number;
  onStepClick: (i: number) => void;
}) => {
  return (
    <ol className="space-y-[16.5px] w-100">
      {STEPS.map((step, i) => {
        const isDone = i < currentStep;
        const isActive = i === currentStep;
        // const isPending = i > currentStep;

        const containerClasses =
          isActive ? "bg-sky-blue text-white"
          : isDone ? "bg-sea-blue hover:bg-sea-blue/80 hover:-translate-y-1 text-white cursor-pointer"
          : "bg-white border-gray-200 shadow-sm text-gray-700";

        return (
          <li key={i} onClick={() => isDone && onStepClick(i)}>
            <div
              className={`w-full py-2.5 px-5 border rounded-xl transition-colors duration-200 ${containerClasses}`}
              role="alert"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm mr-3 font-bold flex items-center min-w-0 w-full">
                  {/* <span className="shrink-0 mr-1">
                    {i + 1}.
                  </span>  */}
                  {/* <i className={`${step.icon} mr-2`}></i> */}
                  <span className="truncate">
                    {step.label}
                  </span>
                </h2>
                {isDone ? (
                  // <Check className="w-5 h-5" strokeWidth={2} />
                  <i className="mdi mdi-check-bold"></i>
                ) : (
                  <i className="mdi mdi-arrow-right-thick"></i>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
});

const NormalAnormalToggle = memo(({ value, onChange, options = ["Normal", "Anormal"] }: {
  value: NormalAnormal;
  onChange: (v: NormalAnormal) => void;
  options?: [string, string];
}) => (
  <div className="flex gap-4">
    {options.map((opt) => (
      <button
        key={opt}
        type="button"
        onClick={() => onChange(value === opt ? "" : (opt as NormalAnormal))}
        className={`w-full flex items-center justify-center px-0 py-2 rounded-lg text-xs text-gray-400 border border-gray-300 transition-all cursor-pointer ${
          value === opt
            ? "bg-gray-50 text-gray-700 font-semibold"
              
            : "bg-gray"
        }`}
      >
        {/* <i className={`mdi mdi-${opt == options[0] ? "check-circle-outline" : "alert-outline"} mr-2`}></i> */}
        {opt}
      </button>
    ))}
  </div>
));

const ZoneTable: React.FC<{
  title: string;
  icon: string;
  fields: string[];
  section: ExploracionSeccion;
  setter: React.Dispatch<React.SetStateAction<ExploracionSeccion>>;
  withDescription?: boolean;
  noHeader?: boolean;
  toggleOptions?: [string, string];
}> = ({ title, icon, fields, section, setter, withDescription, noHeader, toggleOptions }) => (
  <div>
    {!noHeader &&
      <h2 className="text-sm font-bold text-gray-800 flex items-center mb-3">
        <i className={`mdi ${icon} mr-2`}></i>
        {title}
      </h2>
    }
    <div className="flex flex-col gap-y-2">
      {fields.map((field) => (
        <div key={field} className="grid grid-cols-2 gap-x-4 items-center">
          <div className={`grid grid-cols-2 items-center ${!withDescription ? "col-span-2" : ""}`}>
            <label className="text-xs font-medium text-gray-700">
              {field}
            </label>
            <NormalAnormalToggle
              value={section[field]?.valor ?? ""}
              options={toggleOptions}
              onChange={(v) =>
                setter((prev) => ({
                  ...prev,
                  [field]: { ...prev[field], valor: v },
                }))
              }
            />
          </div>

          {withDescription && (
            <div className="relative flex items-center">
              {/* <MessageCircleDashed className="h-3.5 w-3.5 absolute left-3 text-gray-400 pointer-events-none z-10" /> */}
              <input
                type="text"
                value={section[field]?.descripcion ?? ""}
                onChange={(e) => setter((prev) => ({ ...prev, [field]: { ...prev[field], descripcion: e.target.value }, })) }
                placeholder="Descripción"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-800 font-medium outline-none"
                // className="w-full p-2 pl-9 pr-10 border border-gray-300 rounded-lg text-xs focus:ring-1 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
              />
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
);

const SiNoToggle: React.FC<{
  value: boolean | null;
  onChange: (v: boolean | null) => void;
  label?: string;
}> = ({ value, onChange, label }) => (
  <div className="flex items-center gap-2">
    {label && <span className="text-xs text-gray-600 min-w-[60px]">{label}</span>}
    <div className="flex gap-1">
      {[true, false].map((opt) => (
        <button
          key={String(opt)}
          type="button"
          onClick={() => onChange(value === opt ? null : opt)}
          className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all cursor-pointer ${
            value === opt
              ? opt
                ? "bg-green-100 border-green-400 text-green-700"
                : "bg-red-100 border-red-400 text-red-700"
              : "bg-gray-50 border-gray-300 text-gray-400 hover:border-gray-400"
          }`}
        >
          {opt ? "Sí" : "No"}
        </button>
      ))}
    </div>
  </div>
);

// ─── Checkbox cell ────────────────────────────────────────────────────────────

const Toggle2: React.FC<{
  value: string;
  options: [string, string];
  onChange: (v: string) => void;
}> = ({ value, options, onChange }) => (
  <div className="flex gap-4">
    {options.map((opt) => (
      <button
        key={opt}
        type="button"
        onClick={() => onChange(value === opt ? "" : opt)}
        className={`flex-1 px-2 py-1.5 rounded-lg text-xs border transition-all cursor-pointer ${
          value === opt
            ? "bg-gray-100 text-gray-800 border-gray-400 font-semibold"
            : "bg-white text-gray-400 border-gray-300"
        }`}
      >
        {opt}
      </button>
    ))}
  </div>
);

const CkCell = memo(({ checked, onChange }: { checked: boolean | null; onChange: (v: boolean | null) => void }) => (
  <button
    type="button"
    onClick={() => onChange(checked ? null : true)}
    className={`w-5 h-5 rounded border transition-all cursor-pointer flex items-center justify-center ${
      checked ? "bg-sea-blue border-sea-blue text-white" : "border-gray-300 bg-white"
    }`}
  >
    {checked && <span className="text-[10px] font-bold">✓</span>}
  </button>
));

const StepNavButtons: React.FC<{
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
}> = ({ currentStep, totalSteps, onBack, onNext }) => (
  <div className="ml-auto flex items-center gap-2">
    <button
      title="Anterior"
      onClick={onBack}
      disabled={currentStep === 0}
      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
    >
      <ChevronLeft className="h-4 w-4" />
    </button>
    <button
      title="Siguiente"
      onClick={onNext}
      disabled={currentStep === totalSteps - 1}
      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
    >
      <ChevronRight className="h-4 w-4" />
    </button>
  </div>
);

// ── Helper: selecciona/deselecciona toda una columna de una sección ──────────
const selectAllSection = (
  fields: string[],
  section: ExpSection | ExploracionSeccion,
  setter: React.Dispatch<React.SetStateAction<any>>,
  val: "Normal" | "Anormal"
) => {
  const allSelected = fields.every((f) => (section[f] as any)?.valor === val);
  setter((prev: any) => {
    const next = { ...prev };
    fields.forEach((f) => { next[f] = { ...next[f], valor: allSelected ? "" : val }; });
    return next;
  });
};

const thSelectCls = (active: boolean, type: "normal" | "anormal") =>
  `px-3 py-2 text-center font-medium w-1/4 cursor-pointer select-none transition-colors ` +
  (active
    ? type === "normal"
      ? "bg-blue-50 text-blue-600"
      : "bg-red-50 text-red-500"
    : "bg-gray-50 text-gray-700 hover:bg-gray-100");

const thSelectClsNarrow = (active: boolean, type: "normal" | "anormal") =>
  `px-3 py-2 text-center font-medium w-[10%] cursor-pointer select-none transition-colors ` +
  (active
    ? type === "normal"
      ? "bg-gray-200/60"
      : "bg-gray-200/60"
    : "bg-gray-50 text-gray-700 hover:bg-gray-100");

const ExpTable: React.FC<{
  title: string;
  fields: string[];
  section: ExpSection;
  setter: React.Dispatch<React.SetStateAction<ExpSection>>;
  paired?: boolean;
}> = ({ title, fields, section, setter }) => {
  const allN = fields.every((f) => section[f]?.valor === "Normal");
  const allA = fields.every((f) => section[f]?.valor === "Anormal");
  return (
    <div>
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-300">
              <th className="px-3 py-2 text-left font-medium text-gray-700 bg-gray-50 w-2/5">
                {title}
              </th>
              <th
                className={thSelectCls(allN, "normal")}
                title="Clic para marcar todo"
                onClick={() => selectAllSection(fields, section, setter, "Normal")}
              >
                Normal
              </th>
              <th
                className={thSelectCls(allA, "anormal")}
                title="Clic para marcar todo"
                onClick={() => selectAllSection(fields, section, setter, "Anormal")}
              >
                Anormal
              </th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field) => (
              <tr key={field}>
                <td className="px-3 py-2 font-medium text-gray-700">{field}</td>
                <td className="px-3 py-2 text-center">
                  <div className="flex justify-center">
                    <CkCell
                      checked={section[field]?.valor === "Normal"}
                      onChange={() => setter((p) => ({ ...p, [field]: { ...p[field], valor: p[field]?.valor === "Normal" ? "" : "Normal" } }))}
                    />
                  </div>
                </td>
                <td className="px-3 py-2 text-center">
                  <div className="flex justify-center">
                    <CkCell
                      checked={section[field]?.valor === "Anormal"}
                      onChange={() => setter((p) => ({ ...p, [field]: { ...p[field], valor: p[field]?.valor === "Anormal" ? "" : "Anormal" } }))}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

function ExpTableDouble({ leftTitle, leftFields, leftSection, leftSetter, rightTitle, rightFields, rightSection, rightSetter }: {
  leftTitle: string;
  leftFields: string[];
  leftSection: ExpSection;
  leftSetter: React.Dispatch<React.SetStateAction<ExpSection>>;
  rightTitle: string;
  rightFields: string[];
  rightSection: ExpSection;
  rightSetter: React.Dispatch<React.SetStateAction<ExpSection>>;
}) {
  const lAllN = leftFields.every((f) => leftSection[f]?.valor === "Normal");
  const lAllA = leftFields.every((f) => leftSection[f]?.valor === "Anormal");
  const rAllN = rightFields.every((f) => rightSection[f]?.valor === "Normal");
  const rAllA = rightFields.every((f) => rightSection[f]?.valor === "Anormal");

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden mb-4">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-300">
            <th className="px-3 py-2 text-left font-medium text-gray-700 bg-gray-50 w-[30%]">
              {leftTitle}
            </th>
            <th
              className={thSelectClsNarrow(lAllN, "normal")}
              title="Clic para marcar todo"
              onClick={() => selectAllSection(leftFields, leftSection, leftSetter, "Normal")}
            >
              Normal
            </th>
            <th
              className={thSelectClsNarrow(lAllA, "anormal")}
              title="Clic para marcar todo"
              onClick={() => selectAllSection(leftFields, leftSection, leftSetter, "Anormal")}
            >
              Anormal
            </th>
            <th className="px-3 py-2 text-left font-medium border-l border-gray-300 text-gray-700 bg-gray-50 w-[30%]">
              {rightTitle}
            </th>
            <th
              className={thSelectClsNarrow(rAllN, "normal")}
              title="Clic para marcar todo"
              onClick={() => selectAllSection(rightFields, rightSection, rightSetter, "Normal")}
            >
              Normal
            </th>
            <th
              className={thSelectClsNarrow(rAllA, "anormal")}
              title="Clic para marcar todo"
              onClick={() => selectAllSection(rightFields, rightSection, rightSetter, "Anormal")}
            >
              Anormal
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: Math.max(leftFields.length, rightFields.length) }).map((_, i) => {
            const lf = leftFields[i];
            const rf = rightFields[i];
            return (
              <tr key={i}>
                {/* LEFT */}
                <td className="px-3 py-2 font-medium text-gray-700">{lf ?? ""}</td>
                <td className="px-3 py-2 text-center">
                  {lf && (
                    <div className="flex justify-center">
                      <CkCell
                        checked={leftSection[lf]?.valor === "Normal"}
                        onChange={() =>
                          leftSetter((p) => ({
                            ...p,
                            [lf]: { ...p[lf], valor: p[lf]?.valor === "Normal" ? "" : "Normal" },
                          }))
                        }
                      />
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  {lf && (
                    <div className="flex justify-center">
                      <CkCell
                        checked={leftSection[lf]?.valor === "Anormal"}
                        onChange={() =>
                          leftSetter((p) => ({
                            ...p,
                            [lf]: { ...p[lf], valor: p[lf]?.valor === "Anormal" ? "" : "Anormal" },
                          }))
                        }
                      />
                    </div>
                  )}
                </td>
                {/* RIGHT */}
                <td className="px-3 py-2 font-medium text-gray-700 border-l border-gray-300">{rf ?? ""}</td>
                <td className="px-3 py-2 text-center">
                  {rf && (
                    <div className="flex justify-center">
                      <CkCell
                        checked={rightSection[rf]?.valor === "Normal"}
                        onChange={() =>
                          rightSetter((p) => ({
                            ...p,
                            [rf]: { ...p[rf], valor: p[rf]?.valor === "Normal" ? "" : "Normal" },
                          }))
                        }
                      />
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  {rf && (
                    <div className="flex justify-center">
                      <CkCell
                        checked={rightSection[rf]?.valor === "Anormal"}
                        onChange={() =>
                          rightSetter((p) => ({
                            ...p,
                            [rf]: { ...p[rf], valor: p[rf]?.valor === "Anormal" ? "" : "Anormal" },
                          }))
                        }
                      />
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
} 

const makeExpSection = (fields: string[]): ExploracionSeccion =>
  Object.fromEntries(fields.map((f) => [f, { valor: "" as NormalAnormal, descripcion: "" }]));

const calcIMC = (peso: string, talla: string) => {
  const w = parseFloat(peso), h = parseFloat(talla);
  return w > 0 && h > 0 ? (w / (h * h)).toFixed(2) : "";
};

const updateExpSection = (
  setter: React.Dispatch<React.SetStateAction<ExploracionSeccion>>,
  field: string, key: "valor" | "descripcion", value: string
) => setter((prev) => ({ ...prev, [field]: { ...prev[field], [key]: value } }));

const birads: Record<string, string> = {
  "B0": "No concluyente.",
  "B1": "Negativo de cáncer.",
  "B2": "Hallazgos no benignos.",
  "B3": "Requiere evaluación.",
  "B4": "Sospecha de cáncer.",
  "B5": "Alta sospecha de cáncer.",
  "B6": "Malignidad confirmada.",
};

const ExploracionTable = memo(({ title, icon, section, setter, extraRows }: {
  title: string;
  icon: React.ReactNode;
  section: ExploracionSeccion;
  setter: React.Dispatch<React.SetStateAction<ExploracionSeccion>>;
  extraRows?: React.ReactNode;
}) => {
  const fields = Object.keys(section);
  const allN = fields.every((f) => section[f]?.valor === "Normal");
  const allA = fields.every((f) => section[f]?.valor === "Anormal");
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sea-blue">{icon}</span>
        <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">{title}</span>
      </div>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-3 py-2 text-left font-medium text-gray-500 bg-gray-50 w-1/3">Campo</th>
              <th
                className={thSelectCls(allN, "normal") + " w-1/3"}
                title="Clic para marcar todo"
                onClick={() => selectAllSection(fields, section, setter, "Normal")}
              >Normal</th>
              <th
                className={thSelectCls(allA, "anormal")}
                title="Clic para marcar todo"
                onClick={() => selectAllSection(fields, section, setter, "Anormal")}
              >Anormal</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, i) => (
              <tr key={field} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                <td className="px-3 py-2 text-gray-600 font-medium">{field}</td>
                <td className="px-3 py-2" colSpan={2}>
                  <NormalAnormalToggle value={section[field].valor} onChange={(v) => updateExpSection(setter, field, "valor", v)} />
                </td>
              </tr>
            ))}
            {extraRows}
          </tbody>
        </table>
      </div>
    </div>
  );
});

const DescExpTable = memo(({ title, fields, section, setter }: {
  title: string;
  fields: string[];
  section: ExploracionSeccion;
  setter: React.Dispatch<React.SetStateAction<ExploracionSeccion>>;
}) => {
  const allN = fields.every((f) => section[f]?.valor === "Normal");
  const allA = fields.every((f) => section[f]?.valor === "Anormal");
  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden mb-4">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-300">
            <th className="px-3 py-2 text-left font-medium text-gray-700 bg-gray-50 w-[30%]">{title}</th>
            <th
              className={thSelectClsNarrow(allN, "normal")}
              title="Clic para marcar todo"
              onClick={() => selectAllSection(fields, section, setter, "Normal")}
            >
              Normal
            </th>
            <th
              className={thSelectClsNarrow(allA, "anormal")}
              title="Clic para marcar todo"
              onClick={() => selectAllSection(fields, section, setter, "Anormal")}
            >
              Anormal
            </th>
            <th className="px-3 py-2 text-left font-medium text-gray-700 bg-gray-50 w-[50%]">
              Descripción
            </th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => (
            <tr key={field}>
              <td className="px-3 py-2 font-medium text-gray-700">{field}</td>
              <td className="px-3 py-2 text-center">
                <div className="flex justify-center">
                  <CkCell
                    checked={section[field]?.valor === "Normal"}
                    onChange={() => setter((p) => ({ ...p, [field]: { ...p[field], valor: p[field]?.valor === "Normal" ? "" : "Normal" } }))}
                  />
                </div>
              </td>
              <td className="px-3 py-2 text-center">
                <div className="flex justify-center">
                  <CkCell
                    checked={section[field]?.valor === "Anormal"}
                    onChange={() => setter((p) => ({ ...p, [field]: { ...p[field], valor: p[field]?.valor === "Anormal" ? "" : "Anormal" } }))}
                  />
                </div>
              </td>
              <td className="px-2 py-1.5">
                <input
                  type="text"
                  value={section[field]?.descripcion ?? ""}
                  onChange={(e) => setter((p) => ({ ...p, [field]: { ...p[field], descripcion: e.target.value } }))}
                  placeholder="Seleccione una opción primero"
                  className={`w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-1 outline-none ${!section[field]?.valor && "text-gray-800 bg-gray-50"}`}
                  disabled={!section[field]?.valor}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

// ── DescExpTableDouble: dos secciones lado a lado con descripción + select-all ─
function DescExpTableDouble({ leftTitle, leftFields, leftSection, leftSetter }: {
  leftTitle: string;
  leftFields: string[];
  leftSection: ExploracionSeccion;
  leftSetter: React.Dispatch<React.SetStateAction<ExploracionSeccion>>;
  // rightTitle: string;
  // rightFields: string[];
  // rightSection: ExploracionSeccion;
  // rightSetter: React.Dispatch<React.SetStateAction<ExploracionSeccion>>;
}) {
  const lAllN = leftFields.every((f) => leftSection[f]?.valor === "Normal");
  const lAllA = leftFields.every((f) => leftSection[f]?.valor === "Anormal");
  // const rAllN = rightFields.every((f) => rightSection[f]?.valor === "Normal");
  // const rAllA = rightFields.every((f) => rightSection[f]?.valor === "Anormal");
  const rows = Math.max(leftFields.length);
  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden mb-4">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-300">
            {/* ── Lado izquierdo ── */}
            <th className="px-3 py-2 text-left font-medium text-gray-700 bg-gray-50 w-[30%]">
              {leftTitle}
            </th>
            <th
              className={thSelectClsNarrow(lAllN, "normal") + " w-[10%]"}
              title="Clic para marcar todo"
              onClick={() => selectAllSection(leftFields, leftSection, leftSetter, "Normal")}
            >
              {leftTitle == "Genitales" ? "Presente" : "Normal"}
            </th>
            <th
              className={thSelectClsNarrow(lAllA, "anormal") + " w-[10%]"}
              title="Clic para marcar todo"
              onClick={() => selectAllSection(leftFields, leftSection, leftSetter, "Anormal")}
            >
              {leftTitle == "Genitales" ? "Ausente" : "Anormal"}
            </th>
            <th className="px-3 py-2 text-left font-medium text-gray-700 bg-gray-50 w-[50%]">
              Descripción
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => {
            const lf = leftFields[i];
            // const rf = rightFields[i];
            return (
              <tr key={i}>
                <td className="px-3 py-2 font-medium text-gray-700">
                  {lf ?? ""}
                </td>
                <td className="px-3 py-2 text-center">
                  {lf && (
                    <div className="flex justify-center">
                      <CkCell
                        checked={leftSection[lf]?.valor === "Normal"}
                        onChange={() => leftSetter((p) => ({ ...p, [lf]: { ...p[lf], valor: p[lf]?.valor === "Normal" ? "" : "Normal" } }))}
                      />
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  {lf && (
                    <div className="flex justify-center">
                      <CkCell
                        checked={leftSection[lf]?.valor === "Anormal"}
                        onChange={() => leftSetter((p) => ({ ...p, [lf]: { ...p[lf], valor: p[lf]?.valor === "Anormal" ? "" : "Anormal" } }))}
                      />
                    </div>
                  )}
                </td>
                <td className="px-2 py-1.5">
                  {lf && (
                    <input
                      type="text"
                      value={leftSection[lf]?.descripcion ?? ""}
                      onChange={(e) => leftSetter((p) => ({ ...p, [lf]: { ...p[lf], descripcion: e.target.value } }))}
                      placeholder="Seleccione una opción primero"
                      className={`w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-1 outline-none ${!leftSection[lf]?.valor && "text-gray-800 bg-gray-50 border-gray-300"}`}
                      disabled={!leftSection[lf]?.valor}
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const agentesInit: Record<string, ExposicionAgente> = {
  Disolventes: { tiempo: "", puesto: "" },
  Pinturas: { tiempo: "", puesto: "" },
  Metales: { tiempo: "", puesto: "" },
  Polvo: { tiempo: "", puesto: "" },
  Sobresfuerzo: { tiempo: "", puesto: "" },
  Ruido: { tiempo: "", puesto: "" },
  Gases: { tiempo: "", puesto: "" },
  Biológicos: { tiempo: "", puesto: "" },
  Tensionales: { tiempo: "", puesto: "" },
  Otros: { tiempo: "", puesto: "" },
};

const antFamiliaresInit: Record<string, AntFamiliar> = {
  Tuberculosis: { abuelos: null, padres: null, hermanos: null, hijos: null, otros: null },
  Sífilis: { abuelos: null, padres: null, hermanos: null, hijos: null, otros: null },
  Hipertensión: { abuelos: null, padres: null, hermanos: null, hijos: null, otros: null },
  Diabetes: { abuelos: null, padres: null, hermanos: null, hijos: null, otros: null },
  Cardiópatas: { abuelos: null, padres: null, hermanos: null, hijos: null, otros: null },
  Epilépticos: { abuelos: null, padres: null, hermanos: null, hijos: null, otros: null },
  Oncológicos: { abuelos: null, padres: null, hermanos: null, hijos: null, otros: null },
  "Malformaciones congénitas": { abuelos: null, padres: null, hermanos: null, hijos: null, otros: null },
  Otros: { abuelos: null, padres: null, hermanos: null, hijos: null, otros: null },
};

const antPatInit: Record<string, AntPersonalPatologico> = {
  Sífilis: { si: false, observacion: "" }, Tuberculosis: { si: false, observacion: "" }, Diabetes: { si: false, observacion: "" },
  Hipertensión: { si: false, observacion: "" }, Cardiópatas: { si: false, observacion: "" }, Renales: { si: false, observacion: "" },
  Fobias: { si: false, observacion: "" }, Traumáticos: { si: false, observacion: "" }, Quirúrgicos: { si: false, observacion: "" },
  Epilépticos: { si: false, observacion: "" }, Atópicos: { si: false, observacion: "" }, Lumbalgias: { si: false, observacion: "" },
  Vértigo: { si: false, observacion: "" }, Otros: { si: false, observacion: "" },
};

// ─── Main Component ───────────────────────────────────────────────────────────

const Evaluacion: React.FC = () => {
  // const { user } = useAuth();
  const { user } = useAuth() as { user: { rol?: string; matricula?: string } };
  const navigate = useNavigate();

  useEffect(() => {
    if ((user?.rol ?? "").toLowerCase().trim() !== "admin" && (user?.rol ?? "").toLowerCase().trim() !== "médico") {
      navigate("/Agenda");
    }
  }, [user, navigate]);

  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loadingMat, setLoadingMat] = useState(false);
  const [matriculaNotFound, setMatriculaNotFound] = useState(false);
  const [matriculaNotRegis, setMatriculaNotRegis] = useState(false);

  // ── Patient ──
  const [patientData, setPatientData] = useState<PatientData>({
    id: null, matricula: null, nombre: "", tipoPaciente: null,
    estatus: null, especialidad: "", edad: "",
  });

  // ── Sections ──
  const [ficha, setFicha] = useState<FichaIdentificacion>({
    fechaEval: new Date().toISOString().split("T")[0],
    edad: "", genero: "", estadoCivil: "", fechaNacimiento: "",
    escolaridad: "", noImss: "", puestoAspira: "", contactoEmergencia: "",
    numeroContacto: "",
  });

  const [edadInicioLaboral, setEdadInicioLaboral] = useState("");

  const [antLaborales, setAntLaborales] = useState<AntLaboral[]>([
    { empresa: "", puesto: "", tiempo: "" },
    { empresa: "", puesto: "", tiempo: "" },
    { empresa: "", puesto: "", tiempo: "" },
  ]);

  const [agentes, setAgentes] = useState<Record<string, ExposicionAgente>>(agentesInit);
  const [antFamiliares, setAntFamiliares] = useState<Record<string, AntFamiliar>>(antFamiliaresInit);
  const [antPatologicos, setAntPatologicos] = useState<Record<string, AntPersonalPatologico>>(antPatInit);

  const [vacunas, setVacunas] = useState<VacunaInfo>({
    inflChk: false, toxChk: false, hepaChk: false, neumoChk: false,
    influenza: "", toxoide: "", hepatitisB: "", neumococica: "",
    covid1ra: false, covid2da: false, covidRF: false,
    covid1raFecha: "", covid2daFecha: "", covidRFFecha: "",
  });

  const [antNoPatologico, setAntNoPatologico] = useState<AntNoPatologico>({
    toxicomanias: false, toxicomaniasEsp: "",
    alcoholismo: false, alcoholismoEsp: "",
    tabaquismo: false, tabaquismoEsp: "",
  });

  const [gineco, setGineco] = useState<AntGinecoObstetrico>({
    menarquia: "", ritmo: "", fum: "", dismenorrea: "", incapacitante: "",
    diasDismenorrea: "", papanicolau: "", mamas: "", gestas: "", partos: "",
    cesareas: "", abortos: "", usg: "", mastografia: "", birads: "",
  });

  const [incapacidadRiesgo, setIncapacidadRiesgo] = useState<string>("");
  const [incapacidadValuacion, setIncapacidadValuacion] = useState("");
  const [incapacidadEG, setIncapacidadEG] = useState<string>("");
  const [incapacidadComentario, setIncapacidadComentario] = useState("");
  const [enfermedadActual, setEnfermedadActual] = useState("");
  const [manoDominante, setManoDominante] = useState<string>("");

  const [vitalSigns, setVitalSigns] = useState<VitalSigns>({
    Peso: "", Talla: "", Abdomen: "", IMC: "", Sistolica: "", Diastolica: "", TA: "", FC: "", FR: "", SpO2: "",
  });

  const [expCabeza, setExpCabeza] = useState<ExploracionSeccion>(makeExpSection(["Forma", "Tamaño", "Pelo", "Cara"]));
  const [expOidos, setExpOidos] = useState<ExploracionSeccion>(makeExpSection(["C.A.E", "Pabellón", "Tímpanos", "Descripción"]));
  const [expOjos, setExpOjos] = useState<ExploracionSeccion>(makeExpSection(["Reflejos", "Párpados", "Pupilas", "Conjuntivas", "Fondo de ojo"]));
  const [agudezaOD, setAgudezaOD] = useState({ sinLentes: "", conLentes: "" });
  const [agudezaOI, setAgudezaOI] = useState({ sinLentes: "", conLentes: "" });
  const [usaLentes, setUsaLentes] = useState<boolean | null>(null);
  const [expBoca, setExpBoca] = useState<ExploracionSeccion>(makeExpSection(["Mucosas", "Dentadura", "Lengua", "Encías", "Faringe", "Amígdalas"]));
  const [expNariz, setExpNariz] = useState<ExploracionSeccion>(makeExpSection(["Mucosas", "Tabique"]));
  const [expCuello, setExpCuello] = useState<ExploracionSeccion>(makeExpSection(["Ganglios", "Movilidad", "Tiroides", "Acantosis", "Pulsos"]));
  const [expPrecordial, setExpPrecordial] = useState<ExploracionSeccion>(makeExpSection(["Forma", "Ruidos Cardiacos", "Mamas", "Campos pulmonares"]));
  const [expMTor, setExpMTor] = useState<ExploracionSeccion>(makeExpSection(["Integridad", "Forma", "Articulaciones", "Tono Muscular", "Reflejos", "Sensibilidad"]));
  const [expMPel, setExpMPel] = useState<ExploracionSeccion>(makeExpSection(["Integridad", "Forma", "Articulaciones", "Tono Muscular", "Reflejos", "Sensibilidad"]));
  const [expAbdomen, setExpAbdomen] = useState<ExploracionSeccion>(makeExpSection(["Forma"]));
  const [expGenitales, setExpGenitales] = useState<ExploracionSeccion>(makeExpSection(["Fimosis", "Varicoceles", "Criptorquidia", "Hernias", "Cicatrices", "Nevos", "Vitíligo"]));
  const [expPiel, setExpPiel] = useState<ExploracionSeccion>(makeExpSection(["Cicatrices", "Nevos", "Vitíligo"]));
  const [expColCervical, setExpColCervical] = useState<ExploracionSeccion>(makeExpSection(["Integridad", "Forma", "Tono muscular", "Sensibilidad", "Fuerza"]));
  const [expColLumbar, setExpColLumbar] = useState<ExploracionSeccion>(makeExpSection(["Integridad", "Forma", "Tono muscular", "Sensibilidad", "Fuerza"]));

  const [labs, setLabs] = useState<Laboratorios>({
    bh: "", hto: "", gr: "", gb: "", plaq: "",
    glucosa: "", colesterol: "", trigliceridos: "", urea: "", acUrico: "",
  });

  const [expRadiografia, setExpRadiografia] = useState<ExploracionSeccion>(makeExpSection(["R. Tórax", "Columna AP", "Lateral"]));
  const [expHallazgos, setExpHallazgos] = useState<ExploracionSeccion>(makeExpSection(["Lordosis", "Escoliosis", "Antidoping"]));
  const [expGabinete, setExpGabinete] = useState<ExploracionSeccion>(makeExpSection(["Audiometría", "Ekg", "Fit Test", "Espirómetria"]));

  const [conclusiones, setConclusiones] = useState<Conclusiones>({
    diagnostico1: "", diagnostico2: "", diagnostico3: "", diagnostico4: "",
    recomendacion1: "", recomendacion2: "", recomendacion3: "",
    resultado: "", observaciones: "",
  });

  // ── IMC calc ──
  const handleMeasureChange = useCallback((field: "Peso" | "Talla", value: string) => {
    setVitalSigns((prev) => {
      const next = { ...prev, [field]: value };
      next.IMC = calcIMC(next.Peso, next.Talla);
      return next;
    });
  }, []);

  const getImcStyle = (imc: string) => {
    const v = parseFloat(imc);
    if (!imc || isNaN(v) || v === 0) return "border-gray-300 bg-gray-50 text-gray-700";
    if (v < 18.5) return "border-yellow-400 bg-yellow-50 text-yellow-700";
    if (v <= 24.9) return "border-green-400 bg-green-50 text-green-700";
    if (v <= 29.9) return "border-yellow-400 bg-yellow-50 text-yellow-700";
    return "border-red-400 bg-red-50 text-red-700";
  };

  const getImcInput = (imc: string) => {
    const v = parseFloat(imc);
    
    if (!imc || isNaN(v) || v === 0) return "border-gray-300 bg-gray-50 text-gray-700";
    if (v < 18.5) return "border-yellow-300 bg-yellow-50 text-yellow-500";
    if (v <= 24.9) return "border-horz-blue bg-blue-50 text-sky-blue";
    if (v <= 29.9) return "border-yellow-300 bg-yellow-50 text-yellow-500";
    return "border-red-200 bg-red-50 text-red-500";
  };

  const getImcIcon  = (imc: string) => {
    const v = parseFloat(imc);

    if (!imc || isNaN(v) || v === 0) return "text-gray-400";
    if (v < 18.5) return "text-yellow-700"; 
    if (v <= 24.9) return "text-green-700"; 
    if (v <= 29.9) return "text-yellow-700"; 
    return "text-red-700";
  };

  const handleSearchPatient = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPatientData((prev) => ({
      ...prev, id: null, matricula: e.target.value,
      nombre: "", edad: "", especialidad: "",
    }));
  }, []);

  useEffect(() => {
    if (!patientData.matricula) {
      setMatriculaNotFound(false);
      setMatriculaNotRegis(false);
      return;
    }

    const delay = setTimeout(() => {
      (async () => {
        try {
          setLoadingMat(true);
          await new Promise(r => setTimeout(r, 2000));
          
          const cons = await fetchWithAuth(`${API_BASE_URL}/Evaluacion/InformacionPerfil`, {
            method: "POST",
            body: JSON.stringify({ matricula: patientData.matricula }),
          });

          const res = await cons.json();

          if (res && res.data.length == 0) {
            setMatriculaNotFound(true);
            setMatriculaNotRegis(false);
            setPatientData((p) => ({ ...p, id: null, nombre: "", especialidad: "", estatus: "" }));
            return;
          }

          const pacienteId = res.data[0].IdPaciente;
          setMatriculaNotFound(false);
          setPatientData((p) => ({
            ...p, id: pacienteId,
            nombre: res.data![0].Nombre,
            especialidad: res.data![0].Categoria_desc,
            estatus: res.data![0].Empl_status,
          }));
          setMatriculaNotRegis(pacienteId == null);

          // Pre-poblar ficha con datos del perfil
          const fechaNacPerfil = res.data[0].FechaNacimiento
            ? String(res.data[0].FechaNacimiento).split("T")[0]
            : "";
          const edadPerfil = fechaNacPerfil
            ? String(Math.floor((Date.now() - new Date(fechaNacPerfil).getTime()) / 3.15576e10))
            : "";
          setFicha((f) => ({
            ...f,
            fechaNacimiento: fechaNacPerfil,
            edad:            edadPerfil,
            genero:          typeof res.data[0].Sexo === "string" ? res.data[0].Sexo : "",
            noImss:          typeof res.data[0].NSS  === "string" ? res.data[0].NSS  : "",
          }));

          // ── Revisar borrador primero ─────────────────────────────────────────
          try {
            const bRes = await fetchWithAuth(`${API_BASE_URL}/Evaluacion/ObtenerBorrador`, {
              method: "POST",
              body: JSON.stringify({ matricula: patientData.matricula }),
            });
            if (bRes.ok) {
              const bJson = await bRes.json();
              if (bJson?.ok && bJson.data?.datos) {
                const fechaBorrador = bJson.data.fechaGuardado
                  ? new Date(bJson.data.fechaGuardado).toLocaleString("es-MX", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
                  : "";
                const { isConfirmed: cargarBorrador } = await Swal.fire({
                  title: `<p style="font-size: 18px" class="font-bold uppercase text-gray-800">Avance previo</p>`,
                  html: `<p style="font-size: 16px; padding: 0 40px">Se identificó un avance guardado el <b>${fechaBorrador}</b>. ¿Desea continuar?</p>`,
                  iconHtml: `<i class="mdi mdi-alert-circle-outline success-icon"></i><style> .success-icon { font-size: 90px; animation: pop 0.4s ease-out forwards; } @keyframes pop { 0% { transform: scale(0.5); opacity: 0; } 70% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); } } </style>`,
                  didOpen: (p) => { const el = p.querySelector(".swal2-icon") as HTMLElement; if (el) Object.assign(el.style, { border: "none", background: "transparent", boxShadow: "none", width: "auto", height: "auto" }); },
                  buttonsStyling: false,
                  confirmButtonText: `<i class="mdi mdi-autorenew mr-1"></i> Cargar`,
                  cancelButtonText: `<i class="mdi mdi-plus-thick mr-1"></i> Nueva`,
                  showCancelButton: true,
                  customClass: {
                    confirmButton: "flex items-center bg-sea-blue hover:bg-sea-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer",
                    cancelButton: "flex items-center bg-gray-50 hover:bg-gray-100/80 hover:-translate-y-1 text-gray-800 px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-gray-500/30 transition-all cursor-pointer ml-3"
                  },
                });
                if (cargarBorrador) {
                  const b = bJson.data.datos;
                  if (b.ficha)              setFicha((f) => ({ ...f, ...b.ficha }));
                  if (b.edadInicioLaboral  !== undefined) setEdadInicioLaboral(b.edadInicioLaboral ?? "");
                  if (b.antLaborales)       setAntLaborales(b.antLaborales);
                  if (b.agentes)            setAgentes(b.agentes);
                  if (b.antFamiliares)      setAntFamiliares(b.antFamiliares);
                  if (b.antPatologicos)     setAntPatologicos(b.antPatologicos);
                  if (b.vacunas)            setVacunas(b.vacunas);
                  if (b.antNoPatologico)    setAntNoPatologico(b.antNoPatologico);
                  if (b.gineco)             setGineco(b.gineco);
                  if (b.incapacidadRiesgo    !== undefined) setIncapacidadRiesgo(b.incapacidadRiesgo ?? "");
                  if (b.incapacidadValuacion !== undefined) setIncapacidadValuacion(b.incapacidadValuacion ?? "");
                  if (b.incapacidadEG        !== undefined) setIncapacidadEG(b.incapacidadEG ?? "");
                  if (b.incapacidadComentario !== undefined) setIncapacidadComentario(b.incapacidadComentario ?? "");
                  if (b.enfermedadActual     !== undefined) setEnfermedadActual(b.enfermedadActual ?? "");
                  if (b.manoDominante        !== undefined) setManoDominante(b.manoDominante ?? "");
                  if (b.vitalSigns)         setVitalSigns(b.vitalSigns);
                  if (b.expCabeza)          setExpCabeza(b.expCabeza);
                  if (b.expOidos)           setExpOidos(b.expOidos);
                  if (b.expOjos)            setExpOjos(b.expOjos);
                  if (b.agudezaOD)          setAgudezaOD(b.agudezaOD);
                  if (b.agudezaOI)          setAgudezaOI(b.agudezaOI);
                  if (b.usaLentes != null)  setUsaLentes(b.usaLentes);
                  if (b.expBoca)            setExpBoca(b.expBoca);
                  if (b.expNariz)           setExpNariz(b.expNariz);
                  if (b.expCuello)          setExpCuello(b.expCuello);
                  if (b.expPrecordial)      setExpPrecordial(b.expPrecordial);
                  if (b.expMTor)            setExpMTor(b.expMTor);
                  if (b.expMPel)            setExpMPel(b.expMPel);
                  if (b.expAbdomen)         setExpAbdomen(b.expAbdomen);
                  if (b.expGenitales)       setExpGenitales(b.expGenitales);
                  if (b.expPiel)            setExpPiel(b.expPiel);
                  if (b.expColCervical)     setExpColCervical(b.expColCervical);
                  if (b.expColLumbar)       setExpColLumbar(b.expColLumbar);
                  if (b.labs)               setLabs(b.labs);
                  if (b.expRadiografia)     setExpRadiografia(b.expRadiografia);
                  if (b.expHallazgos)       setExpHallazgos(b.expHallazgos);
                  if (b.expGabinete)        setExpGabinete(b.expGabinete);
                  if (b.conclusiones)       setConclusiones(b.conclusiones);
                  return; // No buscar evaluación permanente
                }
              }
            }
          } catch { /* Si falla la consulta de borrador, continuar con flujo normal */ }

          // ── Sin borrador (o usuario rechazó): revisar evaluación permanente ──
          const cons2 = await fetchWithAuth(`${API_BASE_URL}/Evaluacion/ObtenerEvaluacion/${patientData.matricula}/${pacienteId ?? 0}`, {
            method: "POST",
          });

          if (!cons2.ok) return;

          let evalData: any = null;
          try { evalData = await cons2.json(); } catch { return; }
          if (!evalData) return;

          const { isConfirmed } =
          await Swal.fire({
            title: `<p style="font-size: 18px" class="font-bold uppercase text-gray-800">Evaluación previa</p>`,
            html: `<p style="font-size: 16px; padding: 0 40px">Se identificó una evaluación médica previa (<b>${evalData.FechaEvaluacion ? new Date(evalData.FechaEvaluacion).toLocaleDateString("es-MX") : ""}</b>). ¿Desea precargar los datos?</p>`,
            iconHtml: `<i class="mdi mdi-alert-circle-outline success-icon"></i><style> .success-icon { font-size: 90px; animation: pop 0.4s ease-out forwards; } @keyframes pop { 0% { transform: scale(0.5); opacity: 0; } 70% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); } } </style>`,
            didOpen: (p) => { const el = p.querySelector(".swal2-icon") as HTMLElement; if (el) Object.assign(el.style, { border: "none", background: "transparent", boxShadow: "none", width: "auto", height: "auto" }); },
            buttonsStyling: false,
            confirmButtonText: `<i class="mdi mdi-autorenew mr-1"></i> Cargar`,
            cancelButtonText: `<i class="mdi mdi-plus-thick mr-1"></i> Nueva`,
            showCancelButton: true,
            customClass: {
              confirmButton: "flex items-center bg-sea-blue hover:bg-sea-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer",
              cancelButton: "flex items-center bg-gray-50 hover:bg-gray-100/80 hover:-translate-y-1 text-gray-800 px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-gray-500/30 transition-all cursor-pointer ml-3"
            },
          });


          if (!isConfirmed) return;

          const jp = (val: string | null) => { try { return val ? JSON.parse(val) : null; } catch { return null; } };

          // Ficha
          const fechaNac = evalData.FechaNacimiento ? evalData.FechaNacimiento.split("T")[0] : "";
          const edadCalc = fechaNac
            ? String(Math.floor((Date.now() - new Date(fechaNac).getTime()) / 3.15576e10))
            : "";

          setFicha((f) => ({
            ...f,
            fechaEval:          evalData.FechaEvaluacion ? evalData.FechaEvaluacion.split("T")[0] : f.fechaEval,
            // Si el eval trae fecha/genero/NSS los usa; si no, conserva los del perfil
            fechaNacimiento:    fechaNac                                        || f.fechaNacimiento,
            edad:               edadCalc                                        || f.edad,
            genero:             (typeof evalData.Genero  === "string" && evalData.Genero)  ? evalData.Genero  : f.genero,
            noImss:             (typeof evalData.NoIMSS  === "string" && evalData.NoIMSS)  ? evalData.NoIMSS  : f.noImss,
            estadoCivil:        evalData.EstadoCivil ?? "",
            escolaridad:        evalData.Escolaridad ?? "",
            contactoEmergencia: evalData.Contacto ?? "",
            numeroContacto:     evalData.NumContacto ?? "",
          }));

          // Laboral
          if (evalData.EdadInicio != null) setEdadInicioLaboral(String(evalData.EdadInicio));
          const parsedLaborales = jp(evalData.AntecedenteLaboral);
          if (parsedLaborales) setAntLaborales(parsedLaborales);
          const parsedAgentes = jp(evalData.ExposicionAgentes);
          if (parsedAgentes) setAgentes(parsedAgentes);

          // Familiar
          const parsedFamiliar = jp(evalData.AntecedenteFamiliar);
          if (parsedFamiliar) setAntFamiliares(parsedFamiliar);

          // Patológico
          const parsedPat = jp(evalData.AntecedentePatologico);
          if (parsedPat) setAntPatologicos(parsedPat);
          const parsedVacuna  = jp(evalData.EsquemaVacuna)  ?? {};
          const parsedCovid   = jp(evalData.EsquemaCovid)   ?? {};
          setVacunas((v) => ({
            ...v,
            inflChk:      parsedVacuna.influenza?.checked   ?? false,
            influenza:    parsedVacuna.influenza?.fecha      ?? "",
            toxChk:       parsedVacuna.toxoide?.checked      ?? false,
            toxoide:      parsedVacuna.toxoide?.fecha        ?? "",
            hepaChk:      parsedVacuna.hepatitisB?.checked   ?? false,
            hepatitisB:   parsedVacuna.hepatitisB?.fecha     ?? "",
            neumoChk:     parsedVacuna.neumococica?.checked  ?? false,
            neumococica:  parsedVacuna.neumococica?.fecha    ?? "",
            covid1ra:      parsedCovid.covid1ra?.checked ?? false,
            covid1raFecha: parsedCovid.covid1ra?.fecha   ?? "",
            covid2da:      parsedCovid.covid2da?.checked ?? false,
            covid2daFecha: parsedCovid.covid2da?.fecha   ?? "",
            covidRF:       parsedCovid.covidRF?.checked  ?? false,
            covidRFFecha:  parsedCovid.covidRF?.fecha    ?? "",
          }));

          // No Patológico
          const parsedNoPat = jp(evalData.AntecedenteNoPatologico);
          if (parsedNoPat) setAntNoPatologico(parsedNoPat);

          // Gineco-Obstétrico
          setGineco({
            menarquia:      String(evalData.Menarquia),
            ritmo:          String(evalData.Ritmo),
            papanicolau:    String(evalData.Papanicolau),
            fum:            String(evalData.FUM),
            dismenorrea:    String(evalData.Dismenorrea),
            incapacitante:  String(evalData.Incapacitante),
            diasDismenorrea:String(evalData.Dias),
            gestas:         String(evalData.Gestas),
            partos:         String(evalData.Partos),
            cesareas:       String(evalData.Cesareas),
            abortos:        String(evalData.Abortos),
            mamas:          String(evalData.Mamas),
            usg:            String(evalData.USG),
            mastografia:    String(evalData.Mastografia),
            birads:         String(evalData.BiRads),
          });

          // Incapacidad
          const safeStr = (v: any) => (typeof v === "string" ? v.trim() : "");
          setIncapacidadRiesgo(safeStr(evalData.RiesgoTrabajo));
          setIncapacidadEG(safeStr(evalData.EnfermedadGral));
          setManoDominante(String(evalData.ManoDominante));
          setIncapacidadValuacion(String(evalData.Valuacion));
          setIncapacidadComentario(String(evalData.Comentario));
          setEnfermedadActual(String(evalData.PadeceEnfermedad));

          // Exploración — Signos vitales
          const parsedVitales = jp(evalData.SignosVitales);
          if (parsedVitales) setVitalSigns(parsedVitales);

          // Exploración — Secciones
          const parsedCabeza = jp(evalData.Cabeza);       if (parsedCabeza) setExpCabeza(parsedCabeza);
          const parsedOidos  = jp(evalData.Oidos);        if (parsedOidos)  setExpOidos(parsedOidos);
          const parsedOjos   = jp(evalData.Ojos);         if (parsedOjos)   setExpOjos(parsedOjos);
          const parsedBoca   = jp(evalData.Boca);         if (parsedBoca)   setExpBoca(parsedBoca);
          const parsedNariz  = jp(evalData.Nariz);        if (parsedNariz)  setExpNariz(parsedNariz);
          const parsedCuello = jp(evalData.Cuello);       if (parsedCuello) setExpCuello(parsedCuello);
          const parsedPrec   = jp(evalData.AreaPrecordial); if (parsedPrec) setExpPrecordial(parsedPrec);
          const parsedMTor   = jp(evalData.MiembrosToracicos); if (parsedMTor) setExpMTor(parsedMTor);
          const parsedMPel   = jp(evalData.MiembrosPelvicos);  if (parsedMPel) setExpMPel(parsedMPel);
          const parsedAbd    = jp(evalData.Abdomen);      if (parsedAbd)    setExpAbdomen(parsedAbd);
          const parsedGen    = jp(evalData.Genitales);    if (parsedGen)    setExpGenitales(parsedGen);
          const parsedPiel   = jp(evalData.PielAnexos);   if (parsedPiel)   setExpPiel(parsedPiel);
          const parsedColC   = jp(evalData.ColumnaCervicalDorsal); if (parsedColC) setExpColCervical(parsedColC);
          const parsedColL   = jp(evalData.ColumnaLumbar); if (parsedColL)  setExpColLumbar(parsedColL);

          // Agudeza visual
          const parsedAV = jp(evalData.AgudezaVisual);
          if (parsedAV) {
            if (parsedAV.OD)         setAgudezaOD(parsedAV.OD);
            if (parsedAV.OI)         setAgudezaOI(parsedAV.OI);
            if (parsedAV.usaLentes != null) setUsaLentes(parsedAV.usaLentes);
          }

          // Estudios
          const parsedLabs  = jp(evalData.Laboratorio); if (parsedLabs)  setLabs(parsedLabs);
          const parsedRx    = jp(evalData.Radiografia); if (parsedRx)    setExpRadiografia(parsedRx);
          const parsedHall  = jp(evalData.Hallazgos);   if (parsedHall)  setExpHallazgos(parsedHall);
          const parsedGab   = jp(evalData.Gabinete);    if (parsedGab)   setExpGabinete(parsedGab);

          // Conclusiones
          const diags  = jp(evalData.Diagnosticos)   ?? [];
          const recoms = jp(evalData.Recomendaciones) ?? [];
          setConclusiones({
            diagnostico1:    diags[0]  ?? "",
            diagnostico2:    diags[1]  ?? "",
            diagnostico3:    diags[2]  ?? "",
            diagnostico4:    diags[3]  ?? "",
            recomendacion1:  recoms[0] ?? "",
            recomendacion2:  recoms[1] ?? "",
            recomendacion3:  recoms[2] ?? "",
            resultado:       evalData.GradoSalud   ?? "",
            observaciones:   evalData.Observaciones ?? "",
          });

        } finally {
          setLoadingMat(false);
        }
      })();
    }, 1000);
    return () => clearTimeout(delay);
  }, [patientData.matricula]);

  const exitoModal = (title: string, message: string) =>
    Swal.fire({
      title: `<p style="font-size:18px" class="font-bold uppercase text-gray-800">${title}</p>`,
      html: `<p style="font-size:16px;padding:0 40px">${message}</p>`,
      // iconHtml: `<i class="mdi mdi-check-circle-outline" style="color:#54BBAB;font-size:90px"></i>`,
      iconHtml: `<i class="mdi mdi-check-circle-outline success-icon"></i><style> .success-icon { color:#54BBAB; font-size: 90px; animation: pop 0.4s ease-out forwards; } @keyframes pop { 0% { transform: scale(0.5); opacity: 0; } 70% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); } }</style>`,
      didOpen: (p) => { const el = p.querySelector(".swal2-icon") as HTMLElement; if (el) Object.assign(el.style, { border: "none", background: "transparent", boxShadow: "none", width: "auto", height: "auto" }); },
      buttonsStyling: false,
      confirmButtonText: `<i class="mdi mdi-check-bold mr-1"></i> OK`,
      customClass: { confirmButton: "flex items-center bg-sea-blue hover:bg-sea-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer" },
    });

  const errorModal = (title: string, message: string) =>
    Swal.fire({
      title: `<p style="font-size:18px" class="font-bold uppercase text-gray-800">${title}</p>`,
      html: `<p style="font-size:16px;padding:0 40px">${message}</p>`,
      iconHtml: `<i class="mdi mdi-alert-circle-outline" style="font-size:90px"></i>`,
      didOpen: (p) => { const el = p.querySelector(".swal2-icon") as HTMLElement; if (el) Object.assign(el.style, { border: "none", background: "transparent", boxShadow: "none", width: "auto", height: "auto" }); },
      buttonsStyling: false,
      confirmButtonText: `<i class="mdi mdi-check-bold mr-1"></i> OK`,
      customClass: { confirmButton: "flex items-center bg-sea-blue hover:bg-sea-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer" },
    });

  const validateStep = (step: number): string[] => {
    const errors: string[] = [];
    switch (step) {
      case 0:
        if (!patientData.matricula) errors.push("Matrícula");
        if (!ficha.fechaNacimiento) errors.push("Fecha de nacimiento");
        if (!ficha.edad) errors.push("Edad");
        if (!ficha.genero) errors.push("Género");
        if (!ficha.estadoCivil) errors.push("Estado civil");
        if (!ficha.escolaridad) errors.push("Escolaridad");
        if (!ficha.noImss) errors.push("No. IMSS");
        break;
      case 1:
        if (!edadInicioLaboral) errors.push("Edad de inicio laboral");
        break;
      case 6:
        if (!manoDominante) errors.push("Mano dominante");
        if (!enfermedadActual) errors.push("Enfermedad actual");
        break;
      case 7:
        if (!vitalSigns.Peso) errors.push("Peso");
        if (!vitalSigns.Talla) errors.push("Talla");
        if (!vitalSigns.Abdomen) errors.push("Abdomen");
        break;
      case 9: // Conclusiones
        // if (!conclusiones.gradoSalud) errors.push("Grado de salud");
        if (!conclusiones.diagnostico1) errors.push("Al menos un diagnóstico");
        if (!conclusiones.resultado) errors.push("Grado de salud");
        if (!conclusiones.observaciones) errors.push("Resultado");
        break;
    }
    return errors;
  };

  const showStepErrors = (errors: string[], stepLabel: string) => {
    Swal.fire({
      title: `<p style="font-size:18px" class="font-bold uppercase text-gray-800">Campo requerido</p>`,
      html: `<p style="font-size: 16px; padding: 0 40px">Complete los campos obligatorios (<b class="text-red-400">*</b>) de la sección <b>${stepLabel}</b></p>
      `,
      
      iconHtml: `<i class="mdi mdi-alert-circle-outline" style="font-size:90px"></i>`,
      didOpen: (p) => { const el = p.querySelector(".swal2-icon") as HTMLElement; if (el) Object.assign(el.style, { border:"none", background:"transparent", boxShadow:"none", width:"auto", height:"auto" }); },
      buttonsStyling: false,
      confirmButtonText: `<i class="mdi mdi-check-bold mr-1"></i> OK`,
      customClass: { confirmButton: "flex items-center bg-sea-blue hover:bg-sea-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer" },
    });
  };

  const handleNext = () => {
    setCurrentStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const handleStepClick = (i: number) => {
    // Al saltar hacia adelante, validar el paso actual antes de permitirlo
    if (i > currentStep) {
      const errors = validateStep(currentStep);
      if (errors.length > 0) {
        showStepErrors(errors, STEPS[currentStep].label);
        return;
      }
    }
    setCurrentStep(i);
  };
  // ────────────────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    // Helper local: construye el payload del formulario (idéntico para borrador y para AgregarEvaluacion)
    const buildPayload = () => ({
      ficha,
      edadInicioLaboral,
      antLaborales,
      agentes,
      antFamiliares,
      antPatologicos,
      vacunas,
      antNoPatologico,
      gineco: ficha.genero === "F"
        ? { ...gineco, fum: gineco.fum || null }
        : { menarquia: null, ritmo: null, fum: null, dismenorrea: null,
            incapacitante: null, diasDismenorrea: null, papanicolau: null,
            mamas: null, gestas: null, partos: null, cesareas: null,
            abortos: null, usg: null, mastografia: null, birads: null },
      incapacidadRiesgo,
      incapacidadValuacion,
      incapacidadEG,
      incapacidadComentario,
      enfermedadActual,
      manoDominante: typeof manoDominante === "string" ? manoDominante : "",
      vitalSigns,
      expCabeza, expOidos, expOjos, agudezaOD, agudezaOI, usaLentes,
      expBoca, expNariz, expCuello, expPrecordial, expMTor, expMPel,
      expAbdomen, expGenitales, expPiel, expColCervical, expColLumbar,
      labs, expRadiografia, expHallazgos, expGabinete,
      conclusiones,
    });

    if (!patientData.matricula) {
      errorModal("Campo requerido", "Debe ingresar una <b>matrícula</b> para guardar la evaluación.");
      return;
    }

    const stepsConReglas = [0, 1, 3, 6, 7, 8, 9];
    for (const step of stepsConReglas.filter((s) => s <= currentStep)) {
      const errors = validateStep(step);
      if (errors.length > 0) {
        showStepErrors(errors, STEPS[step].label);
        setCurrentStep(step);
        return;
      }
    }

    const confirmacion = await Swal.fire({
      title: `<p style="font-size: 18px" class="font-bold uppercase text-gray-800">Guardar evaluación</p>`,
      html: `<p style="font-size: 16px; padding: 0 40px">Seleccione si desea <b>guardar el avance</b> o <b>finalizar la evaluación</b> y generar el PDF.</p>`,
      iconHtml: `<i class="mdi mdi-help-circle-outline success-icon"></i><style> .success-icon { font-size: 90px; animation: pop 0.4s ease-out forwards; } @keyframes pop { 0% { transform: scale(0.5); opacity: 0; } 70% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); } } </style>`,
      didOpen: (p) => { const el = p.querySelector(".swal2-icon") as HTMLElement; if (el) Object.assign(el.style, { border: "none", background: "transparent", boxShadow: "none", width: "auto", height: "auto" }); },
      showConfirmButton: true,
      showDenyButton: true,
      buttonsStyling: false,
      confirmButtonText: `<span title="Guardar borrador"><i class="mdi mdi-content-save mr-1"></i> Avance</span>`,
      denyButtonText: `<span title="Finalizar evaluación"><i class="mdi mdi-check-decagram mr-1"></i> Finalizar</span>`,
      customClass: {
        confirmButton: "flex items-center bg-gray-50 hover:bg-gray-100/80 hover:-translate-y-1 text-gray-800 px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-gray-500/30 transition-all cursor-pointer",
        denyButton: "flex items-center bg-sea-blue hover:bg-sea-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer ml-3",
      },
    });

    if (confirmacion.isDismissed) return;
    const esAvance = confirmacion.isConfirmed;

    if (esAvance) {
      try {
        setSaving(true);
        await fetchWithAuth(`${API_BASE_URL}/Evaluacion/GuardarBorrador`, {
          method: "POST",
          body: JSON.stringify({
            matricula: patientData.matricula,
            pacienteId: patientData.id,
            datos: buildPayload(),
          }),
        });

        await Swal.fire({
          title: `<p style="font-size: 18px" class="font-bold uppercase text-gray-800">Avance guardado</p>`,
          html: `<p style="font-size: 16px; padding: 0 40px">Se ha guardado el avance de la evaluación. Puede retomarlo en cualquier momento.</p>`,
          iconHtml: `<i class="mdi mdi-check-circle-outline success-icon"></i><style> .success-icon { color: #54BBAB; font-size: 90px; animation: pop 0.4s ease-out forwards; } @keyframes pop { 0% { transform: scale(0.5); opacity: 0; } 70% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); } } </style>`,
          didOpen: (p) => { const el = p.querySelector(".swal2-icon") as HTMLElement; if (el) Object.assign(el.style, { border: "none", background: "transparent", boxShadow: "none", width: "auto", height: "auto" }); },
          showConfirmButton: true,
          buttonsStyling: false,
          confirmButtonText: `<i class="mdi mdi-check" style="margin-right:4px"></i> OK`,
          customClass: {
            confirmButton: "flex items-center bg-sea-blue hover:bg-sea-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer",
          },
        });
      } catch {
        /* silencioso */
      } finally {
        setSaving(false);
      }
      return;
    }

    for (const step of stepsConReglas) {
      const errors = validateStep(step);
      if (errors.length > 0) {
        showStepErrors(errors, STEPS[step].label);
        setCurrentStep(step);
        return;
      }
    }

    try {
      setSaving(true);

      await new Promise((r) => setTimeout(r, 1500));

      const cons = await fetchWithAuth(`${API_BASE_URL}/Evaluacion/AgregarEvaluacion`, {
        method: "POST",
        body: JSON.stringify({
          medico: 8,
          paciente: patientData.id,
          matricula: patientData.matricula,
          ...buildPayload(),
        }),
      });

      const res = await cons.json();

      if (res?.ok && res.data.length > 0) {
        // Generar historia clínica y generar documento
        let docGuardado = false;
        try {
          const docRes = await fetchWithAuth(`${API_BASE_URL}/Evaluacion/GenerarHistoriaClinica`, {
            method: "POST",
            body: JSON.stringify({ evaluacionId: res.data[0].Id, especialidad: patientData.especialidad }),
          });

          if (docRes.ok) {
            const docData = await docRes.json();
            const mat = String(docData.matricula ?? patientData.matricula ?? "").trim();
            docGuardado = true;

            const result = await Swal.fire({
              title: `<p style="font-size: 18px" class="font-bold uppercase text-gray-800">Evaluación registrada</p>`,
              html: `<p style="font-size: 16px; padding: 0 40px">La evaluación médica ha sido guardada y registrada en los documentos del paciente.</p>`,
              iconHtml: `<i class="mdi mdi-check-circle-outline success-icon"></i><style> .success-icon { color: #54BBAB; font-size: 90px; animation: pop 0.4s ease-out forwards; } @keyframes pop { 0% { transform: scale(0.5); opacity: 0; } 70% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); } } </style>`,
              didOpen: (p) => { const el = p.querySelector(".swal2-icon") as HTMLElement; if (el) Object.assign(el.style, { border: "none", background: "transparent", boxShadow: "none", width: "auto", height: "auto" }); },
              // showConfirmButton: true,
              showCancelButton: true,
              buttonsStyling: false,
              confirmButtonText: `<i class="mdi mdi-folder" style="margin-right:4px"></i> Abrir`,
              cancelButtonText: `<i class="mdi mdi-close" style="margin-right:4px"></i> Cerrar`,
              customClass: {
                confirmButton: "flex items-center bg-sea-blue hover:bg-sea-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer",
              cancelButton: "flex items-center bg-gray-50 hover:bg-gray-100/80 hover:-translate-y-1 text-gray-800 px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-gray-500/30 transition-all cursor-pointer ml-3"
              },
            });

            if (result.isConfirmed) {
              navigate("/Documentos", { state: { matricula: mat } });
            }
          }
        } catch { }

        if (!docGuardado) {
          await Swal.fire({
            title: `<p style="font-size: 18px" class="font-bold uppercase text-gray-800">Evaluación finalizada</p>`,
            html: `<p style="font-size: 16px; padding: 0 40px">La evaluación se ha guardado correctamente en el sistema.</p>`,
            iconHtml: `<i class="mdi mdi-check-circle-outline success-icon"></i><style> .success-icon { color: #54BBAB; font-size: 90px; animation: pop 0.4s ease-out forwards; } @keyframes pop { 0% { transform: scale(0.5); opacity: 0; } 70% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); } } </style>`,
            didOpen: (p) => { const el = p.querySelector(".swal2-icon") as HTMLElement; if (el) Object.assign(el.style, { border: "none", background: "transparent", boxShadow: "none", width: "auto", height: "auto" }); },
            showConfirmButton: true,
            showCancelButton: false,
            buttonsStyling: false,
            confirmButtonText: `<i class="mdi mdi-check" style="margin-right:4px"></i> OK`,
            customClass: {
              confirmButton: "flex items-center bg-sea-blue hover:bg-sea-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 mb-2 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer",
            },
          });
        }
      }
    } catch {
      /* handled by modal */
    } finally {
      setSaving(false);
    }
  }, [patientData, conclusiones, ficha, edadInicioLaboral, antLaborales, agentes, antFamiliares, antPatologicos, vacunas, antNoPatologico, gineco, incapacidadRiesgo, incapacidadValuacion, incapacidadEG, incapacidadComentario, enfermedadActual, manoDominante, vitalSigns, expCabeza, expOidos, expOjos, agudezaOD, agudezaOI, usaLentes, expBoca, expNariz, expCuello, expPrecordial, expMTor, expMPel, expAbdomen, expGenitales, expPiel, expColCervical, expColLumbar, labs, expRadiografia, expHallazgos, expGabinete, user, navigate, currentStep]);
  

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stepPanels = useMemo(() => [
    <div key="ficha">
      <div className="border border-gray-300 rounded-lg overflow-hidden mb-1">
        <div className="bg-gray-50 px-3 py-1 border-b border-gray-300">
          <span className="text-xs font-medium text-gray-700">
            Ficha de identificación
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3">
          <div className={`${matriculaNotFound ? "mb-2" : ""}`}>
            <div className="block text-xs font-medium text-gray-700 mb-1">
              Matrícula <b className="text-red-400">*</b>
            </div>
            <div className="relative">
              <Search className={`h-3.5 w-3.5 absolute left-3 top-2.5 ${!patientData.matricula ? "text-gray-400" : loadingMat ? "text-gray-400" : matriculaNotFound ? "text-red-700" : "text-gray-400"}`} />
              {/* matriculaNotRegis ? "text-yellow-700" */}
              <input
                type="text"
                value={patientData.matricula ?? ""}
                onChange={handleSearchPatient}
                placeholder="Matrícula (5 dígitos)"
                disabled={loadingMat}
                maxLength={5}
                className={`w-full border rounded-lg pl-9 px-3 py-2 pr-10 text-xs outline-none transition-colors ${!patientData.matricula ? "border-gray-300 focus:ring-1 focus:ring-sea-blue" : loadingMat ? "border-gray-300 bg-gray-100" : matriculaNotFound ? "border-red-400 bg-red-50 text-red-700" : "border-gray-300 focus:ring-1 focus:ring-sea-blue"}`}
                // matriculaNotRegis ? "border-yellow-400 bg-yellow-50 text-yellow-700"
              />
              {loadingMat &&
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <i className="mdi mdi-loading mdi-spin text-gray-400 text-lg"></i>
                </div>
              }
            </div>
            {matriculaNotFound && (
              <p className="absolute text-xs mt-1 text-red-700">
                No se encontró ningún paciente con esa matrícula.
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Nombre <b className="text-red-400">*</b>
            </label>
            <input
              type="text" 
              value={patientData.nombre} 
              disabled 
              placeholder="Nombre" 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-gray-50 text-gray-800 font-medium outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Fecha
            </label>
            <div className="relative">
              <input
                type="date"
                value={new Date().toISOString().split('T')[0]}
                disabled
                placeholder="Fecha"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-gray-50 text-gray-800 font-medium outline-none"
              />
              {/* <i className="mdi mdi-calendar-blank font-medium text-gray-700 text-[15px] absolute right-[15px] top-[9px]"></i> */}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Fecha de nacimiento <b className="text-red-400">*</b>
            </label>
            <input
              type="date"
              value={ficha.fechaNacimiento}
              onChange={(e) => {
                const dob = e.target.value;
                const age = dob ? String(Math.floor((Date.now() - new Date(dob).getTime()) / 3.15576e10)) : "";
                setFicha((f) => ({ ...f, fechaNacimiento: dob, edad: age }));
              }}
              placeholder="Fecha"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-sea-blue text-gray-800 font-medium outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Edad <b className="text-red-400">*</b>
            </label>
            <input
              type="text"
              value={`${ficha.edad ? ficha.edad + " años" : ""}`}
              disabled 
              // onChange={(e) => setFicha((f) => ({ ...f, edad: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-gray-50 text-gray-800 font-medium outline-none"
              placeholder="Edad"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Género <b className="text-red-400">*</b>
            </label>
            <select
              value={ficha.genero}
              onChange={(e) => {
                const newGenero = e.target.value;
                setFicha((f) => ({ ...f, genero: newGenero }));
                if (newGenero !== "F") {
                  setGineco({
                    menarquia: "", ritmo: "", fum: "", dismenorrea: "",
                    incapacitante: "", diasDismenorrea: "", papanicolau: "",
                    mamas: "", gestas: "", partos: "", cesareas: "",
                    abortos: "", usg: "", mastografia: "", birads: "",
                  });
                }
              }}
              className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-sea-blue outline-none" 
            >
              <option value="" disabled hidden>Seleccionar</option>
              <option value="F">Femenino</option>
              <option value="M">Masculino</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Estado civil <b className="text-red-400">*</b>
            </label>
            <select
              value={ficha.estadoCivil}
              onChange={(e) => setFicha((f) => ({ ...f, estadoCivil: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-sea-blue outline-none" 
            >
              <option value="" disabled hidden>Seleccionar</option>
              <option value="S">Soltero</option>
              <option value="C">Casado</option>
              <option value="D">Divorciado</option>
              <option value="V">Viudo</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Escolaridad <b className="text-red-400">*</b>
            </label>
            <select
              value={ficha.escolaridad}
              onChange={(e) => setFicha((f) => ({ ...f, escolaridad: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-sea-blue outline-none" 
            >
              <option value="" disabled hidden>Seleccionar</option>
              <option value="1">Sin escolaridad</option>
              <option value="2">Educación preescolar</option>
              <option value="3">Educación primaria</option>
              <option value="4">Educación secundaria</option>
              <option value="5">Educación media superior</option>
              <option value="6">Licenciatura</option>
              <option value="7">Especialidad</option>
              <option value="8">Maestría</option>
              <option value="9">Doctorado</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              No. IMSS <b className="text-red-400">*</b>
            </label>
            <input
              type="text"
              maxLength={11}
              value={ficha.noImss}
              onChange={(e) => setFicha((f) => ({ ...f, noImss: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-1 text-gray-800 font-medium outline-none"
              placeholder="No. IMSS (11 caracteres)"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Puesto al que aspira
            </label>
            <input
              type="text" 
              value={patientData.especialidad}
              disabled 
              placeholder="Puesto al que aspira" 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-gray-50 text-gray-800 font-medium outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Contacto de emergencia
            </label>
            <input
              type="text" 
              value={ficha.contactoEmergencia}
              onChange={(e) => setFicha((f) => ({ ...f, contactoEmergencia: e.target.value }))}
              placeholder="Nombre de contacto" 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-1 text-gray-800 font-medium outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Número de contacto
            </label>
            <input 
              type="number" 
              step="1" 
              value={ficha.numeroContacto}
              onChange={(e) => { if (e.target.value.length > 12) return; setFicha((f) => ({ ...f, numeroContacto: e.target.value })); }}
              maxLength={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-1 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="Número de contacto"
            />
          </div>
        </div>
      </div>
      
      <label className="block text-xs text-right font-medium text-gray-700 mt-3">
        <b className="text-red-400">*</b> Campo obligatorio
      </label>
    </div>,

    <div key="laboral">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div></div>
          <div></div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Edad de inicio de actividad laboral <b className="text-red-400">*</b>
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                maxLength={2}
                value={edadInicioLaboral}
                onChange={(e) => setEdadInicioLaboral(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-1 text-gray-800 font-medium outline-none"
                placeholder="18"
              />
              <span className="absolute right-3 text-gray-400 text-xs pointer-events-none">
                años
              </span>
            </div>
          </div>
        </div>

        <div className="border border-gray-300 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-300">
                <th className="px-3 py-2 text-left font-medium text-gray-700 mb-1 w-1/3">
                  Empresa
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700 mb-1 w-1/3">
                  Puesto
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-700 mb-1 w-1/3">
                  Tiempo que trabajo
                </th>
              </tr>
            </thead>
            <tbody>
              {antLaborales.map((row, i) => (
                <tr key={i}>
                  {(["empresa", "puesto", "tiempo"] as const).map((col) => (
                    <td key={col} className="px-3 py-2">
                      <input
                        type="text"
                        value={row[col]}
                        onChange={(e) => setAntLaborales((prev) => prev.map((r, idx) => idx === i ? { ...r, [col]: e.target.value } : r))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-1 text-gray-800 font-medium outline-none"
                        placeholder={col.charAt(0).toUpperCase() + col.slice(1)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mt-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-800 flex items-center">
            <i className="mdi mdi-skull-crossbones mr-2"></i>
            Exposición a Agentes en el Trabajo
          </h2>
        </div>
      </div>

      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-300">
              <th className="px-3 py-2 text-left font-medium text-gray-700 mb-1 w-1/3">
                Agente
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-700 mb-1 w-1/3">
                Tiempo de exposición
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-700 mb-1 w-1/3">
                Puesto de trabajo
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(agentes).map(([agente, val], i) => (
              <tr 
                key={agente}
                // className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
              >
                <td className="px-3 py-2 font-medium text-gray-700 mb-1">
                  {agente}
                </td>
                {(["tiempo", "puesto"] as const).map((col) => (
                  <td key={col} className="px-3 py-2">
                    <input 
                      type="text" 
                      value={val[col]} 
                      onChange={(e) => setAgentes((prev) => ({ ...prev, [agente]: { ...prev[agente], [col]: e.target.value } }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-1 text-gray-800 font-medium outline-none"
                      placeholder={col.charAt(0).toUpperCase() + col.slice(1)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>,

    <div key="familiares">
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-300">
              <th className="px-3 py-2 text-left font-medium text-gray-700 mb-1">
                Antecedente familiar
              </th>
              {["Abuelos", "Padres", "Hermanos", "Hijos", "Otros"].map((col) => (
                <th key={col} className="px-3 py-2 text-center font-medium text-gray-700 mb-1 w-1/7">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(antFamiliares).map(([ant, vals], i) => (
              <tr 
                key={ant} 
                // className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
              >
                <td className="px-3 py-3 font-medium text-gray-700 mb-1">
                  {ant}
                </td>
                {(["abuelos", "padres", "hermanos", "hijos", "otros"] as const).map((col) => (
                  <td key={col} className="px-3 py-3 text-center">
                    <div className="flex justify-center">
                      <CkCell checked={vals[col]} onChange={(v) => setAntFamiliares((prev) => ({ ...prev, [ant]: { ...prev[ant], [col]: v } }))} />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>,

    <div key="patologicos">
      <div className="border border-gray-300 rounded-lg overflow-hidden mb-4">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b  border-gray-300">
              <th className="px-3 py-2 text-left font-medium text-gray-700 mb-1 w-1/5">
                Antecedente
              </th>
              <th className="px-3 py-2 text-center font-medium text-gray-700 mb-1 w-1/10">
                Si / No
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-700 mb-1 w-1/5">
                Observación
              </th>
              <th className="px-3 py-2 text-left font-medium border-l border-gray-300 text-gray-700 mb-1 w-1/5">
                Antecedente
              </th>
              <th className="px-3 py-2 text-center font-medium text-gray-700 mb-1 w-1/10">
                Si / No
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-700 mb-1 w-1/5">
                Observación
              </th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Sífilis", "Traumáticos"],
              ["Tuberculosis", "Quirúrgicos"],
              ["Diabetes", "Epilépticos"],
              ["Hipertensión", "Atópicos"],
              ["Cardiópatas", "Lumbalgias"],
              ["Renales", "Vértigo"],
              ["Fobias", "Otros"],
            ].map(([left, right], i) => (
              <tr key={i}>
                {/* className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"} */}
                <td className="px-3 py-2 font-medium text-gray-700">
                  {left}
                </td>
                <td className="px-3 py-2 text-center">
                  <div className="flex justify-center">
                    <CkCell
                      checked={antPatologicos[left]?.si ?? false}
                      onChange={() => setAntPatologicos((p) => ({ ...p, [left]: { ...p[left], si: !p[left]?.si } }))}
                    />
                  </div>
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="text"
                    value={antPatologicos[left]?.observacion ?? ""}
                    onChange={(e) => setAntPatologicos((p) => ({ ...p, [left]: { ...p[left], observacion: e.target.value } }))}
                    placeholder="Observación"
                    disabled={!antPatologicos[left]?.si}
                    className={`w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-1 outline-none transition-colors ${ antPatologicos[left]?.si ? "text-gray-800 bg-white focus:ring-sea-blue" : " bg-gray-50 cursor-not-allowed" }`}
                  />
                </td>
                <td className="px-3 py-2 font-medium text-gray-700 border-l border-gray-300">
                  {right}
                </td>
                <td className="px-3 py-2 text-center">
                  <div className="flex justify-center">
                    <CkCell
                      checked={antPatologicos[right]?.si ?? false}
                      onChange={() => setAntPatologicos((p) => ({ ...p, [right]: { ...p[right], si: !p[right]?.si } }))}
                    />
                  </div>
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="text"
                    value={antPatologicos[right]?.observacion ?? ""}
                    onChange={(e) => setAntPatologicos((p) => ({ ...p, [right]: { ...p[right], observacion: e.target.value } }))}
                    placeholder="Observación"
                    disabled={!antPatologicos[right]?.si}
                    className={`w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-1 outline-none transition-colors ${ antPatologicos[right]?.si ? "text-gray-800 bg-white focus:ring-sea-blue" : "bg-gray-50 cursor-not-allowed" }`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mt-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-800 flex items-center">
            <i className="mdi mdi-needle mr-2"></i>
            Esquema de Vacunación
          </h2>
        </div>
      </div>
      
      <div className="border border-gray-300 rounded-lg overflow-hidden mb-4">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-300">
              <th className="px-3 py-2 text-left font-medium text-gray-700 w-1/5">
                Vacuna
              </th>
              <th className="px-3 py-2 text-center font-medium text-gray-700 w-1/10">
                Dósis
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-700 w-1/5">
                Fecha
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-700 border-l border-gray-300 w-1/5">
                Vacuna
              </th>
              <th className="px-3 py-2 text-center font-medium text-gray-700 w-1/10">
                Dósis
              </th>
              <th className="px-3 py-2 text-left font-medium text-gray-700 w-1/5">
                Fecha
              </th>
            </tr>
          </thead>
          
          <tbody>
            {(["influenza", "toxoide", "hepatitisB", "neumococica"] as const).map((v, i) => {
              const chkKey = ({ influenza: "inflChk", toxoide: "toxChk", hepatitisB: "hepaChk", neumococica: "neumoChk" } as const)[v];
              const label = { influenza: "Influenza", toxoide: "Toxoide", hepatitisB: "Hepatitis B", neumococica: "Neumocócica" }[v];
              
              const checked = vacunas[chkKey];
              
              const covidRows = [
                { key: "covid1ra" as const, fechaKey: "covid1raFecha" as const, label: "1ra" },
                { key: "covid2da" as const, fechaKey: "covid2daFecha" as const, label: "2da" },
                { key: "covidRF"  as const, fechaKey: "covidRFFecha"  as const, label: "RF"  },
              ];
              
              const covid = covidRows[i];
              
              return (
                <tr key={v}>
                  <td className="px-3 py-2 font-medium text-gray-700">
                    {label}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex justify-center">
                      <CkCell
                        checked={checked}
                        onChange={(val) => setVacunas((p) => ({ ...p, [chkKey]: val ?? false, [v]: val ? p[v] : "", })) }
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="date"
                      value={vacunas[v]}
                      // new Date().toISOString().split("T")[0]
                      disabled={!checked}
                      onChange={(e) => setVacunas((p) => ({ ...p, [v]: e.target.value })) }
                      className={`w-32 px-3 py-1.5 border border-gray-300 rounded-lg text-xs outline-none transition-colors ${ checked ? "text-gray-800 bg-white focus:ring-1 focus:ring-sea-blue" : "text-sea-blue/50 bg-gray-50 cursor-not-allowed" }`}
                    />
                  </td>
                  <td className="px-3 py-2 font-medium text-gray-700 border-l border-gray-300">
                    {covid ? `Covid-19 (${covid.label})` : ""}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {covid && (
                      <div className="flex justify-center">
                        <CkCell
                          checked={vacunas[covid.key]}
                          onChange={(val) => setVacunas((p) => ({ ...p, [covid.key]: val ?? false, [covid.fechaKey]: val ? p[covid.fechaKey] : "", })) }
                        />
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {covid && (
                      <input
                        type="date"
                        value={vacunas[covid.fechaKey]}
                        disabled={!vacunas[covid.key]}
                        onChange={(e) => setVacunas((p) => ({ ...p, [covid.fechaKey]: e.target.value, })) }
                        className={`w-32 px-3 py-1.5 border border-gray-300 rounded-lg text-xs outline-none transition-colors ${ vacunas[covid.key] ? "text-gray-800 bg-white focus:ring-1 focus:ring-sea-blue" : "text-sea-blue/50 bg-gray-50 cursor-not-allowed" }`}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>,

    <div key="nopatologicos">
      <div className="border border-gray-300 rounded-lg overflow-hidden mb-4">
        <div className="bg-gray-50 px-3 py-1 border-b border-gray-300">
          <span className="text-xs font-medium text-gray-700">
            Antecedentes personales no patológicos
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-3">
          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Toxicomanías
            </label>
            <select
              value={antNoPatologico.toxicomanias ? "SI" : "NO"}
              onChange={(e) => setAntNoPatologico((p) => ({
                ...p,
                toxicomanias: e.target.value === "SI",
                toxicomaniasEsp: e.target.value === "SI" ? p.toxicomaniasEsp : "",
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-sea-blue text-gray-800 font-medium outline-none"
            >
              <option value="" disabled hidden>Seleccionar</option>
              <option value="SI">Sí</option>
              <option value="NO">No</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Especifique
            </label>
            <input
              type="text"
              value={antNoPatologico.toxicomaniasEsp}
              onChange={(e) => setAntNoPatologico((p) => ({ ...p, toxicomaniasEsp: e.target.value }))}
              placeholder="Seleccione una opción primero"
              disabled={!antNoPatologico.toxicomanias}
              className={`w-full px-3 py-2 border rounded-lg text-xs font-medium outline-none transition-colors ${ antNoPatologico.toxicomanias ? "text-gray-800 bg-white focus:ring-1 focus:ring-sea-blue border-gray-300" : "text-gray-800 bg-gray-50 border-gray-300" }`}
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Alcoholismo
            </label>
            <select
              value={antNoPatologico.alcoholismo ? "SI" : "NO"}
              onChange={(e) => setAntNoPatologico((p) => ({
                ...p,
                alcoholismo: e.target.value === "SI",
                alcoholismoEsp: e.target.value === "SI" ? p.alcoholismoEsp : "",
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-sea-blue text-gray-800 font-medium outline-none"
            >
              <option value="" disabled hidden>Seleccionar</option>
              <option value="SI">Sí</option>
              <option value="NO">No</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Especifique
            </label>
            <input
              type="text"
              value={antNoPatologico.alcoholismoEsp}
              onChange={(e) => setAntNoPatologico((p) => ({ ...p, alcoholismoEsp: e.target.value }))}
              placeholder="Seleccione una opción primero"
              disabled={!antNoPatologico.alcoholismo}
              className={`w-full px-3 py-2 border rounded-lg text-xs font-medium outline-none transition-colors ${ antNoPatologico.alcoholismo ? "text-gray-800 bg-white focus:ring-1 focus:ring-sea-blue border-gray-300" : "text-gray-800 bg-gray-50 border-gray-300" }`}
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Tabaquismo
            </label>
            <select
              value={antNoPatologico.tabaquismo ? "SI" : "NO"}
              onChange={(e) => setAntNoPatologico((p) => ({
                ...p,
                tabaquismo: e.target.value === "SI",
                tabaquismoEsp: e.target.value === "SI" ? p.tabaquismoEsp : "",
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-sea-blue text-gray-800 font-medium outline-none"
            >
              <option value="" disabled hidden>Seleccionar</option>
              <option value="SI">Sí</option>
              <option value="NO">No</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Especifique
            </label>
            <input
              type="text"
              value={antNoPatologico.tabaquismoEsp}
              onChange={(e) => setAntNoPatologico((p) => ({ ...p, tabaquismoEsp: e.target.value }))}
              placeholder="Seleccione una opción primero"
              disabled={!antNoPatologico.tabaquismo}
              className={`w-full px-3 py-2 border rounded-lg text-xs font-medium outline-none transition-colors ${ antNoPatologico.tabaquismo ? "text-gray-800 bg-white focus:ring-1 focus:ring-sea-blue border-gray-300" : "text-gray-800 bg-gray-50 border-gray-300" }`}
            />
          </div>
        </div>
      </div>
    </div>,

    <div key="gineco">
      <div className={`relative border border-gray-300 rounded-lg overflow-hidden mb-4 transition-opacity ${ficha.genero !== "F" ? "opacity-50 pointer-events-none select-none" : ""}`}>
        {ficha.genero !== "F" && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 rounded-lg">
            {/* <span className="text-xs text-gray-600 bg-white border border-gray-300 rounded-full px-4 py-1.5 shadow-sm">
              <i className="mdi mdi-lock-outline mr-1" />
              {ficha.genero === "M" ? "Sección no aplica para género Masculino" : "Seleccione género Femenino para habilitar esta sección"}
            </span> */}
          </div>
        )}
        <div className="bg-gray-50 px-3 py-1 border-b border-gray-300">
          <span className="text-xs font-medium text-gray-700">
            Antecedentes gineco-obstétricos
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-3 pt-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Menarquia
            </label>
            <input 
              type="text" 
              value={gineco.menarquia}
              onChange={(e) => setGineco((g) => ({ ...g, menarquia: e.target.value }))} 
              placeholder="Menarquia" 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-sea-blue text-gray-800 font-medium outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Ritmo
            </label>
            <input 
              type="text" 
              value={gineco.ritmo} 
              onChange={(e) => setGineco((g) => ({ ...g, ritmo: e.target.value }))} 
              placeholder="Ritmo" 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-sea-blue text-gray-800 font-medium outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Papanicolau
            </label>
            <input 
              type="text" 
              value={gineco.papanicolau} 
              onChange={(e) => setGineco((g) => ({ ...g, papanicolau: e.target.value }))} 
              placeholder="Papanicolau" 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-sea-blue text-gray-800 font-medium outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              FUM
            </label>
            <input 
              type="date" 
              value={gineco.fum} 
              onChange={(e) => setGineco((g) => ({ ...g, fum: e.target.value }))} 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-sea-blue text-gray-800 font-medium outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">Fecha de última menstruación</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Dismenorrea
            </label>
            <input 
              type="text" 
              value={gineco.dismenorrea} 
              onChange={(e) => setGineco((g) => ({ ...g, dismenorrea: e.target.value }))} 
              placeholder="Dismenorrea" 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-sea-blue text-gray-800 font-medium outline-none"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Incapacitante
              </label>
              <select
                value={gineco.incapacitante} 
                onChange={(e) => setGineco((g) => ({ ...g, incapacitante: e.target.value, diasDismenorrea: e.target.value !== "SI" ? "" : g.diasDismenorrea }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-sea-blue text-gray-800 font-medium outline-none"
              >
                <option value="" disabled hidden>Seleccionar</option>
                <option value="SI">Si</option>
                <option value="NO">No</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Días
              </label>
              <div className="relative flex items-center">
                <input 
                  type="number"
                  value={gineco.diasDismenorrea}
                  disabled={gineco.incapacitante !== "SI"}
                  onChange={(e) => { if (e.target.value.length > 3) return; setGineco((g) => ({ ...g, diasDismenorrea: e.target.value })); }}
                  placeholder="1" 
                  className={`w-full px-3 py-2 ${gineco.incapacitante == "SI" ? "" : "bg-gray-50"} border border-gray-300 rounded-lg text-xs focus:ring-1 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                />
                <span className="absolute right-3 text-gray-400 text-xs pointer-events-none">día(s)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 px-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Gestas
            </label>
            <input 
              type="text" 
              value={gineco.gestas} 
              onChange={(e) => setGineco((g) => ({ ...g, gestas: e.target.value }))} 
              placeholder="Gestas" 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-sea-blue text-gray-800 font-medium outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Partos
            </label>
            <input 
              type="text" 
              value={gineco.partos} 
              onChange={(e) => setGineco((g) => ({ ...g, partos: e.target.value }))} 
              placeholder="Partos" 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-sea-blue text-gray-800 font-medium outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Cesáreas
            </label>
            <input 
              type="text" 
              value={gineco.cesareas} 
              onChange={(e) => setGineco((g) => ({ ...g, cesareas: e.target.value }))} 
              placeholder="Cesáreas" 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-sea-blue text-gray-800 font-medium outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Abortos
            </label>
            <input 
              type="text" 
              value={gineco.abortos} 
              onChange={(e) => setGineco((g) => ({ ...g, abortos: e.target.value }))} 
              placeholder="Abortos" 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-sea-blue text-gray-800 font-medium outline-none"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 px-3 pb-3">
          <div className="hidden">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Mamas
            </label>
            <input 
              type="text" 
              value={gineco.mamas}
              onChange={(e) => setGineco((g) => ({ ...g, mamas: e.target.value }))}
              placeholder="Mamas" 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-sea-blue text-gray-800 font-medium outline-none"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 px-3 pb-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              USG
            </label>
            <input 
              type="text" 
              value={gineco.usg}
              onChange={(e) => setGineco((g) => ({ ...g, usg: e.target.value }))}
              placeholder="USG" 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-sea-blue text-gray-800 font-medium outline-none"
            />
            {/* <p className="text-xs text-gray-400 mt-1">Ultrasonido de mamas</p> */}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Mastografía
            </label>
            <input 
              type="text" 
              value={gineco.mastografia} 
              onChange={(e) => setGineco((g) => ({ ...g, mastografia: e.target.value }))}
              placeholder="Mastografía" 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-sea-blue text-gray-800 font-medium outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Bi-Rads
            </label>
            <select
              value={gineco.birads} 
              onChange={(e) => setGineco((g) => ({ ...g, birads: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-sea-blue text-gray-800 font-medium outline-none"
            >
              <option value="" disabled hidden>Seleccionar</option>
              <option value="B0">Bi-Rads 0</option>
              <option value="B1">Bi-Rads 1</option>
              <option value="B2">Bi-Rads 2</option>
              <option value="B3">Bi-Rads 3</option>
              <option value="B4">Bi-Rads 4</option>
              <option value="B5">Bi-Rads 5</option>
              <option value="B6">Bi-Rads 6</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">
              {birads[(gineco.birads)] || "Seleccione una opción."}
            </p>
          </div>
        </div>
      </div>
    </div>,

    <div key="salud">
      <div className="border border-gray-300 rounded-lg overflow-hidden mb-4">
        <div className="bg-gray-50 px-3 py-1 border-b border-gray-300">
          <span className="text-xs font-medium text-gray-700">
            ¿Ha estado incapacitado?
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-3">
          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Por riesgo de trabajo
            </label>
            <select
              value={incapacidadRiesgo}
              onChange={(e) => {
                const val = e.target.value;
                setIncapacidadRiesgo(val);
                if (val !== "SI") setIncapacidadValuacion("");
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-sea-blue text-gray-800 font-medium outline-none"
            >
              <option value="" disabled hidden>Seleccionar</option>
              <option value="SI">Sí</option>
              <option value="NO">No</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Valuación
            </label>
            <input
              type="text"
              value={incapacidadValuacion}
              onChange={(e) => setIncapacidadValuacion(e.target.value)}
              placeholder="Seleccione una opción primero"
              disabled={incapacidadRiesgo !== "SI"}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium outline-none transition-colors ${
                incapacidadRiesgo === "SI" ? "text-gray-800 bg-white focus:ring-1 focus:ring-sea-blue" : "text-gray-800 bg-gray-50"
              }`}
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Por enfermedad general
            </label>
            <select
              value={incapacidadEG}
              onChange={(e) => {
                const val = e.target.value;
                setIncapacidadEG(val);
                if (val !== "SI") setIncapacidadComentario("");
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-sea-blue text-gray-800 font-medium outline-none"
            >
              <option value="" disabled hidden>Seleccionar</option>
              <option value="SI">Sí</option>
              <option value="NO">No</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Comentario
            </label>
            <input
              type="text"
              value={incapacidadComentario}
              onChange={(e) => setIncapacidadComentario(e.target.value)}
              placeholder="Seleccione una opción primero"
              disabled={incapacidadEG !== "SI"}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium outline-none transition-colors ${
                incapacidadEG === "SI" ? "text-gray-800 bg-white focus:ring-1 focus:ring-sea-blue" : "text-gray-800 bg-gray-50"
              }`}
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Mano dominante <b className="text-red-400">*</b>
            </label>
            <select
              value={manoDominante}
              onChange={(e) => setManoDominante(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-sea-blue text-gray-800 font-medium outline-none"
            >
              <option value="" disabled hidden>Seleccionar</option>
              <option value="DER">Derecha</option>
              <option value="IZQ">Izquierda</option>
              <option value="AMB">Ambidiestro</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              ¿Actualmente padece alguna enfermedad? <b className="text-red-400">*</b>
            </label>
            <textarea 
              rows={1} 
              value={enfermedadActual} 
              onChange={(e) => setEnfermedadActual(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-sea-blue text-gray-800 font-medium outline-none resize-none"
              placeholder="Especifique la enfermedad que actualmente padece"
            />
          </div>
        </div>
      </div>
    </div>,

    <div key="exploracion">
      <div className="border border-gray-300 rounded-lg overflow-hidden mb-4">
        <div className="bg-gray-50 px-3 py-1 border-b border-gray-300">
          <span className="text-xs font-medium text-gray-700">
            Signos vitales
          </span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-2 gap-x-4 p-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Peso (kg) <b className="text-red-400">*</b>
            </label>
            <div className="relative flex items-center">
              {/* <Weight className="h-3.5 w-3.5 absolute left-3 top-2.5 text-gray-400" /> */}
              <input 
                type="number" 
                step="0.1" 
                value={vitalSigns.Peso} 
                onChange={(e) => { if(e.target.value.length > 6) return;handleMeasureChange("Peso",e.target.value); }} 
                className="w-full p-2 pr-10 border border-gray-300 rounded-lg text-xs focus:ring-1 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0.0"
              />
              <span className="absolute right-3 text-gray-400 text-xs pointer-events-none">kg</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Altura (m) <b className="text-red-400">*</b>
            </label>
            <div className="relative flex items-center">
              {/* <Ruler className="h-3.5 w-3.5 absolute left-3 top-2.5 text-gray-400" /> */}
              <input
                type="number" 
                step="0.01" 
                value={vitalSigns.Talla} 
                onChange={(e) => { if(e.target.value.length > 4) return;handleMeasureChange("Talla",e.target.value); }} 
                className="w-full p-2 pr-10 border border-gray-300 rounded-lg text-xs focus:ring-1 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                placeholder="0.00" 
              />
              <span className="absolute right-3 text-gray-400 text-xs pointer-events-none">m</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              IMC
            </label>
            <div className="relative flex items-center">
              {/* <Scale className={`h-3.5 w-3.5 absolute left-3 top-2.5 pointer-events-none transition-colors ${getImcIcon(vitalSigns.IMC)}`} /> */}
              <input 
                type="text" 
                value={vitalSigns.IMC} 
                disabled 
                className={`w-full p-2 border rounded-lg text-xs outline-none transition-colors ${getImcInput(vitalSigns.IMC)}`} 
                placeholder="0.00"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Índice de masa corporal</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Abdomen (cm) <b className="text-red-400">*</b>
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                value={vitalSigns.Abdomen}
                onChange={(e) => { if (e.target.value.length > 6) return; setVitalSigns((v) => ({ ...v, Abdomen: e.target.value })); }}
                className="w-full p-2 pr-10 border border-gray-300 rounded-lg text-xs focus:ring-1 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0.00"
              />
              <span className="absolute right-3 text-gray-400 text-xs pointer-events-none">cm</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
             T/A (mmHg) <b className="text-red-400">*</b>
            </label>
            <div className="relative flex items-center border border-gray-300 rounded-lg focus-within:ring-1 focus-within:ring-clinical-blue focus-within:border-clinical-blue bg-white">
              {/* <Activity className="h-3.5 w-3.5 absolute left-3 text-gray-400 pointer-events-none z-10" /> */}
              <div className="flex items-center w-full pl-2 pr-2 py-2">
                <input 
                  type="number" 
                  value={vitalSigns.Sistolica} 
                  onChange={(e) => { const s = e.target.value; if (s.length > 3) return; const d = vitalSigns.Diastolica; setVitalSigns((v) => ({ ...v, Sistolica: s, TA: `${s ? Math.round(parseFloat(s)/10) : 0} / ${d ? Math.round(parseFloat(d)/10) : 0}` })); }}
                  className="w-6 text-xs outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="120"
                />
                <span className="text-gray-400 font-medium text-xs px-1">/</span>
                <input 
                  type="number" 
                  value={vitalSigns.Diastolica} 
                  onChange={(e) => { const d = e.target.value; if (d.length > 3) return; const s = vitalSigns.Sistolica; setVitalSigns((v) => ({ ...v, Diastolica: d, TA: `${s ? Math.round(parseFloat(s)/10) : 0} / ${d ? Math.round(parseFloat(d)/10) : 0}` })); }}
                  className="w-6 text-xs outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="80"
                />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">Tensión arterial</p>
          </div>

          {/*  */}
          <div className="hidden">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              T/A
            </label>
            <div className="relative flex items-center">
              {/* <AudioWaveform className="h-3.5 w-3.5 absolute left-3 text-gray-400 pointer-events-none z-10" /> */}
              <input 
                type="text" 
                value={vitalSigns.TA} 
                disabled 
                className="w-full p-2 border border-gray-300 rounded-lg text-xs bg-gray-50 text-gray-700 font-medium outline-none" 
                placeholder="12 / 8"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Tensión arterial</p>
          </div>
          {/*  */}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              FC (lpm) <b className="text-red-400">*</b>
            </label>
            <div className="relative flex items-center">
              {/* <HeartPulse className="h-3.5 w-3.5 absolute left-3 top-2.5 text-gray-400" /> */}
              <input 
                type="number" 
                value={vitalSigns.FC} 
                onChange={(e) => { if (e.target.value.length > 3) return; setVitalSigns((v) => ({ ...v, FC: e.target.value })); }}
                className="w-full p-2 pr-10 border border-gray-300 rounded-lg text-xs focus:ring-1 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                placeholder="70"
              />
              <span className="absolute right-3 text-gray-400 text-xs pointer-events-none">lpm</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Frecuencia cardiaca
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              FR (rpm) <b className="text-red-400">*</b>
            </label>
            <div className="relative flex items-center">
              {/* <Wind className="h-3.5 w-3.5 absolute left-3 text-gray-400 pointer-events-none z-10" /> */}
              <input 
                type="number" 
                step="0.1" 
                value={vitalSigns.FR} 
                onChange={(e) => { if (e.target.value.length > 4) return; setVitalSigns((v) => ({ ...v, FR: e.target.value })); }}
                className="w-full p-2 pr-10 border border-gray-300 rounded-lg text-xs focus:ring-1 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="18"
              />
              <span className="absolute right-3 text-gray-400 text-xs pointer-events-none">rpm</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Frecuencia respiratoria
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              SpO2 (%) <b className="text-red-400">*</b>
            </label>
            <div className="relative flex items-center">
              {/* <Bubbles className="h-3.5 w-3.5 absolute left-3 top-2.5 text-gray-400" /> */}
              <input 
                type="number" 
                value={vitalSigns.SpO2} 
                onChange={(e) => { const r = e.target.value; if (r === "") { setVitalSigns((v) => ({ ...v, SpO2: "" })); return; } if (parseInt(r) > 100 || r.length > 3) return; setVitalSigns((v) => ({ ...v, SpO2: r })); }}
                className="w-full p-2 pr-10 border border-gray-300 rounded-lg text-xs focus:ring-1 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                placeholder="98"
              />
              <span className="absolute right-3 text-gray-400 text-xs pointer-events-none">%</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Saturación de oxígeno
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mt-4 mb-4">
        <div>
          <h2 className="text-sm font-bold text-gray-800 flex items-center">
            <i className="mdi mdi-brain mr-4"></i>
            Cabeza
          </h2>
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-800 flex items-center">
            <i className="mdi mdi-ear-hearing mr-4"></i>
            Oídos
          </h2>
        </div>
      </div>

      <ExpTableDouble
        leftTitle="Cabeza" leftFields={["Forma", "Tamaño", "Pelo", "Cara"]}
        leftSection={expCabeza} leftSetter={setExpCabeza}
        rightTitle="Oídos" rightFields={["C.A.E", "Pabellón", "Tímpanos", "Descripción"]}
        rightSection={expOidos} rightSetter={setExpOidos}
      />

      <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mt-4 mb-4">
        <div>
          <h2 className="text-sm font-bold text-gray-800 flex items-center">
            <i className="mdi mdi-eye mr-4"></i>
            Ojos
          </h2>
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-800 flex items-center">
            <i className="mdi mdi-bullseye-arrow mr-4"></i>
            Agudeza Visual
          </h2>
        </div>
      </div>
      
      <div className="border border-gray-300 rounded-lg overflow-hidden mb-4">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-300">
              <th className="px-3 py-2 text-left font-medium text-gray-700 w-[30%]">
                Ojos
              </th>
              <th
                title="Clic para marcar todo"
                className={thSelectClsNarrow(["Reflejos","Párpados","Pupilas","Conjuntivas","Fondo de ojo"].every((f) => expOjos[f]?.valor === "Normal"), "normal")}
                onClick={() => selectAllSection(["Reflejos","Párpados","Pupilas","Conjuntivas","Fondo de ojo"], expOjos, setExpOjos, "Normal")}
              >
                Normal
              </th>
              <th
                title="Clic para marcar todo"
                className={thSelectClsNarrow(["Reflejos","Párpados","Pupilas","Conjuntivas","Fondo de ojo"].every((f) => expOjos[f]?.valor === "Anormal"), "anormal")}
                onClick={() => selectAllSection(["Reflejos","Párpados","Pupilas","Conjuntivas","Fondo de ojo"], expOjos, setExpOjos, "Anormal")}
              >
                Anormal
              </th>
              <th className="px-3 py-2 text-left font-medium border-l border-gray-300 text-gray-700 w-[30%]">
                Agudeza visual
              </th>
              <th className="px-0 py-2 text-center font-medium text-gray-700 w-[10%]">
                {/* Sin lentes */}
              </th>
              <th className="px-0 py-2 text-center font-medium text-gray-700 w-[10%]">
                {/* Con lentes */}
              </th>
            </tr>
          </thead>

          <tbody>
            {["Reflejos", "Párpados", "Pupilas", "Conjuntivas", "Fondo de ojo"].map((field, i) => {
              const avRows = [
                null,
                null,
                { label: "Ojo derecho", st: agudezaOD, set: setAgudezaOD },
                { label: "Ojo izquierdo", st: agudezaOI, set: setAgudezaOI },
              ];
              const av = avRows[i];
            
              return (
                <tr key={field}>
                  {/* Columnas Izquierdas (Ojos) */}
                  <td className="px-3 py-2 font-medium text-gray-700">
                    {field}
                    {/* <b className="text-red-400">*</b> */}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex justify-center">
                      <CkCell
                        checked={expOjos[field]?.valor === "Normal"}
                        onChange={() =>
                          setExpOjos((p) => ({
                            ...p,
                            [field]: { ...p[field], valor: p[field]?.valor === "Normal" ? "" : "Normal" },
                          }))
                        }
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex justify-center">
                      <CkCell
                        checked={expOjos[field]?.valor === "Anormal"}
                        onChange={() =>
                          setExpOjos((p) => ({
                            ...p,
                            [field]: { ...p[field], valor: p[field]?.valor === "Anormal" ? "" : "Anormal" },
                          }))
                        }
                      />
                    </div>
                  </td>
                      
                  {/* Columna Derecha Dinámica (Agudeza Visual) */}
                  {/* Columna Derecha Dinámica (Agudeza Visual) */}
                  {(() => {
                    const avRows = [
                      { label: "Ojo derecho", st: agudezaOD, set: setAgudezaOD },
                      { label: "Ojo izquierdo", st: agudezaOI, set: setAgudezaOI },
                    ];
                  
                    if (i === 0) {
                      return (
                        <>
                          <td className="px-3 py-2 font-medium border-l border-gray-300 text-gray-700">
                            ¿Usa lentes?
                          </td>
                          <td colSpan={2} className="px-2 py-1 bg-gray-50/30">
                            <Toggle2
                              value={usaLentes === null ? "" : usaLentes ? "Si" : "No"}
                              options={["Si", "No"]}
                              onChange={(v) => setUsaLentes(v === "Si" ? true : v === "No" ? false : null)}
                            />
                          </td>
                        </>
                      );
                    }
                  
                    if (i === 1) {
                      return (
                        <>
                          <td className="px-3 py-2 font-medium border-l border-t border-b border-gray-300 text-gray-700 bg-gray-50">
                            {/* ¿Usa lentes? */}
                          </td>
                          <td className="text-center font-medium border-t border-b border-gray-300 text-gray-700 bg-gray-50">
                            Con lentes
                          </td>
                          <td className="text-center font-medium border-t border-b border-gray-300 text-gray-700 bg-gray-50">
                            Sin lentes
                          </td>
                        </>
                      );
                    }
                  
                    const av = avRows[i - 2];
                  
                    if (av) {
                      return (
                        <>
                          <td className="px-3 py-2 font-medium border-l border-gray-300 text-gray-700">
                            {av.label}
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={av.st.sinLentes}
                              onChange={(e) => av.set((p) => ({ ...p, sinLentes: e.target.value }))}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-center outline-none focus:ring-1 focus:ring-sea-blue text-xs"
                              placeholder="20/20"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={av.st.conLentes}
                              onChange={(e) => av.set((p) => ({ ...p, conLentes: e.target.value }))}
                              disabled={!usaLentes}
                              className={`w-full px-2 py-1 border border-gray-300 rounded text-center outline-none text-xs ${
                                !usaLentes ? "bg-gray-100 cursor-not-allowed" : "focus:ring-1 focus:ring-sea-blue"
                              }`}
                              placeholder="20/20"
                            />
                          </td>
                        </>
                      );
                    }

                    return (
                      <>
                        <td className="border-l border-gray-300" />
                        <td />
                        <td />
                      </>
                    );
                  })()}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mt-4 mb-4">
        <div>
          <h2 className="text-sm font-bold text-gray-800 flex items-center">
            <i className="mdi mdi-tooth mr-4"></i>
            Boca
          </h2>
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-800 flex items-center">
            <i className="mdi mdi-weather-windy mr-4"></i>
            Nariz
          </h2>
        </div>
      </div>

      <ExpTableDouble
        leftTitle="Boca" leftFields={["Mucosas", "Dentadura", "Lengua", "Encías", "Faringe", "Amígdalas"]}
        leftSection={expBoca} leftSetter={setExpBoca}
        rightTitle="Nariz" rightFields={["Mucosas", "Tabique"]}
        rightSection={expNariz} rightSetter={setExpNariz}
      />
      
      <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mt-4 mb-4">
        <div>
          <h2 className="text-sm font-bold text-gray-800 flex items-center">
            <i className="mdi mdi-account mr-4"></i>
            {/* <img src="./src/assets/img/neck.png" className="mr-3.5" width="16"></img> */}
            Cuello
          </h2>
        </div>
      </div>

      <DescExpTableDouble
        leftTitle="Cuello" leftFields={["Ganglios", "Movilidad", "Tiroides", "Acantosis", "Pulsos"]}
        leftSection={expCuello} leftSetter={setExpCuello}
      />

      <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mt-4 mb-4">
        <div>
          <h2 className="text-sm font-bold text-gray-800 flex items-center">
            <i className="mdi mdi-lungs mr-4"></i>
            Área Precordial
          </h2>
        </div>
      </div>

      <DescExpTableDouble
        leftTitle="Área precordial" leftFields={["Forma", "Ruidos Cardiacos", "Mamas", "Campos pulmonares"]}
        leftSection={expPrecordial} leftSetter={setExpPrecordial}
      />

      <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mt-4 mb-4">
        <div>
          <h2 className="text-sm font-bold text-gray-800 flex items-center">
            <i className="mdi mdi-arm-flex mr-4"></i>
            Miembros Torácicos
          </h2>
        </div>
      </div>

      <DescExpTableDouble
        leftTitle="Miembros torácicos" leftFields={["Integridad", "Forma", "Articulaciones", "Tono Muscular", "Reflejos", "Sensibilidad"]}
        leftSection={expMTor} leftSetter={setExpMTor}
      />

      <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mt-4 mb-4">
        <div>
          <h2 className="text-sm font-bold text-gray-800 flex items-center">
            <i className="mdi mdi-foot-print mr-4"></i>
            Miembros Pélvicos
          </h2>
        </div>
      </div>

      <DescExpTableDouble
        leftTitle="Miembros pélvicos" leftFields={["Integridad", "Forma", "Articulaciones", "Tono Muscular", "Reflejos", "Sensibilidad", "Micosis (Si / No)", "Edemas (Si / No)", "Varices (Si / No)"]}
        leftSection={expMPel} leftSetter={setExpMPel}
      />

      <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mt-4 mb-4">
        <div>
          <h2 className="text-sm font-bold text-gray-800 flex items-center">
            <i className="mdi mdi-dumbbell mr-4"></i>
            Abdomen
          </h2>
        </div>
      </div>

      <DescExpTableDouble
        leftTitle="Abdomen" leftFields={["Forma", "Visceromegalias (Si / No)", "Hernias (Si / No)"]}
        leftSection={expAbdomen} leftSetter={setExpAbdomen}
      />

      <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mt-4 mb-4">
        <div>
          <h2 className="text-sm font-bold text-gray-800 flex items-center">
            <i className="mdi mdi-gender-male-female mr-4"></i>
            Genitales
          </h2>
        </div>
      </div>

      <DescExpTableDouble
        leftTitle="Genitales" leftFields={["Fimosis", "Varicoceles", "Criptorquidia", "Hernias"]}
        leftSection={expGenitales} leftSetter={setExpGenitales}
      />

      <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mt-4 mb-4">
        <div>
          <h2 className="text-sm font-bold text-gray-800 flex items-center">
            <i className="mdi mdi-fingerprint mr-4"></i>
            Piel y Anexos
          </h2>
        </div>
      </div>

      <DescExpTableDouble
        leftTitle="Piel y anexos" leftFields={["Cicatrices", "Nevos", "Vitíligo"]}
        leftSection={expPiel} leftSetter={setExpPiel}
      />

      <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mt-4 mb-4">
        <div>
          <h2 className="text-sm font-bold text-gray-800 flex items-center">
            <i className="mdi mdi-bone mdi-rotate-90 mr-4"></i>
            Columna Cervical y Dorsal
          </h2>
        </div>
      </div>
      
      <DescExpTableDouble        
        leftTitle="Columna cervical y dorsal" leftFields={["Integridad", "Forma", "Tono muscular", "Sensibilidad", "Fuerza"]}
        leftSection={expColCervical} leftSetter={setExpColCervical}
      />

      <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mt-4 mb-4">
        <div>
          <h2 className="text-sm font-bold text-gray-800 flex items-center">
            <i className="mdi mdi-bone mr-4"></i>
            {/* <img src="./src/assets/img/columna-lumbar.png" className="mr-2" width="16"></img> */}
            Columna Lumbar
          </h2>
        </div>
      </div>

      <DescExpTableDouble        
        leftTitle="Columna lumbar" leftFields={["Integridad", "Forma", "Tono muscular", "Sensibilidad", "Fuerza"]}
        leftSection={expColLumbar} leftSetter={setExpColLumbar}
      />
    </div>,

    <div key="laboratorio">
      <div className="border border-gray-300 rounded-lg overflow-hidden mb-4">
        <div className="bg-gray-50 px-3 py-1 border-b border-gray-300">
          <span className="text-xs font-medium text-gray-700">
            Laboratorio
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-2 gap-x-4 p-3">
          <div className="hidden">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              BH
            </label>
            <div className="relative flex items-center">
              <input 
                type="number" 
                step="0.1" 
                value={labs.bh} 
                onChange={(e) => setLabs((p) => ({ ...p, bh: e.target.value }))}
                className="w-full p-2 pr-10 border border-gray-300 rounded-lg text-xs focus:ring-1 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0.0"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Biometría hemática</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              HTO <b className="text-red-400">*</b>
            </label>
            <div className="relative flex items-center">
              <input 
                type="number" 
                step="0.1" 
                value={labs.hto} 
                onChange={(e) => { const val = e.target.value; if (val.length <= 3) { setLabs((p) => ({ ...p, hto: e.target.value })); } }}
                // onChange={(e) => setLabs((p) => ({ ...p, hto: e.target.value }))}
                className="w-full p-2 pr-10 border border-gray-300 rounded-lg text-xs focus:ring-1 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="45"
              />
              <span className="absolute right-3 text-gray-400 text-xs pointer-events-none">%</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Hematocrito</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              GR <b className="text-red-400">*</b>
            </label>
            <div className="relative flex items-center">
              <input 
                type="number" 
                step="0.1" 
                value={labs.gr} 
                onChange={(e) => { const val = e.target.value; if (val.length <= 3) { setLabs((p) => ({ ...p, gr: e.target.value })); } }}
                // onChange={(e) => setLabs((p) => ({ ...p, gr: e.target.value }))}
                className="w-full p-2 pr-10 border border-gray-300 rounded-lg text-xs focus:ring-1 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="5.0"
              />
              <span className="absolute right-3 text-gray-400 text-xs pointer-events-none">mill/µL</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Glóbulos rojos</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              GB <b className="text-red-400">*</b>
            </label>
            <div className="relative flex items-center">
              <input 
                type="number" 
                step="0.1" 
                value={labs.gb} 
                onChange={(e) => { const val = e.target.value; if (val.length <= 5) { setLabs((p) => ({ ...p, gb: e.target.value })); } }}
                // onChange={(e) => setLabs((p) => ({ ...p, gb: e.target.value }))}
                className="w-full p-2 pr-10 border border-gray-300 rounded-lg text-xs focus:ring-1 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="7000"
              />
              <span className="absolute right-3 text-gray-400 text-xs pointer-events-none">/µL</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Glóbulos blancos</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Plaquetas <b className="text-red-400">*</b>
            </label>
            <div className="relative flex items-center">
              <input 
                type="number" 
                step="0.1" 
                value={labs.plaq} 
                onChange={(e) => { const val = e.target.value; if (val.length <= 6) { setLabs((p) => ({ ...p, plaq: e.target.value })); } }}
                // onChange={(e) => setLabs((p) => ({ ...p, plaq: e.target.value }))}
                className="w-full p-2 pr-10 border border-gray-300 rounded-lg text-xs focus:ring-1 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="250000"
              />
              <span className="absolute right-3 text-gray-400 text-xs pointer-events-none">/µL</span>
            </div>
            {/* <p className="text-xs text-gray-400 mt-1">Plaquetas</p> */}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-y-2 gap-x-4 p-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Glucosa <b className="text-red-400">*</b>
            </label>
            <div className="relative flex items-center">
              <input 
                type="number" 
                step="0.1" 
                value={labs.glucosa} 
                onChange={(e) => { const val = e.target.value; if (val.length <= 3) { setLabs((p) => ({ ...p, glucosa: e.target.value })); } }}
                // onChange={(e) => setLabs((p) => ({ ...p, glucosa: e.target.value }))}
                className="w-full p-2 pr-10 border border-gray-300 rounded-lg text-xs focus:ring-1 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="90"
              />
              <span className="absolute right-3 text-gray-400 text-xs pointer-events-none">mg/dL</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Colesterol <b className="text-red-400">*</b>
            </label>
            <div className="relative flex items-center">
              <input 
                type="number" 
                step="0.1" 
                value={labs.colesterol} 
                onChange={(e) => { const val = e.target.value; if (val.length <= 3) { setLabs((p) => ({ ...p, colesterol: e.target.value })); } }}
                // onChange={(e) => setLabs((p) => ({ ...p, colesterol: e.target.value }))}
                className="w-full p-2 pr-10 border border-gray-300 rounded-lg text-xs focus:ring-1 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="180"
              />
              <span className="absolute right-3 text-gray-400 text-xs pointer-events-none">mg/dL</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              TG <b className="text-red-400">*</b>
            </label>
            <div className="relative flex items-center">
              <input 
                type="number" 
                step="0.1" 
                value={labs.trigliceridos} 
                onChange={(e) => { const val = e.target.value; if (val.length <= 3) { setLabs((p) => ({ ...p, trigliceridos: e.target.value })); } }}
                // onChange={(e) => setLabs((p) => ({ ...p, trigliceridos: e.target.value }))}
                className="w-full p-2 pr-10 border border-gray-300 rounded-lg text-xs focus:ring-1 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="120"
              />
              <span className="absolute right-3 text-gray-400 text-xs pointer-events-none">mg/dL</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Triglicéridos</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Urea <b className="text-red-400">*</b>
            </label>
            <div className="relative flex items-center">
              <input 
                type="number" 
                step="0.1" 
                value={labs.urea} 
                onChange={(e) => { const val = e.target.value; if (val.length <= 2) { setLabs((p) => ({ ...p, urea: e.target.value })); } }}
                // onChange={(e) => setLabs((p) => ({ ...p, urea: e.target.value }))}
                className="w-full p-2 pr-10 border border-gray-300 rounded-lg text-xs focus:ring-1 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="25"
              />
              <span className="absolute right-3 text-gray-400 text-xs pointer-events-none">mg/dL</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Ácido úrico <b className="text-red-400">*</b>
            </label>
            <div className="relative flex items-center">
              <input 
                type="number" 
                step="0.1" 
                value={labs.acUrico} 
                onChange={(e) => { const val = e.target.value; if (val.length <= 3) { setLabs((p) => ({ ...p, acUrico: e.target.value })); } }}
                // onChange={(e) => setLabs((p) => ({ ...p, acUrico: e.target.value }))}
                className="w-full p-2 pr-10 border border-gray-300 rounded-lg text-xs focus:ring-1 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="5.5"
              />
              <span className="absolute right-3 text-gray-400 text-xs pointer-events-none">mg/dL</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-2 gap-4 mt-4 mb-4">
        <div>
          <h2 className="text-sm font-bold text-gray-800 flex items-center">
            <i className="mdi mdi-radiology-box mr-4"></i>
            {/* prescription */}
            Radiografía
          </h2>
        </div>
        <div>
          <h2 className="text-sm font-bold text-gray-800 flex items-center">
            <i className="mdi mdi-thermometer-low mr-4"></i>
            Hallazgos y Pruebas
          </h2>
        </div>
      </div>

      <ExpTableDouble
        leftTitle="Radiografía" leftFields={["R. Tórax", "Columna AP", "Lateral"]}
        leftSection={expRadiografia} leftSetter={setExpRadiografia}
        rightTitle="Hallazgos y pruebas" rightFields={["Lordosis", "Escoliosis", "Antidoping"]}
        rightSection={expHallazgos} rightSetter={setExpHallazgos}
      />
      
      <div className="grid grid-cols-1 gap-4 mt-4 mb-4">
        <div>
          <h2 className="text-sm font-bold text-gray-800 flex items-center">
            <i className="mdi mdi-test-tube mr-4"></i>
            Gabinete
          </h2>
        </div>
      </div>

      <DescExpTable title="Gabinete" fields={["Audiometría", "Ekg", "Fit Test", "Espirómetria"]} section={expGabinete} setter={setExpGabinete} />
    </div>,

    <div key="conclusiones">
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-3 py-1 border-b border-gray-300">
          <span className="text-xs font-medium text-gray-700">
            Diagnósticos <b className="text-red-400">*</b>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3">
          {([1, 2, 3, 4] as const).map((n) => {
            const key = `diagnostico${n}` as keyof Conclusiones;
            const prevKey = `diagnostico${n - 1}` as keyof Conclusiones;
            const isEnabled = n === 1 || !!conclusiones[prevKey];
          
            return (
              <div key={n}>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={conclusiones[key] as string}
                    onChange={(e) => setConclusiones((g) => ({ ...g, [key]: e.target.value }))}
                    placeholder="Diagnóstico"
                    disabled={!isEnabled}
                    className={`w-full px-3 py-2 pl-9 border rounded-lg text-xs focus:ring-1 focus:ring-sea-blue font-medium outline-none transition-colors ${
                      isEnabled
                        ? "border-gray-300 text-gray-800 bg-white" : "border-gray-300 text-gray-800 bg-gray-50"
                    }`}
                  />
                  <span className="absolute left-4 text-gray-800 text-xs pointer-events-none">{n}.</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-gray-50 px-3 py-1 border-b border-t border-gray-300">
          <span className="text-xs font-medium text-gray-700">
            Recomendaciones <b className="text-red-400">*</b>
          </span>
        </div>
        
        <div className="grid grid-cols-1 gap-4 p-3">
          {([1, 2, 3] as const).map((n) => {
            const key = `recomendacion${n}` as keyof Conclusiones;
            const prevKey = `recomendacion${n - 1}` as keyof Conclusiones;
            const isEnabled = n === 1 || !!conclusiones[prevKey];
          
            return (
              <div key={n} className="relative flex items-center">
                <input
                  type="text"
                  value={conclusiones[key] as string}
                  onChange={(e) => setConclusiones((c) => ({ ...c, [key]: e.target.value }))}
                  placeholder={`Recomendación`}
                  disabled={!isEnabled}
                  className={`w-full px-3 py-2 pl-9 border rounded-lg text-xs focus:ring-1 focus:ring-sea-blue font-medium outline-none transition-colors ${
                    isEnabled
                      ? "border-gray-300 text-gray-800 bg-white"
                      : "border-gray-300 text-gray-800 bg-gray-50"
                  }`}
                />
                <span className="absolute left-4 text-gray-800 text-xs pointer-events-none">{n}.</span>
              </div>
            );
          })}
        </div>

        <div>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-t border-gray-300">
                <th className="px-3 py-2 text-left font-medium text-gray-700 w-[50%]">
                  Grado de salud <b className="text-red-400">*</b>
                </th>
                <th className="px-3 py-2 text-left font-medium border-l border-gray-300 text-gray-700 w-[50%]">
                  Resultado <b className="text-red-400">*</b>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-3 py-2 font-medium text-gray-700 space-y-2 align-top">
                  {(["Sano", "Riesgo moderado", "Riesgo alto"] as const).map((opcion) => (
                    <div key={opcion} className="flex items-center gap-2">
                      <CkCell
                        checked={conclusiones.resultado === opcion}
                        onChange={() => setConclusiones((c) => ({ ...c, resultado: c.resultado === opcion ? "" : opcion }))}
                      />
                      <span>{opcion}</span>
                    </div>
                  ))}
                </td>
                <td className="px-3 py-2 font-medium border-l border-gray-300 text-left text-gray-700 space-y-2 align-top">
                  {(["Optimo", "Bueno", "Regular", "Malo"] as const).map((opcion) => (
                    <div key={opcion} className="flex items-center gap-2">
                      <CkCell
                        checked={conclusiones.observaciones === opcion}
                        onChange={() => setConclusiones((c) => ({ ...c, observaciones: c.observaciones === opcion ? "" : opcion }))}
                      />
                      <span>{opcion}</span>
                    </div>
                  ))}
                </td>           
              </tr>
            </tbody>
          </table>
        </div>
      
      {/* <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-3">
        <div className="md:col-span-4">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Grado de salud
          </label>
          <select
            value={conclusiones.resultado}
            onChange={(e) => setConclusiones((c) => ({ ...c, resultado: e.target.value as Conclusiones["resultado"] }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-sea-blue text-gray-800 font-medium outline-none"
          >
            <option value="" disabled hidden>Seleccionar</option>
            <option value="Satisfactorio">Satisfactorio</option>
            <option value="No satisfactorio">No satisfactorio</option>
            <option value="Incompleto">Incompleto</option>
          </select>
        </div>

      </div> */}

      </div>
    </div>,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [currentStep, patientData, ficha, loadingMat, matriculaNotFound, matriculaNotRegis, edadInicioLaboral, antLaborales, agentes, antFamiliares, antPatologicos, vacunas, antNoPatologico, gineco, incapacidadRiesgo, incapacidadValuacion, incapacidadEG, incapacidadComentario, enfermedadActual, manoDominante, vitalSigns, expCabeza, expOidos, expOjos, agudezaOD, agudezaOI, usaLentes, expBoca, expNariz, expCuello, expPrecordial, expMTor, expMPel, expAbdomen, expGenitales, expPiel, expColCervical, expColLumbar, labs, expRadiografia, expHallazgos, expGabinete, conclusiones]);

  return (
    <div className="relative flex w-full overflow-hidden">
      <div className="flex-1 mt-14 transition-all duration-300 ease-in-out">
        <div className="max-w-7xl mx-auto px-4 space-y-6 pb-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-2xl font-bold text-sea-blue">
                  Evaluación Médica
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Registro completo de antecedentes y exploración física.
                </p>
              </div>
            </div>
            <button
              onClick={handleSave}
              // disabled={saving || currentStep < STEPS.length - 1}
              disabled={saving}
              className="w-35 flex items-center justify-center bg-sea-blue hover:bg-sea-blue/80 hover:-translate-y-1 text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-md shadow-blue-500/30 transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none disabled:shadow-none disabled:translate-y-0"
            >
              {saving
                ? <><i className="mdi mdi-loading mdi-spin mr-2" />Guardando...</>
                : <><i className="mdi mdi-plus-thick mr-2" />Guardar</>
              }
            </button>
          </div>

          <div className="flex gap-6 items-stretch">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="sticky top-0 self-start hidden lg:block "
            >
              <VerticalStepper currentStep={currentStep} onStepClick={handleStepClick} />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm h-155 flex flex-col overflow-y-auto"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-800 flex items-center">
                  <i className={`${STEPS[currentStep].icon} mr-2`}></i>
                  <p className="ml-2">{STEPS[currentStep].label}</p>
                </h2>
                <StepNavButtons
                  currentStep={currentStep}
                  totalSteps={STEPS.length}
                  onBack={() => setCurrentStep((s) => Math.max(0, s - 1))}
                  onNext={handleNext}
                />
              </div>
              <div className="flex-1 p-6 overflow-y-auto">
                {stepPanels[currentStep]}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Evaluacion;