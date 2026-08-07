import Link from "next/link";
import type { EventoAgenda } from "@/lib/queries";
import type { VistaCalendario } from "./calendario-toolbar";
import { estiloChip, hexDeColor } from "@/lib/colores-agenda";
import { BorrarActividadBoton } from "./borrar-actividad-boton";

const DIAS_CORTOS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// Paleta de las "agendas" (una por unidad), al estilo de los calendarios con
// varios calendarios superpuestos. Se asigna por posición, no por nombre.
const PALETA = [
  { chip: "bg-primary/15 text-primary border-primary/25", punto: "bg-primary" },
  { chip: "bg-success/15 text-success border-success/25", punto: "bg-success" },
  { chip: "bg-accent/15 text-accent border-accent/25", punto: "bg-accent" },
  { chip: "bg-warning/15 text-warning border-warning/25", punto: "bg-warning" },
  { chip: "bg-info/15 text-info border-info/25", punto: "bg-info" },
];

export function colorDeUnidad(unidadId: string, indice: number) {
  return PALETA[indice % PALETA.length] ?? PALETA[0];
}

interface Props {
  vista: VistaCalendario;
  /** Días que se muestran, en orden (YYYY-MM-DD). */
  dias: string[];
  eventos: EventoAgenda[];
  /** Mes de referencia (0-11) — en vista mes, los días de otro mes se atenúan. */
  mesReferencia: number;
  hoy: string;
  /** índice de color por unidad, calculado una vez en la página. */
  indicePorUnidad: Record<string, number>;
  /** Unidades sobre las que el usuario puede cargar (habilita borrar). */
  unidadesEditables?: string[];
  /** Formulario de alta para el día en foco (solo vista día). */
  altaDelDia?: React.ReactNode;
}

