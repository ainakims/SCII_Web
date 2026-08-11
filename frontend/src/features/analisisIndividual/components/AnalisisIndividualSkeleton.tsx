import React from "react";

// Placeholder de una mini card de gráfica (título + área de gráfica + fila de
// leyenda), reutilizado por UltimaTomaSection y MatricesSection en el
// skeleton — mismas proporciones que EvolucionPesoChart/PresionArterialChart/etc.
const SkeletonMiniChart: React.FC<{ alto?: string }> = ({ alto = "h-40" }) => (
  <div className="rounded-lg shadow-xl p-4">
    <div className="h-3 w-40 rounded bg-gray-200 mb-3"></div>
    <div className={`${alto} rounded-lg bg-gray-100`}></div>
    <div className="flex justify-center gap-2 mt-2">
      <div className="h-4 w-16 rounded bg-gray-100"></div>
      <div className="h-4 w-16 rounded bg-gray-100"></div>
    </div>
  </div>
);

// Placeholder de una card simple (Card.tsx: título + un par de bloques de contenido).
const SkeletonCard: React.FC<{ lineas?: number }> = ({ lineas = 2 }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
    <div className="h-3 w-44 rounded bg-gray-200 mb-3"></div>
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: lineas }).map((_, i) => (
        <div key={i} className="bg-gray-50 rounded-lg px-3.5 py-3 h-14"></div>
      ))}
    </div>
  </div>
);

// Reproduce la forma de la vista completa de Análisis Individual (KPIs,
// dictamen/prioridad, Última Toma, matrices, hallazgos y diagnóstico) para
// que se note "de un vistazo" qué va a llegar, mientras la IA sigue
// generando el análisis real. Se muestra detrás de OverlayCargandoIA.
const AnalisisIndividualSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    {/* KPI cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="bg-linear-to-b from-white to-gray-50 rounded-xl shadow-xl flex items-center px-5 py-4 gap-4">
          <div className="size-12 rounded-md bg-gray-200 flex-shrink-0"></div>
          <div className="flex-1 space-y-2">
            <div className="h-2.5 w-16 rounded bg-gray-200"></div>
            <div className="h-4 w-10 rounded bg-gray-200"></div>
          </div>
        </div>
      ))}
    </div>

    {/* HeaderAnalisis: dictamen de aptitud + prioridad médica */}
    <div className="flex flex-col gap-4">
      <div className="bg-linear-to-b from-gray-50 to-white rounded-xl shadow-xl px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="h-3 w-52 rounded bg-gray-200"></div>
          <div className="h-5 w-16 rounded-full bg-gray-200"></div>
        </div>
        <div className="h-3 w-3/4 rounded bg-gray-100 mb-3"></div>
        <div className="h-10 rounded-lg bg-gray-100"></div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="h-3 w-48 rounded bg-gray-200"></div>
          <div className="h-5 w-24 rounded-full bg-gray-200"></div>
        </div>
        <div className="h-3 w-2/3 rounded bg-gray-100 mb-3"></div>
        <div className="h-10 rounded-lg bg-gray-100"></div>
      </div>
    </div>

    {/* Última Toma */}
    <div className="bg-linear-to-b from-white to-gray-50 rounded-xl shadow-xl p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <div className="h-4 w-32 rounded bg-gray-200 mb-2"></div>
          <div className="h-2.5 w-56 rounded bg-gray-100"></div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonMiniChart />
        <SkeletonMiniChart />
        <SkeletonMiniChart />
        <SkeletonMiniChart />
      </div>
    </div>

    {/* Matrices de seguimiento */}
    <div className="bg-linear-to-b from-white to-gray-50 rounded-xl shadow-xl p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <div className="h-4 w-48 rounded bg-gray-200 mb-2"></div>
          <div className="h-2.5 w-64 rounded bg-gray-100"></div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg shadow-xl p-4">
          <div className="h-3 w-52 rounded bg-gray-200 mb-3"></div>
          <div className="grid grid-cols-12 gap-1.5">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-md bg-gray-100"></div>
            ))}
          </div>
          <div className="h-8 rounded-lg bg-gray-100 mt-3"></div>
        </div>
        <div className="rounded-lg shadow-xl p-4">
          <div className="h-3 w-48 rounded bg-gray-200 mb-3"></div>
          <div className="space-y-1.5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-6 rounded bg-gray-100"></div>
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* Hallazgos relevantes */}
    <SkeletonCard lineas={2} />

    {/* Diagnóstico diferencial */}
    <SkeletonCard lineas={2} />
  </div>
);

export default AnalisisIndividualSkeleton;
