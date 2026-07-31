import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { construirIcs, icsHabilitado, tokenValido, type EventoIcs } from "@/lib/ics";
import type { NextRequest } from "next/server";

export const revalidate = 0;
export const dynamic = "force-dynamic";

// Ventana publicada: lo suficiente para ver el historial reciente y lo que
// viene, sin que el archivo crezca sin control.
const DIAS_ATRAS = 180;
const DIAS_ADELANTE = 365;

function sumarDias(iso: string, dias: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function lunesIso(iso: string): string {
  const day = new Date(iso + "T00:00:00Z").getUTCDay();
  return sumarDias(iso, day === 0 ? -6 : 1 - day);
}

/**
 * Feed iCalendar público (URL secreta) de una unidad y todas sus dependencias.
 *
 * GET /api/agenda/<unidad_id>/calendario.ics?token=<token>
 *
 * Lo consume Google Calendar sin sesión, así que NO puede depender de las
 * cookies de Supabase: la autorización es el token de la URL y la lectura va
 * por service_role (bypassea RLS). Por eso el token es lo único que separa
 * este endpoint de los datos: si se filtra la URL, se filtra la agenda.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ unidad: string }> }
) {
  const { unidad } = await params;

  if (!icsHabilitado()) {
    return new Response("Feed no configurado (falta ICS_SECRET)", { status: 503 });
  }
  if (!tokenValido(unidad, req.nextUrl.searchParams.get("token"))) {
    return new Response("Token inválido", { status: 403 });
  }

  const sb = getSupabaseAdmin();

  // Unidad + todas sus dependencias: un secretario se suscribe una sola vez y
  // ve las agendas de todas sus direcciones.
  const { data: unidadesData, error: errUnidades } = await sb
    .from("unidad_organizacional")
    .select("id, nombre, nombre_corto, parent_id");
  if (errUnidades) return new Response("Error al leer la estructura", { status: 500 });

  const unidades = (unidadesData ?? []) as {
    id: string;
    nombre: string;
    nombre_corto: string | null;
    parent_id: string | null;
  }[];
  const raiz = unidades.find((u) => u.id === unidad);
  if (!raiz) return new Response("Unidad inexistente", { status: 404 });

  const ids = new Set<string>([raiz.id]);
  const bajar = (id: string) => {
    for (const u of unidades.filter((x) => x.parent_id === id)) {
      if (ids.has(u.id)) continue;
      ids.add(u.id);
      bajar(u.id);
    }
  };
  bajar(raiz.id);
  const nombreDe = new Map(unidades.map((u) => [u.id, u.nombre_corto ?? u.nombre]));

  const hoy = new Date().toISOString().slice(0, 10);
  const desde = sumarDias(hoy, -DIAS_ATRAS);
  const hasta = sumarDias(hoy, DIAS_ADELANTE);

  const { data: semanas, error: errSemanas } = await sb
    .from("agenda_semana")
    .select("id, unidad_id, fecha_lunes, updated_at, actividades:agenda_actividad(*)")
    .in("unidad_id", [...ids])
    .gte("fecha_lunes", lunesIso(desde))
    .lte("fecha_lunes", hasta);
  if (errSemanas) return new Response("Error al leer la agenda", { status: 500 });

  const eventos: EventoIcs[] = [];
  for (const sem of (semanas ?? []) as {
    unidad_id: string;
    fecha_lunes: string;
    updated_at: string | null;
    actividades?: {
      id: string;
      dia_semana: number;
      actividad: string;
      lugar: string | null;
      horario: string | null;
      observacion: string | null;
      es_feriado: boolean;
    }[];
  }[]) {
    for (const act of sem.actividades ?? []) {
      const fecha = sumarDias(sem.fecha_lunes, act.dia_semana - 1);
      if (fecha < desde || fecha > hasta) continue;
      if (!act.actividad?.trim() && !act.es_feriado) continue; // filas vacías
      eventos.push({
        id: act.id,
        fecha,
        actividad: act.actividad,
        lugar: act.lugar,
        horario: act.horario,
        observacion: act.observacion,
        es_feriado: act.es_feriado,
        unidad_nombre: nombreDe.get(sem.unidad_id) ?? "—",
        actualizado: sem.updated_at,
      });
    }
  }
  eventos.sort((a, b) => a.fecha.localeCompare(b.fecha));

  const nombreCalendario = `PlanIA — ${raiz.nombre_corto ?? raiz.nombre}`;
  const ics = construirIcs(nombreCalendario, eventos);

  return new Response(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="plania-agenda.ics"`,
      // Sin caché intermedia: el que decide cada cuánto refrescar es el cliente.
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
