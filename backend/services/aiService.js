/**
 * Medical Expert System Service for SCII-AI
 * Simulates a high-level internist physician analyzing clinical data.
 *
 * De Exploración Física toma Peso, Talla e IMC, y los complementa con PA (perímetro
 * abdominal) e ICT (índice cintura-talla) para el índice/riesgo de obesidad central, así
 * como con TA (tensión arterial), FC (frecuencia cardiaca), FR (frecuencia respiratoria) y
 * SpO2 para el análisis hemodinámico/respiratorio.
 *
 * Además del análisis clínico por signos/síntomas, cruza:
 *  - Antecedentes patológicos, tratamientos y alergias registrados del paciente (SCII_Pacientes).
 *  - Edad y género del paciente (si está dado de alta como paciente registrado), ajustando
 *    umbrales, dosis y sugerencias (p. ej. dosis pediátrica, metas de TA en el adulto mayor,
 *    presentación atípica de SICA en mujeres, patología prostática en hombres).
 *  - Historial de consultas previas (SCII_Consultas) para detectar padecimientos recurrentes.
 *  - El "Datos de Atención" seleccionado (Tipo de atención / Protocolo / Procedimiento) para
 *    anclar el diagnóstico diferencial y las sugerencias a lo que realmente se está atendiendo,
 *    y no mostrar antecedentes crónicos irrelevantes cuando la atención es por Primeros Auxilios.
 */

// Dominio clínico asociado a cada Protocolo de Atención (catálogo del frontend).
// Se usa para decidir si un antecedente del paciente es pertinente para la atención actual.
const DOMINIOS_PROTOCOLO = {
    '3':  ['piel', 'dermat', 'psoriasis', 'eccema', 'eczema'],
    '4':  ['renal', 'rinon', 'urinari', 'vejiga', 'prostata', 'nefro'],
    '5':  ['gastric', 'estomago', 'higado', 'intestin', 'colon', 'colitis', 'digestiv'],
    '6':  ['respirator', 'pulmon', 'asma', 'epoc', 'bronqui'],
    '7':  ['cardio', 'corazon', 'hipertens', 'presion arterial', 'arritmia', 'coronari'],
    '8':  ['diabet', 'tiroid', 'endocrin', 'obesidad', 'metaboli', 'hipofis', 'suprarrenal', 'glucosa'],
    '9':  ['exantema', 'sarampion', 'rubeola', 'varicela', 'roseola'],
    '10': ['artritis', 'lupus', 'autoinmun', 'inmunolog', 'psoriasis'],
    '11': ['dengue', 'paludismo', 'chikungunya', 'zika', 'chagas'],
    '12': ['vih', 'sifilis', 'gonorrea', 'clamidia', 'vph'],
    '13': ['gineco', 'embarazo', 'menstru', 'ovario', 'obstetric'],
    '14': ['artros', 'articul', 'muscul', 'esquelet', 'columna', 'hernia', 'osteo', 'tendin', 'fractura'],
    '15': ['dental', 'dent', 'encia', 'caries'],
    '16': ['ocular', 'vista', 'ojo', 'glaucoma', 'retina'],
    '17': ['cancer', 'oncolog', 'tumor', 'quimioterapia'],
    '18': ['oido', 'auditiv', 'vertigo', 'otitis'],
    '19': ['ansiedad', 'depres', 'psiqui', 'bipolar', 'panico', 'esquizofrenia'],
    '20': ['epilep', 'convuls', 'neurolog', 'migra', 'parkinson', 'evc', 'cefalea'],
    '21': ['higado', 'hepatit', 'biliar', 'vesicula', 'cirrosis', 'pancreat'],
    '22': ['calor', 'insolacion'],
};

// Catálogo de Protocolos de Atención (debe reflejar el select de Consultas.tsx).
const PROTOCOLOS = {
    '1':  'Acción de Enfermería',
    '2':  'Acción de TUM',
    '3':  'Dermatología',
    '4':  'Enfermedad del Tracto Urinario',
    '5':  'Enfermedad Gastrointestinal',
    '6':  'Enfermedad Respiratoria',
    '7':  'Enfermedades Cardiovasculares',
    '8':  'Enfermedades Endocrinas',
    '9':  'Enfermedades Exantemáticas',
    '10': 'Enfermedades Inmunológicas',
    '11': 'Enfermedades por Vectores',
    '12': 'ETS',
    '13': 'Gineco-obstétrico',
    '14': 'Músculo Esquelético',
    '15': 'Odontológico',
    '16': 'Oftalmología',
    '17': 'Oncológicas',
    '18': 'Ótico',
    '19': 'Psicológico / Psiquiátrico',
    '20': 'SNC',
    '21': 'Trastornos del Hígado y Vías Biliares',
    '22': 'Trastornos por Altas Temperaturas',
};

