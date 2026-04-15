"use client";

import { useState, useTransition } from "react";
import { cargarAvance } from "@/lib/actions";
import type { Meta, NivelEscala } from "@/types/database";

interface AvanceFormProps {
  meta: Meta;
  proyectoId: string;
  onClose: () => void;
}

export function AvanceForm({ meta, proyectoId, onClose }: AvanceFormProps) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [valorNum, setValorNum] = useState<string>("");
  const [valorCual, setValorCual] = useState<string>("");
  const [observacion, setObservacion] = useState<string>("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await cargarAvance({
        proyecto_id: proyectoId,
        meta_id: meta.id,
        tipo_medicion: meta.tipo_medicion,
        valor_numerico: meta.tipo_medicion === "cuantitativo" && valorNum ? Number(valorNum) : null,
        valor_cualitativo: meta.tipo_medicion === "cualitativo" ? valorCual : null,
        observacion: observacion || null,
      });

      if (result.success) {
        setDone(true);
        setTimeout(() => onClose(), 1200);
      } else {
        setError(result.error ?? "Error al cargar el avance");
      }
    });
  }

  if (done) {
    return (
      <div className="rounded-xl border border-success/30 bg-success/5 p-4 text-center">
        <p className="text-success font-semibold">✓ Avance cargado correctamente</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-primary font-semibold uppercase tracking-wider">Cargar avance</p>
        <button type="button" onClick={onClose} className="text-xs text-muted hover:text-foreground">✕</button>
      </div>

      {/* Campo segun tipo */}
      {meta.tipo_medicion === "cuantitativo" && (
        <div>
          <label className="text-xs text-muted block mb-1">
            Valor actual {meta.unidad_medida ? `(${meta.unidad_medida})` : ""}
            {meta.valor_actual != null && (
              <span className="text-muted/50 ml-1">— anterior: {meta.valor_actual}</span>
            )}
          </label>
          <input
            type="number"
            step="any"
            value={valorNum}
            onChange={(e) => setValorNum(e.target.value)}
            placeholder={meta.valor_meta != null ? `Objetivo: ${meta.valor_meta}` : "Valor"}
            required
            className="w-full text-sm bg-surface border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted/40 focus:outline-none focus:border-primary/50"
          />
        </div>
      )}

      {meta.tipo_medicion === "cualitativo" && meta.escala_cualitativa && (
        <div>
          <label className="text-xs text-muted block mb-1.5">
            Nivel actual
            {meta.nivel_actual && (
              <span className="text-muted/50 ml-1">— anterior: {meta.nivel_actual}</span>
            )}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {meta.escala_cualitativa.niveles.map((nivel: NivelEscala) => (
              <button
                key={nivel.clave}
                type="button"
                onClick={() => setValorCual(nivel.clave)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors
                  ${valorCual === nivel.clave
                    ? "bg-primary/20 border-primary/40 text-primary font-semibold"
                    : "border-border text-muted hover:text-foreground hover:border-border"
                  }`}
              >
                {nivel.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {meta.tipo_medicion === "hito_unico" && (
        <p className="text-sm text-foreground">Marcar esta meta como cumplida</p>
      )}

      {/* Observacion */}
      <div>
        <label className="text-xs text-muted block mb-1">Observación (opcional)</label>
        <textarea
          value={observacion}
          onChange={(e) => setObservacion(e.target.value)}
          placeholder="Breve nota sobre el avance..."
          rows={2}
          className="w-full text-sm bg-surface border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted/40 focus:outline-none focus:border-primary/50 resize-none"
        />
      </div>

      {error && (
        <p className="text-xs text-danger">{error}</p>
      )}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose}
          className="text-xs text-muted hover:text-foreground px-3 py-1.5">
          Cancelar
        </button>
        <button type="submit" disabled={isPending || (meta.tipo_medicion === "cuantitativo" && !valorNum) || (meta.tipo_medicion === "cualitativo" && !valorCual)}
          className="text-xs font-semibold bg-primary text-white px-4 py-1.5 rounded-lg hover:bg-primary-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          {isPending ? "Guardando..." : "Guardar avance"}
        </button>
      </div>
    </form>
  );
}
