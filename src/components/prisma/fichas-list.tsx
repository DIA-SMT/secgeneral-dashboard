"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { eliminarFichaPrisma } from "@/lib/actions";
import type { FichaPrisma, UnidadOrganizacional } from "@/types/database";

interface Props {
  fichas: (FichaPrisma & { unidad?: UnidadOrganizacional })[];
  puedeEditar: boolean;
}

const FILAS: { key: keyof FichaPrisma; letra: string; label: string }[] = [
  { key: "relevancia", letra: "R", label: "Relevancia" },
  { key: "indicador", letra: "I", label: "Indicador" },
  { key: "secretaria", letra: "S", label: "Secretaría" },
  { key: "meta_anual", letra: "M", label: "Meta anual" },
  { key: "ancla", letra: "A", label: "Ancla (línea de base)" },
];

export function FichasList({ fichas, puedeEditar }: Props) {
  return (
    <div className="space-y-4">
      {fichas.map((f) => (
        <FichaCard key={f.id} ficha={f} puedeEditar={puedeEditar} />
      ))}
    </div>
  );
}

function FichaCard({
  ficha,
  puedeEditar,
}: {
  ficha: FichaPrisma & { unidad?: UnidadOrganizacional };
  puedeEditar: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [eliminada, setEliminada] = useState(false);

  const eliminar = () => {
    if (!confirm(`¿Eliminar la ficha "${ficha.programa}"?`)) return;
    startTransition(async () => {
      const r = await eliminarFichaPrisma(ficha.id);
      if (r.success) setEliminada(true);
    });
  };

  if (eliminada) return null;

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="bg-primary/10 border-b border-border p-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-7 w-7 rounded bg-primary/20 text-primary flex items-center justify-center text-sm font-bold shrink-0">
              P
            </span>
            <h3 className="text-sm font-bold text-foreground line-clamp-1">{ficha.programa}</h3>
          </div>
          <p className="text-[10px] text-muted mt-1 ml-9">
            {ficha.unidad?.nombre_corto ?? ficha.unidad?.nombre ?? ""}
            {ficha.codigo && ` · Código: ${ficha.codigo}`}
          </p>
        </div>
        {puedeEditar && (
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/poa-2027/mis-fichas/${ficha.id}`}
              className="text-xs text-primary hover:text-primary-light"
            >
              ✎ Editar
            </Link>
            <button
              onClick={eliminar}
              disabled={isPending}
              className="text-xs text-danger hover:text-danger/80 disabled:opacity-50"
            >
              ✕ Eliminar
            </button>
          </div>
        )}
      </div>

      <div className="divide-y divide-border/50">
        {FILAS.map((fila) => (
          <div key={fila.key} className="flex gap-3 p-3">
            <div className="w-32 shrink-0 flex items-start gap-2">
              <span className="h-5 w-5 rounded bg-border/50 text-muted flex items-center justify-center text-[10px] font-bold shrink-0">
                {fila.letra}
              </span>
              <span className="text-[11px] font-semibold text-muted">{fila.label}</span>
            </div>
            <p className="flex-1 text-xs text-foreground whitespace-pre-wrap">
              {(ficha[fila.key] as string) || <span className="text-muted/50 italic">—</span>}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
