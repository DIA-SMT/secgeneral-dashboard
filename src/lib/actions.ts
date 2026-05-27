"use server";

import { supabase } from "./supabase";
import { revalidatePath } from "next/cache";
import { getSupabaseServer } from "./supabase/server";
import { requireValidacionSobreUnidad, requireRol } from "./auth";
import type { RolUsuario } from "@/types/database";

// -------------------------------------------------------
// Server Actions: Agenda Semanal
// -------------------------------------------------------

interface ActividadInput {
  dia_semana: number;
  orden: number;
  es_feriado: boolean;
  actividad: string;
  lugar?: string | null;
  horario?: string | null;
  observacion?: string | null;
}

export async function guardarAgendaSemana(input: {
  unidad_id: string;
  fecha_lunes: string;
  formato_libre?: string | null;
  actividades: ActividadInput[];
}) {
  const { unidad_id, fecha_lunes, formato_libre, actividades } = input;

  // Upsert de la semana
  const { data: semana, error: semanaError } = await supabase
    .from("agenda_semana")
    .upsert({ unidad_id, fecha_lunes, formato_libre: formato_libre ?? null }, { onConflict: "unidad_id,fecha_lunes" })
    .select()
    .single();

  if (semanaError || !semana) return { success: false, error: semanaError?.message ?? "Error al guardar semana" };

  const semanaId = (semana as { id: string }).id;

  // Borrar actividades anteriores
  await supabase.from("agenda_actividad").delete().eq("agenda_semana_id", semanaId);

  // Insertar nuevas
  if (actividades.length > 0) {
    const rows = actividades.map((a) => ({
      agenda_semana_id: semanaId,
      dia_semana: a.dia_semana,
      orden: a.orden,
      es_feriado: a.es_feriado,
      actividad: a.actividad,
      lugar: a.lugar ?? null,
      horario: a.horario ?? null,
      observacion: a.observacion ?? null,
    }));
    const { error: actError } = await supabase.from("agenda_actividad").insert(rows);
    if (actError) return { success: false, error: actError.message };
  }

  revalidatePath("/agenda");
  revalidatePath(`/agenda/${unidad_id}/${fecha_lunes}`);
  revalidatePath("/agenda/totem");

  return { success: true };
}

// -------------------------------------------------------
// Helper: recalcula estado_semaforo a partir del valor y objetivo
// -------------------------------------------------------
function calcularSemaforo(valor: number | null, objetivo: number | null, base: number = 0, invertida = false): string {
  if (valor == null || objetivo == null) return "sin_datos";
  const rango = objetivo - base;
  if (rango === 0) return valor >= objetivo ? "verde" : "rojo";
  const pctRaw = invertida
    ? ((base - valor) / (base - objetivo)) * 100
    : ((valor - base) / rango) * 100;
  const pct = Math.max(0, Math.min(100, pctRaw));
  return pct >= 80 ? "verde" : pct >= 50 ? "amarillo" : "rojo";
}

// -------------------------------------------------------
// Server Action: Cargar avance sobre una meta
// -------------------------------------------------------
// Inserta un registro en la tabla avance (append-only)
// y actualiza los campos materializados en meta.
//
// Esta es la unica forma controlada de actualizar
// meta.valor_actual, meta.nivel_actual, meta.estado_semaforo
// y meta.ultima_actualizacion.
// -------------------------------------------------------

interface CargarAvanceInput {
  proyecto_id: string;
  meta_id: string;
  tipo_medicion: "cuantitativo" | "cualitativo" | "hito_unico";
  valor_numerico?: number | null;
  valor_cualitativo?: string | null;
  observacion?: string | null;
}

