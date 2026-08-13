# Contexto: Matrices de Seguimiento poblacional (Expediente)

Documento de traspaso para continuar esta línea de trabajo en una sesión nueva.
Cubre dos repos relacionados y todo lo construido/decidido en la sesión anterior.

---

## 1. Los dos proyectos y cómo se conectan

- **`WS_OCR v2`** (`C:\Users\Olivos.victor\Documents\WS_OCR_HealthCare\WebService_OCR`) — servicio SOAP
  `.asmx` en C#/.NET (`EvaluacionSalud.asmx`, namespace `http://tempuri.org/`). Expone 4
  WebMethods (`EvaluarSalud`, `EvaluarSaludLigero`, `EvaluarSaludConAnalisisIA`,
  `EvaluarSaludGrupal`) sobre un dominio clínico (`HealthCare/`) alimentado por
  `SCII_Valores_Indicadores_Por_Empleado` (individual) y `SCII_Valores_Indicadores`
  (poblacional), ambos con `@Case` 1/2/3 (histórico de indicadores / perfil del
  empleado / consultas puntuales). Ver `ESTADO_ACTUAL_WEBSERVICE.md` en ese repo para
  el detalle completo de cada WebMethod.
- **`SCII_Web`** (`C:\Users\Olivos.victor\Documents\Visual Studio Code\SCII Web\SCII_Web`)
  — la app web (backend Express/TS + frontend React/Vite/TS) que consume el `.asmx`
  para el análisis **individual**, y consulta `SCII_Valores_Indicadores` **directo**
  (sin pasar por el `.asmx`) para el análisis **poblacional**. Es donde se hizo todo
  el trabajo de esta sesión.

### Dos escalas de análisis en `Expediente.tsx` (`/Expediente`)

- **Vista inicial (poblacional, determinista, sin IA)**: KPIs, tabla de Departamentos,
  Somatometría/Cardiovascular/Metabólico, y las nuevas "Matrices de Seguimiento". Sale
  de `SCII_Valores_Indicadores` vía el backend Node.
- **Clic en una persona (Personal o Reingresos)** → navega a `/Expediente/:matricula`
  (`AnalisisIndividual.tsx`), que sí llama al `.asmx` (`EvaluarSaludConAnalisisIA`,
  con `esActivo` según de qué tabla vino) y sí trae narrativa de IA (diagnóstico
  diferencial, aptitud laboral, hallazgos).

---

## 2. Lo que se construyó esta sesión

### 2.1 Backend (`SCII_Web/backend`)

Se agregó soporte para `@Case=3` de `SCII_Valores_Indicadores` (consultas puntuales
de **toda la plantilla activa**, no solo una matrícula — el usuario ya lo tenía en
su SP, solo faltaba consumirlo desde el backend):

- `interfaces/salud_poblacional.ts` — `RawConsultaRow` (columnas exactas del SELECT
  del usuario: `Matricula, TipoAtencion, TipoProtocolo, Procedimiento,
  Padecimiento_Sintomas, PesoenKg, Altura, IMC, Abdomen, IndiceCinturaTalla, SpO2,
  PresionArterial, FrecuenciaCardiaca, FrecuenciaRespiratoria, FechaConsulta`) y
  `RegistroConsultaValidado` (con `Depto_nombre` ya resuelto).
- `services/poblacionValidacion.service.ts` — `normalizarConsulta`/
  `normalizarConsultasPoblacion` (solo valida `FechaConsulta`, reutilizando
  `validarFecha`; el resto no necesita clasificación clínica para esto).
- `controllers/SaludPoblacionalController.ts` — se extrajo `obtenerCatalogoEmpleados`
  (antes vivía dentro de `obtenerIndicadoresCombinados`) para reutilizarla; nueva
  `obtenerConsultasPoblacionales(activo)` (pide `@Case=3` + catálogo `@Case=2`,
  descarta consultas sin empleado correspondiente, resuelve `Depto_nombre`). Nuevo
  endpoint `ObtenerConsultas`.
- `routes/SaludPoblacionalRoutes.ts` — `POST /SaludPoblacional/ObtenerConsultas`
  (con `ValidarToken`, `@Activo="1"` hardcodeado, mismo patrón que `ObtenerDatos`).

### 2.2 Frontend (`SCII_Web/frontend`) — nueva sección "Matrices de Seguimiento"

