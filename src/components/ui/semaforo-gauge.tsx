type EstadoGauge = "verde" | "amarillo" | "rojo" | "sin_datos";

// "rojo" (No iniciado) se pinta en celeste desde el 28.07.
const COLORS: Record<EstadoGauge, string> = {
  verde: "#10B981",
  amarillo: "#F59E0B",
  rojo: "#38BDF8",
  sin_datos: "#374151",
};

const LABELS: Record<EstadoGauge, string> = {
  verde: "Finalizado",
  amarillo: "En ejecución",
  rojo: "No iniciado",
  sin_datos: "Sin datos",
};

export interface GaugeSegment {
  estado: EstadoGauge;
  count: number;
}

interface SemaforoGaugeProps {
  /** Segmentos del anillo, proporcionales a su cantidad (verde/amarillo/rojo/sin_datos). */
  segments: GaugeSegment[];
  /** Valor mostrado en el centro (avance global %). null => "—". */
  centerValue: number | null;
  /**
   * Denominador para los porcentajes del tooltip. Por defecto es la suma de los
   * segmentos; cuando hay un filtro de estado aplicado se pasa el total del
   * ámbito completo para que el porcentaje siga siendo sobre el total real.
   */
  totalReferencia?: number;
  size?: number;
  strokeWidth?: number;
}

/**
 * Anillo tricolor: cada arco es proporcional a la cantidad de proyectos en
 * ese estado. Al pasar el mouse sobre un color, el tooltip nativo (SVG title)
 * muestra la cantidad y el porcentaje de ese valor sobre el total.
 */
export function SemaforoGauge({
  segments,
  centerValue,
  totalReferencia,
  size = 110,
  strokeWidth = 10,
}: SemaforoGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circ = radius * 2 * Math.PI;
  const suma = segments.reduce((s, x) => s + x.count, 0);
  const totalArco = suma; // proporción del anillo
  const totalPct = totalReferencia ?? suma; // denominador de los porcentajes

  let acc = 0; // fracción de circunferencia ya consumida

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        {/* Pista de fondo */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#1F2937"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {totalArco > 0 &&
          segments
            .filter((s) => s.count > 0)
            .map((s) => {
              const frac = s.count / totalArco;
              const len = frac * circ;
              const offset = -acc * circ;
              const pct = totalPct > 0 ? Math.round((s.count / totalPct) * 100) : 0;
              acc += frac;
              return (
                <circle
                  key={s.estado}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={COLORS[s.estado]}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={`${len} ${circ - len}`}
                  strokeDashoffset={offset}
                  className="cursor-help transition-all duration-500 hover:brightness-125"
                >
                  <title>{`${LABELS[s.estado]}: ${s.count} (${pct}%)`}</title>
                </circle>
              );
            })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-foreground">
          {centerValue != null ? `${Math.round(centerValue)}%` : "—"}
        </span>
      </div>
    </div>
  );
}
