"use client";

import { useState, useTransition } from "react";
import { validarAvance, observarAvance } from "@/lib/actions";

export function ValidarButtons({ avanceId }: { avanceId: string }) {
  const [observando, setObservando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const validar = () => {
    setError(null);
    startTransition(async () => {
      const r = await validarAvance(avanceId);
      if (!r.success) setError(r.error ?? "Error al validar");
    });
  };

  const observar = () => {
    setError(null);
    startTransition(async () => {
      const r = await observarAvance(avanceId, motivo);
      if (!r.success) setError(r.error ?? "Error al observar");
      else {
        setObservando(false);
        setMotivo("");
      }
    });
  };

  return (
    <div className="mt-3 border-t border-border pt-3">
      {!observando ? (
        <div className="flex items-center gap-2">
          <button
            onClick={validar}
            disabled={isPending}
            className="text-xs bg-success/20 text-success border border-success/30 rounded-lg px-3 py-1.5 hover:bg-success/30 disabled:opacity-50"
          >
            {isPending ? "..." : "✓ Validar"}
          </button>
          <button
            onClick={() => setObservando(true)}
            className="text-xs bg-warning/20 text-warning border border-warning/30 rounded-lg px-3 py-1.5 hover:bg-warning/30"
          >
            ! Observar
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            placeholder="Motivo de la observación (obligatorio)"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={2}
            className="w-full text-xs bg-background border border-border rounded px-2 py-1 text-foreground"
          />
          <div className="flex gap-2">
            <button
              onClick={observar}
              disabled={isPending || !motivo.trim()}
              className="text-xs bg-warning/20 text-warning border border-warning/30 rounded px-3 py-1 hover:bg-warning/30 disabled:opacity-50"
            >
              {isPending ? "..." : "Enviar observación"}
            </button>
            <button
              onClick={() => {
                setObservando(false);
                setMotivo("");
                setError(null);
              }}
              className="text-xs text-muted hover:text-foreground"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-xs text-danger mt-2">{error}</p>}
    </div>
  );
}
