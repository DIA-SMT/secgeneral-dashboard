import { getPeriodoActivo, getResumenDashboard, getUnidades, getIndicadores } from "@/lib/queries";
import { KpiCard } from "@/components/ui/kpi-card";
import { CircularProgress } from "@/components/ui/circular-progress";
import { SemaforoSummary } from "@/components/ui/semaforo-summary";
import { ProyectoCard } from "@/components/dashboard/proyecto-card";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { ScopeSelector } from "@/components/dashboard/scope-selector";
import { AutoRefresh } from "@/components/dashboard/auto-refresh";
import { EmptyState } from "@/components/ui/empty-state";
import { formatFecha, calcularAvancePorIndicadores } from "@/lib/utils";
import { getPerfilActual } from "@/lib/auth";
import type { EstadoSemaforo, Meta, Indicador, UnidadOrganizacional } from "@/types/database";
import { Suspense } from "react";
import Link from "next/link";

export const revalidate = 0; // sin cache mientras estamos cargando data

interface Props {
  searchParams: Promise<{ unidad?: string; estado?: string; scope?: string }>;
}

export default async function DashboardPage({ searchParams }: Props) {
  const params = await searchParams;
  const periodo = await getPeriodoActivo();
  const resumen = await getResumenDashboard(periodo.id);
  const unidades = await getUnidades();
  const indicadores = await getIndicadores();
  const perfil = await getPerfilActual();

  // Roles con acceso global pueden elegir el ámbito libremente.
  // El resto (secretario/subsec/director) queda fijado a su área.
  const esGlobal =
    !perfil ||
    perfil.rol === "intendenta" ||
    perfil.rol === "admin_funcional" ||
    perfil.rol === "admin_tecnico";

  const descendientes = (id: string): string[] => {
    const directos = unidades.filter((u) => u.parent_id === id).map((u) => u.id);
    return [id, ...directos.flatMap((d) => descendientes(d))];
  };

  // Si el usuario tiene área asignada y no es global, forzamos el scope a su unidad
  const scopeForzado = !esGlobal && perfil?.unidad_id ? perfil.unidad_id : null;
  const scopeId = scopeForzado ?? params.scope;
  const scopeUnidadIds = scopeId ? new Set(descendientes(scopeId)) : null;

  const proyectosScope = scopeUnidadIds
    ? resumen.proyectos.filter((p) => scopeUnidadIds.has(p.unidad_id))
    : resumen.proyectos;
  const proyectoIdsScope = new Set(proyectosScope.map((p) => p.id));
  const metasScope = scopeUnidadIds
    ? resumen.metas.filter((m) => proyectoIdsScope.has(m.proyecto_id))
    : resumen.metas;
  const metasSemaforoScope = {
    verde: metasScope.filter((m) => m.estado_semaforo === "verde").length,
    amarillo: metasScope.filter((m) => m.estado_semaforo === "amarillo").length,
    rojo: metasScope.filter((m) => m.estado_semaforo === "rojo").length,
    sin_datos: metasScope.filter(
      (m) => m.estado_semaforo === "sin_datos" || m.estado_semaforo === "gris"
    ).length,
  };

  const proyectosActivos = proyectosScope.filter((p) => p.estado === "activo");

  // -------------------------------------------------------
  // Avance basado en INDICADORES (lo que cargan los directores)
  // -------------------------------------------------------
  type IndConRel = Indicador & { meta?: { proyecto?: { id: string; unidad_id: string } } };
  const indByProyecto = new Map<string, Indicador[]>();
  const indByUnidad = new Map<string, Indicador[]>();
  for (const i of indicadores as IndConRel[]) {
    const pyId = i.meta?.proyecto?.id;
    const uId = i.meta?.proyecto?.unidad_id;
    if (pyId) (indByProyecto.get(pyId) ?? indByProyecto.set(pyId, []).get(pyId)!).push(i);
    if (uId) (indByUnidad.get(uId) ?? indByUnidad.set(uId, []).get(uId)!).push(i);
  }

  // Indicadores dentro del scope
  const indScope = scopeUnidadIds
    ? (indicadores as IndConRel[]).filter((i) => {
        const uId = i.meta?.proyecto?.unidad_id;
        return uId ? scopeUnidadIds.has(uId) : false;
      })
    : (indicadores as IndConRel[]);

  const indicadoresStats = {
    total: indScope.length,
    semaforo: {
      verde: indScope.filter((i) => i.estado_semaforo === "verde").length,
      amarillo: indScope.filter((i) => i.estado_semaforo === "amarillo").length,
      rojo: indScope.filter((i) => i.estado_semaforo === "rojo").length,
      sin_datos: indScope.filter((i) => i.estado_semaforo === "sin_datos" || i.estado_semaforo === "gris").length,
    },
  };

  // Avance por proyecto (a partir de sus indicadores)
  const avancePorProyecto = new Map<string, ReturnType<typeof calcularAvancePorIndicadores>>();
  for (const py of proyectosActivos) {
    avancePorProyecto.set(py.id, calcularAvancePorIndicadores(indByProyecto.get(py.id) ?? []));
  }

  // Avance global = promedio de proyectos con datos
  const proyectosConDatos = proyectosActivos.filter((p) => (avancePorProyecto.get(p.id)?.conDatos ?? 0) > 0);
  const porcentajeGlobal =
    proyectosConDatos.length > 0
      ? Math.round(
          proyectosConDatos.reduce((acc, p) => acc + (avancePorProyecto.get(p.id)?.porcentaje ?? 0), 0) /
            proyectosConDatos.length
        )
      : null;
  const tieneSeguimiento = proyectosConDatos.length > 0;

  // Distribución de proyectos por estado (semáforo) según sus indicadores
  const distribucionProyectos = { verde: 0, amarillo: 0, rojo: 0, sin_datos: 0 };
  for (const py of proyectosActivos) {
    const av = avancePorProyecto.get(py.id);
    if (!av || av.conDatos === 0) distribucionProyectos.sin_datos++;
    else distribucionProyectos[av.estado as "verde" | "amarillo" | "rojo"]++;
  }

  const estadoGlobal: EstadoSemaforo = !tieneSeguimiento
    ? "sin_datos"
    : porcentajeGlobal != null && porcentajeGlobal >= 70
    ? "verde"
    : porcentajeGlobal != null && porcentajeGlobal >= 40
    ? "amarillo"
    : "rojo";

  // Agrupar por subsecretaria
  const subsecretarias = unidades.filter((u) => u.nivel === 1);
  const direccionesPorSubsec = new Map<string, UnidadOrganizacional[]>();
  for (const sub of subsecretarias) {
    direccionesPorSubsec.set(sub.id, unidades.filter((u) => u.parent_id === sub.id));
  }

  const scopeUnidad = scopeId ? unidades.find((u) => u.id === scopeId) ?? null : null;

  // Filtrado: el ámbito (scope) es el único filtro de área. Acá solo el estado.
  let proyectosFiltrados = proyectosActivos;
  if (params.estado && params.estado !== "todos") {
    proyectosFiltrados = proyectosFiltrados.filter((py) => {
      const av = avancePorProyecto.get(py.id);
      const estado = !av || av.conDatos === 0 ? "sin_datos" : av.estado;
      return estado === params.estado;
    });
  }
  const hayFiltros = !!scopeId || (!!params.estado && params.estado !== "todos");

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Panel Ejecutivo</h1>
          {esGlobal ? (
            <>
              <Suspense><ScopeSelector unidades={unidades} /></Suspense>
              {scopeUnidad && (
                <p className="mt-1 text-xs text-muted">Ámbito: {scopeUnidad.nombre}</p>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm text-muted">
              {scopeUnidad ? scopeUnidad.nombre : "Tu área"}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 self-start">
          <Link href="/tv" target="_blank"
            className="text-xs text-muted hover:text-accent border border-border hover:border-accent/30 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5">
            <span>▣</span> Modo TV
          </Link>
          <AutoRefresh intervalSegundos={60} />
        </div>
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

      {/* KPIs: Avance global → Proyectos → Metas → Indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="sm:col-span-2 lg:col-span-1 rounded-2xl border border-border bg-surface p-6 flex items-center gap-6">
          {tieneSeguimiento && porcentajeGlobal != null ? (
            <CircularProgress value={porcentajeGlobal} estado={estadoGlobal} size={110} strokeWidth={10} />
          ) : (
            <div className="h-[110px] w-[110px] rounded-full border-[10px] border-border/30 flex items-center justify-center shrink-0">
              <span className="text-2xl font-light text-muted/40">—</span>
            </div>
          )}
          <div>
            <p className="text-xs text-muted uppercase tracking-widest font-medium">Avance Global</p>
            {tieneSeguimiento && porcentajeGlobal != null ? (
              <p className="text-lg font-semibold text-foreground mt-1">{porcentajeGlobal}% ejecutado</p>
            ) : (
              <p className="text-sm text-muted/70 mt-1">Aguardando primer reporte</p>
            )}
          </div>
        </div>

        <Link href="/proyectos" className="block hover:scale-[1.02] transition-transform">
          <KpiCard label="Proyectos" value={proyectosActivos.length}
            sublabel={`de ${proyectosScope.length} en POA`}
            accent="success" />
        </Link>

        <Link href="/metas" className="block hover:scale-[1.02] transition-transform">
          <KpiCard label="Metas" value={metasScope.length}
            sublabel={resumen.tieneSeguimiento
              ? `${metasSemaforoScope.verde} finalizadas · ${metasSemaforoScope.rojo} no iniciadas`
              : "Pendientes de seguimiento"}
            accent="accent" />
        </Link>

        <Link href="/indicadores" className="block hover:scale-[1.02] transition-transform">
          <KpiCard label="Indicadores" value={indicadoresStats.total}
            sublabel={indicadoresStats.total > 0
              ? `${indicadoresStats.semaforo.verde} en verde · ${indicadoresStats.semaforo.rojo} en rojo`
              : "Sin indicadores en este ámbito"}
            accent="primary" />
        </Link>
      </div>

      {/* Grado de avance + proximo hito */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs text-muted uppercase tracking-widest mb-3">Grado de avance de los proyectos</p>
          <SemaforoSummary
            verde={distribucionProyectos.verde}
            amarillo={distribucionProyectos.amarillo}
            rojo={distribucionProyectos.rojo}
            sin_datos={distribucionProyectos.sin_datos}
            label="proyectos" />
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
              const av = avancePorProyecto.get(py.id);
              return <ProyectoCard key={py.id} proyecto={py} metas={metas}
                avance={av ? { porcentaje: av.porcentaje, estado: av.estado, tieneSeguimiento: av.conDatos > 0 } : undefined} />;
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
                      const av = avancePorProyecto.get(py.id);
                      return <ProyectoCard key={py.id} proyecto={py} metas={metas}
                        avance={av ? { porcentaje: av.porcentaje, estado: av.estado, tieneSeguimiento: av.conDatos > 0 } : undefined} />;
                    })}
                  </div>
                  {pysSub.length > 9 && (
                    <Link href={`/dashboard?scope=${sub.id}`}
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