export async function cargarAvance(input: CargarAvanceInput) {
  const { proyecto_id, meta_id, tipo_medicion, valor_numerico, valor_cualitativo, observacion } = input;

  // 1. Insertar avance (append-only)
  const { error: avanceError } = await supabase.from("avance").insert({
    proyecto_id,
    meta_id,
    fuente: "manual",
    valor_numerico: valor_numerico ?? null,
    valor_cualitativo: valor_cualitativo ?? null,
    observacion: observacion || null,
  });

  if (avanceError) {
    return { success: false, error: avanceError.message };
  }

  // 2. Actualizar campos materializados en meta
  // Estos campos son DERIVADOS — se actualizan aqui como proceso controlado.
  const ahora = new Date().toISOString();

  if (tipo_medicion === "cuantitativo" && valor_numerico != null) {
    // Obtener meta para calcular semaforo
    const { data: meta } = await supabase
      .from("meta")
      .select("valor_meta, valor_linea_base, fecha_limite, metadata")
      .eq("id", meta_id)
      .single();

    let estado_semaforo = "sin_datos";
    if (meta && meta.valor_meta != null) {
      const base = (meta.valor_linea_base as number) ?? 0;
      const objetivo = meta.valor_meta as number;
      const invertida = (meta.metadata as Record<string, unknown>)?.invertida === true;
      let pct: number;
      if (invertida) {
        pct = objetivo !== base ? ((base - valor_numerico) / (base - objetivo)) * 100 : 0;
      } else {
        pct = objetivo !== base ? ((valor_numerico - base) / (objetivo - base)) * 100 : 0;
      }
      pct = Math.max(0, Math.min(100, pct));
      estado_semaforo = pct >= 80 ? "verde" : pct >= 50 ? "amarillo" : "rojo";
    }

    await supabase
      .from("meta")
      .update({
        valor_actual: valor_numerico,
        estado_semaforo,
        ultima_actualizacion: ahora,
      })
      .eq("id", meta_id);
  }

  if (tipo_medicion === "cualitativo" && valor_cualitativo) {
    // Obtener escala para derivar semaforo
    const { data: meta } = await supabase
      .from("meta")
      .select("escala_cualitativa")
      .eq("id", meta_id)
      .single();

    let estado_semaforo = "sin_datos";
    if (meta?.escala_cualitativa) {
      const escala = meta.escala_cualitativa as { niveles: { clave: string; valor_numerico: number }[] };
      const nivel = escala.niveles.find((n) => n.clave === valor_cualitativo);
      if (nivel) {
        const pct = nivel.valor_numerico;
        estado_semaforo = pct >= 80 ? "verde" : pct >= 50 ? "amarillo" : pct > 0 ? "rojo" : "sin_datos";
      }
    }

    await supabase
      .from("meta")
      .update({
        nivel_actual: valor_cualitativo,
        estado_semaforo,
        ultima_actualizacion: ahora,
      })
      .eq("id", meta_id);
  }

  if (tipo_medicion === "hito_unico") {
    await supabase
      .from("meta")
      .update({
        valor_actual: 1,
        estado_semaforo: "verde",
        ultima_actualizacion: ahora,
      })
      .eq("id", meta_id);
  }

  // 3. Revalidar las paginas que muestran estos datos
  revalidatePath(`/proyectos/${proyecto_id}`);
  revalidatePath("/dashboard");
  revalidatePath("/tv");

  return { success: true };
}

