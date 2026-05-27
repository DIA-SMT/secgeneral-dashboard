import { getPeriodoActivo, getProyectos, getUnidades } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatFechaRelativa, calcularEstadoProyecto } from "@/lib/utils";
import type { Meta, UnidadOrganizacional } from "@/types/database";
import { ProyectosSearch } from "./search";
import { Suspense } from "react";

export const revalidate = 60;

interface Props {
  searchParams: Promise<{ q?: string; dir?: string; estado?: string }>;
}

export default async function ProyectosPage({ searchParams }: Props) {
  const params = await searchParams;
  const periodo = await getPeriodoActivo();
  const proyectos = await getProyectos(periodo.id);
  const unidades = await getUnidades();

  const { data: todasMetas } = await supabase
    .from("meta")
    .select("*")
    .in("proyecto_id", proyectos.map((p) => p.id))
    .is("deleted_at", null);

  const metasPorPy = new Map<string, Meta[]>();
  for (const m of (todasMetas ?? []) as Meta[]) {
    const arr = metasPorPy.get(m.proyecto_id) ?? [];
    arr.push(m);
    metasPorPy.set(m.proyecto_id, arr);
  }

  // Filtrado por busqueda y direccion
  let filtrados = proyectos;
  if (params.q) {
    const q = params.q.toLowerCase();
    filtrados = filtrados.filter((p) =>
      p.nombre.toLowerCase().includes(q) ||
      p.codigo?.toLowerCase().includes(q) ||
      p.unidad?.nombre_corto?.toLowerCase().includes(q) ||
      p.unidad?.nombre.toLowerCase().includes(q)
    );
  }
  if (params.dir) {
    // Filtrar por la unidad seleccionada Y todos sus descendientes
    const descendientes = (id: string): string[] => {
      const directos = unidades.filter((u) => u.parent_id === id).map((u) => u.id);
      return [id, ...directos.flatMap((d) => descendientes(d))];
    };
    const dirIds = new Set(descendientes(params.dir));
    filtrados = filtrados.filter((p) => dirIds.has(p.unidad_id));
  }
  if (params.estado && params.estado !== "todos") {
    filtrados = filtrados.filter((p) => {
      const metas = metasPorPy.get(p.id) ?? [];
      const { estado } = calcularEstadoProyecto(metas);
      return estado === params.estado;
    });
  }

  // Agrupar por direccion
  const direcciones = unidades.filter((u) => u.nivel === 2);
  const pysPorDir = new Map<string, typeof filtrados>();
  for (const py of filtrados) {
    const arr = pysPorDir.get(py.unidad_id) ?? [];
    arr.push(py);
    pysPorDir.set(py.unidad_id, arr);
  }

  const hayFiltro = !!params.q || !!params.dir || (!!params.estado && params.estado !== "todos");

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Proyectos</h1>
          <p className="text-sm text-muted mt-1">
            {periodo.nombre} — {filtrados.length} de {proyectos.length} proyectos
          </p>
        </div>
        <Suspense>
          <ProyectosSearch unidades={unidades} />
        </Suspense>
      </div>

      {filtrados.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-muted">Sin resultados para esta búsqueda</p>
        </div>
      ) : hayFiltro ? (
        // Flat list when filtered
        <div className="space-y-2">
          {filtrados.map((py) => (
            <ProyectoRow key={py.id} py={py} metas={metasPorPy.get(py.id) ?? []} />
          ))}
        </div>
      ) : (
        // Grouped by direction
        <div className="space-y-6">
          {direcciones.map((dir) => {
            const pys = pysPorDir.get(dir.id);
            if (!pys || pys.length === 0) return null;
            return (
              <div key={dir.id}>
                <div className="flex items-center gap-2 mb-2 sticky top-0 bg-background py-1 z-10">
                  <span className="text-xs font-semibold text-accent uppercase tracking-wider">
                    {dir.nombre_corto ?? dir.nombre}
                  </span>
                  <span className="text-xs text-muted">({pys.length})</span>
                  <div className="flex-1 h-px bg-border/30" />
                </div>
                <div className="space-y-2">
                  {pys.map((py) => (
                    <ProyectoRow key={py.id} py={py} metas={metasPorPy.get(py.id) ?? []} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProyectoRow({ py, metas }: { py: { id: string; codigo: string | null; nombre: string; unidad?: { nombre_corto: string | null; nombre: string } | null }; metas: Meta[] }) {
  const { porcentaje, estado, tieneSeguimiento } = calcularEstadoProyecto(metas);

  return (
    <Link href={`/proyectos/${py.id}`}
      className="flex items-center gap-4 p-3 rounded-xl border border-border bg-surface hover:bg-surface-hover hover:border-primary/30 transition-all group">
      <div className="hidden sm:flex flex-col items-center w-20 shrink-0">
        <StatusBadge estado={estado} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          {py.codigo && (
            <span className="text-[10px] font-mono text-muted bg-border/50 px-1.5 py-0.5 rounded">{py.codigo}</span>
          )}
          <span className="sm:hidden"><StatusBadge estado={estado} /></span>
        </div>
        <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
          {py.nombre}
        </h3>
        <p className="text-xs text-muted mt-0.5">{metas.length} metas</p>
      </div>
      <div className="w-28 hidden md:block">
        {tieneSeguimiento ? (
          <ProgressBar value={porcentaje} estado={estado} size="sm" />
        ) : (
          <div className="flex items-center justify-end">
            <span className="text-[10px] text-primary/50 uppercase">Pendiente</span>
          </div>
        )}
      </div>
      <span className="text-muted group-hover:text-primary transition-colors">→</span>
    </Link>
  );
}
