import type { EstadoSemaforo } from "@/types/database";

// -------------------------------------------------------
// Helpers de presentacion
// -------------------------------------------------------

export function semaforoColor(estado: EstadoSemaforo): string {
  const map: Record<EstadoSemaforo, string> = {
    verde: "bg-success",
    amarillo: "bg-warning",
    rojo: "bg-danger",
    gris: "bg-muted/40",
    sin_datos: "bg-primary/20",
  };
  return map[estado] ?? "bg-muted/20";
}

// Etiqueta semantica correcta:
// "sin_datos" NO es "Atrasado". Es "Pendiente" — aun no se cargo seguimiento.
export function semaforoLabel(estado: EstadoSemaforo): string {
  const map: Record<EstadoSemaforo, string> = {
    verde: "Finalizado",
    amarillo: "En ejecución",
    rojo: "No iniciado",
    gris: "Inactivo",
    sin_datos: "Sin datos",
  };
  return map[estado] ?? "Pendiente";
}

export function semaforoTextColor(estado: EstadoSemaforo): string {
  const map: Record<EstadoSemaforo, string> = {
    verde: "text-success",
    amarillo: "text-warning",
    rojo: "text-danger",
    gris: "text-muted",
    sin_datos: "text-primary/70",
  };
  return map[estado] ?? "text-muted";
}

// Texto que en realidad representa "sin valor" (placeholders de importación:
// "-", "—", "N/A", "s/d", ".", vacío).
export function textoEsVacio(t: string | null | undefined): boolean {
  const s = (t ?? "").trim();
  return s === "" || /^(-+|—+|–+|n\/?a|s\/?d|\.)$/i.test(s);
}

// Texto que representa un cero ("0", "0%", "0,0").
export function textoEsCero(t: string): boolean {
  return /^0+([.,]0+)?$/.test(t.replace(/[%\s]/g, ""));
}

// Estado del semáforo para mostrar en la UI. La fuente de verdad es
// estado_semaforo (recalculado al cargar), pero acá se blindan las reglas del
// 16.07 por si quedara algún dato viejo desalineado:
//   * valor numérico → lo que tenga guardado (0 ya se guarda como rojo)
//   * texto "No" o "0" → No iniciado (rojo)
//   * sin valor cargado / placeholder → Sin datos (aunque tenga objetivo)
//   * resto → lo que tenga guardado
export function estadoVisualIndicador(ind: {
  estado_semaforo: EstadoSemaforo;
  valor_actual: number | null;
  valor_actual_texto: string | null;
}): EstadoSemaforo {
  if (ind.valor_actual != null) return ind.estado_semaforo;
  const s = (ind.valor_actual_texto ?? "").trim();
  if (textoEsVacio(s)) return "sin_datos";
  if (/^no$/i.test(s) || textoEsCero(s)) return "rojo";
  return ind.estado_semaforo;
}

export function formatFechaRelativa(fecha: string | null): string {
  if (!fecha) return "Sin fecha";
  const ahora = new Date();
  const target = new Date(fecha);
  const diffMs = ahora.getTime() - target.getTime();
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDias < 0) {
    const diasFaltan = Math.abs(diffDias);
    if (diasFaltan === 0) return "Hoy";
    if (diasFaltan === 1) return "Mañana";
    if (diasFaltan < 7) return `En ${diasFaltan} días`;
    if (diasFaltan < 30) return `En ${Math.floor(diasFaltan / 7)} sem.`;
    return `En ${Math.floor(diasFaltan / 30)} mes(es)`;
  }
  if (diffDias === 0) return "Hoy";
  if (diffDias === 1) return "Ayer";
  if (diffDias < 7) return `Hace ${diffDias} días`;
  if (diffDias < 30) return `Hace ${Math.floor(diffDias / 7)} sem.`;
  return `Hace ${Math.floor(diffDias / 30)} mes(es)`;
}