// -------------------------------------------------------
// Server Action: Validar un avance (Subsec → 'validado')
// -------------------------------------------------------
export async function validarAvance(avance_id: string) {
  const sb = await getSupabaseServer();
  const { data: av } = await sb
    .from("avance")
    .select("id, proyecto_id, proyecto:proyecto(unidad_id)")
    .eq("id", avance_id)
    .single();
  if (!av) return { success: false, error: "Avance no encontrado" };
  const proyecto = (av as { proyecto?: { unidad_id: string } | { unidad_id: string }[] }).proyecto;
  const unidadId = Array.isArray(proyecto) ? proyecto[0]?.unidad_id : proyecto?.unidad_id;
  if (!unidadId) return { success: false, error: "Proyecto sin unidad" };

  try {
    await requireValidacionSobreUnidad(unidadId);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  const { data: userData } = await sb.auth.getUser();
  const { error } = await sb
    .from("avance")
    .update({
      estado_validacion: "validado",
      validado_por: userData.user?.id ?? null,
      validado_at: new Date().toISOString(),
      observacion_validacion: null,
    })
    .eq("id", avance_id);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/proyectos/${(av as { proyecto_id: string }).proyecto_id}`);
  revalidatePath("/validaciones");
  revalidatePath("/dashboard");
  return { success: true };
}

// -------------------------------------------------------
// Server Action: Observar un avance (Subsec → 'observado' + motivo)
// -------------------------------------------------------
export async function observarAvance(avance_id: string, observacion: string) {
  if (!observacion || !observacion.trim()) {
    return { success: false, error: "La observación es obligatoria" };
  }
  const sb = await getSupabaseServer();
  const { data: av } = await sb
    .from("avance")
    .select("id, proyecto_id, proyecto:proyecto(unidad_id)")
    .eq("id", avance_id)
    .single();
  if (!av) return { success: false, error: "Avance no encontrado" };
  const proyecto = (av as { proyecto?: { unidad_id: string } | { unidad_id: string }[] }).proyecto;
  const unidadId = Array.isArray(proyecto) ? proyecto[0]?.unidad_id : proyecto?.unidad_id;
  if (!unidadId) return { success: false, error: "Proyecto sin unidad" };

  try {
    await requireValidacionSobreUnidad(unidadId);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  const { data: userData } = await sb.auth.getUser();
  const { error } = await sb
    .from("avance")
    .update({
      estado_validacion: "observado",
      validado_por: userData.user?.id ?? null,
      validado_at: new Date().toISOString(),
      observacion_validacion: observacion.trim(),
    })
    .eq("id", avance_id);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/proyectos/${(av as { proyecto_id: string }).proyecto_id}`);
  revalidatePath("/validaciones");
  revalidatePath("/dashboard");
  return { success: true };
}

// -------------------------------------------------------
// Server Action: Completar un hito
// -------------------------------------------------------
export async function completarHito(input: {
  proyecto_id: string;
  hito_id: string;
  observacion?: string | null;
}) {
  const { proyecto_id, hito_id, observacion } = input;

  // Insertar avance referenciando el hito
  const { error: avanceError } = await supabase.from("avance").insert({
    proyecto_id,
    hito_id,
    fuente: "manual",
    observacion: observacion || null,
  });

  if (avanceError) {
    return { success: false, error: avanceError.message };
  }

  // Actualizar hito materializado
  const hoy = new Date().toISOString().slice(0, 10);
  await supabase
    .from("hito")
    .update({
      completado: true,
      fecha_completado: hoy,
    })
    .eq("id", hito_id);

  revalidatePath(`/proyectos/${proyecto_id}`);
  revalidatePath("/dashboard");
  revalidatePath("/hitos");
  revalidatePath("/tv");

  return { success: true };
}

