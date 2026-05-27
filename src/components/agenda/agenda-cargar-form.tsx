"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { guardarAgendaSemana } from "@/lib/actions";
import type { AgendaSemana, AgendaActividad, UnidadOrganizacional } from "@/types/database";

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

interface ActividadLocal {
  id: string;
  dia_semana: number;
  orden: number;
  es_feriado: boolean;
  actividad: string;
  lugar: string;
  horario: string;
}

interface Props {
  unidades: UnidadOrganizacional[];
  unidadInicial: string;
  fechaLunes: string;
  agendaInicial: (AgendaSemana & { actividades?: AgendaActividad[] }) | null;
}

let uid = 0;
const nextId = () => `tmp-${++uid}`;

export function AgendaCargarForm({ unidades, unidadInicial, fechaLunes, agendaInicial }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [unidadId, setUnidadId] = useState(unidadInicial);
  const [modo, setModo] = useState<"grilla" | "libre">(
    agendaInicial?.formato_libre ? "libre" : "grilla"
  );
  const [formatoLibre, setFormatoLibre] = useState(agendaInicial?.formato_libre ?? "");

  const [actividades, setActividades] = useState<ActividadLocal[]>(() =>
    (agendaInicial?.actividades ?? []).map((a) => ({
      id: a.id,
      dia_semana: a.dia_semana,
      orden: a.orden,
      es_feriado: a.es_feriado,
      actividad: a.actividad,
      lugar: a.lugar ?? "",
      horario: a.horario ?? "",
    }))
  );

  const sortByName = (a: UnidadOrganizacional, b: UnidadOrganizacional) =>
    (a.nombre_corto ?? a.nombre).localeCompare(b.nombre_corto ?? b.nombre);
  const subsecretarias = unidades.filter((u) => u.nivel === 1).sort(sortByName);
  const direcciones = unidades.filter((u) => u.nivel >= 2).sort(sortByName);

  const cambiarUnidad = (nuevoId: string) => {
    if (actividades.length > 0 || formatoLibre) {
      if (!confirm("Cambiar de unidad descartará los cambios sin guardar. ¿Continuar?")) return;
    }
    router.push(`/agenda/cargar?unidad=${nuevoId}&semana=${fechaLunes}`);
  };

  const agregarActividad = (dia: number) => {
    setActividades((prev) => [
      ...prev,
      {
        id: nextId(),
        dia_semana: dia,
        orden: prev.filter((a) => a.dia_semana === dia).length,
        es_feriado: false,
        actividad: "",
        lugar: "",
        horario: "",
      },
    ]);
  };

  const marcarFeriado = (dia: number) => {
    setActividades((prev) => [
      ...prev.filter((a) => a.dia_semana !== dia),
      { id: nextId(), dia_semana: dia, orden: 0, es_feriado: true, actividad: "FERIADO", lugar: "", horario: "" },
    ]);
  };

  const actualizar = (id: string, campo: keyof ActividadLocal, valor: string | boolean) => {
    setActividades((prev) => prev.map((a) => (a.id === id ? { ...a, [campo]: valor } : a)));
  };

  const eliminar = (id: string) => {
    setActividades((prev) => prev.filter((a) => a.id !== id));
  };

  const guardar = () => {
    setError(null);
    setSaved(false);
    if (!unidadId) {
      setError("Seleccioná una unidad");
      return;
    }
    startTransition(async () => {
      const result = await guardarAgendaSemana({
        unidad_id: unidadId,
        fecha_lunes: fechaLunes,
        formato_libre: modo === "libre" ? formatoLibre : null,
        actividades: modo === "grilla"
          ? actividades.filter((a) => a.actividad.trim()).map((a, i) => ({
              dia_semana: a.dia_semana,
              orden: i,
              es_feriado: a.es_feriado,
              actividad: a.actividad,
              lugar: a.lugar || null,
              horario: a.horario || null,
            }))
          : [],
      });
      if (result.success) {
        setSaved(true);
        router.push(`/agenda/${unidadId}/${fechaLunes}`);
      } else {
        setError(result.error ?? "Error al guardar");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface p-4 flex flex-wrap items-center gap-3">
        <label className="text-xs text-muted">Unidad:</label>
        <select
          value={unidadId}
          onChange={(e) => cambiarUnidad(e.target.value)}
          className="text-sm bg-background border border-border rounded-lg px-3 py-1.5 text-foreground"
        >
          <option value="">Seleccionar...</option>
          {subsecretarias.length > 0 && (
            <optgroup label="Subsecretarías">
              {subsecretarias.map((u) => (
                <option key={u.id} value={u.id}>{u.nombre_corto ?? u.nombre}</option>
              ))}
            </optgroup>
          )}
          <optgroup label="Direcciones">
            {direcciones.map((u) => (
              <option key={u.id} value={u.id}>{u.nombre_corto ?? u.nombre}</option>
            ))}
          </optgroup>
        </select>

        <div className="flex gap-1 ml-auto">
          <button
            onClick={() => setModo("grilla")}
            className={`text-xs px-3 py-1.5 rounded-lg border ${modo === "grilla" ? "bg-primary/20 text-primary border-primary/30" : "border-border text-muted"}`}
          >
            Grilla por día
          </button>
          <button
            onClick={() => setModo("libre")}
            className={`text-xs px-3 py-1.5 rounded-lg border ${modo === "libre" ? "bg-primary/20 text-primary border-primary/30" : "border-border text-muted"}`}
          >
            Formato libre
          </button>
        </div>
      </div>

      {modo === "libre" ? (
        <textarea
          value={formatoLibre}
          onChange={(e) => setFormatoLibre(e.target.value)}
          rows={12}
          placeholder="Plan semanal en formato libre (ej: Envío a impresión POA Ambiente, tablero de monitoreo, etc.)"
          className="w-full bg-surface border border-border rounded-xl p-4 text-sm text-foreground"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
          {DIAS.map((dia, i) => {
            const diaSemana = i + 1;
            const acts = actividades.filter((a) => a.dia_semana === diaSemana);
            const esFeriado = acts.some((a) => a.es_feriado);
            return (
              <div key={dia} className="rounded-xl border border-border bg-surface p-3 flex flex-col min-h-[200px]">
                <div className="border-b border-border pb-2 mb-2 flex items-center justify-between">
                  <p className="text-xs font-bold text-foreground uppercase">{dia}</p>
                  {!esFeriado && (
                    <button
                      onClick={() => marcarFeriado(diaSemana)}
                      title="Marcar feriado"
                      className="text-[9px] text-muted hover:text-warning"
                    >
                      Feriado
                    </button>
                  )}
                </div>
                {esFeriado ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2">
                    <span className="text-[11px] font-bold text-warning bg-warning/10 px-2 py-1 rounded">FERIADO</span>
                    <button
                      onClick={() => setActividades((p) => p.filter((a) => a.dia_semana !== diaSemana))}
                      className="text-[9px] text-muted hover:text-foreground"
                    >
                      Quitar feriado
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 flex-1">
                      {acts.map((a) => (
                        <div key={a.id} className="border-l-2 border-primary/30 pl-2 space-y-1">
                          <input
                            value={a.actividad}
                            onChange={(e) => actualizar(a.id, "actividad", e.target.value)}
                            placeholder="Actividad"
                            className="w-full text-[11px] bg-background border border-border rounded px-1.5 py-0.5 text-foreground"
                          />
                          <input
                            value={a.lugar}
                            onChange={(e) => actualizar(a.id, "lugar", e.target.value)}
                            placeholder="Lugar"
                            className="w-full text-[10px] bg-background border border-border rounded px-1.5 py-0.5 text-foreground"
                          />
                          <input
                            value={a.horario}
                            onChange={(e) => actualizar(a.id, "horario", e.target.value)}
                            placeholder="Horario"
                            className="w-full text-[10px] bg-background border border-border rounded px-1.5 py-0.5 text-foreground"
                          />
                          <button
                            onClick={() => eliminar(a.id)}
                            className="text-[9px] text-danger hover:text-danger/80"
                          >
                            Eliminar
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => agregarActividad(diaSemana)}
                      className="mt-2 text-[10px] text-primary hover:text-primary-light text-left"
                    >
                      + Actividad
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
      {saved && <p className="text-sm text-success">✓ Guardado</p>}

      <div className="flex gap-2">
        <button
          onClick={guardar}
          disabled={isPending || !unidadId}
          className="text-sm bg-primary text-white rounded-lg px-4 py-2 hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? "Guardando..." : "Guardar agenda"}
        </button>
        <button
          onClick={() => router.push("/agenda")}
          className="text-sm text-muted hover:text-foreground border border-border rounded-lg px-4 py-2"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
