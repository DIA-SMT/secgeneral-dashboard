"use client";

import { useState, useTransition } from "react";
import { completarHito } from "@/lib/actions";

interface HitoActionsProps {
  hitoId: string;
  proyectoId: string;
  completado: boolean;
}

export function HitoActions({ hitoId, proyectoId, completado }: HitoActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  if (completado || done) return null;

  return (
    <button
      onClick={() => {
        startTransition(async () => {
          const result = await completarHito({
            proyecto_id: proyectoId,
            hito_id: hitoId,
          });
          if (result.success) setDone(true);
        });
      }}
      disabled={isPending}
      className="text-[10px] font-medium text-primary hover:text-primary-light transition-colors disabled:opacity-40 ml-2"
    >
      {isPending ? "..." : "✓ Completar"}
    </button>
  );
}
