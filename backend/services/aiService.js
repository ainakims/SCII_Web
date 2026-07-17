/**
 * Medical Expert System Service for SCII-AI
 * Simulates a high-level internist physician analyzing clinical data.
 */

exports.analyzeConsult = async (consultData) => {
    // We simulate an API delay to mimic AI thinking
    await new Promise(resolve => setTimeout(resolve, 2000));

    const { MotivoConsulta = '', PadecimientoActual = '', SignosVitales = {}, Laboratorios = {} } = consultData;

    const analysis = {
        riesgo: 'Bajo',
        inconsistencias: [],
        diagnosticoDiferencial: [],
        sugerenciasTratamiento: [],
        interacciones: false,
    };

    let riskScore = 0;
    let obesityRisk = false;
    let overweightRisk = false;

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
        analysis.sugerenciasTratamiento.push('Administrar antipiréticos (Paracetamol 1g c/8h). Evaluar focos infecciosos (BH, EGO, Rx Tórax).');
    }

    if (SignosVitales.SpO2 && SignosVitales.SpO2 < 90) {
        riskScore += 8;
        analysis.inconsistencias.push(`Hipoxemia documentada (SpO2: ${SignosVitales.SpO2}%).`);
        analysis.diagnosticoDiferencial.push('Insuficiencia Respiratoria Orgánica');
        analysis.sugerenciasTratamiento.push('Soporte con oxígeno suplementario inmediato a 3L/min por puntas nasales. Realizar Gasometría Arterial.');
    }

    // 5. ANÁLISIS SINTOMÁTICO (TEXTO LIBRE / NLP SIMULADA)
    const allText = (MotivoConsulta + " " + PadecimientoActual).toLowerCase();

    // Cardiovascular / Emergencias
    if (allText.match(/(pecho|opresivo|precordial|irradia.*brazo|irradia.*mandibula)/)) {
        riskScore += 9;
        analysis.inconsistencias.push('Síntomas coronarios (Dolor torácico/opresivo).');
        analysis.diagnosticoDiferencial.push('Síndrome Coronario Agudo', 'Angina Inestable');
        analysis.sugerenciasTratamiento.push('Realizar Electrocardiograma (ECG) de 12 derivaciones URGENTE. Protocolo MONA inicial en sospecha de IAM. Enzimas cardíacas.');
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

    // Filtrar duplicados
    analysis.diagnosticoDiferencial = [...new Set(analysis.diagnosticoDiferencial)];
    analysis.sugerenciasTratamiento = [...new Set(analysis.sugerenciasTratamiento)];

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

