import { supabase } from "./supabase";
import type { Periodo, UnidadOrganizacional, Proyecto, Meta, Hito, Avance, EstadoSemaforo } from "@/types/database";

// -------------------------------------------------------
// Queries server-side para alimentar las vistas.
// Se usan desde Server Components.
// -------------------------------------------------------

export async function getPeriodoActivo(): Promise<Periodo> {
  const { data, error } = await supabase
    .from("periodo")
    .select("*")
    .eq("activo", true)
    .single();
  if (error) throw error;
  return data as Periodo;
}

export async function getUnidades(): Promise<UnidadOrganizacional[]> {
  const { data, error } = await supabase
    .from("unidad_organizacional")
    .select("*")
    .eq("activa", true)
    .order("nivel")
    .order("orden");
  if (error) throw error;
  return (data ?? []) as UnidadOrganizacional[];
}

export async function getProyectos(periodoId: string): Promise<(Proyecto & { unidad: UnidadOrganizacional })[]> {
  const { data, error } = await supabase
    .from("proyecto")
    .select("*, unidad:unidad_organizacional(*)")
    .eq("periodo_id", periodoId)
    .is("deleted_at", null)
    .order("orden");
  if (error) throw error;
  return (data ?? []) as (Proyecto & { unidad: UnidadOrganizacional })[];
}

export async function getProyecto(id: string): Promise<Proyecto & { unidad: UnidadOrganizacional }> {
  const { data, error } = await supabase
    .from("proyecto")
    .select("*, unidad:unidad_organizacional(*)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as Proyecto & { unidad: UnidadOrganizacional };
}

export async function getMetasPorProyecto(proyectoId: string): Promise<Meta[]> {
  const { data, error } = await supabase
    .from("meta")
    .select("*")
    .eq("proyecto_id", proyectoId)
    .is("deleted_at", null)
    .order("orden");
  if (error) throw error;
  return (data ?? []) as Meta[];
}

export async function getHitosPorProyecto(proyectoId: string): Promise<Hito[]> {
  const { data, error } = await supabase
    .from("hito")
    .select("*")
    .eq("proyecto_id", proyectoId)
    .is("deleted_at", null)
    .order("orden");
  if (error) throw error;
  return (data ?? []) as Hito[];
}

export async function getAvancesPorProyecto(proyectoId: string): Promise<Avance[]> {
  const { data, error } = await supabase
    .from("avance")
    .select("*")
    .eq("proyecto_id", proyectoId)
    .order("fecha_reporte", { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []) as Avance[];
}

export async function getTodosLosHitos(periodoId: string) {
  const { data, error } = await supabase
    .from("hito")
    .select("*, proyecto:proyecto!inner(id, nombre, codigo, periodo_id)")
    .eq("proyecto.periodo_id", periodoId)
    .is("deleted_at", null)
    .order("fecha_esperada");
  if (error) throw error;
  return data ?? [];
}

export async function getResumenDashboard(periodoId: string) {
  const proyectos = await getProyectos(periodoId);
  const proyectoIds = proyectos.map((p) => p.id);

  const { data: metasData, error: metasError } = await supabase
    .from("meta")
    .select("*")
    .in("proyecto_id", proyectoIds)
    .is("deleted_at", null);
  if (metasError) throw metasError;

  const metas = (metasData ?? []) as Meta[];

  const { data: hitosData, error: hitosError } = await supabase
    .from("hito")
    .select("*")
    .in("proyecto_id", proyectoIds)
    .is("deleted_at", null);
  if (hitosError) throw hitosError;

  const hitos = (hitosData ?? []) as Hito[];

  const metasPorProyecto = new Map<string, Meta[]>();
  for (const m of metas) {
    const arr = metasPorProyecto.get(m.proyecto_id) ?? [];
    arr.push(m);
    metasPorProyecto.set(m.proyecto_id, arr);
  }

  const totalMetas = metas.length;
  const metasSemaforo = {
    verde: metas.filter((m) => m.estado_semaforo === "verde").length,
    amarillo: metas.filter((m) => m.estado_semaforo === "amarillo").length,
    rojo: metas.filter((m) => m.estado_semaforo === "rojo").length,
    sin_datos: metas.filter(
      (m) => m.estado_semaforo === "sin_datos" || m.estado_semaforo === "gris"
    ).length,
  };

  // Solo metas que tienen avance reportado cuentan para el porcentaje global
  const metasConAvance = metas.filter(
    (m) => m.ultima_actualizacion != null && m.valor_actual != null
  );

  let porcentajeGlobal: number | null = null;
  if (metasConAvance.length > 0) {
    const cuantiConAvance = metasConAvance.filter(
      (m) => m.tipo_medicion === "cuantitativo" && m.valor_meta != null
    );
    if (cuantiConAvance.length > 0) {
      const suma = cuantiConAvance.reduce((acc, m) => {
        const base = m.valor_linea_base ?? 0;
        const actual = m.valor_actual ?? base;
        const meta = m.valor_meta!;
        const rango = meta - base;
        if (rango === 0) return acc + (actual >= meta ? 100 : 0);
        const invertida = (m.metadata as Record<string, unknown>)?.invertida === true;
        if (invertida) {
          return acc + Math.max(0, Math.min(100, ((base - actual) / (base - meta)) * 100));
        }
        return acc + Math.max(0, Math.min(100, ((actual - base) / rango) * 100));
      }, 0);
      porcentajeGlobal = Math.round(suma / cuantiConAvance.length);
    } else {
      porcentajeGlobal = 0;
    }
  }

  const tieneSeguimiento = metasConAvance.length > 0;

  const hitosCompletados = hitos.filter((h) => h.completado).length;
  const hitosTotal = hitos.length;

  // Proximo hito: solo los que tienen fecha FUTURA (no pasada sin completar)
  const ahora = new Date().toISOString().slice(0, 10);
  const proximoHito = hitos
    .filter((h) => !h.completado && h.fecha_esperada && h.fecha_esperada >= ahora)
    .sort((a, b) => a.fecha_esperada!.localeCompare(b.fecha_esperada!))[0] ?? null;

  // Hitos vencidos: fecha pasada y no completados
  const hitosVencidos = hitos.filter(
    (h) => !h.completado && h.fecha_esperada && h.fecha_esperada < ahora
  ).length;

  return {
    proyectos,
    metas,
    metasPorProyecto,
    hitos,
    totalMetas,
    metasSemaforo,
    porcentajeGlobal,
    tieneSeguimiento,
    hitosCompletados,
    hitosTotal,
    hitosVencidos,
    proximoHito,
  };
}
