type EstadoGauge = "verde" | "amarillo" | "rojo" | "sin_datos";

const COLORS: Record<EstadoGauge, string> = {
  verde: "#10B981",
  amarillo: "#F59E0B",
  rojo: "#EF4444",
  sin_datos: "#374151",
};

const LABELS: Record<EstadoGauge, string> = {
  verde: "Verde",
  amarillo: "Amarillo",
  rojo: "Rojo",
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
  size = 110,
  strokeWidth = 10,
}: SemaforoGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circ = radius * 2 * Math.PI;
  const total = segments.reduce((s, x) => s + x.count, 0);

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
        {total > 0 &&
          segments
            .filter((s) => s.count > 0)
            .map((s) => {
              const frac = s.count / total;
              const len = frac * circ;
              const offset = -acc * circ;
              const pct = Math.round(frac * 100);
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