export function CalendarioVista({
  vista,
  dias,
  eventos,
  mesReferencia,
  hoy,
  indicePorUnidad,
  unidadesEditables,
  altaDelDia,
}: Props) {
  const editables = new Set(unidadesEditables ?? []);
  const puedeCargar = editables.size > 0;
  const porDia = new Map<string, EventoAgenda[]>();
  for (const e of eventos) {
    (porDia.get(e.fecha) ?? porDia.set(e.fecha, []).get(e.fecha)!).push(e);
  }

  if (vista === "dia") {
    const fecha = dias[0];
    const delDia = porDia.get(fecha) ?? [];
    return (
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-border/20 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-foreground capitalize">
              {legibleLargo(fecha)}
            </p>
            <p className="text-[11px] text-muted">
              {delDia.length} {delDia.length === 1 ? "actividad" : "actividades"}
            </p>
          </div>
        </div>
        {delDia.length === 0 ? (
          <p className="p-6 text-sm text-muted text-center">Sin actividades cargadas para este día.</p>
        ) : (
          <ul className="divide-y divide-border">
            {delDia.map((e) => (
              <li key={e.id} className="p-3">
                <EventoFila
                  evento={e}
                  indicePorUnidad={indicePorUnidad}
                  editable={editables.has(e.unidad_id)}
                />
              </li>
            ))}
          </ul>
        )}
        {altaDelDia && <div className="p-3 border-t border-border">{altaDelDia}</div>}
      </div>
    );
  }

  if (vista === "semana") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
        {dias.map((fecha, i) => {
          const delDia = porDia.get(fecha) ?? [];
          const esHoy = fecha === hoy;
          return (
            <div
              key={fecha}
              className={`rounded-xl border bg-surface min-h-[220px] flex flex-col ${
                esHoy ? "border-primary/50" : "border-border"
              }`}
            >
              <div
                className={`px-2 py-1.5 border-b text-center ${
                  esHoy ? "border-primary/30 bg-primary/10" : "border-border"
                }`}
              >
                <p className="text-[10px] text-muted uppercase tracking-wider">{DIAS_CORTOS[i]}</p>
                <p className={`text-sm font-bold ${esHoy ? "text-primary" : "text-foreground"}`}>
                  {Number(fecha.slice(8, 10))}
                </p>
              </div>
              <div className="p-1.5 space-y-1 flex-1 flex flex-col">
                <div className="space-y-1 flex-1">
                  {delDia.map((e) => (
                    <EventoChip key={e.id} evento={e} indicePorUnidad={indicePorUnidad} />
                  ))}
                  {delDia.length === 0 && (
                    <p className="text-[10px] text-muted/50 text-center pt-4">—</p>
                  )}
                </div>
                {puedeCargar && (
                  <Link
                    href={{ pathname: "/agenda", query: { vista: "dia", fecha } }}
                    className="text-[10px] text-muted hover:text-primary text-center pt-1"
                  >
                    + actividad
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Vista mes
  const semanas: string[][] = [];
  for (let i = 0; i < dias.length; i += 7) semanas.push(dias.slice(i, i + 7));

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="grid grid-cols-7 bg-border/20 border-b border-border">
        {DIAS_CORTOS.map((d) => (
          <div key={d} className="px-2 py-2 text-[10px] text-muted uppercase tracking-wider text-center">
            {d}
          </div>
        ))}
      </div>
      <div>
        {semanas.map((semana, si) => (
          <div key={si} className="grid grid-cols-7 border-b border-border last:border-b-0">
            {semana.map((fecha) => {
              const delDia = porDia.get(fecha) ?? [];
              const esHoy = fecha === hoy;
              const otroMes = Number(fecha.slice(5, 7)) - 1 !== mesReferencia;
              const visibles = delDia.slice(0, 3);
              const resto = delDia.length - visibles.length;
              return (
                <div
                  key={fecha}
                  className={`min-h-[110px] border-r border-border last:border-r-0 p-1.5 ${
                    otroMes ? "bg-background/40" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    {puedeCargar ? (
                      <Link
                        href={{ pathname: "/agenda", query: { vista: "dia", fecha } }}
                        title="Agregar actividad en este día"
                        className={`text-[11px] h-5 w-5 rounded inline-flex items-center justify-center ${
                          otroMes ? "text-muted/30" : "text-muted/60 hover:text-primary hover:bg-primary/10"
                        }`}
                      >
                        +
                      </Link>
                    ) : (
                      <span />
                    )}
                    <Link
                      href={{ pathname: "/agenda", query: { vista: "dia", fecha } }}
                      className={`text-[11px] h-5 min-w-5 px-1 rounded-full inline-flex items-center justify-center ${
                        esHoy
                          ? "bg-primary text-white font-bold"
                          : otroMes
                          ? "text-muted/50"
                          : "text-muted hover:text-foreground"
                      }`}
                    >
                      {Number(fecha.slice(8, 10))}
                    </Link>
                  </div>
                  <div className="space-y-1">
                    {visibles.map((e) => (
                      <EventoChip key={e.id} evento={e} indicePorUnidad={indicePorUnidad} compacto />
                    ))}
                    {resto > 0 && (
                      <Link
                        href={{ pathname: "/agenda", query: { vista: "dia", fecha } }}
                        className="block text-[10px] text-muted hover:text-primary pl-1"
                      >
                        +{resto} más
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function EventoChip({
  evento,
  indicePorUnidad,
  compacto = false,
}: {
  evento: EventoAgenda;
  indicePorUnidad: Record<string, number>;
  compacto?: boolean;
}) {
  // El color propio de la actividad (06.08) manda sobre el de la unidad.
  const hex = hexDeColor(evento.color);
  const color = colorDeUnidad(evento.unidad_id, indicePorUnidad[evento.unidad_id] ?? 0);
  return (
    <Link
      href={`/agenda/${evento.unidad_id}/${evento.fecha_lunes}`}
      title={`${evento.horario ? evento.horario + " · " : ""}${evento.actividad}${
        evento.lugar ? ` · ${evento.lugar}` : ""
      } — ${evento.unidad_nombre}`}
      style={hex ? estiloChip(hex) : undefined}
      className={`block rounded border px-1.5 py-1 hover:brightness-125 transition ${
        hex ? "" : color.chip
      } ${evento.es_feriado ? "opacity-70 italic" : ""}`}
    >
      <p className={`${compacto ? "text-[10px]" : "text-[11px]"} font-medium line-clamp-1`}>
        {evento.horario ? <span className="opacity-80">{evento.horario} </span> : null}
        {evento.actividad}
      </p>
      {!compacto && (
        <p className="text-[9px] opacity-70 line-clamp-1">{evento.unidad_nombre}</p>
      )}
    </Link>
  );
}

function EventoFila({
  evento,
  indicePorUnidad,
  editable = false,
}: {
  evento: EventoAgenda;
  indicePorUnidad: Record<string, number>;
  editable?: boolean;
}) {
  const hex = hexDeColor(evento.color);
  const color = colorDeUnidad(evento.unidad_id, indicePorUnidad[evento.unidad_id] ?? 0);
  return (
    <div className="flex items-start gap-3">
      <Link
        href={`/agenda/${evento.unidad_id}/${evento.fecha_lunes}`}
        className="flex items-start gap-3 group flex-1 min-w-0"
      >
        <span
          className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${hex ? "" : color.punto}`}
          style={hex ? { backgroundColor: hex } : undefined}
        />
        <span className="w-20 shrink-0 text-xs text-muted">{evento.horario ?? "—"}</span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm text-foreground group-hover:text-primary">
            {evento.actividad}
          </span>
          <span className="block text-[11px] text-muted">
            {evento.unidad_nombre}
            {evento.lugar ? ` · ${evento.lugar}` : ""}
          </span>
          {evento.observacion && (
            <span className="block text-[11px] text-muted/80 italic mt-0.5">{evento.observacion}</span>
          )}
        </span>
      </Link>
      {editable && <BorrarActividadBoton actividadId={evento.id} actividad={evento.actividad} />}
    </div>
  );
}

function legibleLargo(fechaIso: string): string {
  return new Date(fechaIso + "T00:00:00").toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
