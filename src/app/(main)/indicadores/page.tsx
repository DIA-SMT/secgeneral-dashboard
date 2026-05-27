import { getIndicadores, getUnidades, getPeriodoActivo, getProyectos } from "@/lib/queries";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";

export const revalidate = 60;

interface Props {
  searchParams: Promise<{ q?: string; estado?: string; unidad?: string }>;
}

export default async function IndicadoresPage({ searchParams }: Props) {
  const params = await searchParams;
  const [indicadores, periodo, unidades] = await Promise.all([
    getIndicadores(),
    getPeriodoActivo(),
    getUnidades(),
  ]);
  const proyectos = await getProyectos(periodo.id);
  const proyectoUnidad = new Map(proyectos.map((p) => [p.id, p.unidad]));

  type IndicadorJoined = (typeof indicadores)[number] & {
    meta?: {
      id: string;
      nombre: string;
      proyecto?: { id: string; nombre: string; codigo: string | null; unidad_id: string };
    };
  };

  let filtrados = indicadores as IndicadorJoined[];

  if (params.q) {
    const q = params.q.toLowerCase();
    filtrados = filtrados.filter(
      (i) =>
        i.nombre.toLowerCase().includes(q) ||
        i.codigo?.toLowerCase().includes(q) ||
        i.meta?.nombre.toLowerCase().includes(q)
    );
  }
  if (params.estado && params.estado !== "todos") {
    filtrados = filtrados.filter((i) => i.estado_semaforo === params.estado);
  }
  if (params.unidad) {
    const descendientes = (id: string): string[] => {
      const directos = unidades.filter((u) => u.parent_id === id).map((u) => u.id);
      return [id, ...directos.flatMap((d) => descendientes(d))];
    };
    const uIds = new Set(descendientes(params.unidad));
    filtrados = filtrados.filter((i) => {
      const proyectoId = i.meta?.proyecto?.id;
      const py = proyectoId ? proyectos.find((p) => p.id === proyectoId) : null;
      return py ? uIds.has(py.unidad_id) : false;
    });
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Indicadores</h1>
        <p className="text-sm text-muted mt-1">
          {filtrados.length} de {indicadores.length} indicadores
        </p>
      </div>

      {filtrados.length === 0 ? (
        <EmptyState
          title="Sin indicadores cargados"
          description="Los indicadores se cargan desde cada meta dentro del recuadro CARGA DE AVANCE"
          icon="◉"
        />
      ) : (
        <div className="space-y-2">
          {filtrados.map((ind) => {
            const py = ind.meta?.proyecto;
            const unidad = py ? proyectoUnidad.get(py.id) : null;
            return (
              <Link
                key={ind.id}
                href={`/indicadores/${ind.id}`}
                className="flex items-center gap-4 p-3 rounded-xl border border-border bg-surface hover:bg-surface-hover hover:border-primary/30 transition-all group"
              >
                <div className="w-20 shrink-0">
                  <StatusBadge estado={ind.estado_semaforo} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {ind.codigo && (
                      <span className="text-[10px] font-mono text-muted bg-border/50 px-1.5 py-0.5 rounded">
                        {ind.codigo}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {ind.nombre}
                  </h3>
                  {ind.meta && (
                    <p className="text-xs text-muted mt-0.5 line-clamp-1">
                      Meta: {ind.meta.nombre}
                      {unidad && ` · ${unidad.nombre_corto ?? unidad.nombre}`}
                    </p>
                  )}
                </div>
                <div className="hidden md:block text-right shrink-0">
                  {ind.valor_actual != null && ind.valor_objetivo != null ? (
                    <p className="text-sm font-semibold text-foreground">
                      {ind.valor_actual} / {ind.valor_objetivo} {ind.unidad_medida ?? ""}
                    </p>
                  ) : (
                    <span className="text-[10px] text-muted">Sin datos</span>
                  )}
                </div>
                <span className="text-muted group-hover:text-primary transition-colors">→</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
