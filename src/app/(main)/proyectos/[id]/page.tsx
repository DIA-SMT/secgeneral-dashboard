import { getProyecto, getMetasPorProyecto, getHitosPorProyecto, getAvancesPorProyecto } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import type { Indicador } from "@/types/database";
import { StatusBadge } from "@/components/ui/status-badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { MetaCardWithForm } from "@/components/dashboard/meta-card-with-form";
import { HitoActions } from "@/components/dashboard/hito-actions";
import { AvancesList } from "@/components/dashboard/avances-list";
import { getPerfilActual } from "@/lib/auth";
import { formatFecha, formatFechaRelativa, calcularEstadoProyecto } from "@/lib/utils";
import { BackButton } from "@/components/layout/back-button";
import Link from "next/link";

export const revalidate = 60;

export default async function ProyectoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [proyecto, metas, hitos, avances] = await Promise.all([
    getProyecto(id),
    getMetasPorProyecto(id),
    getHitosPorProyecto(id),
    getAvancesPorProyecto(id),
  ]);

  const { data: indData } = await supabase
    .from("indicador")
    .select("*")
    .in("meta_id", metas.map((m) => m.id))
    .is("deleted_at", null)
    .order("orden");
  const indicadores = (indData ?? []) as Indicador[];
  const indicadoresPorMeta = new Map<string, Indicador[]>();
  for (const i of indicadores) {
    (indicadoresPorMeta.get(i.meta_id) ?? indicadoresPorMeta.set(i.meta_id, []).get(i.meta_id)!).push(i);
  }

  const perfil = await getPerfilActual();
  const puedeCargar =
    !!perfil &&
    (perfil.rol === "admin_funcional" ||
      (perfil.rol === "director" && perfil.unidad_id === proyecto.unidad_id));

  const { porcentaje: avgPct, estado: estadoGlobal, tieneSeguimiento } = calcularEstadoProyecto(metas);
  const ahora = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back + Breadcrumb */}
      <div className="flex items-center justify-between gap-3">
        <BackButton fallback="/proyectos" />
        <nav className="flex items-center gap-2 text-sm text-muted min-w-0">
          <Link href="/proyectos" className="hover:text-primary transition-colors">Proyectos</Link>
          <span>/</span>
          <span className="text-foreground line-clamp-1">{proyecto.nombre}</span>
        </nav>
      </div>

      {/* Header */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {proyecto.codigo && (
                <span className="text-xs font-mono text-muted bg-border/50 px-2 py-0.5 rounded">{proyecto.codigo}</span>
              )}
              <StatusBadge estado={estadoGlobal} />
              <span className="text-xs text-muted capitalize px-2 py-0.5 rounded bg-border/30">{proyecto.estado}</span>
            </div>
            <h1 className="text-xl font-bold text-foreground">{proyecto.nombre}</h1>
            <p className="text-sm text-muted mt-1">{proyecto.unidad?.nombre_corto ?? proyecto.unidad?.nombre}</p>
            {proyecto.objetivo && (
              <p className="text-sm text-muted/80 mt-2 max-w-2xl">{proyecto.objetivo}</p>
            )}
          </div>
          <div className="flex items-center gap-6 shrink-0">
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground">{tieneSeguimiento ? `${avgPct ?? 0}%` : "—"}</p>
              <p className="text-xs text-muted">Avance</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground">
                {hitos.filter((h) => h.completado).length}/{hitos.length}
              </p>
              <p className="text-xs text-muted">Hitos</p>
            </div>
          </div>
        </div>
        {tieneSeguimiento ? (
          <div className="mt-4">
            <ProgressBar value={avgPct} estado={estadoGlobal} size="lg" />
          </div>
        ) : (
          <div className="mt-4 h-3 rounded-full bg-border/20 flex items-center justify-center">
            <span className="text-[9px] text-muted/40 uppercase tracking-wider">Sin avances reportados</span>
          </div>
        )}
        <div className="flex gap-4 mt-3 text-xs text-muted">
          {proyecto.fecha_inicio && <span>Inicio: {formatFecha(proyecto.fecha_inicio)}</span>}
          {proyecto.fecha_fin && <span>Fin: {formatFecha(proyecto.fecha_fin)}</span>}
        </div>
      </div>

      {/* Metas (con formulario de carga inline) */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Metas ({metas.length})</h2>
        <div className="space-y-3">
          {metas.map((meta) => (
            <MetaCardWithForm
              key={meta.id}
              meta={meta}
              proyectoId={proyecto.id}
              indicadores={indicadoresPorMeta.get(meta.id) ?? []}
              puedeCargar={puedeCargar}
            />
          ))}
        </div>
      </div>

      {/* Hitos */}
      {hitos.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            Hitos ({hitos.filter((h) => h.completado).length}/{hitos.length} completados)
          </h2>
          <div className="relative pl-6 space-y-4">
            <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />
            {hitos.map((hito) => {
              const vencido = !hito.completado && hito.fecha_esperada && hito.fecha_esperada < ahora;
              return (
                <div key={hito.id} className="relative flex items-start gap-3">
                  <div className={`absolute left-[-15px] top-1.5 h-3 w-3 rounded-full border-2
                    ${hito.completado ? "bg-success border-success"
                      : vencido ? "bg-warning border-warning"
                      : "bg-background border-border"}`} />
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-medium ${hito.completado ? "text-foreground" : vencido ? "text-warning" : "text-muted"}`}>
                      {hito.nombre}
                      {hito.obligatorio && <span className="text-[10px] text-warning ml-2">obligatorio</span>}
                      <HitoActions hitoId={hito.id} proyectoId={proyecto.id} completado={hito.completado} />
                    </h4>
                    <div className="flex items-center gap-3 text-xs text-muted mt-0.5">
                      {hito.completado ? (
                        <span className="text-success">Completado {formatFecha(hito.fecha_completado)}</span>
                      ) : vencido ? (
                        <span className="text-warning">Fecha vencida — esperado {formatFecha(hito.fecha_esperada)}</span>
                      ) : (
                        <span>Esperado: {formatFecha(hito.fecha_esperada)}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ultimos avances */}
      {avances.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Últimos avances</h2>
          <AvancesList avances={avances} metas={metas} proyectoId={proyecto.id} puedeCorregir={puedeCargar} />
        </div>
      )}

      {/* Sin avances aun */}
      {avances.length === 0 && (
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <p className="text-sm text-muted">Sin avances reportados todavía</p>
          <p className="text-xs text-muted/50 mt-1">Los avances se cargarán durante el seguimiento operativo</p>
        </div>
      )}
    </div>
  );
}
