import type { EstadoSemaforo } from "@/types/database";

const barColors: Record<EstadoSemaforo, string> = {
  verde: "bg-success",
  amarillo: "bg-warning",
  rojo: "bg-info", // No iniciado → celeste (28.07)
  gris: "bg-muted/40",
  sin_datos: "bg-muted/20",
};

interface ProgressBarProps {
  value: number | null;
  estado?: EstadoSemaforo;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

export function ProgressBar({
  value,
  estado = "sin_datos",
  showLabel = true,
  size = "md",
}: ProgressBarProps) {
  const pct = value != null ? Math.max(0, Math.min(100, value)) : 0;
  const heights = { sm: "h-1", md: "h-2", lg: "h-3" };

  return (
    <div className="flex items-center gap-3">
      <div className={`flex-1 rounded-full bg-border/50 ${heights[size]}`}>
        <div
          className={`${heights[size]} rounded-full transition-all duration-500 ${barColors[estado]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-sm font-semibold text-foreground tabular-nums w-12 text-right">
          {value != null ? `${Math.round(value)}%` : "—"}
        </span>
      )}
    </div>
  );
}