// Sugerencia clínica anclada al Protocolo de Atención seleccionado, parametrizada con el
// Procedimiento/subtipo específico elegido por el médico (más confiable que inferir todo
// del texto libre). Solo se usa cuando la atención NO es por Primeros Auxilios.
const SUGERENCIA_PROTOCOLO = {
    '3':  (p) => `Realizar exploración dermatológica dirigida${p ? ` a ${p.toLowerCase()}` : ''}. Valorar manejo tópico y referir a Dermatología si no hay mejoría en 7-10 días.`,
    '4':  (p) => `Solicitar EGO y Urocultivo${p ? ` para descartar/confirmar ${p.toLowerCase()}` : ''}. Iniciar manejo según hallazgos y asegurar hidratación adecuada.`,
    '5':  (p) => `Indicar manejo sintomático e hidratación${p ? ` dirigido a ${p.toLowerCase()}` : ''}. Solicitar laboratorio si hay datos de alarma (sangrado, deshidratación severa).`,
    '6':  (p) => `Evaluar oximetría y auscultación pulmonar${p ? ` ante sospecha de ${p.toLowerCase()}` : ''}. Considerar Radiografía de Tórax y manejo broncodilatador si aplica.`,
    '7':  (p) => `Realizar ECG y monitoreo de signos vitales${p ? ` ante sospecha de ${p.toLowerCase()}` : ''}. Referir a Cardiología si hay hallazgos anormales.`,
    '8':  (p) => `Solicitar perfil metabólico (glucosa, HbA1c, perfil tiroideo según corresponda)${p ? ` relacionado con ${p.toLowerCase()}` : ''}. Referir a Endocrinología para seguimiento.`,
    '9':  (p) => `Manejo sintomático y aislamiento${p ? ` compatible con ${p.toLowerCase()}` : ''}. Notificar a epidemiología por tratarse de enfermedad exantemática.`,
    '10': (p) => `Solicitar perfil inmunológico/reumatológico${p ? ` ante sospecha de ${p.toLowerCase()}` : ''} y referir a Reumatología/Inmunología.`,
    '11': (p) => `Solicitar estudios específicos para enfermedad transmitida por vector${p ? ` (${p.toLowerCase()})` : ''}. Vigilar signos de alarma y notificar a epidemiología.`,
    '12': (p) => `Solicitar pruebas específicas de ETS${p ? ` (${p.toLowerCase()})` : ''}, manejo dirigido y orientación sobre prácticas sexuales seguras. Asegurar confidencialidad.`,
    '13': (p) => `Realizar valoración gineco-obstétrica dirigida${p ? ` a ${p.toLowerCase()}` : ''} y referir a Ginecología según hallazgos.`,
    '14': (p) => `Realizar exploración músculo-esquelética dirigida${p ? ` a ${p.toLowerCase()}` : ''}. Considerar imagen (Rx) si hay datos de fractura/luxación y manejo con AINEs/inmovilización según corresponda.`,
    '15': (p) => `Valoración odontológica dirigida${p ? ` a ${p.toLowerCase()}` : ''}. Manejo del dolor con analgésico y referencia a Odontología.`,
    '16': (p) => `Exploración oftalmológica dirigida${p ? ` a ${p.toLowerCase()}` : ''}. Referir a Oftalmología si hay compromiso visual o dolor intenso.`,
    '17': () => 'Ante sospecha oncológica, priorizar estudios de imagen/laboratorio dirigidos y referencia URGENTE a Oncología.',
    '18': (p) => `Exploración otoscópica dirigida${p ? ` a ${p.toLowerCase()}` : ''}. Referir a Otorrinolaringología si no hay mejoría o hay hipoacusia.`,
    '19': (p) => `Realizar valoración psicológica/psiquiátrica dirigida${p ? ` a ${p.toLowerCase()}` : ''}. Referir a Psicología/Psiquiatría; evaluar riesgo suicida si aplica.`,
    '20': (p) => `Realizar exploración neurológica dirigida${p ? ` a ${p.toLowerCase()}` : ''}. Referir a Neurología si hay déficit focal o datos de alarma.`,
    '21': (p) => `Solicitar pruebas de función hepática${p ? ` ante sospecha de ${p.toLowerCase()}` : ''}. Referir a Gastroenterología/Hepatología según hallazgos.`,
    '22': (p) => `Manejo de emergencia por calor: enfriamiento activo, hidratación y monitoreo de signos vitales${p ? ` (${p.toLowerCase()})` : ''}.`,
};

// Acciones concretas para Primeros Auxilios (procedimiento de Enfermería/TUM), en vez de
// lenguaje orientado a enfermedades crónicas que no aporta a este tipo de atención.
const SUGERENCIA_AUX = {
    'Aplicación de medicamentos': 'Confirmar indicación, dosis y vía del medicamento aplicado; verificar alergias previas y registrar la respuesta del paciente.',
    'Chequeo de signos vitales': 'Registrar y comparar signos vitales contra parámetros basales del paciente; repetir monitoreo si hay alguna alteración.',
    'Curaciones': 'Realizar limpieza y curación de la herida con técnica aséptica; valorar esquema de vacunación antitetánica y datos de infección.',
    'Retiro de puntos': 'Verificar cicatrización adecuada antes del retiro de puntos; valorar datos de dehiscencia o infección de la herida.',
    'Llamado de auxilio': 'Priorizar la estabilización del paciente (ABC) y activar el protocolo de emergencia interno.',
    'Traslado IMSS': 'Estabilizar al paciente antes del traslado y documentar signos vitales, mecanismo de lesión y manejo inicial otorgado.',
    'Valoración y atención en área': 'Realizar valoración primaria en sitio, documentar hallazgos y decidir si amerita traslado a unidad médica.',
};

