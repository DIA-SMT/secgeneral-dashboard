"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { editarProyecto, eliminarProyecto } from "@/lib/actions";

interface Props {
  proyectoId: string;
  nombreActual: string;
}

export function ProyectoAcciones({ proyectoId, nombreActual }: Props) {
  const router = useRouter();
  const [modo, setModo] = useState<"idle" | "editar" | "eliminar">("idle");
  const [nombre, setNombre] = useState(nombreActual);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const guardarNombre = () => {
    setError(null);
    if (!nombre.trim()) {
      setError("El nombre no puede quedar vacío.");
      return;
    }
    startTransition(async () => {
      const r = await editarProyecto({ proyecto_id: proyectoId, nombre });
      if (r.success) {
        setModo("idle");
        router.refresh();
      } else {
        setError(r.error ?? "Error al guardar");
      }
    });
  };

  const confirmarEliminar = () => {
    setError(null);
    startTransition(async () => {
      const r = await eliminarProyecto({ proyecto_id: proyectoId });
      if (r.success) {
        router.push("/proyectos");
      } else {
        setError(r.error ?? "Error al eliminar");
      }
    });
  };

  if (modo === "editar") {
    return (
      <div className="flex flex-col gap-2 w-full max-w-xl">
        <label className="text-[10px] text-muted uppercase tracking-wider">Nombre del proyecto</label>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          autoFocus
          className="w-full text-sm bg-background border border-border rounded px-3 py-2"
        />
        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={guardarNombre}
            disabled={isPending}
            className="text-sm bg-primary text-white rounded-lg px-4 py-2 hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? "Guardando..." : "Guardar"}
          </button>
          <button
            onClick={() => {
              setNombre(nombreActual);
              setError(null);
              setModo("idle");
            }}
            className="text-sm text-muted hover:text-foreground"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  if (modo === "eliminar") {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-danger/30 bg-danger/5 p-3 w-full max-w-xl">
        <p className="text-sm text-foreground">
          ¿Eliminar este proyecto? Se ocultará junto con sus metas e indicadores. Usalo solo para
          proyectos que no se ejecutarán.
        </p>
        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={confirmarEliminar}
            disabled={isPending}
            className="text-sm bg-danger text-white rounded-lg px-4 py-2 hover:bg-danger/90 disabled:opacity-50"
          >
            {isPending ? "Eliminando..." : "Sí, eliminar"}
          </button>
          <button
            onClick={() => {
              setError(null);
              setModo("idle");
            }}
            className="text-sm text-muted hover:text-foreground"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => setModo("editar")}
        className="text-xs text-muted hover:text-primary transition-colors inline-flex items-center gap-1"
      >
        <span aria-hidden>✎</span> Editar nombre
      </button>
      <button
        onClick={() => setModo("eliminar")}
        className="text-xs text-muted hover:text-danger transition-colors inline-flex items-center gap-1"
      >
        <span aria-hidden>✕</span> Eliminar
      </button>
    </div>
  );
}
