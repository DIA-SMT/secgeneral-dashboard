import { getUnidades, getPeriodoActivo, getProyectos } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import type { UnidadOrganizacional, Meta, EstadoSemaforo } from "@/types/database";

export const revalidate = 60;

export default async function EstructuraPage() {
  const [unidades, periodo] = await Promise.all([getUnidades(), getPeriodoActivo()]);
  const proyectos = await getProyectos(periodo.id);

  // Traer metas para estadísticas
  const { data: todasMetas } = await supabase
    .from("meta")
    .select("proyecto_id, estado_semaforo")
    .in("proyecto_id", proyectos.map((p) => p.id))
    .is("deleted_at", null);

  // Agrupar proyectos y metas por unidad
  const pyPorUnidad = new Map<string, typeof proyectos>();
  for (const py of proyectos) {
    const arr = pyPorUnidad.get(py.unidad_id) ?? [];
    arr.push(py);
    pyPorUnidad.set(py.unidad_id, arr);
  }

  const metasPorPy = new Map<string, (typeof todasMetas)>();
  for (const m of todasMetas ?? []) {
    const arr = metasPorPy.get(m.proyecto_id) ?? [];
    arr.push(m);
    metasPorPy.set(m.proyecto_id, arr);
  }

  // Construir árbol
  const raiz = unidades.filter((u) => u.parent_id === null);
  const hijos = (parentId: string) => unidades.filter((u) => u.parent_id === parentId);

  function contarSemaforos(unidadId: string): Record<EstadoSemaforo, number> {
    const counts: Record<EstadoSemaforo, number> = { verde: 0, amarillo: 0, rojo: 0, gris: 0, sin_datos: 0 };
    const pys = pyPorUnidad.get(unidadId) ?? [];
    for (const py of pys) {
      const metas = metasPorPy.get(py.id) ?? [];
      for (const m of metas) {
        const e = (m as { estado_semaforo: EstadoSemaforo }).estado_semaforo;
        counts[e] = (counts[e] || 0) + 1;
      }
    }
    // Incluir hijos recursivamente
    for (const hijo of hijos(unidadId)) {
      const hijoC = contarSemaforos(hijo.id);
      for (const k of Object.keys(counts) as EstadoSemaforo[]) {
        counts[k] += hijoC[k];
      }
    }
    return counts;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Estructura Organizacional</h1>
        <p className="text-sm text-muted mt-1">{unidades.length} unidades organizacionales</p>
      </div>

      <div className="space-y-2">
        {raiz.map((unidad) => (
          <UnidadNode
            key={unidad.id}
            unidad={unidad}
            hijos={hijos}
            pyPorUnidad={pyPorUnidad}
            contarSemaforos={contarSemaforos}
            depth={0}
          />
        ))}
      </div>
    </div>
  );
}

function UnidadNode({
  unidad,
  hijos,
  pyPorUnidad,
  contarSemaforos,
  depth,
}: {
  unidad: UnidadOrganizacional;
  hijos: (id: string) => UnidadOrganizacional[];
  pyPorUnidad: Map<string, { id: string; nombre: string; codigo: string | null }[]>;
  contarSemaforos: (id: string) => Record<EstadoSemaforo, number>;
  depth: number;
}) {
  const children = hijos(unidad.id);
  const proyectos = pyPorUnidad.get(unidad.id) ?? [];
  const semaforos = contarSemaforos(unidad.id);
  const totalMetas = Object.values(semaforos).reduce((a, b) => a + b, 0);

  const bgByDepth = ["bg-surface", "bg-surface/80", "bg-surface/60"];

  return (
    <div className={`rounded-xl border border-border ${bgByDepth[depth] ?? "bg-surface/40"} overflow-hidden`}>
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold
            ${depth === 0 ? "bg-primary/20 text-primary" : depth === 1 ? "bg-accent/20 text-accent" : "bg-border text-muted"}`}>
            {unidad.nombre_corto?.[0] ?? unidad.nombre[0]}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{unidad.nombre}</h3>
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="capitalize">{unidad.tipo}</span>
              {unidad.responsable_nombre && (
                <>
                  <span>·</span>
                  <span>{unidad.responsable_nombre}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Semáforo mini */}
        {totalMetas > 0 && (
          <div className="flex items-center gap-2 text-xs">
            {semaforos.verde > 0 && (
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-success" />{semaforos.verde}
              </span>
            )}
            {semaforos.amarillo > 0 && (
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-warning" />{semaforos.amarillo}
              </span>
            )}
            {semaforos.rojo > 0 && (
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-danger" />{semaforos.rojo}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Proyectos de esta unidad */}
      {proyectos.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-2">
          {proyectos.map((py) => (
            <Link
              key={py.id}
              href={`/proyectos/${py.id}`}
              className="text-xs bg-border/30 hover:bg-primary/10 hover:text-primary px-2.5 py-1 rounded-md transition-colors"
            >
              {py.codigo ?? py.nombre}
            </Link>
          ))}
        </div>
      )}

      {/* Hijos */}
      {children.length > 0 && (
        <div className="px-4 pb-4 space-y-2">
          {children.map((hijo) => (
            <UnidadNode
              key={hijo.id}
              unidad={hijo}
              hijos={hijos}
              pyPorUnidad={pyPorUnidad}
              contarSemaforos={contarSemaforos}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
