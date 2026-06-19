"use server";

import { supabase } from "./supabase";
import { revalidatePath } from "next/cache";
import { getSupabaseServer } from "./supabase/server";
import { requireValidacionSobreUnidad, requireRol, getPerfilActual } from "./auth";
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

  const sb = await getSupabaseServer();

  // Upsert de la semana
  const { data: semana, error: semanaError } = await sb
    .from("agenda_semana")
    .upsert({ unidad_id, fecha_lunes, formato_libre: formato_libre ?? null }, { onConflict: "unidad_id,fecha_lunes" })
    .select()
    .single();

  if (semanaError || !semana) return { success: false, error: semanaError?.message ?? "Error al guardar semana" };

  const semanaId = (semana as { id: string }).id;

  // Borrar actividades anteriores (reemplazo completo)
  const { error: delError } = await sb
    .from("agenda_actividad")
    .delete()
    .eq("agenda_semana_id", semanaId);
  if (delError) return { success: false, error: delError.message };

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
    const { error: actError } = await sb.from("agenda_actividad").insert(rows);
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

  // Cliente con sesión del usuario → RLS valida que sea Director del área o admin
  const sb = await getSupabaseServer();

  // 1. Insertar avance (append-only)
  const { error: avanceError } = await sb.from("avance").insert({
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
    const { data: meta } = await sb
      .from("meta")
      .select("valor_meta, valor_linea_base, fecha_limite, metadata")
      .eq("id", meta_id)
      .single();

    // Si la meta tiene valor_meta definido, calculamos pct. Si no (caso común
    // tras el import inicial donde solo está el enunciado), marcamos la meta
    // como "EN EJECUCIÓN" (amarillo) para que el dashboard refleje que hay
    // actividad cargada aunque aún no se haya cuantificado el objetivo.
    let estado_semaforo = "amarillo";
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

    await sb
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
    const { data: meta } = await sb
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

    await sb
      .from("meta")
      .update({
        nivel_actual: valor_cualitativo,
        estado_semaforo,
        ultima_actualizacion: ahora,
      })
      .eq("id", meta_id);
  }

  if (tipo_medicion === "hito_unico") {
    await sb
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
// Server Action: Crear perfil para un usuario de auth.users existente
// (cuando un admin creó el usuario en Supabase Dashboard y necesita
// asignarle rol + unidad)
// -------------------------------------------------------
// -------------------------------------------------------
// Server Action: Crear un usuario en Supabase Auth (email + password)
// Solo admin_funcional / admin_tecnico. El usuario queda SIN perfil
// (rol/unidad) — se asigna después desde "Usuarios sin asignar".
// -------------------------------------------------------
export async function crearUsuarioAuth(input: { email: string; password: string }) {
  try {
    await requireRol("admin_funcional", "admin_tecnico");
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Email inválido." };
  }
  if (!password || password.length < 6) {
    return { success: false, error: "La contraseña debe tener al menos 6 caracteres." };
  }

  const { getSupabaseAdmin } = await import("./supabase/admin");
  const sb = getSupabaseAdmin();
  const { error } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) {
    // Mensaje más claro para el caso típico de duplicado
    const msg = /already.*registered|exists/i.test(error.message)
      ? "Ya existe un usuario con ese email."
      : error.message;
    return { success: false, error: msg };
  }

  revalidatePath("/admin/usuarios");
  return { success: true };
}

export async function crearPerfilParaUsuario(input: {
  user_id: string;
  email: string;
  nombre: string;
  rol: RolUsuario;
  unidad_id: string | null;
}) {
  try {
    await requireRol("admin_funcional", "admin_tecnico");
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  // Usar admin client para saltarse RLS (la tabla perfil_usuario tiene policies estrictas)
  const { getSupabaseAdmin } = await import("./supabase/admin");
  const sb = getSupabaseAdmin();
  const { error } = await sb.from("perfil_usuario").insert({
    user_id: input.user_id,
    email: input.email,
    nombre: input.nombre || null,
    rol: input.rol,
    unidad_id: input.unidad_id,
    activo: true,
  });
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/usuarios");
  return { success: true };
}

// -------------------------------------------------------
// Server Action: Cargar/actualizar valor de un indicador
// -------------------------------------------------------
export async function actualizarIndicador(input: {
  indicador_id: string;
  valor_actual?: number | null;
  valor_actual_texto?: string | null;
  valor_objetivo?: number | null;
  valor_objetivo_texto?: string | null;
  unidad_medida?: string | null;
  observacion?: string | null;
  estado_semaforo_override?: "verde" | "amarillo" | "rojo" | "sin_datos" | null;
  proyecto_id?: string;
}) {
  const {
    indicador_id,
    valor_actual,
    valor_actual_texto,
    valor_objetivo,
    valor_objetivo_texto,
    unidad_medida,
    observacion,
    estado_semaforo_override,
    proyecto_id,
  } = input;

  const sb = await getSupabaseServer();
  const { data: ind } = await sb
    .from("indicador")
    .select("valor_objetivo, metadata")
    .eq("id", indicador_id)
    .single();

  const invertida = (ind?.metadata as Record<string, unknown> | undefined)?.invertida === true;
  // Objetivo efectivo: el nuevo si vino en este submit, sino el ya guardado.
  const objetivoEfectivo =
    valor_objetivo !== undefined && valor_objetivo !== null
      ? valor_objetivo
      : (ind?.valor_objetivo as number | null) ?? null;

  // Si el usuario eligió un estado manualmente (caso texto), respetarlo.
  // Sino, calcular del valor numérico contra el objetivo efectivo.
  let estado: string;
  if (estado_semaforo_override) {
    estado = estado_semaforo_override;
  } else if (valor_actual != null && objetivoEfectivo != null) {
    estado = calcularSemaforo(valor_actual, objetivoEfectivo, 0, invertida);
  } else if (valor_actual != null) {
    // Valor numérico cargado sin objetivo → se considera "en ejecución"
    estado = "amarillo";
  } else if (valor_actual_texto != null && valor_actual_texto.trim() !== "") {
    estado = "amarillo";
  } else {
    estado = "sin_datos";
  }

  type UpdatePayload = {
    valor_actual?: number | null;
    valor_actual_texto?: string | null;
    valor_objetivo?: number | null;
    valor_objetivo_texto?: string | null;
    unidad_medida?: string | null;
    observacion?: string | null;
    estado_semaforo: string;
    ultima_actualizacion: string;
  };
  const update: UpdatePayload = {
    estado_semaforo: estado,
    ultima_actualizacion: new Date().toISOString(),
  };
  if (valor_actual !== undefined) update.valor_actual = valor_actual;
  if (valor_actual_texto !== undefined) update.valor_actual_texto = valor_actual_texto;
  if (valor_objetivo !== undefined) update.valor_objetivo = valor_objetivo;
  if (valor_objetivo_texto !== undefined) update.valor_objetivo_texto = valor_objetivo_texto;
  if (unidad_medida !== undefined) update.unidad_medida = unidad_medida;
  if (observacion !== undefined) update.observacion = observacion;

  const { error } = await sb
    .from("indicador")
    .update(update)
    .eq("id", indicador_id);

  if (error) return { success: false, error: error.message };

  if (proyecto_id) revalidatePath(`/proyectos/${proyecto_id}`);
  revalidatePath("/proyectos");
  revalidatePath("/indicadores");
  revalidatePath(`/indicadores/${indicador_id}`);
  revalidatePath("/avance-direcciones");
  revalidatePath("/dashboard");
  revalidatePath("/tv");

  return { success: true };
}

// -------------------------------------------------------
// Server Action: Borrar el valor cargado en un indicador
// (vuelve a estado inicial sin avance)
// -------------------------------------------------------
export async function borrarValorIndicador(input: {
  indicador_id: string;
  proyecto_id?: string;
}) {
  try {
    await requireRol("director", "admin_funcional");
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  const sb = await getSupabaseServer();
  const { error } = await sb
    .from("indicador")
    .update({
      valor_actual: null,
      valor_actual_texto: null,
      observacion: null,
      estado_semaforo: "sin_datos",
      ultima_actualizacion: null,
    })
    .eq("id", input.indicador_id);
  if (error) return { success: false, error: error.message };
  if (input.proyecto_id) revalidatePath(`/proyectos/${input.proyecto_id}`);
  revalidatePath("/proyectos");
  revalidatePath("/indicadores");
  revalidatePath(`/indicadores/${input.indicador_id}`);
  revalidatePath("/avance-direcciones");
  revalidatePath("/dashboard");
  return { success: true };
}

// -------------------------------------------------------
// Server Action: Editar metadata de un indicador (nombre, unidad, objetivo)
// -------------------------------------------------------
export async function editarIndicador(input: {
  indicador_id: string;
  nombre?: string;
  unidad_medida?: string | null;
  valor_objetivo?: number | null;
  valor_objetivo_texto?: string | null;
  proyecto_id?: string;
}) {
  try {
    await requireRol("director", "admin_funcional");
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  type UpdatePayload = {
    nombre?: string;
    unidad_medida?: string | null;
    valor_objetivo?: number | null;
    valor_objetivo_texto?: string | null;
  };
  const update: UpdatePayload = {};
  if (input.nombre !== undefined) update.nombre = input.nombre;
  if (input.unidad_medida !== undefined) update.unidad_medida = input.unidad_medida;
  if (input.valor_objetivo !== undefined) update.valor_objetivo = input.valor_objetivo;
  if (input.valor_objetivo_texto !== undefined) update.valor_objetivo_texto = input.valor_objetivo_texto;

  const sb = await getSupabaseServer();
  const { error } = await sb
    .from("indicador")
    .update(update)
    .eq("id", input.indicador_id);
  if (error) return { success: false, error: error.message };
  if (input.proyecto_id) revalidatePath(`/proyectos/${input.proyecto_id}`);
  revalidatePath("/proyectos");
  revalidatePath("/indicadores");
  revalidatePath(`/indicadores/${input.indicador_id}`);
  revalidatePath("/avance-direcciones");
  return { success: true };
}

// -------------------------------------------------------
// Server Action: Borrar (soft-delete) un indicador completo
// -------------------------------------------------------
export async function eliminarIndicador(input: {
  indicador_id: string;
  proyecto_id?: string;
}) {
  try {
    await requireRol("director", "admin_funcional");
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  const sb = await getSupabaseServer();
  const { error } = await sb
    .from("indicador")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", input.indicador_id);
  if (error) return { success: false, error: error.message };
  if (input.proyecto_id) revalidatePath(`/proyectos/${input.proyecto_id}`);
  revalidatePath("/proyectos");
  revalidatePath("/indicadores");
  revalidatePath("/avance-direcciones");
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
  try {
    await requireRol("director", "admin_funcional");
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
  const sb = await getSupabaseServer();
  const { error } = await sb.from("indicador").insert({
    meta_id: input.meta_id,
    nombre: input.nombre,
    unidad_medida: input.unidad_medida ?? null,
    valor_objetivo: input.valor_objetivo ?? null,
    estado_semaforo: "sin_datos",
  });

  if (error) return { success: false, error: error.message };

  if (input.proyecto_id) revalidatePath(`/proyectos/${input.proyecto_id}`);
  revalidatePath("/avance-direcciones");
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

  const sb = await getSupabaseServer();

  // 1. Insertar avance correctivo (append-only)
  const { error: avanceError } = await sb.from("avance").insert({
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
    const { data: meta } = await sb
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

    await sb
      .from("meta")
      .update({
        valor_actual: valor_numerico,
        estado_semaforo: estado,
        ultima_actualizacion: ahora,
      })
      .eq("id", meta_id);
  }

  if (tipo_medicion === "cualitativo" && valor_cualitativo) {
    const { data: meta } = await sb
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
    await sb
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

// -------------------------------------------------------
// Server Actions: Fichas PRISMA (POA 2027)
// -------------------------------------------------------

interface FichaPrismaInput {
  codigo?: string | null;
  programa: string;
  relevancia?: string | null;
  indicador?: string | null;
  secretaria?: string | null;
  meta_anual?: string | null;
  ancla?: string | null;
}

export async function crearFichaPrisma(input: FichaPrismaInput) {
  const perfil = await getPerfilActual();
  if (!perfil) return { success: false, error: "No autenticado" };
  if (!["director", "admin_funcional"].includes(perfil.rol)) {
    return { success: false, error: "Solo los Directores pueden cargar fichas PRISMA" };
  }
  if (!perfil.unidad_id && perfil.rol === "director") {
    return { success: false, error: "Tu perfil no tiene una dirección asignada" };
  }
  if (!input.programa?.trim()) {
    return { success: false, error: "El campo Programa/Proyecto es obligatorio" };
  }

  const { error } = await supabase.from("ficha_prisma").insert({
    unidad_id: perfil.unidad_id,
    anio: 2027,
    codigo: input.codigo ?? null,
    programa: input.programa.trim(),
    relevancia: input.relevancia ?? null,
    indicador: input.indicador ?? null,
    secretaria: input.secretaria ?? null,
    meta_anual: input.meta_anual ?? null,
    ancla: input.ancla ?? null,
    created_by: perfil.user_id,
  });
  if (error) return { success: false, error: error.message };
  revalidatePath("/poa-2027/mis-fichas");
  revalidatePath("/poa-2027");
  return { success: true };
}

export async function editarFichaPrisma(id: string, input: FichaPrismaInput) {
  const perfil = await getPerfilActual();
  if (!perfil) return { success: false, error: "No autenticado" };
  if (!input.programa?.trim()) {
    return { success: false, error: "El campo Programa/Proyecto es obligatorio" };
  }

  // Verificar pertenencia: el director solo edita fichas de su unidad
  const { data: ficha } = await supabase
    .from("ficha_prisma")
    .select("unidad_id")
    .eq("id", id)
    .single();
  if (!ficha) return { success: false, error: "Ficha no encontrada" };
  if (
    perfil.rol === "director" &&
    (ficha as { unidad_id: string }).unidad_id !== perfil.unidad_id
  ) {
    return { success: false, error: "No podés editar fichas de otra dirección" };
  }

  const { error } = await supabase
    .from("ficha_prisma")
    .update({
      codigo: input.codigo ?? null,
      programa: input.programa.trim(),
      relevancia: input.relevancia ?? null,
      indicador: input.indicador ?? null,
      secretaria: input.secretaria ?? null,
      meta_anual: input.meta_anual ?? null,
      ancla: input.ancla ?? null,
    })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/poa-2027/mis-fichas");
  return { success: true };
}

export async function eliminarFichaPrisma(id: string) {
  const perfil = await getPerfilActual();
  if (!perfil) return { success: false, error: "No autenticado" };
  const { error } = await supabase
    .from("ficha_prisma")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/poa-2027/mis-fichas");
  return { success: true };
}

// -------------------------------------------------------
// Server Actions: Proyectos y Metas (Director / admin_funcional)
// -------------------------------------------------------
export async function crearProyecto(input: {
  nombre: string;
  objetivo?: string | null;
  unidad_id: string;
  codigo?: string | null;
}) {
  const perfil = await getPerfilActual();
  if (!perfil) return { success: false, error: "No autenticado" };
  if (!["director", "admin_funcional"].includes(perfil.rol)) {
    return { success: false, error: "Solo Directores o Admin Funcional pueden crear proyectos" };
  }
  if (!input.nombre?.trim()) return { success: false, error: "El nombre del proyecto es obligatorio" };

  // Director solo puede crear en su propia dirección
  const unidadId = perfil.rol === "director" ? perfil.unidad_id : input.unidad_id;
  if (!unidadId) return { success: false, error: "Falta la dirección del proyecto" };

  const sb = await getSupabaseServer();
  const { data: periodo } = await sb.from("periodo").select("id").eq("activo", true).single();
  if (!periodo) return { success: false, error: "No hay período activo" };

  const { data, error } = await sb
    .from("proyecto")
    .insert({
      nombre: input.nombre.trim(),
      objetivo: input.objetivo?.trim() || null,
      codigo: input.codigo?.trim() || null,
      unidad_id: unidadId,
      periodo_id: (periodo as { id: string }).id,
      estado: "activo",
    })
    .select("id")
    .single();
  if (error) return { success: false, error: error.message };

  revalidatePath("/proyectos");
  revalidatePath("/dashboard");
  return { success: true, id: (data as { id: string }).id };
}

export async function crearMeta(input: {
  proyecto_id: string;
  nombre: string;
  tipo_medicion?: "cuantitativo" | "cualitativo" | "hito_unico";
  unidad_medida?: string | null;
  valor_meta?: number | null;
}) {
  const perfil = await getPerfilActual();
  if (!perfil) return { success: false, error: "No autenticado" };
  if (!["director", "admin_funcional"].includes(perfil.rol)) {
    return { success: false, error: "Sin permisos para crear metas" };
  }
  if (!input.nombre?.trim()) return { success: false, error: "El enunciado de la meta es obligatorio" };

  const sb = await getSupabaseServer();
  const { error } = await sb.from("meta").insert({
    proyecto_id: input.proyecto_id,
    nombre: input.nombre.trim(),
    tipo_medicion: input.tipo_medicion ?? "cuantitativo",
    unidad_medida: input.unidad_medida?.trim() || null,
    valor_meta: input.valor_meta ?? null,
    estado_semaforo: "sin_datos",
  });
  if (error) return { success: false, error: error.message };

  revalidatePath(`/proyectos/${input.proyecto_id}`);
  revalidatePath("/proyectos");
  return { success: true };
}

export async function editarMeta(input: {
  meta_id: string;
  proyecto_id: string;
  nombre?: string;
  unidad_medida?: string | null;
  valor_meta?: number | null;
}) {
  const perfil = await getPerfilActual();
  if (!perfil) return { success: false, error: "No autenticado" };
  if (!["director", "admin_funcional"].includes(perfil.rol)) {
    return { success: false, error: "Sin permisos para editar metas" };
  }
  if (input.nombre !== undefined && !input.nombre.trim()) {
    return { success: false, error: "El enunciado no puede quedar vacío" };
  }

  const update: Record<string, unknown> = {};
  if (input.nombre !== undefined) update.nombre = input.nombre.trim();
  if (input.unidad_medida !== undefined) update.unidad_medida = input.unidad_medida?.trim() || null;
  if (input.valor_meta !== undefined) update.valor_meta = input.valor_meta;

  const sb = await getSupabaseServer();
  const { error } = await sb.from("meta").update(update).eq("id", input.meta_id);
  if (error) return { success: false, error: error.message };

  revalidatePath(`/proyectos/${input.proyecto_id}`);
  revalidatePath("/proyectos");
  return { success: true };
}

export async function eliminarMeta(input: { meta_id: string; proyecto_id: string }) {
  const perfil = await getPerfilActual();
  if (!perfil) return { success: false, error: "No autenticado" };
  if (!["director", "admin_funcional"].includes(perfil.rol)) {
    return { success: false, error: "Sin permisos para eliminar metas" };
  }
  const sb = await getSupabaseServer();
  const { error } = await sb
    .from("meta")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", input.meta_id);
  if (error) return { success: false, error: error.message };
  revalidatePath(`/proyectos/${input.proyecto_id}`);
  revalidatePath("/proyectos");
  return { success: true };
}
