"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { crearProyecto } from "@/lib/actions";
import type { UnidadOrganizacional } from "@/types/database";

interface Props {
  // Para admin: lista de direcciones donde puede crear. Para director: vacío (usa su unidad).
  direcciones?: UnidadOrganizacional[];
  esAdmin: boolean;
  unidadNombre?: string | null;
}

export function NuevoProyectoForm({ direcciones = [], esAdmin, unidadNombre }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [unidadId, setUnidadId] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    if (!nombre.trim()) {
      setError("El nombre del proyecto es obligatorio.");
      return;
    }
    if (esAdmin && !unidadId) {
      setError("Elegí la dirección del proyecto.");
      return;
    }
    startTransition(async () => {
      const r = await crearProyecto({
        nombre,
        objetivo: objetivo || null,
        unidad_id: unidadId, // para director se ignora y usa su unidad
      });
      if (r.success) {
        setNombre("");
        setObjetivo("");
        setOpen(false);
        if (r.id) router.push(`/proyectos/${r.id}`);
        else router.refresh();
      } else {
        setError(r.error ?? "Error al crear");
      }
    });
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm bg-primary text-white rounded-lg px-4 py-2 hover:bg-primary/90 shrink-0"
      >
        + Nuevo proyecto
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3 w-full">
      <p className="text-sm font-semibold text-foreground">Nuevo proyecto</p>
      {!esAdmin && unidadNombre && (
        <p className="text-xs text-muted">Dirección: {unidadNombre}</p>
      )}
      {esAdmin && (
        <div>
          <label className="text-[10px] text-muted uppercase tracking-wider">Dirección</label>
          <select
            value={unidadId}
            onChange={(e) => setUnidadId(e.target.value)}
            className="w-full text-sm bg-background border border-border rounded px-3 py-2 mt-0.5"
          >
            <option value="">Seleccionar...</option>
            {direcciones.map((u) => {
              // Indentación por nivel para leer la jerarquía (Secretaría → Dir).
              const sangria = "  ".repeat(Math.max(0, u.nivel));
              const etiqueta =
                u.nivel === 0 ? " (Secretaría)" : u.nivel === 1 ? " (Subsecretaría)" : "";
              return (
                <option key={u.id} value={u.id}>
                  {sangria}
                  {u.nombre_corto ?? u.nombre}
                  {etiqueta}
                </option>
              );
            })}
          </select>
        </div>
      )}
      <div>
        <label className="text-[10px] text-muted uppercase tracking-wider">Nombre del proyecto</label>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          autoFocus
          className="w-full text-sm bg-background border border-border rounded px-3 py-2 mt-0.5"
        />
      </div>
      <div>
        <label className="text-[10px] text-muted uppercase tracking-wider">Objetivo (opcional)</label>
        <textarea
          value={objetivo}
          onChange={(e) => setObjetivo(e.target.value)}
          rows={2}
          className="w-full text-sm bg-background border border-border rounded px-3 py-2 mt-0.5"
        />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={isPending}
          className="text-sm bg-primary text-white rounded-lg px-4 py-2 hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? "Creando..." : "Crear proyecto"}
        </button>
        <button onClick={() => setOpen(false)} className="text-sm text-muted hover:text-foreground">
          Cancelar
        </button>
      </div>
    </div>
  );
}
