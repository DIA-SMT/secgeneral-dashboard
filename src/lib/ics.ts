import { createHmac, timingSafeEqual } from "node:crypto";

// ---------------------------------------------------------------------------
// Feed iCalendar de la agenda (30.07 — "vincular el calendario con el de
// Google"). El feed se publica en una URL secreta que el funcionario pega en
// Google Calendar (Otros calendarios → Desde URL), igual que la "dirección
// secreta en formato iCal" que usa el propio Google.
//
// Es de solo lectura y de ida: PlanIA → Google. Google refresca los feeds
// externos cuando quiere (suele ser cada varias horas), no es controlable.
// ---------------------------------------------------------------------------

const NOMBRE_PRODUCTO = "-//Municipalidad de San Miguel de Tucuman//PlanIA//ES";

// Argentina es UTC-3 todo el año (no hay horario de verano desde 2009), así que
// alcanza con convertir a UTC y emitir los horarios en Z. Evita tener que
// declarar un VTIMEZONE completo en el archivo.
const OFFSET_HORAS_AR = 3;

/** true si el feed está habilitado (hay secreto configurado). */
export function icsHabilitado(): boolean {
  return !!process.env.ICS_SECRET;
}

/**
 * Token de la URL secreta de una unidad. Es un HMAC del id con `ICS_SECRET`:
 * no hace falta guardarlo en la base y se revocan todos a la vez rotando el
 * secreto. Si algún día hace falta revocar de a uno, hay que pasarlo a columna.
 */
export function tokenDeUnidad(unidadId: string): string | null {
  const secreto = process.env.ICS_SECRET;
  if (!secreto) return null;
  return createHmac("sha256", secreto)
    .update(unidadId)
    .digest("base64url")
    .slice(0, 32);
}

