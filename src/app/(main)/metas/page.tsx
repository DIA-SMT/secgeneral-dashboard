import { getPeriodoActivo, getProyectos, getUnidades, getMetasDelPeriodo, getIndicadores } from "@/lib/queries";
import { StatusBadge } from "@/components/ui/status-badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { calcularPorcentajeMeta, avanceMetaEnPlazo, type AvanceNivel } from "@/lib/utils";
import { PlazoBadge } from "@/components/ui/plazo-badge";
import type { Indicador, UnidadOrganizacional } from "@/types/database";
import Link from "next/link";

export const revalidate = 60;

interface Props {
  searchParams: Promise<{ q?: string; estado?: string; unidad?: string }>;
}

export default async function MetasPage({ searchParams }: Props) {
  const params = await searchParams;
  const [periodo, unidades] = await Promise.all([
    getPeriodoActivo(),
    getUnidades(),
  ]);
  const periodoProyectos = await getProyectos(periodo.id);

  const proyectosMap = new Map(periodoProyectos.map((p) => [p.id, p]));
  let metas = await getMetasDelPeriodo(periodo.id);
  const indicadores = await getIndicadores();

  // Avance de cada meta desde sus indicadores (cascada 16.07).
  const indByMeta = new Map<string, Indicador[]>();
  for (const i of indicadores as Indicador[]) {
    if (i.meta_id) (indByMeta.get(i.meta_id) ?? indByMeta.set(i.meta_id, []).get(i.meta_id)!).push(i);
  }
  const hoy = new Date().toISOString().slice(0, 10);
  const avByMeta = new Map<string, AvanceNivel>();
  for (const m of metas) {
    avByMeta.set(
      m.id,
      avanceMetaEnPlazo(
        indByMeta.get(m.id) ?? [],
        calcularPorcentajeMeta(m),
        { fecha_inicio: m.fecha_inicio, fecha_limite: m.fecha_limite },
        hoy
      )
    );
  }

  if (params.q) {
    const q = params.q.toLowerCase();
    metas = metas.filter((m) => m.nombre.toLowerCase().includes(q));
  }
  if (params.estado && params.estado !== "todos") {
    metas = metas.filter((m) => avByMeta.get(m.id)?.estado === params.estado);
  }
  if (params.unidad) {
    const descendientes = (id: string): string[] => {
      const directos = unidades.filter((u: UnidadOrganizacional) => u.parent_id === id).map((u) => u.id);
      return [id, ...directos.flatMap((d) => descendientes(d))];
    };
    const uIds = new Set(descendientes(params.unidad));
    metas = metas.filter((m) => {
      const py = proyectosMap.get(m.proyecto_id);
      return py ? uIds.has(py.unidad_id) : false;
    });
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Metas</h1>
        <p className="text-sm text-muted mt-1">
          {metas.length} {metas.length === 1 ? "meta" : "metas"} en {periodo.nombre}
        </p>
      </div>

      <div className="space-y-2">
        {metas.map((m) => {
          const py = proyectosMap.get(m.proyecto_id);
          const av = avByMeta.get(m.id);
          const pct = av?.pct ?? null;
          const estado = av?.estado ?? "sin_datos";
          const tieneSeg = (av?.conDatos ?? 0) > 0;
          return (
            <Link
              key={m.id}
              href={`/proyectos/${m.proyecto_id}`}
              className="flex items-center gap-4 p-3 rounded-xl border border-border bg-surface hover:bg-surface-hover hover:border-primary/30 transition-all group"
            >
              <div className="w-20 shrink-0">
                <StatusBadge estado={estado} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                  {m.nombre}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  {py && <p className="text-xs text-muted line-clamp-1">{py.nombre}</p>}
                  <PlazoBadge inicio={m.fecha_inicio} fin={m.fecha_limite} hoy={hoy} mostrarRango={false} />
                </div>
              </div>
              <div className="w-28 hidden md:block">
                {tieneSeg ? (
                  <ProgressBar value={pct} estado={estado} size="sm" />
                ) : (
                  <span className="text-[10px] text-muted">Pendiente</span>
                )}
              </div>
              <span className="text-muted group-hover:text-primary">→</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