const STOPWORDS_HISTORIAL = new Set([
    'para', 'como', 'pero', 'desde', 'hasta', 'entre', 'sobre', 'tiene', 'tengo',
    'esta', 'este', 'presenta', 'refiere', 'general', 'paciente', 'consulta',
]);

const normalizarTexto = (s) =>
    String(s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[^\x00-\x7F]/g, '');

const separarCondiciones = (texto) =>
    String(texto || '')
        .split(/[,;/\n]|(?:\sy\s)/i)
        .map(s => s.trim())
        .filter(Boolean);

const palabrasClave = (texto) =>
    normalizarTexto(texto)
        .split(/\W+/)
        .filter(w => w.length > 3 && !STOPWORDS_HISTORIAL.has(w));

const calcularEdad = (fechaNacimiento) => {
    if (!fechaNacimiento) return null;
    const nacimiento = new Date(fechaNacimiento);
    if (isNaN(nacimiento.getTime())) return null;

    const hoy = new Date();
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;

    return (edad >= 0 && edad <= 120) ? edad : null;
};

// Determina si un antecedente (texto libre) tiene sentido mencionarlo dado el tipo de
// atención actual: si la atención es por Primeros Auxilios, solo se muestra cuando el
// propio paciente lo refiere en el padecimiento actual o cuando el protocolo seleccionado
// pertenece al mismo dominio clínico del antecedente.
const antecedenteEsRelevante = (textoAntecedente, protocoloId, tipoAtencion, textoConsultaNorm) => {
    if (tipoAtencion !== 'AUX') return true;

    const antecedenteNorm = normalizarTexto(textoAntecedente);

    const palabrasAntecedente = antecedenteNorm.split(/\W+/).filter(w => w.length > 4);
    if (palabrasAntecedente.some(w => textoConsultaNorm.includes(w))) return true;

    const dominio = DOMINIOS_PROTOCOLO[String(protocoloId)] || [];
    return dominio.some(kw => antecedenteNorm.includes(kw));
};

// Busca en el historial una consulta previa cuyo padecimiento/diagnóstico comparta
// vocabulario relevante con el padecimiento actual, o que haya sido del mismo protocolo.
const encontrarConsultaSimilar = (padecimientoActual, protocoloActual, historial) => {
    if (!Array.isArray(historial) || historial.length === 0 || !padecimientoActual) return null;

    const palabrasActuales = new Set(palabrasClave(padecimientoActual));
    if (palabrasActuales.size === 0) return null;

    const candidatos = historial
        .map(h => {
            const textoPrevio = `${h.Padecimiento || ''} ${h.Diagnostico || ''}`;
            const coincidencias = palabrasClave(textoPrevio).filter(w => palabrasActuales.has(w)).length;
            const mismoProtocolo = protocoloActual && String(h.Protocolo ?? '') === String(protocoloActual);
            return { consulta: h, coincidencias, mismoProtocolo };
        })
        .filter(c => c.coincidencias >= 2 || (c.mismoProtocolo && c.coincidencias >= 1))
        .sort((a, b) => new Date(b.consulta.FechaConsulta || 0) - new Date(a.consulta.FechaConsulta || 0));

    return candidatos[0] || null;
};

