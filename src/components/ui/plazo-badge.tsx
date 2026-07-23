import { estadoPlazo, formatFecha, type EstadoPlazo } from "@/lib/utils";

const CFG: Record<Exclude<EstadoPlazo, "sin_plazo">, { label: string; cls: string }> = {
  programado: { label: "Programado", cls: "text-primary border-primary/30 bg-primary/10" },
  vigente: { label: "Vigente", cls: "text-accent border-accent/30 bg-accent/10" },
  vencido: { label: "Vencido", cls: "text-danger border-danger/30 bg-danger/10" },
};

interface PlazoBadgeProps {
  inicio: string | null;
  fin: string | null;
  /** Fecha actual YYYY-MM-DD (calculada en el servidor). */
  hoy: string;
  /** Si true (default) muestra el rango de fechas junto al badge. */
  mostrarRango?: boolean;
}

/**
 * Muestra el estado del plazo (Programado / Vigente / Vencido) y, opcionalmente,
 * el rango de fechas. No renderiza nada si no hay periodo asignado.
 */
export function PlazoBadge({ inicio, fin, hoy, mostrarRango = true }: PlazoBadgeProps) {
  const estado = estadoPlazo(inicio, fin, hoy);
  if (estado === "sin_plazo") return null;
  const cfg = CFG[estado];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${cfg.cls}`}
      >
        {cfg.label}
      </span>
      {mostrarRango && (inicio || fin) && (
        <span className="text-[10px] text-muted">
          {formatFecha(inicio)} – {formatFecha(fin)}
        </span>
      )}
    </span>
  );
}
