"use client";

import { useState, useTransition } from "react";
import { corregirAvance } from "@/lib/actions";
import { formatFecha } from "@/lib/utils";
import type { Avance, Meta } from "@/types/database";

interface Props {
  avances: Avance[];
  metas: Meta[];
  proyectoId: string;
  puedeCorregir?: boolean;
}

export function AvancesList({ avances, metas, proyectoId, puedeCorregir = false }: Props) {
  const metaById = new Map(metas.map((m) => [m.id, m]));

  // Identificar el último avance por meta (no correctivo, o el correctivo más reciente)
  const ultimoPorMeta = new Map<string, string>();
  for (const a of avances) {
    if (a.meta_id && !ultimoPorMeta.has(a.meta_id)) {
      ultimoPorMeta.set(a.meta_id, a.id);
    }
  }

  return (
    <div className="space-y-2">
      {avances.slice(0, 10).map((avance) => {
        const meta = avance.meta_id ? metaById.get(avance.meta_id) : null;
        const esUltimo = avance.meta_id && ultimoPorMeta.get(avance.meta_id) === avance.id;
        const esCorreccion = avance.fuente === "correccion";
        return (
          <AvanceItem
            key={avance.id}
            avance={avance}
            meta={meta}
            proyectoId={proyectoId}
            puedeCorregir={!!esUltimo && !!meta && puedeCorregir}
            esCorreccion={esCorreccion}
          />
        );
      })}
    </div>
  );
}

function AvanceItem({
  avance,
  meta,
  proyectoId,
  puedeCorregir,
  esCorreccion,
}: {
  avance: Avance;
  meta: Meta | null | undefined;
  proyectoId: string;
  puedeCorregir: boolean;
  esCorreccion: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [valor, setValor] = useState(
    avance.valor_numerico?.toString() ?? avance.valor_cualitativo ?? ""
  );
  const [motivo, setMotivo] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!meta) return;
    setError(null);
    startTransition(async () => {
      const result = await corregirAvance({
        avance_id: avance.id,
        proyecto_id: proyectoId,
        meta_id: meta.id,
        tipo_medicion: meta.tipo_medicion,
        valor_numerico: meta.tipo_medicion === "cuantitativo" ? Number(valor) : null,
        valor_cualitativo: meta.tipo_medicion === "cualitativo" ? valor : null,
        motivo,
      });
      if (result.success) {
        setEditing(false);
        setMotivo("");
      } else {
        setError(result.error ?? "Error al corregir");
      }
    });
  };

  return (
    <div className="rounded-lg border border-border bg-surface p-3 text-sm">
      <div className="flex items-center justify-between text-xs text-muted mb-1">
        <span>{formatFecha(avance.fecha_reporte)}</span>
        <div className="flex items-center gap-1">
          {avance.estado_validacion === "validado" && (
            <span className="bg-success/20 text-success border border-success/30 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider">
              ✓ validado
            </span>
          )}
          {avance.estado_validacion === "observado" && (
            <span
              title={avance.observacion_validacion ?? ""}
              className="bg-danger/20 text-danger border border-danger/30 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider"
            >
              ! observado
            </span>
          )}
          {avance.estado_validacion === "pendiente" && (
            <span className="bg-warning/10 text-warning border border-warning/30 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider">
              pendiente
            </span>
          )}
          <span
            className={`capitalize px-1.5 py-0.5 rounded text-[10px] ${
              esCorreccion
                ? "bg-warning/20 text-warning border border-warning/30"
                : "bg-border/50"
            }`}
          >
            {esCorreccion ? "✏️ corrección" : avance.fuente}
          </span>
        </div>
      </div>
      {avance.valor_numerico != null && (
        <p className="text-foreground font-medium">Valor: {avance.valor_numerico}</p>
      )}
      {avance.valor_cualitativo && (
        <p className="text-foreground font-medium">Nivel: {avance.valor_cualitativo}</p>
      )}
      {avance.observacion && <p className="text-muted mt-0.5">{avance.observacion}</p>}

      {puedeCorregir && !editing && (
        <button
          onClick={() => setEditing(true)}
          className="mt-2 text-[10px] text-primary hover:text-primary-light"
        >
          ✏️ Corregir
        </button>
      )}

      {editing && meta && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          <p className="text-[10px] text-muted uppercase tracking-wider">Corregir valor</p>
          {meta.tipo_medicion === "cuantitativo" && (
            <input
              type="number"
              step="any"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="w-full text-sm bg-background border border-border rounded px-2 py-1 text-foreground"
            />
          )}
          {meta.tipo_medicion === "cualitativo" && meta.escala_cualitativa && (
            <select
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="w-full text-sm bg-background border border-border rounded px-2 py-1 text-foreground"
            >
              {meta.escala_cualitativa.niveles.map((n) => (
                <option key={n.clave} value={n.clave}>{n.label}</option>
              ))}
            </select>
          )}
          <textarea
            placeholder="Motivo de la corrección (obligatorio)"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={2}
            className="w-full text-xs bg-background border border-border rounded px-2 py-1 text-foreground"
            required
          />
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={isPending || !motivo.trim()}
              className="text-xs bg-warning/20 text-warning border border-warning/30 rounded px-3 py-1 hover:bg-warning/30 disabled:opacity-50"
            >
              {isPending ? "Guardando..." : "Guardar corrección"}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
              className="text-xs text-muted hover:text-foreground"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
