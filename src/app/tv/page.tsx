import { getPeriodoActivo, getResumenDashboard, getUnidades, getIndicadores } from "@/lib/queries";
import { CircularProgress } from "@/components/ui/circular-progress";
import { formatFecha, formatFechaRelativa, calcularPorcentajeMeta, semaforoColor, calcularEstadoProyecto, calcularAvancePorIndicadores, avanceGlobalPorEstado } from "@/lib/utils";
import type { EstadoSemaforo, Meta, Indicador } from "@/types/database";
import { TvClock } from "./tv-clock";
import Image from "next/image";

export const revalidate = 30;

export default async function TvPage() {
  const periodo = await getPeriodoActivo();
  const resumen = await getResumenDashboard(periodo.id);
  const unidades = await getUnidades();
  const indicadores = await getIndicadores();

  const proyectosActivos = resumen.proyectos.filter((p) => p.estado === "activo");

  // Avance global ponderado por CANTIDAD de proyectos por estado (finalizado
  // 100 %, en ejecución 50 %), calculado desde los indicadores — igual que el
  // Panel Ejecutivo, para que ambas pantallas muestren el mismo número.
  type IndConRel = Indicador & { meta?: { proyecto?: { id: string } } };
  const indByProyecto = new Map<string, Indicador[]>();
  for (const i of indicadores as IndConRel[]) {
    const pyId = i.meta?.proyecto?.id;
    if (pyId) (indByProyecto.get(pyId) ?? indByProyecto.set(pyId, []).get(pyId)!).push(i);
  }
  const distribucionProyectos = { verde: 0, amarillo: 0, rojo: 0, sin_datos: 0 };
  for (const py of proyectosActivos) {
    const av = calcularAvancePorIndicadores(indByProyecto.get(py.id) ?? []);
    if (av.conDatos === 0) distribucionProyectos.sin_datos++;
    else distribucionProyectos[av.estado as "verde" | "amarillo" | "rojo"]++;
  }
  const porcentajeGlobal = avanceGlobalPorEstado(distribucionProyectos);
  const tieneSeguimientoGlobal =
    distribucionProyectos.verde + distribucionProyectos.amarillo + distribucionProyectos.rojo > 0;

  const estadoGlobal: EstadoSemaforo = !tieneSeguimientoGlobal
    ? "sin_datos"
    : porcentajeGlobal != null && porcentajeGlobal >= 70 ? "verde"
    : porcentajeGlobal != null && porcentajeGlobal >= 40 ? "amarillo" : "rojo";

  // Proyectos con seguimiento que estan en rojo
  const proyectosCriticos = proyectosActivos.filter((py) => {
    const metas = (resumen.metasPorProyecto.get(py.id) ?? []) as Meta[];
    const { estado, tieneSeguimiento } = calcularEstadoProyecto(metas);
    return tieneSeguimiento && estado === "rojo";
  });

  const ahora = new Date();
  const ahoraStr = ahora.toISOString().slice(0, 10);

  // Próximos 3 hitos (solo futuros)
  const proximosHitos = resumen.hitos
    .filter((h) => !h.completado && h.fecha_esperada && h.fecha_esperada >= ahoraStr)
    .sort((a, b) => a.fecha_esperada!.localeCompare(b.fecha_esperada!))
    .slice(0, 3);

  // Hitos vencidos (fecha pasada, no completados)
  const hitosVencidos = resumen.hitos.filter(
    (h) => !h.completado && h.fecha_esperada && h.fecha_esperada < ahoraStr
  );

  // Avance por area (subsecretarias nivel 1)
  const unidadesNivel1 = unidades.filter((u) => u.nivel === 1);

  return (
    <div className="fixed inset-0 bg-background overflow-hidden p-8 flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-5">
          <Image
            src="/logos/logoMuni-sm.png"
            alt="PlanIA"
            width={56}
            height={56}
            className="h-14 w-14"
            priority
          />
          <div className="border-l border-border pl-5">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              <span>Plan</span><span className="text-primary">IA</span>
            </h1>
            <p className="text-sm text-muted mt-0.5">{periodo.nombre} · Muni SMT</p>
          </div>
        </div>
        <TvClock />
      </div>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-12 grid-rows-6 gap-5 min-h-0">

        {/* Avance Global */}
        <div className="col-span-3 row-span-3 rounded-2xl border border-border bg-surface flex flex-col items-center justify-center gap-3 p-6">
          {tieneSeguimientoGlobal && porcentajeGlobal != null ? (
            <CircularProgress value={porcentajeGlobal} estado={estadoGlobal} size={180} strokeWidth={12} />
          ) : (
            <div className="h-[180px] w-[180px] rounded-full border-[12px] border-border/30 flex flex-col items-center justify-center">
              <span className="text-3xl font-light text-muted/40">—</span>
              <span className="text-xs text-muted/40 mt-1">Pendiente</span>
            </div>
          )}
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">
              {tieneSeguimientoGlobal ? "Avance Global" : "Seguimiento Pendiente"}
            </p>
            <p className="text-sm text-muted">{periodo.nombre}</p>
          </div>
        </div>

        {/* KPIs grandes */}
        <div className="col-span-3 row-span-1 rounded-2xl border border-border bg-surface flex items-center justify-between px-8">
          <div>
            <p className="text-xs text-muted uppercase tracking-widest">Proyectos</p>
            <p className="text-5xl font-bold text-foreground mt-1">{proyectosActivos.length}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted uppercase tracking-widest">Metas</p>
            <p className="text-5xl font-bold text-foreground mt-1">{resumen.totalMetas}</p>
          </div>
        </div>

        {/* Semaforo visual */}
        <div className="col-span-6 row-span-1 rounded-2xl border border-border bg-surface flex items-center gap-6 px-8">
          <SemaforoBlock color="bg-success" count={resumen.metasSemaforo.verde} label="Al día" total={resumen.totalMetas} />
          <SemaforoBlock color="bg-warning" count={resumen.metasSemaforo.amarillo} label="En ejecución" total={resumen.totalMetas} />
          <SemaforoBlock color="bg-danger" count={resumen.metasSemaforo.rojo} label="En riesgo" total={resumen.totalMetas} />
          <SemaforoBlock color="bg-primary/30" count={resumen.metasSemaforo.sin_datos} label="Pendientes" total={resumen.totalMetas} />
        </div>

        {/* Hitos */}
        <div className="col-span-3 row-span-2 rounded-2xl border border-primary/20 bg-surface flex flex-col items-center justify-center p-6">
          <p className="text-7xl font-bold text-foreground">
            {resumen.hitosCompletados}<span className="text-3xl text-muted font-normal">/{resumen.hitosTotal}</span>
          </p>
          <p className="text-base text-muted mt-2">Hitos cumplidos</p>
          {resumen.hitosVencidos > 0 && (
            <div className="mt-3 px-3 py-1.5 rounded-lg bg-warning/10 border border-warning/20">
              <p className="text-sm text-warning font-semibold">{resumen.hitosVencidos} con fecha vencida</p>
            </div>
          )}
        </div>

        {/* Proyectos criticos O estado de planificacion */}
        <div className="col-span-6 row-span-2 rounded-2xl border border-border bg-surface p-6 flex flex-col">
          {resumen.tieneSeguimiento && proyectosCriticos.length > 0 ? (
            <>
              <div className="flex items-center gap-2 mb-4">
                <span className="h-3 w-3 rounded-full bg-danger" />
                <h2 className="text-lg font-semibold text-foreground">Proyectos en Riesgo</h2>
              </div>
              <div className="flex-1 space-y-3 overflow-hidden">
                {proyectosCriticos.slice(0, 4).map((py) => {
                  const metas = (resumen.metasPorProyecto.get(py.id) ?? []) as Meta[];
                  const { porcentaje } = calcularEstadoProyecto(metas);
                  return (
                    <div key={py.id} className="flex items-center justify-between rounded-xl bg-danger/5 border border-danger/10 px-5 py-3">
                      <div>
                        <p className="text-base font-semibold text-foreground">{py.nombre}</p>
                        <p className="text-sm text-muted">{py.unidad?.nombre_corto}</p>
                      </div>
                      <p className="text-3xl font-bold text-danger">{porcentaje ?? 0}%</p>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <span className="text-primary text-3xl">◎</span>
              </div>
              {resumen.tieneSeguimiento ? (
                <p className="text-xl text-success font-medium">Sin proyectos críticos</p>
              ) : (
                <>
                  <p className="text-xl font-semibold text-foreground">Planificación Lista</p>
                  <p className="text-sm text-muted text-center max-w-md">
                    {proyectosActivos.length} proyectos y {resumen.totalMetas} metas definidas.
                    Aguardando el inicio del seguimiento operativo.
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Avance por area */}
        <div className="col-span-6 row-span-3 rounded-2xl border border-border bg-surface p-6 flex flex-col">
          <h2 className="text-lg font-semibold text-foreground mb-4">Avance por Área</h2>
          <div className="flex-1 space-y-4 overflow-hidden">
            {unidadesNivel1.map((unidad) => {
              const dirs = unidades.filter((u) => u.parent_id === unidad.id);
              const allIds = [unidad.id, ...dirs.map((d) => d.id)];
              const pysUnidad = proyectosActivos.filter((p) => allIds.includes(p.unidad_id));
              const metasUnidad = pysUnidad.flatMap((py) => (resumen.metasPorProyecto.get(py.id) ?? []) as Meta[]);
              const tieneSeg = metasUnidad.some((m) => m.ultima_actualizacion != null);
              const pcts = metasUnidad.map((m) => calcularPorcentajeMeta(m)).filter((p): p is number => p !== null);
              const avg = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0;
              const estado: EstadoSemaforo = !tieneSeg ? "sin_datos" : avg >= 70 ? "verde" : avg >= 40 ? "amarillo" : "rojo";

              return (
                <div key={unidad.id} className="flex items-center gap-4">
                  <div className="w-44 shrink-0">
                    <p className="text-base font-medium text-foreground truncate">{unidad.nombre_corto}</p>
                    <p className="text-xs text-muted">{pysUnidad.length} proyectos</p>
                  </div>
                  <div className="flex-1">
                    <div className="h-4 rounded-full bg-border/50 overflow-hidden">
                      {tieneSeg ? (
                        <div className={`h-full rounded-full transition-all duration-700 ${semaforoColor(estado)}`}
                          style={{ width: `${avg}%` }} />
                      ) : (
                        <div className="h-full w-full bg-border/20 flex items-center justify-center">
                          <span className="text-[9px] text-muted/40 uppercase tracking-wider">pendiente</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-foreground w-16 text-right tabular-nums">
                    {tieneSeg ? `${avg}%` : "—"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Proximos hitos */}
        <div className="col-span-3 row-span-3 rounded-2xl border border-accent/20 bg-surface p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <span className="h-3 w-3 rounded-full bg-accent" />
            <h2 className="text-lg font-semibold text-foreground">Próximos Hitos</h2>
          </div>
          <div className="flex-1 space-y-4">
            {proximosHitos.length > 0 ? proximosHitos.map((hito, i) => {
              const py = resumen.proyectos.find((p) => p.id === hito.proyecto_id);
              return (
                <div key={hito.id}
                  className={`rounded-xl px-5 py-4 border ${i === 0 ? "border-accent/30 bg-accent/5" : "border-border bg-background/50"}`}>
                  <p className={`text-2xl font-bold tabular-nums ${i === 0 ? "text-accent" : "text-foreground"}`}>
                    {formatFecha(hito.fecha_esperada)}
                  </p>
                  <p className="text-base font-medium text-foreground mt-1">{hito.nombre}</p>
                  <p className="text-sm text-muted">{py?.nombre}</p>
                </div>
              );
            }) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-muted">Sin hitos próximos</p>
              </div>
            )}
          </div>
        </div>

        {/* Alertas */}
        <div className="col-span-3 row-span-3 rounded-2xl border border-border bg-surface p-6 flex flex-col">
          <h2 className="text-lg font-semibold text-foreground mb-4">Alertas</h2>
          <div className="flex-1 space-y-3 overflow-y-auto">
            {hitosVencidos.length > 0 ? (
              hitosVencidos.slice(0, 6).map((h) => {
                const py = resumen.proyectos.find((p) => p.id === h.proyecto_id);
                return (
                  <div key={h.id} className="rounded-xl bg-warning/5 border border-warning/20 px-4 py-3">
                    <p className="text-sm font-semibold text-warning">{h.nombre}</p>
                    <p className="text-xs text-muted">{py?.nombre} · Vencido {formatFechaRelativa(h.fecha_esperada)}</p>
                  </div>
                );
              })
            ) : !resumen.tieneSeguimiento ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-muted/60">Sin alertas activas</p>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-base text-success">Todo en orden</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between text-xs text-muted/50">
        <div className="flex items-center gap-3">
          <Image
            src="/logos/Direccion IA logo Secregeneral Dashboard.png"
            alt="Dirección de IA"
            width={80}
            height={28}
            className="logo-auto h-5 w-auto opacity-50"
          />
          <p>Desarrollo realizado por la Dirección de IA — Municipalidad de San Miguel de Tucumán</p>
        </div>
        <p>Datos actualizados automáticamente</p>
      </div>
    </div>
  );
}

function SemaforoBlock({ color, count, label, total }: { color: string; count: number; label: string; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex-1 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-xl ${color} flex items-center justify-center`}>
        <span className="text-lg font-bold text-white">{count}</span>
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted">{pct}%</p>
      </div>
    </div>
  );
}
