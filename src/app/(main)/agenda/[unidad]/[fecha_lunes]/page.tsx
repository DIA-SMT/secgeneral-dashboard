import { getAgendaSemana, getUnidades } from "@/lib/queries";
import { BackButton } from "@/components/layout/back-button";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 0;

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export default async function AgendaTotemPage({
  params,
}: {
  params: Promise<{ unidad: string; fecha_lunes: string }>;
}) {
  const { unidad, fecha_lunes } = await params;
  const [agenda, unidades] = await Promise.all([
    getAgendaSemana(unidad, fecha_lunes),
    getUnidades(),
  ]);

  const unidadObj = unidades.find((u) => u.id === unidad);
  if (!unidadObj) notFound();

  // Calcular fechas de cada día
  const lunesDate = new Date(fecha_lunes + "T00:00:00");
  const fechasDia = DIAS.map((_, i) => {
    const d = new Date(lunesDate);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <BackButton fallback="/agenda" />
        <Link
          href={`/agenda/cargar?unidad=${unidad}&semana=${fecha_lunes}`}
          className="text-xs text-primary border border-primary/30 bg-primary/10 hover:bg-primary/20 rounded-lg px-3 py-1.5"
        >
          ✎ Editar
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">{unidadObj.nombre}</h1>
        <p className="text-sm text-muted mt-1">Agenda semanal — semana del {fecha_lunes}</p>
      </div>

      {!agenda ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <p className="text-sm text-muted">Sin agenda cargada para esta semana</p>
          <Link
            href={`/agenda/cargar?unidad=${unidad}&semana=${fecha_lunes}`}
            className="inline-block mt-3 text-xs text-primary hover:text-primary-light"
          >
            Cargar agenda →
          </Link>
        </div>
      ) : agenda.formato_libre ? (
        <div className="rounded-xl border border-border bg-surface p-6">
          <p className="text-xs text-muted uppercase tracking-wider mb-3">Plan semanal</p>
          <pre className="whitespace-pre-wrap text-sm text-foreground font-sans">{agenda.formato_libre}</pre>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
          {DIAS.map((dia, i) => {
            const diaSemana = i + 1;
            const actividades = (agenda.actividades ?? []).filter((a) => a.dia_semana === diaSemana);
            const esFeriado = actividades.some((a) => a.es_feriado);
            return (
              <div key={dia} className="rounded-xl border border-border bg-surface p-3 flex flex-col">
                <div className="border-b border-border pb-2 mb-2">
                  <p className="text-xs font-bold text-foreground uppercase">{dia}</p>
                  <p className="text-[10px] text-muted">{fechasDia[i]}</p>
                </div>
                {esFeriado ? (
                  <div className="flex-1 flex items-center justify-center">
                    <span className="text-[11px] font-bold text-warning bg-warning/10 px-2 py-1 rounded">FERIADO</span>
                  </div>
                ) : actividades.length === 0 ? (
                  <p className="text-[10px] text-muted/40 italic">Sin actividades</p>
                ) : (
                  <ul className="space-y-2 flex-1">
                    {actividades.map((a) => (
                      <li key={a.id} className="text-[11px] border-l-2 border-primary/30 pl-2">
                        <p className="font-semibold text-foreground line-clamp-3">{a.actividad}</p>
                        {a.lugar && <p className="text-muted mt-0.5"><span className="text-muted/60">Lugar:</span> {a.lugar}</p>}
                        {a.horario && <p className="text-muted"><span className="text-muted/60">Horario:</span> {a.horario}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
