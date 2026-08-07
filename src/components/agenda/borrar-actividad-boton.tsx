"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { borrarActividadAgenda } from "@/lib/actions";

export function BorrarActividadBoton({
  actividadId,
  actividad,
}: {
  actividadId: string;
  actividad: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const borrar = () => {
    if (!confirm(`¿Borrar la actividad "${actividad}"?`)) return;
    startTransition(async () => {
      const r = await borrarActividadAgenda(actividadId);
      if (r.success) router.refresh();
      else alert(r.error ?? "No se pudo borrar");
    });
  };

  return (
    <button
      onClick={borrar}
      disabled={isPending}
      title="Borrar actividad"
      aria-label={`Borrar ${actividad}`}
      className="text-xs text-muted hover:text-danger disabled:opacity-50 shrink-0 px-1"
    >
      ✕
    </button>
  );
}
