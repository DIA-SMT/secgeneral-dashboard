"use client";

import { useState } from "react";

export interface Proposal {
  propuesta_id: string;
  tipo: "avance" | "hito";
  proyecto: string;
  proyecto_codigo?: string;
  // Avance fields
  meta?: string;
  tipo_medicion?: string;
  valor_actual?: number | null;
  valor_meta?: number | null;
  unidad_medida?: string;
  valor_propuesto?: number | string | null;
  // Hito fields
  hito?: string;
  fecha_esperada?: string;
  obligatorio?: boolean;
  // Common
  observacion?: string | null;
}

interface ProposalCardProps {
  proposal: Proposal;
  onResult?: (propuestaId: string, success: boolean, message: string) => void;
  disabled?: boolean;
}

export function ProposalCard({ proposal, onResult, disabled }: ProposalCardProps) {
  const [status, setStatus] = useState<"pending" | "confirming" | "confirmed" | "cancelled" | "error">("pending");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleConfirm() {
    setStatus("confirming");
    try {
      const action = proposal.tipo === "avance" ? "confirmar_avance" : "confirmar_hito";
      const res = await fetch("/api/chat/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propuesta_id: proposal.propuesta_id, action }),
      });
      const data = await res.json();

      if (data.error) {
        setStatus("error");
        setErrorMsg(data.error);
        onResult?.(proposal.propuesta_id, false, data.error);
      } else {
        setStatus("confirmed");
        onResult?.(proposal.propuesta_id, true, data.mensaje ?? "Cargado correctamente");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Error de conexión");
      onResult?.(proposal.propuesta_id, false, "Error de conexión");
    }
  }

  async function handleCancel() {
    try {
      await fetch("/api/chat/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propuesta_id: proposal.propuesta_id, action: "cancelar" }),
      });
      setStatus("cancelled");
      onResult?.(proposal.propuesta_id, false, "Propuesta cancelada");
    } catch {
      setStatus("cancelled");
    }
  }

  const isAvance = proposal.tipo === "avance";

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 space-y-2.5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-base">{isAvance ? "📋" : "📅"}</span>
        <span className="text-xs font-semibold text-primary uppercase tracking-wider">
          Propuesta de {isAvance ? "carga" : "hito"}
        </span>
      </div>

      {/* Content */}
      <div className="space-y-1.5 text-sm">
        <div className="flex gap-2">
          <span className="text-muted shrink-0">Proyecto:</span>
          <span className="text-foreground font-medium">{proposal.proyecto}</span>
        </div>

        {isAvance && proposal.meta && (
          <div className="flex gap-2">
            <span className="text-muted shrink-0">Meta:</span>
            <span className="text-foreground">{proposal.meta}</span>
          </div>
        )}

        {isAvance && proposal.valor_propuesto != null && (
          <div className="flex gap-2">
            <span className="text-muted shrink-0">Valor:</span>
            <span className="text-foreground font-semibold">
              {proposal.valor_propuesto}
              {proposal.unidad_medida ? ` ${proposal.unidad_medida}` : ""}
            </span>
            {proposal.valor_meta != null && (
              <span className="text-muted text-xs">
                (meta: {proposal.valor_meta})
              </span>
            )}
          </div>
        )}

        {!isAvance && proposal.hito && (
          <div className="flex gap-2">
            <span className="text-muted shrink-0">Hito:</span>
            <span className="text-foreground">{proposal.hito}</span>
          </div>
        )}

        {!isAvance && proposal.fecha_esperada && (
          <div className="flex gap-2">
            <span className="text-muted shrink-0">Fecha:</span>
            <span className="text-foreground">{proposal.fecha_esperada}</span>
          </div>
        )}

        {proposal.observacion && (
          <div className="flex gap-2">
            <span className="text-muted shrink-0">Obs:</span>
            <span className="text-foreground italic">{proposal.observacion}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      {status === "pending" && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleConfirm}
            disabled={disabled}
            className="flex-1 text-xs font-medium py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-40"
          >
            Confirmar
          </button>
          <button
            onClick={handleCancel}
            disabled={disabled}
            className="flex-1 text-xs font-medium py-1.5 rounded-lg bg-surface-hover hover:bg-border text-muted transition-colors disabled:opacity-40"
          >
            Cancelar
          </button>
        </div>
      )}

      {status === "confirming" && (
        <div className="text-xs text-primary flex items-center gap-1.5 pt-1">
          <span className="animate-spin">⏳</span> Confirmando...
        </div>
      )}

      {status === "confirmed" && (
        <div className="text-xs text-green-600 font-medium pt-1">
          ✅ Avance cargado correctamente
        </div>
      )}

      {status === "cancelled" && (
        <div className="text-xs text-muted pt-1">
          ✕ Propuesta cancelada
        </div>
      )}

      {status === "error" && (
        <div className="text-xs text-red-400 pt-1">
          ⚠️ {errorMsg}
        </div>
      )}
    </div>
  );
}
