type EstadoGauge = "verde" | "amarillo" | "rojo" | "sin_datos";

// "rojo" (No iniciado) vuelve al rojo el 30.07 (el 28.07 se probó en celeste).
const COLORS: Record<EstadoGauge, string> = {
  verde: "#10B981",
  amarillo: "#F59E0B",
  rojo: "#EF4444",
  sin_datos: "#6B7280",
};

// Resto del círculo (lo que falta para llegar al 100 %).
const COLOR_PENDIENTE = "#4B5563";

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
  /**
   * Estados que COMPONEN el valor mostrado en el centro. El arco de color se
   * reparte entre ellos en proporción a su cantidad.
   */
  segments: GaugeSegment[];
  /**
   * Valor del centro (0-100). Es también la porción del círculo que se pinta
   * con color: el resto queda en gris. null => "—" y anillo todo gris.
   */
  centerValue: number | null;
  /**
   * Denominador para los porcentajes del tooltip. Por defecto es la suma de los
   * segmentos; cuando hay un filtro de estado aplicado se pasa el total del
   * ámbito completo para que el porcentaje siga siendo sobre el total real.
   */
  totalReferencia?: number;
  /** Etiqueta del tramo gris en el tooltip. */
  labelPendiente?: string;
  size?: number;
  strokeWidth?: number;
}

/**
 * Anillo de avance (correcciones 30.07): el círculo completo es el 100 %.
 * Se pinta con los colores del semáforo SOLO la porción ejecutada — el valor
 * del centro — y el resto queda en gris. Dentro de esa porción, cada estado
 * ocupa un arco proporcional a su cantidad. Al pasar el mouse sobre un color
 * se ve la cantidad y el porcentaje de ese estado sobre el total.
 */
export function SemaforoGauge({
  segments,
  centerValue,
  totalReferencia,
  labelPendiente = "Pendiente",
  size = 110,
  strokeWidth = 10,
}: SemaforoGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circ = radius * 2 * Math.PI;

  const suma = segments.reduce((s, x) => s + x.count, 0);
  const totalPct = totalReferencia ?? suma; // denominador de los porcentajes

  // Fracción del círculo que va coloreada = el propio valor del centro.
  const fill = centerValue == null ? 0 : Math.max(0, Math.min(100, centerValue)) / 100;
  const pendiente = 1 - fill;

  let acc = 0; // fracción de circunferencia ya consumida

  const arcos =
    fill > 0 && suma > 0
      ? segments
          .filter((s) => s.count > 0)
          .map((s) => {
            // Proporción DENTRO del arco coloreado.
            const frac = (s.count / suma) * fill;
            const arco = {
              key: s.estado as string,
              color: COLORS[s.estado],
              frac,
              offset: -acc * circ,
              title: `${LABELS[s.estado]}: ${s.count} (${
                totalPct > 0 ? Math.round((s.count / totalPct) * 100) : 0
              }%)`,
            };
            acc += frac;
            return arco;
          })
      : [];

  if (pendiente > 0.0001) {
    arcos.push({
      key: "pendiente",
      color: COLOR_PENDIENTE,
      frac: pendiente,
      offset: -acc * circ,
      title: `${labelPendiente}: ${Math.round(pendiente * 100)}%`,
    });
  }

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        {/* Pista de fondo: token `stroke-border` en vez del #1F2937 fijo, que
            era el --brd del modo oscuro (corrección 24.08). */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-border"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {arcos.map((a) => {
          const len = a.frac * circ;
          return (
            <circle
              key={a.key}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={a.color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${len} ${circ - len}`}
              strokeDashoffset={a.offset}
              className="cursor-help transition-all duration-500 hover:brightness-125"
            >
              <title>{a.title}</title>
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
