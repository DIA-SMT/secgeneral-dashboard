import { getPeriodoActivo, getProyectos, getUnidades } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import type { Meta, UnidadOrganizacional } from "@/types/database";
import { CargaBatch } from "./carga-batch";

export const revalidate = 0; // Siempre fresco para carga

export default async function CargaPage() {
  const periodo = await getPeriodoActivo();
  const proyectos = await getProyectos(periodo.id);
  const unidades = await getUnidades();

  const proyectoIds = proyectos.filter((p) => p.estado === "activo").map((p) => p.id);

  const { data: metasData } = await supabase
    .from("meta")
    .select("*")
    .in("proyecto_id", proyectoIds)
    .is("deleted_at", null)
    .order("orden");

  const metas = (metasData ?? []) as Meta[];
  const direcciones = unidades.filter((u) => u.nivel === 2);

  // Agrupar por proyecto
  const metasPorPy = new Map<string, Meta[]>();
  for (const m of metas) {
    const arr = metasPorPy.get(m.proyecto_id) ?? [];
    arr.push(m);
    metasPorPy.set(m.proyecto_id, arr);
  }

  // Serializar para client component
  const proyectosData = proyectos
    .filter((p) => p.estado === "activo")
    .map((p) => ({
      id: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      unidad_id: p.unidad_id,
      unidad_nombre: p.unidad?.nombre_corto ?? p.unidad?.nombre ?? "",
      metas: metasPorPy.get(p.id) ?? [],
    }));

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Carga de Avances</h1>
        <p className="text-sm text-muted mt-1">
          {periodo.nombre} — Carga rápida por área
        </p>
      </div>

      <CargaBatch
        proyectos={proyectosData}
        direcciones={direcciones}
      />
    </div>
  );
}
