import { getEventosAgenda, getUnidades, lunesIso, sumarDias, type EventoAgenda } from "@/lib/queries";
import { colorDeUnidad } from "@/components/agenda/calendario-vista";
import { estiloChip, hexDeColor } from "@/lib/colores-agenda";
import type { UnidadOrganizacional } from "@/types/database";

const DIAS_CORTOS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** Cuántas actividades entran en una celda antes del "+N más". */
const MAX_POR_DIA = 4;

interface Props {
  /** YYYY-MM-DD del mes a mostrar; null ⇒ mes actual. */
  fecha: string | null;
  /** Acota la agenda al árbol de una unidad (para TVs de un área). */
  unidadId: string | null;
}

/**
 * Agenda del mes en modo TV: la misma grilla mensual de /agenda pero a tamaño
 * pantalla, sin toolbar ni links (nadie hace click en una TV).
 */
export async function TvCalendarioMes({ fecha, unidadId }: Props) {
  const hoy = new Date().toISOString().slice(0, 10);
  const referencia = fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : hoy;

  // La grilla arranca el lunes de la 1ª semana del mes y termina el domingo de
  // la última, igual que en /agenda.
  const primero = `${referencia.slice(0, 7)}-01`;
  const diasDelMes = new Date(
    Number(referencia.slice(0, 4)),
    Number(referencia.slice(5, 7)),
    0
  ).getDate();
  const ultimo = `${referencia.slice(0, 7)}-${String(diasDelMes).padStart(2, "0")}`;
  const desde = lunesIso(primero);
  const hasta = sumarDias(lunesIso(ultimo), 6);
  const mesReferencia = Number(referencia.slice(5, 7)) - 1;

  const dias: string[] = [];
  for (let d = desde; d <= hasta; d = sumarDias(d, 1)) dias.push(d);

  const [unidades, eventosRango] = await Promise.all([
    getUnidades(),
    getEventosAgenda(desde, hasta),
  ]);

  // Filtro por ámbito: la unidad pedida y todo lo que cuelga de ella.
  const ambito = unidadId ? subarbol(unidades, unidadId) : null;
  const eventos = ambito ? eventosRango.filter((e) => ambito.has(e.unidad_id)) : eventosRango;

  // Color estable por unidad dentro de la vista, con el mismo criterio que la
  // agenda web (orden por id), para que los colores coincidan entre pantallas.
  const indicePorUnidad: Record<string, number> = {};
  for (const id of [...new Set(eventos.map((e) => e.unidad_id))].sort()) {
    indicePorUnidad[id] = Object.keys(indicePorUnidad).length;
  }

  const porDia = new Map<string, EventoAgenda[]>();
  for (const e of eventos) {
    (porDia.get(e.fecha) ?? porDia.set(e.fecha, []).get(e.fecha)!).push(e);
  }

  const semanas: string[][] = [];
  for (let i = 0; i < dias.length; i += 7) semanas.push(dias.slice(i, i + 7));

  const delMes = eventos.filter((e) => Number(e.fecha.slice(5, 7)) - 1 === mesReferencia);
  const unidadFiltro = unidadId ? unidades.find((u) => u.id === unidadId) ?? null : null;

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground capitalize">
            {MESES[mesReferencia]} {referencia.slice(0, 4)}
          </h2>
          <p className="text-sm text-muted">
            {delMes.length} {delMes.length === 1 ? "actividad" : "actividades"} en el mes
            {unidadFiltro ? ` · ${unidadFiltro.nombre_corto ?? unidadFiltro.nombre}` : ""}
          </p>
        </div>

        {/* Leyenda: qué unidad es cada color */}
        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 max-w-[60%]">
          {Object.entries(indicePorUnidad).slice(0, 8).map(([id, i]) => {
            const u = unidades.find((x) => x.id === id);
            return (
              <span key={id} className="inline-flex items-center gap-1.5 text-xs text-muted">
                <span className={`h-2.5 w-2.5 rounded-full ${colorDeUnidad(id, i).punto}`} />
                {u?.nombre_corto ?? u?.nombre ?? "—"}
              </span>
            );
          })}
        </div>
      </div>

      <div className="flex-1 min-h-0 rounded-2xl border border-border bg-surface overflow-hidden flex flex-col">
        <div className="grid grid-cols-7 bg-border/20 border-b border-border">
          {DIAS_CORTOS.map((d) => (
            <div key={d} className="px-2 py-2 text-xs text-muted uppercase tracking-wider text-center">
              {d}
            </div>
          ))}
        </div>

        <div className="flex-1 min-h-0 flex flex-col">
          {semanas.map((semana, si) => (
            <div key={si} className="flex-1 min-h-0 grid grid-cols-7 border-b border-border last:border-b-0">
              {semana.map((f) => {
                const delDia = porDia.get(f) ?? [];
                const esHoy = f === hoy;
                const otroMes = Number(f.slice(5, 7)) - 1 !== mesReferencia;
                const visibles = delDia.slice(0, MAX_POR_DIA);
                const resto = delDia.length - visibles.length;
                return (
                  <div
                    key={f}
                    className={`min-h-0 border-r border-border last:border-r-0 p-2 flex flex-col gap-1 overflow-hidden ${
                      otroMes ? "bg-background/40" : ""
                    }`}
                  >
                    <span
                      className={`self-end text-sm h-7 min-w-7 px-2 rounded-full inline-flex items-center justify-center shrink-0 ${
                        esHoy
                          ? "bg-primary text-white font-bold"
                          : otroMes
                          ? "text-muted/40"
                          : "text-muted"
                      }`}
                    >
                      {Number(f.slice(8, 10))}
                    </span>
                    <div className="flex-1 min-h-0 space-y-1 overflow-hidden">
                      {visibles.map((e) => (
                        <TvEventoChip key={e.id} evento={e} indicePorUnidad={indicePorUnidad} />
                      ))}
                      {resto > 0 && (
                        <p className="text-[11px] text-muted pl-1">+{resto} más</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TvEventoChip({
  evento,
  indicePorUnidad,
}: {
  evento: EventoAgenda;
  indicePorUnidad: Record<string, number>;
}) {
  // El color propio de la actividad (06.08) manda sobre el de la unidad.
  const hex = hexDeColor(evento.color);
  const color = colorDeUnidad(evento.unidad_id, indicePorUnidad[evento.unidad_id] ?? 0);
  return (
    <div
      style={hex ? estiloChip(hex) : undefined}
      className={`rounded border px-1.5 py-1 ${hex ? "" : color.chip} ${
        evento.es_feriado ? "opacity-70 italic" : ""
      }`}
    >
      <p className="text-xs font-medium line-clamp-1">
        {evento.horario ? <span className="opacity-80">{evento.horario} </span> : null}
        {evento.actividad}
      </p>
    </div>
  );
}

/** La unidad y todo su árbol de dependencias. */
function subarbol(unidades: UnidadOrganizacional[], unidadId: string): Set<string> {
  const hijos = new Map<string, string[]>();
  for (const u of unidades) {
    if (!u.parent_id) continue;
    (hijos.get(u.parent_id) ?? hijos.set(u.parent_id, []).get(u.parent_id)!).push(u.id);
  }
  const out = new Set<string>([unidadId]);
  const walk = (id: string) => {
    for (const h of hijos.get(id) ?? []) {
      out.add(h);
      walk(h);
    }
  };
  walk(unidadId);
  return out;
}