// -------------------------------------------------------
// Server Actions: Administración de perfiles de usuario
// -------------------------------------------------------
export async function actualizarPerfil(input: {
  user_id: string;
  rol: RolUsuario;
  unidad_id: string | null;
}) {
  try {
    await requireRol("admin_funcional", "admin_tecnico");
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  const sb = await getSupabaseServer();
  const { error } = await sb
    .from("perfil_usuario")
    .update({ rol: input.rol, unidad_id: input.unidad_id })
    .eq("user_id", input.user_id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/usuarios");
  return { success: true };
}

export async function desactivarPerfil(user_id: string) {
  try {
    await requireRol("admin_tecnico");
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  const sb = await getSupabaseServer();
  const { error } = await sb
    .from("perfil_usuario")
    .update({ activo: false })
    .eq("user_id", user_id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/usuarios");
  return { success: true };
}

// -------------------------------------------------------
// Server Action: Cargar/actualizar valor de un indicador
// -------------------------------------------------------
export async function actualizarIndicador(input: {
  indicador_id: string;
  valor_actual: number | null;
  proyecto_id?: string;
}) {
  const { indicador_id, valor_actual, proyecto_id } = input;

  const { data: ind } = await supabase
    .from("indicador")
    .select("valor_objetivo, metadata")
    .eq("id", indicador_id)
    .single();

  const invertida = (ind?.metadata as Record<string, unknown> | undefined)?.invertida === true;
  const estado = calcularSemaforo(valor_actual, ind?.valor_objetivo ?? null, 0, invertida);

  const { error } = await supabase
    .from("indicador")
    .update({
      valor_actual,
      estado_semaforo: estado,
      ultima_actualizacion: new Date().toISOString(),
    })
    .eq("id", indicador_id);

  if (error) return { success: false, error: error.message };

  if (proyecto_id) revalidatePath(`/proyectos/${proyecto_id}`);
  revalidatePath("/indicadores");
  revalidatePath(`/indicadores/${indicador_id}`);
  revalidatePath("/dashboard");

  return { success: true };
}

// -------------------------------------------------------
// Server Action: Crear un nuevo indicador para una meta
// -------------------------------------------------------
export async function crearIndicador(input: {
  meta_id: string;
  nombre: string;
  unidad_medida?: string | null;
  valor_objetivo?: number | null;
  proyecto_id?: string;
}) {
  const { error } = await supabase.from("indicador").insert({
    meta_id: input.meta_id,
    nombre: input.nombre,
    unidad_medida: input.unidad_medida ?? null,
    valor_objetivo: input.valor_objetivo ?? null,
    estado_semaforo: "sin_datos",
  });

  if (error) return { success: false, error: error.message };

  if (input.proyecto_id) revalidatePath(`/proyectos/${input.proyecto_id}`);
  revalidatePath("/indicadores");
  revalidatePath("/dashboard");

  return { success: true };
}

// -------------------------------------------------------
// Server Action: Corregir un avance previo
// -------------------------------------------------------
export async function corregirAvance(input: {
  avance_id: string;
  proyecto_id: string;
  meta_id: string;
  tipo_medicion: "cuantitativo" | "cualitativo" | "hito_unico";
  valor_numerico?: number | null;
  valor_cualitativo?: string | null;
  motivo: string;
}) {
  const { avance_id, proyecto_id, meta_id, tipo_medicion, valor_numerico, valor_cualitativo, motivo } = input;

  if (!motivo || motivo.trim().length === 0) {
    return { success: false, error: "El motivo de la corrección es obligatorio." };
  }

  // 1. Insertar avance correctivo (append-only)
  const { error: avanceError } = await supabase.from("avance").insert({
    proyecto_id,
    meta_id,
    fuente: "correccion",
    valor_numerico: valor_numerico ?? null,
    valor_cualitativo: valor_cualitativo ?? null,
    observacion: motivo,
    reemplaza_avance_id: avance_id,
  });

  if (avanceError) return { success: false, error: avanceError.message };

  // 2. Recalcular materializados
  const ahora = new Date().toISOString();

  if (tipo_medicion === "cuantitativo" && valor_numerico != null) {
    const { data: meta } = await supabase
      .from("meta")
      .select("valor_meta, valor_linea_base, metadata")
      .eq("id", meta_id)
      .single();

    const invertida = (meta?.metadata as Record<string, unknown> | undefined)?.invertida === true;
    const estado = calcularSemaforo(
      valor_numerico,
      meta?.valor_meta as number | null,
      (meta?.valor_linea_base as number | null) ?? 0,
      invertida
    );

    await supabase
      .from("meta")
      .update({
        valor_actual: valor_numerico,
        estado_semaforo: estado,
        ultima_actualizacion: ahora,
      })
      .eq("id", meta_id);
  }

  if (tipo_medicion === "cualitativo" && valor_cualitativo) {
    const { data: meta } = await supabase
      .from("meta")
      .select("escala_cualitativa")
      .eq("id", meta_id)
      .single();
    let estado = "sin_datos";
    if (meta?.escala_cualitativa) {
      const escala = meta.escala_cualitativa as { niveles: { clave: string; valor_numerico: number }[] };
      const nivel = escala.niveles.find((n) => n.clave === valor_cualitativo);
      if (nivel) {
        const pct = nivel.valor_numerico;
        estado = pct >= 80 ? "verde" : pct >= 50 ? "amarillo" : pct > 0 ? "rojo" : "sin_datos";
      }
    }
    await supabase
      .from("meta")
      .update({
        nivel_actual: valor_cualitativo,
        estado_semaforo: estado,
        ultima_actualizacion: ahora,
      })
      .eq("id", meta_id);
  }

  revalidatePath(`/proyectos/${proyecto_id}`);
  revalidatePath("/dashboard");
  revalidatePath("/tv");

  return { success: true };
}
