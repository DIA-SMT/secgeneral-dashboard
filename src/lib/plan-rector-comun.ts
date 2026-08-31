/**
 * Plan Rector: tipos y helpers PUROS, compartidos por cliente y servidor.
 *
 * Va aparte de `plan-rector.ts` a propósito: ese módulo importa
 * `getSupabaseServer`, que usa `next/headers` y es solo de servidor. Si un
 * componente con "use client" importa de ahí —aunque sea solo un helper de
 * texto— el build lo arrastra al bundle del browser y falla.
 *
 * Regla: acá nada que toque la base, el request ni cookies.
 */

export type TipoNodoRector = "area_intervencion" | "eje" | "objetivo" | "linea";
export type EstadoVinculoRector = "propuesto" | "confirmado" | "rechazado";

export interface NodoRector {
  id: string;
  parent_id: string | null;
  tipo: TipoNodoRector;
  nivel: number;
  clave_estable: string;
  codigo_cliente: string | null;
  nombre: string;
  nombre_corto: string | null;
  orden: number;
  activa: boolean;
}

export interface NodoRectorArbol extends NodoRector {
  hijos: NodoRectorArbol[];
  /** Solo en los ejes: los ODS que declara el documento. */
  ods: { numero: number; nombre: string }[];
  /** Proyectos imputados a ESTE nodo (no a sus hijos). */
  imputados: number;
  /** Proyectos imputados a este nodo o a cualquier descendiente. */
  imputadosSubarbol: number;
}

export interface ImputacionProyecto {
  id: string;
  nodo_id: string;
  estado: EstadoVinculoRector;
  principal: boolean;
  justificacion: string | null;
  confianza: number | null;
  created_at: string;
  /** Ruta legible: "A2 · Eje 4 · Limpieza y saneamiento…" */
  ruta: string;
}

export function recortar(s: string, max: number): string {
  const t = s.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

/** Rótulo breve para las rutas y los selectores. */
export function rotuloCorto(n: {
  tipo: TipoNodoRector;
  codigo_cliente: string | null;
  nombre: string;
  nombre_corto: string | null;
}): string {
  if (n.tipo === "area_intervencion") return n.codigo_cliente ?? n.nombre_corto ?? n.nombre;
  if (n.tipo === "eje") return `Eje ${n.codigo_cliente ?? ""}`.trim();
  if (n.tipo === "objetivo") return n.codigo_cliente ? `Obj. ${n.codigo_cliente}` : "Objetivo";
  return recortar(n.nombre, 60);
}

/**
 * Etiquetas propias del Plan Rector. No se reusa `semaforoLabel`, que para
 * 'gris' devuelve "Inactivo": acá un nodo sin proyectos no está inactivo, le
 * falta imputación.
 */
export function rotuloCobertura(imputados: number): string {
  if (imputados === 0) return "Sin proyectos imputados";
  return imputados === 1 ? "1 proyecto imputado" : `${imputados} proyectos imputados`;
}