/** Comparación en tiempo constante, para no filtrar el token por timing. */
export function tokenValido(unidadId: string, recibido: string | null): boolean {
  const esperado = tokenDeUnidad(unidadId);
  if (!esperado || !recibido) return false;
  const a = Buffer.from(esperado);
  const b = Buffer.from(recibido);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// ---------------------------------------------------------------------------
// Serialización
// ---------------------------------------------------------------------------

// RFC 5545: los caracteres con significado propio se escapan y los saltos de
// línea se representan como \n literal.
function escapar(texto: string): string {
  return texto
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// RFC 5545: ninguna línea puede pasar de 75 octetos; las continuaciones
// arrancan con un espacio. Se cuenta en bytes UTF-8, no en caracteres, y no se
// parte un carácter multibyte por la mitad.
function plegar(linea: string): string {
  const bytes = Buffer.from(linea, "utf8");
  if (bytes.length <= 75) return linea;

  const partes: string[] = [];
  let inicio = 0;
  let limite = 75;
  while (inicio < bytes.length) {
    let fin = Math.min(inicio + limite, bytes.length);
    // Retroceder si caímos en medio de un carácter (los bytes de continuación
    // UTF-8 son 10xxxxxx).
    while (fin > inicio && fin < bytes.length && (bytes[fin] & 0xc0) === 0x80) fin--;
    partes.push(bytes.subarray(inicio, fin).toString("utf8"));
    inicio = fin;
    limite = 74; // las continuaciones gastan un octeto en el espacio inicial
  }
  return partes.join("\r\n ");
}

const fechaBasica = (iso: string) => iso.replace(/-/g, ""); // 2026-08-03 → 20260803

function utcBasico(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function sumarDiasIso(iso: string, dias: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

// Una hora reconocida dentro del texto libre.
type Hora = { h: number; m: number; idx: number };

// Un número cuenta como hora solo si trae minutos ("9:30") o un sufijo que lo
// marque ("9 hs", "10 AM"). Así "reunión con 5 personas" no se lee como las 5.
const RE_HORA = /(\d{1,2})(?:[:.](\d{2}))?\s*(a\.?\s?m\.?|p\.?\s?m\.?|hs?|horas?)?/gi;

// "10 a 12 hs", "de 14 a 16", "9 - 11": el primer número queda sin sufijo
// propio, así que se lo busca aparte, justo antes de la hora que sí se detectó.
const RE_RANGO_PREVIO = /(\d{1,2})(?:[:.](\d{2}))?\s*(?:hs?|horas?)?\s*(?:hasta|a|[-–—])\s*$/i;

function aHora(hh: string, mm: string | undefined, sufijo: string | undefined, idx: number): Hora | null {
  let h = Number(hh);
  const m = mm ? Number(mm) : 0;
  const s = (sufijo ?? "").toLowerCase().replace(/[.\s]/g, "");
  if (s === "pm" && h < 12) h += 12;
  if (s === "am" && h === 12) h = 0;
  if (h > 23 || m > 59) return null;
  return { h, m, idx };
}

/**
 * Intenta sacar hora de inicio y fin del campo `horario`, que es texto libre
 * ("9 hs", "10 AM", "10 a 12hs", "8.30", "Mañana"). Si no se puede, el evento
 * va como de día completo — que es lo honesto: no inventamos un horario.
 */
export function parsearHorario(
  horario: string | null
): { inicio: string; fin: string } | null {
  if (!horario) return null;

  const encontradas: Hora[] = [];
  for (const m of horario.matchAll(RE_HORA)) {
    if (m[2] === undefined && m[3] === undefined) continue; // número suelto
    const h = aHora(m[1], m[2], m[3], m.index ?? 0);
    if (h) encontradas.push(h);
  }
  if (encontradas.length === 0) return null;

  let inicio = encontradas[0];
  let fin = encontradas[1] ?? null;

  // Caso "10 a 12hs": lo detectado es el FIN; el inicio está justo antes.
  if (!fin) {
    const previo = RE_RANGO_PREVIO.exec(horario.slice(0, inicio.idx));
    if (previo) {
      const h = aHora(previo[1], previo[2], undefined, 0);
      if (h && h.h * 60 + h.m < inicio.h * 60 + inicio.m) {
        fin = inicio;
        inicio = h;
      }
    }
  }

  const minutos = (t: Hora) => t.h * 60 + t.m;
  // Duración por defecto cuando no hay hora de fin: 1 hora.
  if (!fin || minutos(fin) <= minutos(inicio)) {
    fin = { h: Math.min(23, inicio.h + 1), m: inicio.m, idx: 0 };
  }

  const hhmm = (t: Hora) =>
    `${String(t.h).padStart(2, "0")}${String(t.m).padStart(2, "0")}00`;
  return { inicio: hhmm(inicio), fin: hhmm(fin) };
}

// Pasa una fecha local argentina (YYYY-MM-DD + HHMMSS) a UTC en formato básico.
function localArgentinaAUtc(fechaIso: string, hhmmss: string): string {
  const [y, m, d] = fechaIso.split("-").map(Number);
  const h = Number(hhmmss.slice(0, 2));
  const min = Number(hhmmss.slice(2, 4));
  return utcBasico(new Date(Date.UTC(y, m - 1, d, h + OFFSET_HORAS_AR, min, 0)));
}

export interface EventoIcs {
  id: string;
  fecha: string; // YYYY-MM-DD
  actividad: string;
  lugar: string | null;
  horario: string | null;
  observacion: string | null;
  es_feriado: boolean;
  unidad_nombre: string;
  actualizado: string | null; // ISO timestamp
}

/** Arma el archivo .ics completo de un calendario. */
export function construirIcs(nombreCalendario: string, eventos: EventoIcs[]): string {
  const ahora = utcBasico(new Date());

  const lineas: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${NOMBRE_PRODUCTO}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapar(nombreCalendario)}`,
    "X-WR-TIMEZONE:America/Argentina/Buenos_Aires",
    // Sugerencia de refresco. Google la ignora y usa su propia frecuencia;
    // otros clientes (Apple, Outlook) sí la respetan.
    "REFRESH-INTERVAL;VALUE=DURATION:PT2H",
    "X-PUBLISHED-TTL:PT2H",
  ];

  for (const e of eventos) {
    const horas = e.es_feriado ? null : parsearHorario(e.horario);
    const descripcion = [
      e.unidad_nombre,
      e.horario && !horas ? `Horario: ${e.horario}` : null,
      e.observacion,
    ]
      .filter(Boolean)
      .join("\n");

    lineas.push("BEGIN:VEVENT");
    lineas.push(`UID:${e.id}@plania.smt.gob.ar`);
    lineas.push(`DTSTAMP:${ahora}`);
    if (horas) {
      lineas.push(`DTSTART:${localArgentinaAUtc(e.fecha, horas.inicio)}`);
      lineas.push(`DTEND:${localArgentinaAUtc(e.fecha, horas.fin)}`);
    } else {
      // Día completo: el DTEND es exclusivo, por eso el día siguiente.
      lineas.push(`DTSTART;VALUE=DATE:${fechaBasica(e.fecha)}`);
      lineas.push(`DTEND;VALUE=DATE:${fechaBasica(sumarDiasIso(e.fecha, 1))}`);
    }
    lineas.push(
      `SUMMARY:${escapar(e.es_feriado ? `FERIADO — ${e.actividad || "Sin actividad"}` : e.actividad)}`
    );
    if (e.lugar) lineas.push(`LOCATION:${escapar(e.lugar)}`);
    if (descripcion) lineas.push(`DESCRIPTION:${escapar(descripcion)}`);
    if (e.actualizado) lineas.push(`LAST-MODIFIED:${utcBasico(new Date(e.actualizado))}`);
    lineas.push(e.es_feriado ? "TRANSP:TRANSPARENT" : "TRANSP:OPAQUE");
    lineas.push("END:VEVENT");
  }

  lineas.push("END:VCALENDAR");

  // RFC 5545 exige CRLF y terminar el archivo con un salto de línea.
  return lineas.map(plegar).join("\r\n") + "\r\n";
}
