"use client";

import { useState, useTransition } from "react";
import { actualizarIndicador } from "@/lib/actions";

interface Props {
  indicadorId: string;
  proyectoId: string;
  valorActual: number | null;
  valorObjetivo: number | null;
  unidadMedida: string | null;
  puedeCargar: boolean;
}

export function IndicadorCargaForm({
  indicadorId,
  proyectoId,
  valorActual,
  valorObjetivo,
  unidadMedida,
  puedeCargar,
}: Props) {
  const [open, setOpen] = useState(false);
  const [valor, setValor] = useState(valorActual?.toString() ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const submit = () => {
    setError(null);
    setSaved(false);
    const num = Number(valor);
    if (!isFinite(num)) {
      setError("Ingresá un número válido. Para porcentajes usá '45' o '45.5' (sin signo %)");
      return;
    }
    startTransition(async () => {
      const r = await actualizarIndicador({
        indicador_id: indicadorId,
        valor_actual: num,
        proyecto_id: proyectoId,
      });
      if (r.success) {
        setSaved(true);
        setTimeout(() => {
          setSaved(false);
          setOpen(false);
        }, 1200);
      } else {
        setError(r.error ?? "Error al guardar");
      }
    });
  };

  if (!puedeCargar) {
    return (
      <p className="text-xs text-muted italic">
        Solo el Director de esta unidad o un Admin Funcional puede cargar este indicador.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm bg-primary/20 text-primary border border-primary/30 rounded-lg px-4 py-2 hover:bg-primary/30 transition-colors"
      >
        ✎ Cargar / actualizar valor
      </button>
    );
  }

  return (
    <div className="space-y-3 p-4 bg-background border border-border rounded-lg">
      <div>
        <label className="text-xs text-muted uppercase tracking-wider">
          Nuevo valor {unidadMedida && <span>({unidadMedida})</span>}
        </label>
        <input
          type="number"
          step="any"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          autoFocus
          placeholder={valorObjetivo != null ? `Objetivo: ${valorObjetivo}` : "Ingresá un valor"}
          className="mt-1 w-full text-sm bg-surface border border-border rounded px-3 py-2 text-foreground"
        />
        <p className="text-[10px] text-muted mt-1">
          Para porcentajes ingresá el número sin signo (ej. 45 = 45%).
        </p>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}
      {saved && <p className="text-xs text-success">✓ Guardado correctamente</p>}

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={isPending || !valor}
          className="text-sm bg-primary text-white rounded px-4 py-1.5 hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? "Guardando..." : "Guardar"}
        </button>
        <button
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="text-sm text-muted hover:text-foreground"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
