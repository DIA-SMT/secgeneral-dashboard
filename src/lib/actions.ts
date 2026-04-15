"use server";

import { supabase } from "./supabase";
import { revalidatePath } from "next/cache";

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