Vive en `Expediente.tsx`, **fuera** de `ExpedienteContenido.tsx` (que sí es compartido
con `ExpedienteDepartamento.tsx` — "por departamento" no tiene sentido ya filtrado a
uno solo, por eso se montó aparte). `Expediente.tsx` ahora también hace fetch a
`/SaludPoblacional/ObtenerConsultas` en paralelo a `/ObtenerDatos` (eager, no lazy).

Tres gráficas dentro de una sola `SectionCard` (`MatricesPoblacionalSection.tsx`),
cada una a todo el ancho (`flex flex-col`, no grid de 2 columnas — se probó grid y
no se leían bien las etiquetas):

1. **`RiesgoPorDepartamentoChart.tsx`** — barras **agrupadas, no apiladas** (Sano/
   Riesgo moderado/Riesgo alto), una por `Depto_Series` (estado actual, snapshot,
   sin año). Se descartaron barras apiladas porque un valor de 1 al lado de un 20
   se vuelve invisible dentro de una pila.
2. **`ConsultasPorDepartamentoChart.tsx`** — pie chart con "active shape" (mismo
   mecanismo que la dona de ICT en `AntropometriaSection.tsx`: clic explota el
   sector hacia afuera) por `Depto_nombre`, con leyenda clicable debajo (mismo
   patrón que "Categoría de la OMS"). Clic en una rebanada despliega una lista con
   el conteo por `TipoProtocolo` (fallback `TipoAtencion`) de ese departamento.
   Selector de año (dropdown, no chevron).
3. **`VisitasAnualesChart.tsx`** ("Asistencia anual") — barras agrupadas por **pares
   año/año-anterior deslizantes** (ej. `2024/2025`, `2025/2026` — cada año aparece
   en dos grupos). Selector "Últimos N periodos" (arranca en 2, ampliable hasta el
   máximo disponible). La tendencia (% de cambio + ícono de dirección) vive en el
   **tooltip**, no como badges visibles (se quitaron los badges por decisión del
   usuario: no aportaban valor ahí). Clic en una barra abre debajo un bar chart
   **horizontal** con el detalle por `Depto_Series` del año **más reciente** del par
   clickeado (ej. clic en `2024/2025` grafica 2025).

Agregación (`analytics.ts`, todas funciones puras):
`distribucionRiesgoPorDepartamento`, `construirConsultasPorDepartamento`,
`aniosDisponiblesConsultas`, `construirVisitasPorAnio`, `construirParesAnuales`,
`construirVisitasPorDepartamento`.

**Definición de "visita"** (decisión explícita del usuario): una fila con `Fecha`
válida en `registros` = un evento/visita — no personas distintas (una persona puede
aportar varias visitas al año). Las filas marcadas `esDuplicado` se excluyen.

---

## 3. Decisiones de diseño a respetar en cualquier gráfica nueva de este dashboard

- **Nunca barras apiladas** cuando las magnitudes entre categorías pueden ser muy
  distintas (ej. 1 vs 20) — usar barras agrupadas (sin `stackId`) o, si son muchas
  categorías con jerarquía, un mecanismo tipo pie+drill-down o treemap.
- **Reutilizar el mecanismo de "active shape"** (clic explota un sector de pie hacia
  afuera) en vez de un segundo anillo/nivel — un segundo nivel reintroduce el mismo
  problema de proporción invisible que las barras apiladas.
- **Leyendas clicables** (toggle mostrar/ocultar) siguen siempre el mismo patrón:
  botón con swatch de color + label, se fuerza el valor a 0 en el dato visible sin
  perder el conteo real; el % de un tooltip se calcula siempre sobre el total
  completo, no sobre lo visible.
- **`Depto_Series`** (granular) se prefiere sobre `Depto_nombre` (categoría agrupada)
  para desgloses "por departamento real" — ya se migró `RiesgoPorDepartamentoChart`
  y `VisitasAnualesChart` a `Depto_Series`; `ConsultasPorDepartamentoChart` se quedó
  en `Depto_nombre` (nunca se confirmó si debía cambiar también, ver pendientes).
- Paleta y estilos: mismos tokens de color ya usados en el resto del dashboard
  (`#009BDE` sea-blue, `#FFC627` amarillo, `#EE7523` naranja, `#EF4444`/`#991b1b` rojo,
  `#9ca3af` gris "sin dato"), mismo `tooltipCls`, `ShimmerOverlay subtle` envolviendo
  cualquier `ResponsiveContainer`, mismo `selectCls` para dropdowns de año.
