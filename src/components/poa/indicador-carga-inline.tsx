"use client";

import { useState, useTransition } from "react";
import { actualizarIndicador } from "@/lib/actions";

interface Props {
  indicadorId: string;
  proyectoId: string;
  valorActual: number | null;
  valorObjetivo: number | null;
  unidadMedida: string | null;
  onClose: () => void;
}

export function IndicadorCargaInline({
  indicadorId,
  proyectoId,
  valorActual,
  valorObjetivo,
  unidadMedida,
  onClose,
}: Props) {
  const [valor, setValor] = useState(valorActual?.toString() ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    const num = Number(valor);
    if (!isFinite(num)) {
      setError("Número inválido (sin signo %)");
      return;
    }
    startTransition(async () => {
      const r = await actualizarIndicador({
        indicador_id: indicadorId,
        valor_actual: num,
        proyecto_id: proyectoId,
      });
      if (r.success) onClose();
      else setError(r.error ?? "Error");
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 bg-background border border-border rounded p-2">
      <input
        type="number"
        step="any"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder={valorObjetivo != null ? `Objetivo: ${valorObjetivo}` : "Valor"}
        autoFocus
        className="w-24 text-xs bg-surface border border-border rounded px-2 py-1 text-foreground"
      />
      <span className="text-[10px] text-muted">{unidadMedida ?? ""}</span>
      <button
        onClick={submit}
        disabled={isPending || !valor}
        className="text-[10px] bg-primary text-white rounded px-2 py-1 hover:bg-primary/90 disabled:opacity-50"
      >
        {isPending ? "..." : "Guardar"}
      </button>
      <button onClick={onClose} className="text-[10px] text-muted hover:text-foreground">
        ✕
      </button>
      {error && <p className="text-[10px] text-danger w-full">{error}</p>}
    </div>
  );
}
