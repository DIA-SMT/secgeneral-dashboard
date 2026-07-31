import type { EstadoSemaforo } from "@/types/database";

interface Props {
  value: number | null; // 0-100
  estado: EstadoSemaforo;
  size?: number;
  label?: string;
}

// Gauge circular compacto para mostrar % de avance
export function MiniGauge({ value, estado, size = 56, label }: Props) {
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = value ?? 0;
  const offset = circ - (pct / 100) * circ;

  const color =
    estado === "verde"
      ? "var(--color-success, #16a34a)"
      : estado === "amarillo"
      ? "var(--color-warning, #ca8a04)"
      : estado === "rojo"
      ? "var(--color-info, #EF4444)" // No iniciado → rojo (30.07)
      : "var(--color-border, #888)";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-border/30"
          />
          {value != null && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={stroke}
              strokeDasharray={circ}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-foreground">
            {value != null ? `${pct}%` : "—"}
          </span>
        </div>
      </div>
      {label && <span className="text-[9px] text-muted uppercase tracking-wider">{label}</span>}
    </div>
  );
}
