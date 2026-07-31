import { getPeriodoActivo, getResumenDashboard, getUnidades, getIndicadores } from "@/lib/queries";
import { KpiCard } from "@/components/ui/kpi-card";
import { SemaforoGauge } from "@/components/ui/semaforo-gauge";
import { ProyectoCard } from "@/components/dashboard/proyecto-card";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { ScopeSelector } from "@/components/dashboard/scope-selector";
import { AutoRefresh } from "@/components/dashboard/auto-refresh";
import { EmptyState } from "@/components/ui/empty-state";
import {
  calcularPorcentajeMeta,
  avanceMetaEnPlazo,
  avanceAgregado,
  avanceGlobalPorConteo,
  porcentajeDeEstado,
  totalDistribucion,
  type AvanceNivel,
} from "@/lib/utils";
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

  const totalIndicadoresScope = indScope.length;

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

  // -------------------------------------------------------
  // Avance global (correcciones 28.07 + 30.07)
  // -------------------------------------------------------
  // Se mide porcentualmente por CONTEO de proyectos: finalizados + en ejecución
  // sobre el total del ámbito.
  //
  // 30.07: el círculo completo es el 100 %. El anillo pinta SOLO esa porción
  // ejecutada y deja el resto —lo pendiente por finalizar— en gris.
  //
  // 31.07: dentro de esa porción también entran los NO INICIADOS (rojo), que
  // antes quedaban afuera del anillo. El arco sigue midiendo lo mismo (el % del
  // centro); lo que cambia es cómo se reparte por dentro: cada estado ocupa un
  // tramo proporcional a su cantidad. Los "sin datos" siguen fuera del anillo.
  //
  // Con un filtro de estado aplicado, el anillo muestra SOLO ese color y el
  // número del centro pasa a ser el porcentaje de ese color sobre el total.
  const ESTADOS_GAUGE = ["verde", "amarillo", "rojo", "sin_datos"] as const;
  const estadoFiltro =
    ESTADOS_GAUGE.find((e) => e === params.estado) ?? null;

  const totalAmbito = totalDistribucion(distribucionProyectos);
  const porcentajeGlobal = estadoFiltro
    ? porcentajeDeEstado(distribucionProyectos, estadoFiltro)
    : avanceGlobalPorConteo(distribucionProyectos);

  const segmentosGauge = estadoFiltro
    ? [{ estado: estadoFiltro, count: distribucionProyectos[estadoFiltro] }]
    : ([
        { estado: "verde", count: distribucionProyectos.verde },
        { estado: "amarillo", count: distribucionProyectos.amarillo },
        { estado: "rojo", count: distribucionProyectos.rojo },
      ] as const);

  // Hay seguimiento si al menos un proyecto del ámbito tiene datos cargados.
  const tieneSeguimiento =
    distribucionProyectos.verde + distribucionProyectos.amarillo + distribucionProyectos.rojo > 0;

  // Cantidades que se muestran debajo de la rueda del KPI de avance global.
  const conteosRueda = [
    { estado: "verde" as const, label: "finalizados", count: distribucionProyectos.verde, dot: "bg-success" },
    { estado: "amarillo" as const, label: "en ejecución", count: distribucionProyectos.amarillo, dot: "bg-warning" },
    { estado: "rojo" as const, label: "no iniciados", count: distribucionProyectos.rojo, dot: "bg-info" },
    { estado: "sin_datos" as const, label: "sin datos", count: distribucionProyectos.sin_datos, dot: "bg-primary/30" },
  ];

  // Agrupar por Secretaría: las direcciones que cuelgan directo de una
  // secretaría (sin subsecretaría) también tienen que aparecer.
  const secretarias = unidades.filter((u) => u.nivel === 0);

  const scopeUnidad = scopeId ? unidades.find((u) => u.id === scopeId) ?? null : null;

  const hayFiltros = !!scopeId || (!!params.estado && params.estado !== "todos");

  // Las cards llevan a su sección arrastrando los filtros del panel:
  // el ámbito (scope) mapeado al parámetro de cada página y el estado/semáforo.
  const estadoParam = params.estado && params.estado !== "todos" ? params.estado : null;

  // Fija el ámbito del panel sin perder el filtro de estado.
  const buildScopeHref = (unidadId: string) => {
    const sp = new URLSearchParams();
    sp.set("scope", unidadId);
    if (estadoParam) sp.set("estado", estadoParam);
    return `/dashboard?${sp.toString()}`;
  };

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
        <div className="sm:col-span-2 lg:col-span-1 rounded-2xl border border-border bg-surface p-6 flex flex-col items-center gap-3">
          <p className="text-xs text-muted uppercase tracking-widest font-medium self-start">
            Avance Global
          </p>
          <SemaforoGauge
            centerValue={tieneSeguimiento ? porcentajeGlobal : null}
            segments={[...segmentosGauge]}
            totalReferencia={totalAmbito}
            labelPendiente={estadoFiltro ? "Resto del ámbito" : "Pendiente por finalizar"}
            size={110}
            strokeWidth={10}
          />
          {tieneSeguimiento ? (
            /* Cantidad de proyectos clasificados, debajo de la rueda (28.07) */
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
              {conteosRueda
                .filter((c) => c.count > 0)
                .map((c) => (
                  <span
                    key={c.estado}
                    className="inline-flex items-center gap-1.5 text-[11px] text-muted"
                    title={`${c.count} de ${totalAmbito} proyectos`}
                  >
                    <span className={`h-2 w-2 rounded-full ${c.dot}`} />
                    <span className="font-semibold text-foreground">{c.count}</span>
                    {c.label}
                  </span>
                ))}
            </div>
          ) : (
            <p className="text-sm text-muted/70">Aguardando primer reporte</p>
          )}
        </div>

        <Link href={buildHref("/proyectos", "dir")} className="block hover:scale-[1.02] transition-transform">
          <KpiCard label="Proyectos" value={proyectosActivos.length} accent="success" />
        </Link>

        <Link href={buildHref("/metas", "unidad")} className="block hover:scale-[1.02] transition-transform">
          <KpiCard label="Metas" value={metasScope.length} accent="accent" />
        </Link>

        <Link href={buildHref("/indicadores", "unidad")} className="block hover:scale-[1.02] transition-transform">
          <KpiCard label="Indicadores" value={totalIndicadoresScope} accent="primary" />
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
            {secretarias.map((sec) => {
              const allUnitIds = descendientes(sec.id);
              const pysSec = proyectosFiltrados.filter((p) => allUnitIds.includes(p.unidad_id));
              if (pysSec.length === 0) return null;
              const nombreSec = sec.nombre_corto ?? sec.nombre;
              return (
                <div key={sec.id}>
                  {/* Click en la secretaría → fija el ámbito, y el ámbito ya
                      alimenta todos los KPI y gráficos del panel (28.07). */}
                  <Link
                    href={buildScopeHref(sec.id)}
                    className="flex items-center gap-2 mb-4 group w-fit"
                  >
                    <div className="h-6 w-6 rounded-md bg-accent/20 flex items-center justify-center">
                      <span className="text-accent text-xs font-bold">{nombreSec[0]}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      {nombreSec}
                    </h3>
                    <span className="text-xs text-muted">— {pysSec.length} proyectos</span>
                  </Link>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {pysSec.slice(0, 9).map((py) => {
                      const metas = (resumen.metasPorProyecto.get(py.id) ?? []) as Meta[];
                      const av = avancePorProyecto.get(py.id);
                      return <ProyectoCard key={py.id} proyecto={py} metas={metas}
                        avance={av ? { porcentaje: av.pct, estado: av.estado, tieneSeguimiento: av.conDatos > 0 } : undefined} />;
                    })}
                  </div>
                  {pysSec.length > 9 && (
                    <Link href={buildScopeHref(sec.id)}
                      className="inline-block mt-3 text-xs text-primary hover:text-primary-light transition-colors">
                      Ver los {pysSec.length} proyectos →
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
