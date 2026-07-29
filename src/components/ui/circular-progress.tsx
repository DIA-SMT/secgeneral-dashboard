import type { EstadoSemaforo } from "@/types/database";

const strokeColors: Record<EstadoSemaforo, string> = {
  verde: "#10B981",
  amarillo: "#F59E0B",
  rojo: "#38BDF8", // No iniciado → celeste (28.07)
  gris: "#6B7280",
  sin_datos: "#374151",
};

interface CircularProgressProps {
  value: number;
  estado?: EstadoSemaforo;
  size?: number;
  strokeWidth?: number;
}

export function CircularProgress({
  value,
  estado = "sin_datos",
  size = 120,
  strokeWidth = 8,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const pct = Math.max(0, Math.min(100, value));
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#1F2937"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColors[estado]}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-foreground">{Math.round(value)}%</span>
      </div>
    </div>
  );
}
