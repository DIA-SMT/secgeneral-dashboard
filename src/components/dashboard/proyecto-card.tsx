import Link from "next/link";
import type { Proyecto, Meta, EstadoSemaforo } from "@/types/database";
import { StatusBadge } from "@/components/ui/status-badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatFechaRelativa, calcularEstadoProyecto } from "@/lib/utils";

interface ProyectoCardProps {
  proyecto: Proyecto;
  metas: Meta[];
  // Avance precalculado (a partir de indicadores). Si viene, prevalece sobre el cálculo por metas.
  avance?: { porcentaje: number | null; estado: EstadoSemaforo; tieneSeguimiento: boolean };
}

export function ProyectoCard({ proyecto, metas, avance }: ProyectoCardProps) {
  const calc = calcularEstadoProyecto(metas);
  const porcentaje = avance ? avance.porcentaje : calc.porcentaje;
  const estado = avance ? avance.estado : calc.estado;
  const tieneSeguimiento = avance ? avance.tieneSeguimiento : calc.tieneSeguimiento;

  const ultimaAct = metas
    .map((m) => m.ultima_actualizacion)
    .filter(Boolean)
    .sort()
    .reverse()[0] ?? null;

  return (
    <Link
      href={`/proyectos/${proyecto.id}`}
      className="block rounded-xl border border-border bg-surface p-4 hover:bg-surface-hover hover:border-primary/30 transition-all group"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {proyecto.codigo && (
              <span className="text-[10px] font-mono text-muted bg-border/50 px-1.5 py-0.5 rounded">
                {proyecto.codigo}
              </span>
            )}
            <StatusBadge estado={estado} />
          </div>
          <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
            {proyecto.nombre}
          </h3>
          {proyecto.unidad && (
            <p className="text-xs text-muted mt-0.5 truncate">
              {proyecto.unidad.nombre_corto ?? proyecto.unidad.nombre}
            </p>
          )}
        </div>
      </div>

      {tieneSeguimiento ? (
        <ProgressBar value={porcentaje ?? 0} estado={estado} size="sm" />
      ) : (
        <div className="h-2 rounded-full bg-border/30" />
      )}

      <div className="flex items-center justify-between mt-2 text-xs text-muted">
        <span>{metas.length} metas</span>
        {tieneSeguimiento ? (
          <span>{formatFechaRelativa(ultimaAct)}</span>
        ) : (
          <span className="text-primary/60">Sin seguimiento</span>
        )}
      </div>
    </Link>
  );
}
