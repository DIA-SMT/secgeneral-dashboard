import { getPeriodoActivo, getProyectos, getUnidades } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/ui/status-badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { calcularPorcentajeMeta } from "@/lib/utils";
import type { Meta, UnidadOrganizacional } from "@/types/database";
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

  const { data: metasData } = await supabase
    .from("meta")
    .select("*")
    .in("proyecto_id", periodoProyectos.map((p) => p.id))
    .is("deleted_at", null);

  const proyectosMap = new Map(periodoProyectos.map((p) => [p.id, p]));
  let metas = (metasData ?? []) as Meta[];

  if (params.q) {
    const q = params.q.toLowerCase();
    metas = metas.filter((m) => m.nombre.toLowerCase().includes(q));
  }
  if (params.estado && params.estado !== "todos") {
    metas = metas.filter((m) => m.estado_semaforo === params.estado);
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
          const pct = calcularPorcentajeMeta(m);
          return (
            <Link
              key={m.id}
              href={`/proyectos/${m.proyecto_id}`}
              className="flex items-center gap-4 p-3 rounded-xl border border-border bg-surface hover:bg-surface-hover hover:border-primary/30 transition-all group"
            >
              <div className="w-20 shrink-0">
                <StatusBadge estado={m.estado_semaforo} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                  {m.nombre}
                </h3>
                {py && (
                  <p className="text-xs text-muted mt-0.5">{py.nombre}</p>
                )}
              </div>
              <div className="w-28 hidden md:block">
                {m.ultima_actualizacion ? (
                  <ProgressBar value={pct} estado={m.estado_semaforo} size="sm" />
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
