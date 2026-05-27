"use client";

import { useEffect, useState } from "react";
import type { UnidadOrganizacional, AgendaSemana, AgendaActividad } from "@/types/database";

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

interface Props {
  unidades: UnidadOrganizacional[];
  agendas: Record<string, AgendaSemana & { actividades?: AgendaActividad[] }>;
  fechaLunes: string;
}

export function TotemRotator({ unidades, agendas, fechaLunes }: Props) {
  const [idx, setIdx] = useState(0);
  const conAgenda = unidades.filter((u) => agendas[u.id]);

  useEffect(() => {
    if (conAgenda.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % conAgenda.length), 20000);
    return () => clearInterval(t);
  }, [conAgenda.length]);

  if (conAgenda.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <p className="text-sm text-muted">Sin agendas cargadas para esta semana</p>
      </div>
    );
  }

  const unidad = conAgenda[idx];
  const agenda = agendas[unidad.id];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{unidad.nombre}</h1>
          <p className="text-sm text-muted mt-1">Agenda semanal — semana del {fechaLunes}</p>
        </div>
        <div className="flex items-center gap-2">
          {conAgenda.map((_, i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === idx ? "w-8 bg-primary" : "w-2 bg-muted/30"
              }`}
            />
          ))}
        </div>
      </div>

      {agenda.formato_libre ? (
        <div className="rounded-xl border border-border bg-surface p-6">
          <pre className="whitespace-pre-wrap text-base text-foreground font-sans">{agenda.formato_libre}</pre>
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-3">
          {DIAS.map((dia, i) => {
            const diaSemana = i + 1;
            const actividades = (agenda.actividades ?? []).filter((a) => a.dia_semana === diaSemana);
            const esFeriado = actividades.some((a) => a.es_feriado);
            return (
              <div key={dia} className="rounded-xl border border-border bg-surface p-3 flex flex-col min-h-[400px]">
                <p className="text-sm font-bold text-foreground uppercase border-b border-border pb-2 mb-2">{dia}</p>
                {esFeriado ? (
                  <div className="flex-1 flex items-center justify-center">
                    <span className="text-xs font-bold text-warning bg-warning/10 px-3 py-2 rounded">FERIADO</span>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {actividades.map((a) => (
                      <li key={a.id} className="text-xs border-l-2 border-primary/30 pl-2">
                        <p className="font-semibold text-foreground">{a.actividad}</p>
                        {a.lugar && <p className="text-muted mt-0.5">{a.lugar}</p>}
                        {a.horario && <p className="text-muted">{a.horario}</p>}
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
