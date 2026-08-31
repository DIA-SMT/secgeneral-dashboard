/**
 * Plan Rector: lectura de la jerarquía y de las imputaciones de proyectos.
 *
 * La jerarquía tiene cuatro niveles y vive en una sola tabla con `parent_id`,
 * igual que `unidad_organizacional`:
 *   área de intervención (5) → eje (17) → objetivo (19) → línea (63)
 * Los ODS cuelgan del eje, no de la línea: así viene el documento.
 *
 * Acá NO se calculan porcentajes todavía. El cálculo espera tres definiciones
 * del cliente (si un proyecto puede colgar de varios ejes, si "sin vínculo" es
 * válido, y a qué nivel hace falta el vínculo). Ver PLAN_RECTOR.md.
 */
import { cache } from "react";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  rotuloCorto,
  type TipoNodoRector,
  type NodoRector,
  type NodoRectorArbol,
  type ImputacionProyecto,
} from "./plan-rector-comun";

// Los tipos y los helpers puros viven en plan-rector-comun.ts para que los
// componentes con "use client" puedan importarlos sin arrastrar este módulo
// (que usa getSupabaseServer) al bundle del browser.
export type {
  TipoNodoRector, EstadoVinculoRector, NodoRector, NodoRectorArbol, ImputacionProyecto,
} from "./plan-rector-comun";
export { recortar, rotuloCorto, rotuloCobertura } from "./plan-rector-comun";

/**
 * true si el error es "esa tabla no existe".
 *
 * El código se despliega solo (Vercel sigue a `main`) y las migraciones las
 * aplica una persona aparte, así que entre un deploy y el otro paso hay una
 * ventana en la que estas tablas no existen todavía. Sin esto, `/plan-rector`
 * tiraría 500 y la ficha de cualquier proyecto se caería con ella.
 *
 * 42P01 es `undefined_table` de Postgres; PGRST205 es lo que devuelve PostgREST
 * cuando la tabla no está en su schema cache.
 */
function tablaInexistente(e: unknown): boolean {
  const err = e as { code?: string; message?: string } | null;
  if (!err) return false;
  return (
    err.code === "42P01" ||
    err.code === "PGRST205" ||
    /relation .* does not exist|could not find the table/i.test(err.message ?? "")
  );
}

const ARBOL_VACIO = { arbol: [] as NodoRectorArbol[], totalNodos: 0 };

// ---------------------------------------------------------------------------
// Jerarquía
// ---------------------------------------------------------------------------

/**
 * Árbol completo con el conteo de proyectos imputados por nodo.
 *
 * Son 104 nodos: se traen todos de una y se arma el árbol en memoria, que es
 * más barato que cuatro consultas anidadas.
 */
export const getPlanRectorArbol = cache(async function getPlanRectorArbol(): Promise<{
  arbol: NodoRectorArbol[];
  totalNodos: number;
}> {
  const supabase = await getSupabaseServer();

  const [nodosRes, odsRes, vinculosRes] = await Promise.all([
    supabase
      .from("plan_rector_nodo")
      .select("id, parent_id, tipo, nivel, clave_estable, codigo_cliente, nombre, nombre_corto, orden, activa")
      .eq("activa", true)
      .order("nivel")
      .order("orden"),
    supabase
      .from("pr_eje_ods")
      .select("nodo_id, ods:ods(numero, nombre)"),
    // Solo los confirmados cuentan como imputación firme. Los propuestos se
    // muestran aparte, en la pantalla de imputación.
    supabase
      .from("proyecto_plan_rector")
      .select("nodo_id")
      .eq("estado", "confirmado"),
  ]);

  if (nodosRes.error) {
    if (tablaInexistente(nodosRes.error)) return ARBOL_VACIO;
    throw nodosRes.error;
  }

  const nodos = (nodosRes.data ?? []) as NodoRector[];

  const odsPorNodo = new Map<string, { numero: number; nombre: string }[]>();
  /* eslint-disable @typescript-eslint/no-explicit-any */
  for (const fila of (odsRes.data ?? []) as any[]) {
    const o = fila.ods;
    if (!o) continue;
    if (!odsPorNodo.has(fila.nodo_id)) odsPorNodo.set(fila.nodo_id, []);
    odsPorNodo.get(fila.nodo_id)!.push({ numero: o.numero, nombre: o.nombre });
  }
  for (const lista of odsPorNodo.values()) lista.sort((a, b) => a.numero - b.numero);

  const imputadosPorNodo = new Map<string, number>();
  for (const v of (vinculosRes.data ?? []) as { nodo_id: string }[]) {
    imputadosPorNodo.set(v.nodo_id, (imputadosPorNodo.get(v.nodo_id) ?? 0) + 1);
  }

  // Índice y armado del árbol.
  const porId = new Map<string, NodoRectorArbol>();
  for (const n of nodos) {
    porId.set(n.id, {
      ...n,
      hijos: [],
      ods: odsPorNodo.get(n.id) ?? [],
      imputados: imputadosPorNodo.get(n.id) ?? 0,
      imputadosSubarbol: 0,
    });
  }
  const raices: NodoRectorArbol[] = [];
  for (const n of porId.values()) {
    if (n.parent_id) {
      // Si el padre está inactivo no viene en la consulta: el hijo se cuelga de
      // la raíz en vez de desaparecer, así una baja a medias se ve.
      const padre = porId.get(n.parent_id);
      if (padre) padre.hijos.push(n);
      else raices.push(n);
    } else {
      raices.push(n);
    }
  }

  const ordenar = (lista: NodoRectorArbol[]) => {
    lista.sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, "es"));
    for (const n of lista) ordenar(n.hijos);
  };
  ordenar(raices);

  // Acumulado del subárbol, de abajo hacia arriba.
  const acumular = (n: NodoRectorArbol): number => {
    n.imputadosSubarbol = n.imputados + n.hijos.reduce((a, h) => a + acumular(h), 0);
    return n.imputadosSubarbol;
  };
  for (const r of raices) acumular(r);

  return { arbol: raices, totalNodos: nodos.length };
});

