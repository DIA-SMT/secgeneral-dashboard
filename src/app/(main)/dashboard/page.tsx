import { getPeriodoActivo, getResumenDashboard, getUnidades } from "@/lib/queries";
import { KpiCard } from "@/components/ui/kpi-card";
import { CircularProgress } from "@/components/ui/circular-progress";
import { SemaforoSummary } from "@/components/ui/semaforo-summary";
import { ProyectoCard } from "@/components/dashboard/proyecto-card";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { formatFecha, calcularEstadoProyecto } from "@/lib/utils";
import type { EstadoSemaforo, Meta, UnidadOrganizacional } from "@/types/database";
import { Suspense } from "react";
import Link from "next/link";

export const revalidate = 60;

interface Props {
  searchParams: Promise<{ unidad?: string; estado?: string }>;
}

export default async function DashboardPage({ searchParams }: Props) {
  const params = await searchParams;
  const periodo = await getPeriodoActivo();
  const resumen = await getResumenDashboard(periodo.id);
  const unidades = await getUnidades();

  const proyectosActivos = resumen.proyectos.filter((p) => p.estado === "activo");

  const estadoGlobal: EstadoSemaforo = !resumen.tieneSeguimiento
    ? "sin_datos"
    : resumen.porcentajeGlobal != null && resumen.porcentajeGlobal >= 70
    ? "verde"
    : resumen.porcentajeGlobal != null && resumen.porcentajeGlobal >= 40
    ? "amarillo"
    : "rojo";

  // Agrupar por subsecretaria
  const subsecretarias = unidades.filter((u) => u.nivel === 1);
  const direccionesPorSubsec = new Map<string, UnidadOrganizacional[]>();
  for (const sub of subsecretarias) {
    direccionesPorSubsec.set(sub.id, unidades.filter((u) => u.parent_id === sub.id));
  }

  // Filtrado
  let proyectosFiltrados = proyectosActivos;
  if (params.unidad) {
    const unidadHijos = unidades
      .filter((u) => u.id === params.unidad || u.parent_id === params.unidad)
      .map((u) => u.id);
    proyectosFiltrados = proyectosFiltrados.filter((p) => unidadHijos.includes(p.unidad_id));
  }
  if (params.estado && params.estado !== "todos") {
    proyectosFiltrados = proyectosFiltrados.filter((py) => {
      const metas = (resumen.metasPorProyecto.get(py.id) ?? []) as Meta[];
      const { estado } = calcularEstadoProyecto(metas);
      return estado === params.estado;
    });
  }
  const hayFiltros = !!params.unidad || (!!params.estado && params.estado !== "todos");

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Panel Ejecutivo</h1>
          <p className="text-sm text-muted mt-1">{periodo.nombre}</p>
        </div>
        <Link href="/tv" target="_blank"
          className="text-xs text-muted hover:text-accent border border-border hover:border-accent/30 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5 self-start">
          <span>▣</span> Modo TV
        </Link>
      </div>

      {/* Banner: planificacion sin seguimiento */}
      {!resumen.tieneSeguimiento && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-primary text-lg">◎</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Planificación cargada — Seguimiento pendiente</p>
              <p className="text-xs text-muted mt-0.5">
                El POA tiene {proyectosActivos.length} proyectos activos y {resumen.totalMetas} metas definidas.
                Los indicadores se activarán cuando se carguen los primeros avances operativos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="sm:col-span-2 lg:col-span-1 rounded-2xl border border-border bg-surface p-6 flex items-center gap-6">
          {resumen.tieneSeguimiento && resumen.porcentajeGlobal != null ? (
            <CircularProgress value={resumen.porcentajeGlobal} estado={estadoGlobal} size={110} strokeWidth={10} />
          ) : (
            <div className="h-[110px] w-[110px] rounded-full border-[10px] border-border/30 flex items-center justify-center shrink-0">
              <span className="text-2xl font-light text-muted/40">—</span>
            </div>
          )}
          <div>
            <p className="text-xs text-muted uppercase tracking-widest font-medium">Avance Global</p>
            {resumen.tieneSeguimiento && resumen.porcentajeGlobal != null ? (
              <p className="text-lg font-semibold text-foreground mt-1">{resumen.porcentajeGlobal}% ejecutado</p>
            ) : (
              <p className="text-sm text-muted/70 mt-1">Aguardando primer reporte</p>
            )}
          </div>
        </div>

        <KpiCard label="Metas" value={resumen.totalMetas}
          sublabel={resumen.tieneSeguimiento
            ? `${resumen.metasSemaforo.verde} al día · ${resumen.metasSemaforo.rojo} en riesgo`
            : "Pendientes de seguimiento"}
          accent="accent" />

        <KpiCard label="Hitos" value={`${resumen.hitosCompletados}/${resumen.hitosTotal}`}
          sublabel={resumen.hitosVencidos > 0
            ? `${resumen.hitosVencidos} con fecha vencida`
            : resumen.proximoHito
            ? `Próximo: ${resumen.proximoHito.nombre}`
            : "Sin hitos próximos"}
          accent={resumen.hitosVencidos > 0 ? "warning" : "primary"} />

        <KpiCard label="Proyectos" value={proyectosActivos.length}
          sublabel={`de ${resumen.proyectos.length} en POA`}
          accent="success" />
      </div>

      {/* Semaforo + proximo hito */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs text-muted uppercase tracking-widest mb-3">Distribución de metas</p>
          <SemaforoSummary
            verde={resumen.metasSemaforo.verde}
            amarillo={resumen.metasSemaforo.amarillo}
            rojo={resumen.metasSemaforo.rojo}
            sin_datos={resumen.metasSemaforo.sin_datos} />
        </div>

        {resumen.proximoHito?.fecha_esperada ? (
          <div className="rounded-2xl border border-accent/20 bg-accent/5 p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-accent uppercase tracking-widest font-medium">Próximo hito</p>
              <p className="text-base font-semibold text-foreground mt-1">{resumen.proximoHito.nombre}</p>
            </div>
            <p className="text-xl font-bold text-accent shrink-0 ml-4">{formatFecha(resumen.proximoHito.fecha_esperada)}</p>
          </div>
        ) : resumen.hitosVencidos > 0 ? (
          <div className="rounded-2xl border border-warning/20 bg-warning/5 p-5 flex items-center gap-3">
            <div>
              <p className="text-sm font-semibold text-warning">{resumen.hitosVencidos} hitos con fecha vencida</p>
              <p className="text-xs text-muted mt-0.5">Revisar en la vista de Hitos</p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-surface p-5 flex items-center justify-center">
            <p className="text-sm text-muted">Sin hitos próximos</p>
          </div>
        )}
      </div>

      {/* Proyectos */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
          <h2 className="text-lg font-semibold text-foreground">
            Proyectos{hayFiltros ? ` (${proyectosFiltrados.length})` : ""}
          </h2>
          <Suspense><FilterBar unidades={unidades} /></Suspense>
        </div>

        {proyectosFiltrados.length === 0 ? (
          <EmptyState title="Sin proyectos para este filtro"
            description="Probá cambiar los filtros o seleccionar otra área" icon="▦" />
        ) : hayFiltros ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {proyectosFiltrados.map((py) => {
              const metas = (resumen.metasPorProyecto.get(py.id) ?? []) as Meta[];
              return <ProyectoCard key={py.id} proyecto={py} metas={metas} />;
            })}
          </div>
        ) : (
          <div className="space-y-8">
            {subsecretarias.map((sub) => {
              const dirs = direccionesPorSubsec.get(sub.id) ?? [];
              const allUnitIds = [sub.id, ...dirs.map((d) => d.id)];
              const pysSub = proyectosFiltrados.filter((p) => allUnitIds.includes(p.unidad_id));
              if (pysSub.length === 0) return null;
              return (
                <div key={sub.id}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-6 w-6 rounded-md bg-accent/20 flex items-center justify-center">
                      <span className="text-accent text-xs font-bold">{sub.nombre_corto?.[0]}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">{sub.nombre_corto}</h3>
                    <span className="text-xs text-muted">— {pysSub.length} proyectos</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {pysSub.slice(0, 9).map((py) => {
                      const metas = (resumen.metasPorProyecto.get(py.id) ?? []) as Meta[];
                      return <ProyectoCard key={py.id} proyecto={py} metas={metas} />;
                    })}
                  </div>
                  {pysSub.length > 9 && (
                    <Link href={`/dashboard?unidad=${sub.id}`}
                      className="inline-block mt-3 text-xs text-primary hover:text-primary-light transition-colors">
                      Ver los {pysSub.length} proyectos →
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