- No hay `tsc` instalado en `frontend` (Vite/esbuild no type-checkea) — para
  verificar cambios se usa `npm run build` (catch de errores de resolución/sintaxis,
  no de tipos) desde `SCII_Web/frontend`. El `backend` sí tiene `typescript`
  instalado (`npx tsc --noEmit -p .` funciona ahí).

---

## 4. Pendiente / sin resolver

1. **Bug reportado, no diagnosticado**: el usuario reportó que "Riesgo por
   Departamento" seguía graficándose "sin distinción" después de migrar el código a
   `Depto_Series`. Se verificó que el código (`analytics.ts` línea ~465,
   `MatricesPoblacionalSection.tsx`) está correctamente cableado — la causa más
   probable es de datos, no de código: posible que en el SP real `Depto_Series`
   venga `NULL` para varias filas (esas personas se **excluyen** silenciosamente de
   la gráfica, no se agrupan distinto — función retorna temprano si
   `!r.Depto_Series`), o que el dev server no se haya reiniciado. **No se confirmó
   la causa real** — falta que el usuario corra la app contra su base de datos real
   y confirme.
2. **`ConsultasPorDepartamentoChart` sigue usando `Depto_nombre`**, no se migró a
   `Depto_Series` como las otras dos — nunca se preguntó/confirmó si debía cambiar
   también.
3. **Ninguna de las tres gráficas se probó contra datos reales** — todo se validó
   solo con `npm run build` (sin errores de compilación/resolución), nunca se abrió
   en un navegador con datos de la base de datos real.
4. **Asunción sin confirmar del todo**: el drill-down de "Consultas por
   Departamento" agrupa por `TipoProtocolo` (fallback `TipoAtencion`) — el usuario
   se confundió en el mensaje donde se le preguntó esto explícitamente y nunca lo
   confirmó por separado; se procedió con esa asunción por ser la más consistente
   con `MatrizProtocoloItem`/`ConstruirMatrizProtocolos` del `.asmx`.
5. **Ideas mencionadas pero no implementadas**:
   - `EvaluarSaludGrupal` (WebMethod poblacional del `.asmx`) nunca se llama desde
     SCII_Web — hay lógica de resumen poblacional duplicada entre SCII_Web
     (`resumenMedicoIA.ts` + `iaResumenPoblacional.service.ts`, su propio llamado a
     OpenAI) y el `.asmx` (`AnalizadorPoblacionalIA`). No se decidió si consolidar.
   - `resumenMedicoIA.ts` ya calcula `distribucionRiesgo` por departamento (para el
     resumen IA) que nunca se visualiza directamente — es información relacionada
     pero no es la misma fuente que `distribucionRiesgoPorDepartamento` (nueva,
     construida sobre `estadoActual` con `Depto_Series`).
   - Un `console.log` de depuración (3 líneas) quedó dentro de un `useMemo` en
     `CardiovascularSection.tsx` (líneas ~91-93) — detectado, nunca se pidió
     quitarlo.

---

## 5. Archivos tocados esta sesión (referencia rápida)

**Backend:**
- `backend/interfaces/salud_poblacional.ts`
- `backend/services/poblacionValidacion.service.ts`
- `backend/controllers/SaludPoblacionalController.ts`
- `backend/routes/SaludPoblacionalRoutes.ts`

**Frontend:**
- `frontend/src/features/saludPoblacional/types.ts`
- `frontend/src/features/saludPoblacional/analytics.ts`
- `frontend/src/features/saludPoblacional/components/RiesgoPorDepartamentoChart.tsx` (nuevo)
- `frontend/src/features/saludPoblacional/components/ConsultasPorDepartamentoChart.tsx` (nuevo)
- `frontend/src/features/saludPoblacional/components/VisitasAnualesChart.tsx` (nuevo)
- `frontend/src/features/saludPoblacional/components/MatricesPoblacionalSection.tsx` (nuevo)
- `frontend/src/pages/Expediente.tsx`

**Nota:** en algún punto de la sesión el usuario editó directamente
`RiesgoPorDepartamentoChart.tsx` (ajustes de estilo en el eje X y, más tarde, quitó
el nivel "Sin dato" de `SERIES_RIESGO` y sus colores) — esos cambios ya están
reflejados en el archivo actual, no se revirtieron.