export function formatFecha(fecha: string | null): string {
  if (!fecha) return "—";
  return new Date(fecha).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function calcularPorcentajeMeta(meta: {
  tipo_medicion: string;
  valor_actual: number | null;
  valor_meta: number | null;
  valor_linea_base: number | null;
  nivel_actual: string | null;
  escala_cualitativa: { niveles: { clave: string; valor_numerico: number }[] } | null;
  metadata: Record<string, unknown>;
}): number | null {
  // Si no hay valor actual reportado, no hay porcentaje calculable
  if (meta.valor_actual == null && meta.nivel_actual == null) return null;

  if (meta.tipo_medicion === "cuantitativo") {
    if (meta.valor_meta == null || meta.valor_actual == null) return null;
    const base = meta.valor_linea_base ?? 0;
    const rango = meta.valor_meta - base;
    if (rango === 0) return meta.valor_actual >= meta.valor_meta ? 100 : 0;
    const invertida = meta.metadata?.invertida === true;
    if (invertida) {
      return Math.max(0, Math.min(100, Math.round(((base - meta.valor_actual) / (base - meta.valor_meta)) * 100)));
    }
    return Math.max(0, Math.min(100, Math.round(((meta.valor_actual - base) / rango) * 100)));
  }

  if (meta.tipo_medicion === "cualitativo" && meta.escala_cualitativa && meta.nivel_actual) {
    const nivel = meta.escala_cualitativa.niveles.find(
      (n) => n.clave === meta.nivel_actual
    );
    return nivel?.valor_numerico ?? null;
  }

  if (meta.tipo_medicion === "hito_unico") {
    return meta.valor_actual === 1 ? 100 : 0;
  }

  return null;
}

// Determina si un proyecto tiene algun avance cargado
export function proyectoTieneSeguimiento(metas: { ultima_actualizacion: string | null }[]): boolean {
  return metas.some((m) => m.ultima_actualizacion != null);
}

// Calcula el estado de un proyecto a partir de sus metas
export function calcularEstadoProyecto(metas: {
  estado_semaforo: EstadoSemaforo;
  ultima_actualizacion: string | null;
  tipo_medicion: string;
  valor_actual: number | null;
  valor_meta: number | null;
  valor_linea_base: number | null;
  nivel_actual: string | null;
  escala_cualitativa: { niveles: { clave: string; valor_numerico: number }[] } | null;
  metadata: Record<string, unknown>;
}[]): { porcentaje: number | null; estado: EstadoSemaforo; tieneSeguimiento: boolean } {
  if (metas.length === 0) return { porcentaje: null, estado: "sin_datos", tieneSeguimiento: false };

  const tieneSeguimiento = metas.some((m) => m.ultima_actualizacion != null);

  if (!tieneSeguimiento) {
    return { porcentaje: null, estado: "sin_datos", tieneSeguimiento: false };
  }

  const porcentajes = metas
    .map((m) => calcularPorcentajeMeta(m))
    .filter((p): p is number => p !== null);

  if (porcentajes.length === 0) return { porcentaje: 0, estado: "sin_datos", tieneSeguimiento };

  const avg = Math.round(porcentajes.reduce((a, b) => a + b, 0) / porcentajes.length);
  const rojas = metas.filter((m) => m.estado_semaforo === "rojo").length;

  let estado: EstadoSemaforo;
  if (rojas > 0) estado = "rojo";
  else if (avg >= 70) estado = "verde";
  else if (avg >= 40) estado = "amarillo";
  else estado = "rojo";

  return { porcentaje: avg, estado, tieneSeguimiento };
}

// Calcula el grado de avance de un proyecto a partir de SUS INDICADORES.
// Cada indicador aporta:
//   - numérico con objetivo: min(100, valor/objetivo*100)
//   - texto/cualitativo: según su estado_semaforo (verde=100, amarillo=50, rojo=10)
//   - sin datos: no cuenta
export function calcularAvancePorIndicadores(
  indicadores: {
    valor_actual: number | null;
    valor_objetivo: number | null;
    valor_actual_texto?: string | null;
    estado_semaforo: EstadoSemaforo;
  }[]
): { porcentaje: number | null; conDatos: number; total: number; estado: EstadoSemaforo } {
  const total = indicadores.length;
  if (total === 0) return { porcentaje: null, conDatos: 0, total: 0, estado: "sin_datos" };

  const porEstado = (e: EstadoSemaforo) =>
    e === "verde" ? 100 : e === "rojo" ? 10 : 50; // amarillo/sin_datos → 50 (en ejecución)

  let suma = 0;
  let cnt = 0;
  for (const i of indicadores) {
    if (i.valor_actual != null && i.valor_objetivo != null) {
      // Numérico con objetivo → porcentaje real
      const pct = i.valor_objetivo === 0
        ? (i.valor_actual >= i.valor_objetivo ? 100 : 0)
        : Math.max(0, Math.min(100, (i.valor_actual / i.valor_objetivo) * 100));
      suma += pct;
      cnt++;
    } else if (i.valor_actual != null) {
      // Numérico SIN objetivo cargado: igual cuenta como avance reportado
      suma += porEstado(i.estado_semaforo);
      cnt++;
    } else if (!textoEsVacio(i.valor_actual_texto)) {
      // Texto (Sí/No, Realizado) → según su semáforo. Los placeholders ("-",
      // "N/A", etc.) no cuentan como dato.
      suma += porEstado(i.estado_semaforo);
      cnt++;
    }
  }

  if (cnt === 0) return { porcentaje: null, conDatos: 0, total, estado: "sin_datos" };

  const avg = Math.round(suma / cnt);
  const estado: EstadoSemaforo = avg >= 70 ? "verde" : avg >= 40 ? "amarillo" : "rojo";
  return { porcentaje: avg, conDatos: cnt, total, estado };
}

// Avance global a partir de la CANTIDAD de proyectos por estado (no del avance
// individual de cada uno): finalizado = 100 %, en ejecución = 50 %, sobre el
// total de proyectos (los "sin datos" cuentan como 0 %). Devuelve null si el
// conjunto está vacío.
export function avanceGlobalPorEstado(dist: {
  verde: number;
  amarillo: number;
  rojo: number;
  sin_datos: number;
}): number | null {
  const total = dist.verde + dist.amarillo + dist.rojo + dist.sin_datos;
  if (total === 0) return null;
  return Math.round((dist.verde * 100 + dist.amarillo * 50) / total);
}

// Devuelve el subárbol de unidades (raíz + descendientes) a partir de un id.
// Si rootId es null, devuelve todas. Útil para acotar filtros al área del usuario.
export function subtreeUnidades<T extends { id: string; parent_id: string | null }>(
  unidades: T[],
  rootId: string | null
): T[] {
  if (!rootId) return unidades;
  const hijos = (id: string): string[] => {
    const directos = unidades.filter((u) => u.parent_id === id).map((u) => u.id);
    return [id, ...directos.flatMap((d) => hijos(d))];
  };
  const ids = new Set(hijos(rootId));
  return unidades.filter((u) => ids.has(u.id));
}

export function esRolGlobal(rol: string | null | undefined): boolean {
  return rol === "intendenta" || rol === "admin_funcional" || rol === "admin_tecnico" || rol == null;
}
