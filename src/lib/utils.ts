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
    verde: "Al día",
    amarillo: "En atención",
    rojo: "Atrasado",
    gris: "Inactivo",
    sin_datos: "Pendiente",
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