/** Lista plana de nodos imputables (eje, objetivo o línea) con su ruta legible. */
export const getNodosImputables = cache(async function getNodosImputables(): Promise<
  { id: string; tipo: TipoNodoRector; ruta: string; nombre: string }[]
> {
  const { arbol } = await getPlanRectorArbol();
  const salida: { id: string; tipo: TipoNodoRector; ruta: string; nombre: string }[] = [];

  const recorrer = (n: NodoRectorArbol, prefijo: string[]) => {
    const etiqueta = rotuloCorto(n);
    const ruta = [...prefijo, etiqueta];
    // El nivel 0 no es imputable: el área se deriva subiendo el árbol, así no
    // hay dos formas de decir lo mismo. La base también lo rechaza.
    if (n.tipo !== "area_intervencion") {
      salida.push({ id: n.id, tipo: n.tipo, ruta: ruta.join(" · "), nombre: n.nombre });
    }
    for (const h of n.hijos) recorrer(h, ruta);
  };
  for (const r of arbol) recorrer(r, []);
  return salida;
});




// ---------------------------------------------------------------------------
// Imputaciones de un proyecto
// ---------------------------------------------------------------------------

export async function getImputacionesDeProyecto(
  proyectoId: string
): Promise<{ imputaciones: ImputacionProyecto[]; excluido: { motivo: string } | null }> {
  const supabase = await getSupabaseServer();

  const [vinculosRes, exclusionRes, nodosRes] = await Promise.all([
    supabase
      .from("proyecto_plan_rector")
      .select("id, nodo_id, estado, principal, justificacion, confianza, created_at")
      .eq("proyecto_id", proyectoId)
      .order("created_at", { ascending: false }),
    supabase
      .from("proyecto_pr_exclusion")
      .select("motivo")
      .eq("proyecto_id", proyectoId)
      .maybeSingle(),
    getNodosImputables(),
  ]);

  if (vinculosRes.error) {
    if (tablaInexistente(vinculosRes.error)) return { imputaciones: [], excluido: null };
    throw vinculosRes.error;
  }

  const rutaPorId = new Map(nodosRes.map((n) => [n.id, n.ruta]));
  const imputaciones = ((vinculosRes.data ?? []) as Omit<ImputacionProyecto, "ruta">[]).map((v) => ({
    ...v,
    ruta: rutaPorId.get(v.nodo_id) ?? "(nodo dado de baja)",
  }));

  const excluido = (exclusionRes.data as { motivo: string } | null) ?? null;
  return { imputaciones, excluido };
}

/**
 * Cobertura global: cuántos proyectos activos del período ya tienen una
 * imputación confirmada o una exclusión declarada.
 *
 * Es el número que importa en los primeros meses, más que cualquier porcentaje
 * de avance: mientras la cobertura sea baja, el % de un ámbito habla de una
 * fracción del POA y no del POA.
 */
export async function getCoberturaPlanRector(periodoId: string): Promise<{
  activos: number;
  imputados: number;
  excluidos: number;
  pendientes: number;
  pct: number;
}> {
  const supabase = await getSupabaseServer();

  const { data: proyectos, error } = await supabase
    .from("proyecto")
    .select("id")
    .eq("periodo_id", periodoId)
    .eq("estado", "activo")
    .is("deleted_at", null);
  if (error) throw error;

  const ids = new Set((proyectos ?? []).map((p) => (p as { id: string }).id));
  if (ids.size === 0) return { activos: 0, imputados: 0, excluidos: 0, pendientes: 0, pct: 0 };

  const [vinculosRes, exclusionesRes] = await Promise.all([
    supabase.from("proyecto_plan_rector").select("proyecto_id").eq("estado", "confirmado"),
    supabase.from("proyecto_pr_exclusion").select("proyecto_id"),
  ]);

  if (tablaInexistente(vinculosRes.error) || tablaInexistente(exclusionesRes.error)) {
    return { activos: ids.size, imputados: 0, excluidos: 0, pendientes: ids.size, pct: 0 };
  }

  // Un proyecto puede tener varias imputaciones confirmadas: para cobertura
  // cuenta una sola vez.
  const imputadosSet = new Set(
    ((vinculosRes.data ?? []) as { proyecto_id: string }[])
      .map((v) => v.proyecto_id)
      .filter((id) => ids.has(id))
  );
  const excluidosSet = new Set(
    ((exclusionesRes.data ?? []) as { proyecto_id: string }[])
      .map((v) => v.proyecto_id)
      .filter((id) => ids.has(id) && !imputadosSet.has(id))
  );

  const resueltos = imputadosSet.size + excluidosSet.size;
  return {
    activos: ids.size,
    imputados: imputadosSet.size,
    excluidos: excluidosSet.size,
    pendientes: ids.size - resueltos,
    pct: Math.round((resueltos / ids.size) * 100),
  };
}
