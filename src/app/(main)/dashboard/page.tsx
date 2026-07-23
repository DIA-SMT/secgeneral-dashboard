import { getPeriodoActivo, getResumenDashboard, getUnidades, getIndicadores } from "@/lib/queries";
import { KpiCard } from "@/components/ui/kpi-card";
import { SemaforoGauge } from "@/components/ui/semaforo-gauge";
import { KpiBreakdownTooltip } from "@/components/ui/kpi-breakdown-tooltip";
import { ProyectoCard } from "@/components/dashboard/proyecto-card";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { ScopeSelector } from "@/components/dashboard/scope-selector";
import { AutoRefresh } from "@/components/dashboard/auto-refresh";
import { EmptyState } from "@/components/ui/empty-state";
import { calcularPorcentajeMeta, avanceMetaEnPlazo, avanceAgregado, avanceGlobalPonderado, type AvanceNivel } from "@/lib/utils";
import { getPerfilActual } from "@/lib/auth";
import type { Meta, Indicador } from "@/types/database";
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
  const indByMeta = new Map<string, Indicador[]>();
  const indByUnidad = new Map<string, Indicador[]>();
  for (const i of indicadores as IndConRel[]) {
    const mId = i.meta_id;
    const uId = i.meta?.proyecto?.unidad_id;
    if (mId) (indByMeta.get(mId) ?? indByMeta.set(mId, []).get(mId)!).push(i);
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

  const hoy = new Date().toISOString().slice(0, 10);

  // Avance por proyecto vía cascada: cada meta se deriva de sus indicadores y
  // el proyecto es el promedio de sus metas (contando todas). Considera el plazo.
  const avancePorProyecto = new Map<string, AvanceNivel>();
  for (const py of proyectosActivos) {
    const metasDelPy = resumen.metasPorProyecto.get(py.id) ?? [];
    const metaPcts = metasDelPy.map(
      (m) =>
        avanceMetaEnPlazo(
          indByMeta.get(m.id) ?? [],
          calcularPorcentajeMeta(m),
          { fecha_inicio: m.fecha_inicio, fecha_limite: m.fecha_limite },
          hoy
        ).pct
    );
    avancePorProyecto.set(py.id, avanceAgregado(metaPcts));
  }

  // Estado (semáforo) de un proyecto
  type EstadoProyecto = "verde" | "amarillo" | "rojo" | "sin_datos";
  const estadoProyecto = (py: { id: string }): EstadoProyecto => {
    const av = avancePorProyecto.get(py.id);
    if (!av || av.conDatos === 0) return "sin_datos";
    return av.estado as "verde" | "amarillo" | "rojo";
  };

  // Distribución (conteo) de proyectos por estado, para un conjunto dado
  const distribucion = (pys: typeof proyectosActivos) => {
    const d = { verde: 0, amarillo: 0, rojo: 0, sin_datos: 0 };
    for (const py of pys) d[estadoProyecto(py)]++;
    return d;
  };

  // Distribución del ámbito completo (tarjeta "Grado de avance")
  const distribucionProyectos = distribucion(proyectosActivos);

  // Filtro por estado (semáforo). El ámbito ya está aplicado en proyectosActivos.
  let proyectosFiltrados = proyectosActivos;
  if (params.estado && params.estado !== "todos") {
    proyectosFiltrados = proyectosActivos.filter((py) => estadoProyecto(py) === params.estado);
  }

  // Avance global = promedio del grado de avance de las metas ponderado por su
  // "valor particular" (meta.peso), sobre las metas de los proyectos filtrados
  // (correcciones 23.07 pág. 18). Los segmentos del anillo siguen mostrando la
  // distribución por cantidad de proyectos por estado.
  const distribucionGlobal = distribucion(proyectosFiltrados);
  const idsFiltrados = new Set(proyectosFiltrados.map((p) => p.id));
  const metasGlobal = metasScope.filter((m) => idsFiltrados.has(m.proyecto_id));
  const porcentajeGlobal = avanceGlobalPonderado(
    metasGlobal.map((m) => ({
      pct: avanceMetaEnPlazo(
        indByMeta.get(m.id) ?? [],
        calcularPorcentajeMeta(m),
        { fecha_inicio: m.fecha_inicio, fecha_limite: m.fecha_limite },
        hoy
      ).pct,
      peso: m.peso,
    }))
  );
  // Hay seguimiento si al menos un proyecto del conjunto tiene datos cargados.
  const tieneSeguimiento =
    distribucionGlobal.verde + distribucionGlobal.amarillo + distribucionGlobal.rojo > 0;

  // Agrupar por subsecretaria
  const subsecretarias = unidades.filter((u) => u.nivel === 1);

  const scopeUnidad = scopeId ? unidades.find((u) => u.id === scopeId) ?? null : null;

  const hayFiltros = !!scopeId || (!!params.estado && params.estado !== "todos");

  // Las cards llevan a su sección arrastrando los filtros del panel:
  // el ámbito (scope) mapeado al parámetro de cada página y el estado/semáforo.
  const estadoParam = params.estado && params.estado !== "todos" ? params.estado : null;
  const buildHref = (base: string, areaKey: "dir" | "unidad") => {
    const sp = new URLSearchParams();
    if (scopeId) sp.set(areaKey, scopeId);
    if (estadoParam) sp.set("estado", estadoParam);
    const qs = sp.toString();
    return qs ? `${base}?${qs}` : base;
  };

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
          <SemaforoGauge
            centerValue={tieneSeguimiento ? porcentajeGlobal : null}
            segments={[
              { estado: "verde", count: distribucionGlobal.verde },
              { estado: "amarillo", count: distribucionGlobal.amarillo },
              { estado: "rojo", count: distribucionGlobal.rojo },
              { estado: "sin_datos", count: distribucionGlobal.sin_datos },
            ]}
            size={110}
            strokeWidth={10}
          />
          <div>
            <p className="text-xs text-muted uppercase tracking-widest font-medium">Avance Global</p>
            {!tieneSeguimiento && (
              <p className="text-sm text-muted/70 mt-1">Aguardando primer reporte</p>
            )}
          </div>
        </div>

        <Link href={buildHref("/proyectos", "dir")} className="relative group block hover:scale-[1.02] transition-transform">
          <KpiCard label="Proyectos" value={proyectosActivos.length}
            sublabel={`de ${proyectosScope.length} en POA`}
            accent="success" />
          <KpiBreakdownTooltip
            verde={distribucionProyectos.verde}
            amarillo={distribucionProyectos.amarillo}
            rojo={distribucionProyectos.rojo}
            sin_datos={distribucionProyectos.sin_datos} />
        </Link>

        <Link href={buildHref("/metas", "unidad")} className="relative group block hover:scale-[1.02] transition-transform">
          <KpiCard label="Metas" value={metasScope.length}
            sublabel={resumen.tieneSeguimiento
              ? `${metasSemaforoScope.verde} finalizadas · ${metasSemaforoScope.rojo} no iniciadas`
              : "Pendientes de seguimiento"}
            accent="accent" />
          <KpiBreakdownTooltip
            verde={metasSemaforoScope.verde}
            amarillo={metasSemaforoScope.amarillo}
            rojo={metasSemaforoScope.rojo}
            sin_datos={metasSemaforoScope.sin_datos} />
        </Link>

        <Link href={buildHref("/indicadores", "unidad")} className="relative group block hover:scale-[1.02] transition-transform">
          <KpiCard label="Indicadores" value={indicadoresStats.total}
            sublabel={indicadoresStats.total > 0
              ? `${indicadoresStats.semaforo.verde} en verde · ${indicadoresStats.semaforo.rojo} en rojo`
              : "Sin indicadores en este ámbito"}
            accent="primary" />
          <KpiBreakdownTooltip
            verde={indicadoresStats.semaforo.verde}
            amarillo={indicadoresStats.semaforo.amarillo}
            rojo={indicadoresStats.semaforo.rojo}
            sin_datos={indicadoresStats.semaforo.sin_datos} />
        </Link>
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
                avance={av ? { porcentaje: av.pct, estado: av.estado, tieneSeguimiento: av.conDatos > 0 } : undefined} />;
            })}
          </div>
        ) : (
          <div className="space-y-8">
            {subsecretarias.map((sub) => {
              const allUnitIds = descendientes(sub.id);
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
                        avance={av ? { porcentaje: av.pct, estado: av.estado, tieneSeguimiento: av.conDatos > 0 } : undefined} />;
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
