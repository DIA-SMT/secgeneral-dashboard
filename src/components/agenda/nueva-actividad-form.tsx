"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { crearActividadPuntual } from "@/lib/actions";
import { COLORES_AGENDA } from "@/lib/colores-agenda";
import type { UnidadOrganizacional } from "@/types/database";

interface Props {
  /** Día sobre el que se carga (YYYY-MM-DD). */
  fecha: string;
  /** Unidades sobre las que este usuario puede cargar. */
  unidades: UnidadOrganizacional[];
  /** Unidad propuesta por defecto (la del usuario, si tiene). */
  unidadPorDefecto: string | null;
}

/**
 * Alta de una actividad puntual en un día del calendario (correcciones 06.08).
 * Se agrega a la agenda de la unidad elegida sin tocar el resto de la semana.
 */
export function NuevaActividadForm({ fecha, unidades, unidadPorDefecto }: Props) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [unidadId, setUnidadId] = useState(unidadPorDefecto ?? unidades[0]?.id ?? "");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [actividad, setActividad] = useState("");
  const [lugar, setLugar] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [color, setColor] = useState<string>("azul");

  if (unidades.length === 0) return null;

  const limpiar = () => {
    setHoraInicio("");
    setHoraFin("");
    setActividad("");
    setLugar("");
    setDescripcion("");
    setError(null);
  };

  const guardar = () => {
    setError(null);
    if (!actividad.trim()) {
      setError("Escribí la actividad");
      return;
    }
    // El horario se guarda como texto (así está el modelo): "09:00" o "09:00 a 11:00".
    const horario = horaInicio ? (horaFin ? `${horaInicio} a ${horaFin}` : horaInicio) : null;

    startTransition(async () => {
      const r = await crearActividadPuntual({
        unidad_id: unidadId,
        fecha,
        actividad: actividad.trim(),
        horario,
        lugar: lugar.trim() || null,
        observacion: descripcion.trim() || null,
        color,
      });
      if (r.success) {
        limpiar();
        setAbierto(false);
        router.refresh();
      } else {
        setError(r.error ?? "No se pudo guardar");
      }
    });
  };

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="text-xs text-primary border border-primary/30 bg-primary/10 hover:bg-primary/20 rounded-lg px-3 py-1.5"
      >
        + Agregar actividad
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
      <p className="text-xs text-muted uppercase tracking-wider">Nueva actividad</p>

      {unidades.length > 1 && (
        <div>
          <label className="text-[11px] text-muted block mb-1">Agenda de</label>
          <select
            value={unidadId}
            onChange={(e) => setUnidadId(e.target.value)}
            className="w-full text-sm bg-background border border-border rounded px-2 py-1.5 text-foreground"
          >
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre_corto ?? u.nombre}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div>
          <label className="text-[11px] text-muted block mb-1">Hora</label>
          <input
            type="time"
            value={horaInicio}
            onChange={(e) => setHoraInicio(e.target.value)}
            className="text-sm bg-background border border-border rounded px-2 py-1.5 text-foreground"
          />
        </div>
        <div>
          <label className="text-[11px] text-muted block mb-1">Hasta (opcional)</label>
          <input
            type="time"
            value={horaFin}
            onChange={(e) => setHoraFin(e.target.value)}
            className="text-sm bg-background border border-border rounded px-2 py-1.5 text-foreground"
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="text-[11px] text-muted block mb-1">Lugar (opcional)</label>
          <input
            type="text"
            value={lugar}
            onChange={(e) => setLugar(e.target.value)}
            placeholder="Ej: Salón de actos"
            className="w-full text-sm bg-background border border-border rounded px-2 py-1.5 text-foreground"
          />
        </div>
      </div>

      <div>
        <label className="text-[11px] text-muted block mb-1">Actividad</label>
        <input
          type="text"
          value={actividad}
          onChange={(e) => setActividad(e.target.value)}
          autoFocus
          placeholder="Ej: Reunión con vecinos del Barrio Sur"
          className="w-full text-sm bg-background border border-border rounded px-2 py-1.5 text-foreground"
        />
      </div>

      <div>
        <label className="text-[11px] text-muted block mb-1">Descripción (opcional)</label>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={2}
          placeholder="Detalle de la actividad..."
          className="w-full text-sm bg-background border border-border rounded px-2 py-1.5 text-foreground"
        />
      </div>

      <div>
        <label className="text-[11px] text-muted block mb-1.5">Color</label>
        <div className="flex flex-wrap gap-2">
          {COLORES_AGENDA.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setColor(c.key)}
              title={c.nombre}
              aria-label={c.nombre}
              aria-pressed={color === c.key}
              className={`h-6 w-6 rounded-full border-2 transition ${
                color === c.key ? "border-foreground scale-110" : "border-transparent hover:scale-105"
              }`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          onClick={guardar}
          disabled={isPending}
          className="text-sm bg-primary text-white rounded-lg px-4 py-1.5 hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? "Guardando..." : "Guardar actividad"}
        </button>
        <button
          onClick={() => {
            setAbierto(false);
            limpiar();
          }}
          className="text-sm text-muted hover:text-foreground"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