exports.analyzeConsult = async (consultData) => {
    // We simulate an API delay to mimic AI thinking
    await new Promise(resolve => setTimeout(resolve, 2000));

    const {
        MotivoConsulta = '',
        PadecimientoActual = '',
        SignosVitales = {},
        Laboratorios = {},
        TipoAtencion = '',
        ProtocoloAtencion = '',
        Procedimiento = '',
        Paciente = null,
        HistorialConsultas = [],
    } = consultData;

    const analysis = {
        riesgo: 'Bajo',
        inconsistencias: [],
        diagnosticoDiferencial: [],
        sugerenciasTratamiento: [],
        antecedentesRelevantes: [],
        interacciones: false,
    };

    let riskScore = 0;
    let obesityRisk = false;
    let overweightRisk = false;

    // Edad y sexo del paciente (solo si está dado de alta y registrado en el sistema).
    // Se usan para adaptar umbrales/sugerencias por edad y género a lo largo del análisis.
    const edadPaciente = Paciente ? calcularEdad(Paciente.FechaNacimiento) : null;
    const sexoPaciente = Paciente && Paciente.Sexo ? String(Paciente.Sexo).trim().toUpperCase().charAt(0) : null;

    // 1. ANÁLISIS HEMODINÁMICO (PRESIÓN ARTERIAL)
    if (SignosVitales.PA) {
        const [sysStr, diaStr] = SignosVitales.PA.split('/');
        const sys = parseInt(sysStr, 10);
        const dia = parseInt(diaStr, 10);

        if (sys >= 180 || dia >= 120) {
            riskScore += 10;
            analysis.inconsistencias.push(`Presión Arterial Crítica (${SignosVitales.PA} mmHg): Posible Crisis Hipertensiva.`);
            analysis.diagnosticoDiferencial.push('Crisis Hipertensiva (Urgencia/Emergencia)');
            analysis.sugerenciasTratamiento.push('Manejo inmediato: Considerar Captopril sublingual o antihipertensivo IV si hay daño a órgano blanco. Monitoreo estrecho.');
        } else if (sys >= 140 || dia >= 90) {
            riskScore += 3;
            analysis.inconsistencias.push(`Presión Arterial Elevada (${SignosVitales.PA} mmHg) fuera de metas.`);
            analysis.diagnosticoDiferencial.push('Hipertensión Arterial Descontrolada / Grado 2');
            analysis.sugerenciasTratamiento.push('Ajustar dosis de antihipertensivos actuales (ARA-II o IECA combinado con Calcio-antagonista). Recomendar dieta DASH estricta.');
            if (edadPaciente !== null && edadPaciente >= 65) {
                analysis.sugerenciasTratamiento.push('En paciente mayor de 65 años, considerar metas de TA más flexibles (<150/90 mmHg) si existe fragilidad, evitando hipotensión ortostática y caídas.');
            }
        } else if (sys < 90 || dia < 60) {
            riskScore += 5;
            analysis.inconsistencias.push(`Hipotensión (${SignosVitales.PA} mmHg).`);
            analysis.diagnosticoDiferencial.push('Hipotensión Ortostática / Choque');
            analysis.sugerenciasTratamiento.push('Evaluar estado de hidratación, suspender antihipertensivos temporalmente y administrar líquidos cristaloides si procede.');
        }
    }

    // 2. ANÁLISIS METABÓLICO (LABORATORIOS)
    let metabolicSyndromeCount = 0;

    if (Laboratorios.HbA1c) {
        if (Laboratorios.HbA1c >= 6.5) {
            riskScore += 4;
            analysis.inconsistencias.push(`HbA1c en rango diabético (${Laboratorios.HbA1c}%).`);
            analysis.diagnosticoDiferencial.push('Diabetes Mellitus Tipo 2');
            analysis.sugerenciasTratamiento.push('Iniciar o ajustar esquema con Metformina. Si HbA1c > 8.5%, considerar adición de iSGLT2 o terapia dual combinada. Derivar a Oftalmología para fondo de ojo.');
            metabolicSyndromeCount++;
        } else if (Laboratorios.HbA1c >= 5.7) {
            riskScore += 1;
            analysis.diagnosticoDiferencial.push('Prediabetes (Intolerancia a la Glucosa)');
            analysis.sugerenciasTratamiento.push('Prevención secundaria: Ejercicio aeróbico 150min/semana, pérdida del 7-10% del peso corporal.');
        }
    }

    if (Laboratorios.Trigliceridos && Laboratorios.Trigliceridos >= 150) {
        analysis.inconsistencias.push(`Hipertrigliceridemia (${Laboratorios.Trigliceridos} mg/dL).`);
        analysis.diagnosticoDiferencial.push('Dislipidemia Mixta');
        analysis.sugerenciasTratamiento.push('Si TG > 500, riesgo de Pancreatitis: prescribir Fibratos (Fenofibrato/Bezafibrato) prioritariamente.');
        metabolicSyndromeCount++;
    }

    if (Laboratorios.Colesterol && Laboratorios.Colesterol > 200) {
        analysis.inconsistencias.push(`Hipercolesterolemia (${Laboratorios.Colesterol} mg/dL).`);
        analysis.diagnosticoDiferencial.push('Hipercolesterolemia');
        analysis.sugerenciasTratamiento.push('Iniciar Estatinas de moderada o alta intensidad (Rosuvastatina o Atorvastatina) según riesgo cardiovascular.');
    }

    // 3. ANÁLISIS SOMATOMÉTRICO (IMC)
    if (SignosVitales.IMC) {
        if (SignosVitales.IMC >= 30) {
            riskScore += 2;
            obesityRisk = true;

            analysis.inconsistencias.push( `Obesidad grado ${ SignosVitales.IMC >= 40 ? 'III' : SignosVitales.IMC >= 35 ? 'II' : 'I' } (IMC: ${SignosVitales.IMC}).` );

            analysis.diagnosticoDiferencial.push('Obesidad');

            analysis.sugerenciasTratamiento.push(
                'Implementar programa integral de reducción de peso con plan nutricional individualizado, ejercicio aeróbico y de fuerza al menos 150 minutos por semana. Considerar valoración por Nutrición.'
            );

            metabolicSyndromeCount++;

        } else if (SignosVitales.IMC >= 25) {
            overweightRisk = true;

            analysis.inconsistencias.push(
                `Sobrepeso (IMC: ${SignosVitales.IMC}).`
            );

            analysis.diagnosticoDiferencial.push('Sobrepeso');

            analysis.sugerenciasTratamiento.push(
                'Recomendar modificación de hábitos de vida: alimentación balanceada, reducción de alimentos ultraprocesados y actividad física regular para alcanzar un IMC saludable.'
            );
        }
    }

    // 3b. OBESIDAD CENTRAL (Perímetro Abdominal e Índice Cintura-Talla)
    // El IMC no distingue grasa central; se complementa con PA (perímetro abdominal) e ICT
    // (cintura/talla), marcadores más específicos de riesgo cardiometabólico.
    if (SignosVitales.ICT && parseFloat(SignosVitales.ICT) > 0) {
        const ict = parseFloat(SignosVitales.ICT);

        if (ict >= 0.6) {
            riskScore += 3;
            obesityRisk = true;
            analysis.inconsistencias.push(`Índice Cintura-Talla muy elevado (ICT: ${ict}).`);
            analysis.diagnosticoDiferencial.push('Obesidad Central / Riesgo Cardiometabólico Alto');
            analysis.sugerenciasTratamiento.push('ICT ≥0.6: riesgo cardiometabólico alto independiente del IMC. Priorizar reducción de grasa abdominal y valorar perfil lipídico/glucosa.');
            metabolicSyndromeCount++;
        } else if (ict >= 0.5) {
            if (!obesityRisk) overweightRisk = true;
            analysis.inconsistencias.push(`Índice Cintura-Talla elevado (ICT: ${ict}).`);
            analysis.diagnosticoDiferencial.push('Obesidad Central / Riesgo Cardiometabólico Aumentado');
            analysis.sugerenciasTratamiento.push('ICT ≥0.5: mantener el perímetro de cintura por debajo de la mitad de la talla para reducir el riesgo cardiometabólico.');
            metabolicSyndromeCount++;
        }
    }

    if (SignosVitales.Abdomen && parseFloat(SignosVitales.Abdomen) > 0) {
        const abdomen = parseFloat(SignosVitales.Abdomen);
        // Cortes por sexo (IDF/ATP III); si el paciente no está registrado se usa un corte genérico.
        const umbralAlto = sexoPaciente === 'M' ? 102 : sexoPaciente === 'F' ? 88 : 100;
        const umbralAumentado = sexoPaciente === 'M' ? 90 : sexoPaciente === 'F' ? 80 : 90;

        if (abdomen >= umbralAlto) {
            riskScore += 2;
            obesityRisk = true;
            analysis.inconsistencias.push(`Perímetro abdominal muy elevado (${abdomen} cm).`);
            analysis.sugerenciasTratamiento.push('Perímetro abdominal en rango de alto riesgo cardiometabólico: reforzar manejo integral de peso y descartar síndrome metabólico.');
            metabolicSyndromeCount++;
        } else if (abdomen >= umbralAumentado) {
            analysis.inconsistencias.push(`Perímetro abdominal elevado (${abdomen} cm).`);
            metabolicSyndromeCount++;
        }
    }

    // Diagnóstico de Síndrome Metabólico Reuniendo Criterios
    if (metabolicSyndromeCount >= 2 && SignosVitales.PA && (parseInt(SignosVitales.PA.split('/')[0]) >= 130 || parseInt(SignosVitales.PA.split('/')[1]) >= 85)) {
        analysis.diagnosticoDiferencial.push('Síndrome Metabólico');
        analysis.sugerenciasTratamiento.push('Enfoque integral: Manejo agresivo de peso, control estricto de glucemia y TA. Referir a Nutrición clínica.');
    }

    // 4. OTROS SIGNOS Y SÍNTOMAS
    if (SignosVitales.Temp && SignosVitales.Temp >= 38) {
        riskScore += 2;
        analysis.inconsistencias.push(`Síndrome Febril (${SignosVitales.Temp} °C).`);
        analysis.diagnosticoDiferencial.push('Proceso Infeccioso / Inflamatorio');

        if (edadPaciente !== null && edadPaciente < 12) {
            analysis.sugerenciasTratamiento.push('Paciente pediátrico: ajustar dosis de antipirético por kg de peso (Paracetamol 10-15 mg/kg/dosis) en lugar de dosis fija de adulto. Evaluar focos infecciosos y valorar interconsulta a Pediatría.');
        } else {
            analysis.sugerenciasTratamiento.push('Administrar antipiréticos (Paracetamol 1g c/8h). Evaluar focos infecciosos (BH, EGO, Rx Tórax).');
        }
    }

    if (SignosVitales.FC) {
        const fc = parseInt(SignosVitales.FC, 10);

        if (fc > 100) {
            riskScore += 3;
            analysis.inconsistencias.push(`Taquicardia (FC: ${fc} lpm).`);
            analysis.diagnosticoDiferencial.push('Taquicardia');
            analysis.sugerenciasTratamiento.push('Investigar causa de taquicardia (fiebre, dolor, ansiedad, anemia, arritmia, hipertiroidismo). Realizar ECG si persiste o hay síntomas asociados.');
        } else if (fc > 0 && fc < 60) {
            riskScore += 3;
            analysis.inconsistencias.push(`Bradicardia (FC: ${fc} lpm).`);
            analysis.diagnosticoDiferencial.push('Bradicardia');
            analysis.sugerenciasTratamiento.push('Descartar causa farmacológica (betabloqueadores) o trastorno de conducción cardiaca. Realizar ECG y valorar interconsulta a Cardiología si es sintomática.');
        }
    }

    if (SignosVitales.FR) {
        const fr = parseFloat(SignosVitales.FR);

        if (fr > 20) {
            riskScore += 3;
            analysis.inconsistencias.push(`Taquipnea (FR: ${fr} rpm).`);
            analysis.diagnosticoDiferencial.push('Taquipnea');
            analysis.sugerenciasTratamiento.push('Evaluar causa de taquipnea (hipoxia, dolor, ansiedad, acidosis metabólica). Correlacionar con SpO2 y considerar Gasometría Arterial.');
        } else if (fr > 0 && fr < 12) {
            riskScore += 4;
            analysis.inconsistencias.push(`Bradipnea (FR: ${fr} rpm).`);
            analysis.diagnosticoDiferencial.push('Bradipnea / Depresión Respiratoria');
            analysis.sugerenciasTratamiento.push('Evaluar permeabilidad de vía aérea y descartar depresión respiratoria por sedantes u opioides. Vigilancia estrecha y soporte ventilatorio si progresa.');
        }
    }

    if (SignosVitales.SpO2 && SignosVitales.SpO2 < 90) {
        riskScore += 8;
        analysis.inconsistencias.push(`Hipoxemia documentada (SpO2: ${SignosVitales.SpO2}%).`);
        analysis.diagnosticoDiferencial.push('Insuficiencia Respiratoria Orgánica');
        analysis.sugerenciasTratamiento.push('Soporte con oxígeno suplementario inmediato a 3L/min por puntas nasales. Realizar Gasometría Arterial.');
    }

    // 5. ANÁLISIS SINTOMÁTICO (TEXTO LIBRE / NLP SIMULADA)
    const allText = (MotivoConsulta + " " + PadecimientoActual).toLowerCase();
    const allTextNorm = normalizarTexto(allText);

    // Cardiovascular / Emergencias
    if (allText.match(/(pecho|opresivo|precordial|irradia.*brazo|irradia.*mandibula)/)) {
        riskScore += 9;
        analysis.inconsistencias.push('Síntomas coronarios (Dolor torácico/opresivo).');
        analysis.diagnosticoDiferencial.push('Síndrome Coronario Agudo', 'Angina Inestable');
        analysis.sugerenciasTratamiento.push('Realizar Electrocardiograma (ECG) de 12 derivaciones URGENTE. Protocolo MONA inicial en sospecha de IAM. Enzimas cardíacas.');

        if (sexoPaciente === 'F') {
            analysis.sugerenciasTratamiento.push('Recordar que las mujeres pueden presentar Síndrome Coronario Agudo con síntomas atípicos (náusea, fatiga, dolor epigástrico) además del dolor típico; no descartar por presentación atípica.');
        }
    }

    // Respiratorio
    if (allText.match(/(falta de aire|disnea|ahogo|tos.*flema|tos.*sangre|hemoptisis)/)) {
        riskScore += 5;
        analysis.inconsistencias.push('Dificultad respiratoria referida en el padecimiento.');
        analysis.diagnosticoDiferencial.push('EPOC Exacerbado', 'Neumonía', 'Insuficiencia Cardiaca');
        analysis.sugerenciasTratamiento.push('Solicitar Radiografía de Tórax PA. Considerar Broncodilatadores de rescate (Salbutamol) y esteroides sistémicos si hay broncoespasmo.');
    }

    // Metabólico (Diabetes Descontrolada)
    if (allText.match(/(mucha sed|polidipsia|mucha hambre|polifagia|orinar mucho|poliuria|perdida de peso)/)) {
        riskScore += 3;
        analysis.inconsistencias.push('Tríada/Tétrada clásica de Diabetes descrita por el paciente.');
        analysis.diagnosticoDiferencial.push('Diabetes Mellitus Descompensada');
        analysis.sugerenciasTratamiento.push('Solicitar Química Sanguínea de 6 elementos urgente. Hidratación agresiva si sospecha de Cetoacidosis o Estado Hiperosmolar.');
    }

    // Vías Urinarias / Nefrología
    if (allText.match(/(ardor al orinar|disuria|orina.*sangre|hematuria|dolor.*espalda baja|lumbalgia)/)) {
        riskScore += 2;
        analysis.diagnosticoDiferencial.push('Infección de Vías Urinarias', 'Litiasis Renal (Cálculos)');
        analysis.sugerenciasTratamiento.push('Solicitar Examen General de Orina (EGO) y Urocultivo. Iniciar antibiótico empírico (ej. Nitrofurantoína o Fosfomicina) si EGO sugiere IVU.');
    }

    // Gastrointestinal
    if (allText.match(/(dolor de estomago|epigastralgia|nausea|vomito|diarrea.*sangre|melena)/)) {
        riskScore += 3;
        analysis.diagnosticoDiferencial.push('Enfermedad Ácido Péptica', 'Gastroenteritis Infecciosa', 'Sangrado de Tubo Digestivo');
        analysis.sugerenciasTratamiento.push('Prescribir IBP (Omeprazol/Pantoprazol). Si hay datos de sangrado activo, referir a endoscopia superior.');
    }

    // Neurológico
    if (allText.match(/(dolor de cabeza|cefalea|mareo|vertigo|debilidad.*mitad|paralisis|hablar.*raro|disartria)/)) {
        if (allText.match(/(debilidad.*mitad|paralisis|hablar.*raro|disartria)/)) {
            riskScore += 10;
            analysis.inconsistencias.push('Déficit Neurológico Focal reportado.');
            analysis.diagnosticoDiferencial.push('Enfermedad Vascular Cerebral (EVC/Ictus)');
            analysis.sugerenciasTratamiento.push('CÓDIGO ICTUS: Traslado inmediato para TAC de cráneo simple. Ventana terapéutica de 4.5 horas para trombólisis.');
        } else {
            riskScore += 1;
            analysis.diagnosticoDiferencial.push('Cefalea Tensional', 'Migraña', 'Vértigo Postural Paroxístico Benigno');
            analysis.sugerenciasTratamiento.push('Manejo sintomático con AINEs (Ketorolaco/Naproxeno) o Triptanos en caso de Migraña diagnosticada.');
        }
    }

    // 5.5 SUGERENCIAS DIRIGIDAS SEGÚN "DATOS DE ATENCIÓN" (Tipo de atención / Protocolo / Procedimiento)
    // La categorización que elige el médico es una señal más confiable que el texto libre:
    // se usa para anclar el diagnóstico diferencial y las sugerencias a lo que realmente se
    // está atendiendo, en vez de dar recomendaciones genéricas de enfermedades crónicas
    // cuando la atención es, por ejemplo, Primeros Auxilios.
    if (TipoAtencion === 'AUX') {
        const accionAux = SUGERENCIA_AUX[Procedimiento];
        if (accionAux) {
            analysis.sugerenciasTratamiento.push(accionAux);
        }
    } else if (ProtocoloAtencion && PROTOCOLOS[String(ProtocoloAtencion)]) {
        const nombreProtocolo = PROTOCOLOS[String(ProtocoloAtencion)];

        if (Procedimiento && Procedimiento !== 'Otras') {
            analysis.diagnosticoDiferencial.push(Procedimiento);
        } else if (analysis.diagnosticoDiferencial.length === 0) {
            analysis.diagnosticoDiferencial.push(nombreProtocolo);
        }

        const sugerenciaProtocolo = SUGERENCIA_PROTOCOLO[String(ProtocoloAtencion)];
        if (sugerenciaProtocolo) {
            analysis.sugerenciasTratamiento.push(sugerenciaProtocolo(Procedimiento));
        }
    }

    // Coherencia de género con el protocolo seleccionado (solo si el paciente está registrado).
    if (sexoPaciente === 'M' && String(ProtocoloAtencion) === '13') {
        analysis.inconsistencias.unshift('Se seleccionó el protocolo Gineco-obstétrico para un paciente registrado como masculino: verificar la selección del protocolo de atención.');
    }

    // Diferencial adicional dirigido por edad + género en vías urinarias.
    if (String(ProtocoloAtencion) === '4' && sexoPaciente === 'M' && edadPaciente !== null && edadPaciente >= 50) {
        analysis.diagnosticoDiferencial.push('Patología Prostática (HPB/Prostatitis)');
        analysis.sugerenciasTratamiento.push('En hombre mayor de 50 años con síntomas urinarios, considerar tacto rectal y Antígeno Prostático Específico (APE) para descartar patología prostática.');
    }

    // 6. CONTEXTO DEL PACIENTE (edad y antecedentes registrados)
    // Solo se usa si el paciente está dado de alta y registrado en el sistema (Paciente != null).
    if (Paciente) {
        const edad = edadPaciente;

        if (edad !== null) {
            if (edad < 18) {
                analysis.antecedentesRelevantes.push(`Paciente de ${edad} años: los rangos de referencia estándar para adultos podrían no aplicar directamente; valorar con criterios pediátricos.`);
            } else if (edad >= 60) {
                analysis.antecedentesRelevantes.push(`Paciente de ${edad} años: mayor vulnerabilidad clínica asociada a la edad, considerar manejo con mayor cautela ante hallazgos anormales.`);
                if (riskScore > 0) riskScore += 1;
            }
        }

        // Antecedentes patológicos, tratamientos y alergias generales: se filtran por
        // relevancia con los "Datos de Atención" seleccionados (no aplica si la atención
        // es distinta a Primeros Auxilios, o si el antecedente es del mismo dominio/está
        // referido en el padecimiento actual).
        const partesAntecedentes = [];
        if (Paciente.Enfermedades && String(Paciente.Enfermedades).trim()) partesAntecedentes.push(`Enfermedades: ${String(Paciente.Enfermedades).trim()}`);
        if (Paciente.Tratamientos && String(Paciente.Tratamientos).trim()) partesAntecedentes.push(`Tratamientos: ${String(Paciente.Tratamientos).trim()}`);
        if (Paciente.Alergias && String(Paciente.Alergias).trim()) partesAntecedentes.push(`Alergias: ${String(Paciente.Alergias).trim()}`);

        if (partesAntecedentes.length > 0) {
            const textoCompleto = partesAntecedentes.join(' ');
            const esRelevante =
                antecedenteEsRelevante(textoCompleto, ProtocoloAtencion, TipoAtencion, allTextNorm) ||
                separarCondiciones(Paciente.Enfermedades).some(c => antecedenteEsRelevante(c, ProtocoloAtencion, TipoAtencion, allTextNorm));

            if (esRelevante) {
                analysis.antecedentesRelevantes.push(`Antecedentes registrados del paciente — ${partesAntecedentes.join('; ')}.`);
            }
        }

        // Alergias a medicamentos: siempre se muestran y se cruzan contra las sugerencias
        // de tratamiento (seguridad del paciente, independiente del tipo de atención).
        if (Paciente.AlergiasMedicamento && String(Paciente.AlergiasMedicamento).trim()) {
            const alergiasMed = separarCondiciones(Paciente.AlergiasMedicamento);
            const textoSugerenciasNorm = normalizarTexto(analysis.sugerenciasTratamiento.join(' '));

            const alergiaEnConflicto = alergiasMed.find(a => {
                const aNorm = normalizarTexto(a);
                return aNorm.length > 2 && textoSugerenciasNorm.includes(aNorm);
            });

            if (alergiaEnConflicto) {
                analysis.interacciones = true;
                analysis.inconsistencias.unshift(`ALERGIA REGISTRADA: el paciente reporta alergia a "${alergiaEnConflicto.trim()}", presente entre las sugerencias de tratamiento. Verificar antes de prescribir.`);
            }

            analysis.antecedentesRelevantes.push(`Alergia(s) a medicamento(s) registrada(s): ${String(Paciente.AlergiasMedicamento).trim()}.`);
        }
    }

    // 7. HISTORIAL DE CONSULTAS (SCII_Consultas) — padecimiento recurrente
    const consultaSimilar = encontrarConsultaSimilar(PadecimientoActual, ProtocoloAtencion, HistorialConsultas);
    if (consultaSimilar) {
        const fechaRaw = consultaSimilar.consulta.FechaConsulta;
        const fecha = fechaRaw && !isNaN(new Date(fechaRaw).getTime())
            ? new Date(fechaRaw).toLocaleDateString('es-MX')
            : 'fecha no registrada';
        const diagPrevio = consultaSimilar.consulta.Diagnostico ? ` (Diagnóstico: ${consultaSimilar.consulta.Diagnostico})` : '';

        analysis.antecedentesRelevantes.push(`El paciente ya fue atendido por un padecimiento similar el ${fecha}${diagPrevio}. Valorar si se trata de un cuadro recurrente o no resuelto.`);
        riskScore += 1;
    }

    // Filtrar duplicados
    analysis.diagnosticoDiferencial = [...new Set(analysis.diagnosticoDiferencial)];
    analysis.sugerenciasTratamiento = [...new Set(analysis.sugerenciasTratamiento)];
    analysis.antecedentesRelevantes = [...new Set(analysis.antecedentesRelevantes)];

    // Si la salud está bien
    if (analysis.diagnosticoDiferencial.length === 0) {
        analysis.diagnosticoDiferencial.push('Paciente Sano / Control Adecuado');
        analysis.sugerenciasTratamiento.push('Felicitar por adherencia al tratamiento. Mantener vigilancia anual de rutina.');
        analysis.inconsistencias.push('Parámetros biológicos dentro de rangos normales.');
    }

    // Clasificación de Riesgo

    // Obesidad = siempre Alto
    if (obesityRisk) {
        analysis.riesgo = 'Alto';
    }
    // Sobrepeso = mínimo Moderado
    else if (overweightRisk) {
        analysis.riesgo = 'Moderado';
    }
    // Clasificación normal por score
    else if (riskScore >= 7) {
        analysis.riesgo = 'Alto';
    } else if (riskScore >= 3) {
        analysis.riesgo = 'Moderado';
    } else {
        analysis.riesgo = 'Bajo';
    }

    return analysis;
};
