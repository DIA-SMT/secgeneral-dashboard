"use client";

import { useState } from "react";
import type { Meta, Indicador } from "@/types/database";
import { StatusBadge } from "@/components/ui/status-badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { calcularPorcentajeMeta, semaforoTextColor, formatFecha, formatFechaRelativa } from "@/lib/utils";
import { AvanceForm } from "./avance-form";
import { IndicadoresPanel } from "@/components/indicadores/indicador-mini-form";

interface MetaCardWithFormProps {
  meta: Meta;
  proyectoId: string;
  indicadores?: Indicador[];
  puedeCargar?: boolean;
}

export function MetaCardWithForm({ meta, proyectoId, indicadores = [], puedeCargar = false }: MetaCardWithFormProps) {
  const [showForm, setShowForm] = useState(false);
  const pct = calcularPorcentajeMeta(meta);
  const invertida = (meta.metadata as Record<string, unknown>)?.invertida === true;
  const metaTieneSeg = meta.ultima_actualizacion != null;

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge estado={meta.estado_semaforo} />
            <span className="text-[10px] font-mono text-muted bg-border/50 px-1.5 py-0.5 rounded">
              {meta.tipo_medicion}
            </span>
            {invertida && (
              <span className="text-[10px] text-accent bg-accent/10 px-1.5 py-0.5 rounded">↓ menor es mejor</span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-foreground">{meta.nombre}</h3>

          {meta.tipo_medicion === "cuantitativo" && meta.valor_meta != null && (
            <p className="text-xs text-muted mt-1">
              {metaTieneSeg ? (
                <>
                  <span className={semaforoTextColor(meta.estado_semaforo) + " font-semibold"}>
                    {meta.valor_actual ?? meta.valor_linea_base ?? 0}
                  </span>
                  {" / "}{meta.valor_meta} {meta.unidad_medida}
                </>
              ) : (
                <>
                  Objetivo: {meta.valor_meta} {meta.unidad_medida}
                  {meta.valor_linea_base != null && meta.valor_linea_base !== 0 && (
                    <span className="ml-2 text-muted/60">(base: {meta.valor_linea_base})</span>
                  )}
                </>
              )}
            </p>
          )}

          {meta.tipo_medicion === "cualitativo" && meta.escala_cualitativa && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {meta.escala_cualitativa.niveles.map((nivel) => (
                <span key={nivel.clave}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-all
                    ${meta.nivel_actual === nivel.clave
                      ? "bg-primary/20 border-primary/40 text-primary font-semibold"
                      : "border-border text-muted/50"}`}>
                  {nivel.label}
                </span>
              ))}
            </div>
          )}

          {meta.tipo_medicion === "hito_unico" && (
            <p className="text-xs mt-1">
              {meta.valor_actual === 1
                ? <span className="text-success font-semibold">✓ Cumplido</span>
                : <span className="text-muted">Pendiente</span>}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="w-28">
            {metaTieneSeg ? (
              <ProgressBar value={pct} estado={meta.estado_semaforo} showLabel size="sm" />
            ) : (
              <span className="text-xs text-muted/50">—</span>
            )}
          </div>
          {/* Boton cargar avance — solo Director o admin */}
          {puedeCargar && (meta.tipo_medicion !== "hito_unico" || meta.valor_actual !== 1) ? (
            <button
              onClick={() => setShowForm(!showForm)}
              className="text-[10px] font-medium text-primary hover:text-primary-light transition-colors"
            >
              {showForm ? "Cerrar" : "+ Cargar avance"}
            </button>
          ) : null}
        </div>
      </div>

      {meta.fecha_limite && (
        <p className="text-[10px] text-muted mt-2">
          Fecha límite: {formatFecha(meta.fecha_limite)}
          {metaTieneSeg && meta.ultima_actualizacion && (
            <> · Última actualización: {formatFechaRelativa(meta.ultima_actualizacion)}</>
          )}
        </p>
      )}

      {/* Panel de indicadores (siempre visible; el botón "+ Agregar" sólo si puede cargar) */}
      <div className="mt-3 pt-3 border-t border-border/50">
        <IndicadoresPanel
          metaId={meta.id}
          proyectoId={proyectoId}
          indicadores={indicadores}
          metaValorMeta={meta.valor_meta}
          metaUnidadMedida={meta.unidad_medida}
          puedeEditar={puedeCargar}
        />
      </div>

      {/* Formulario inline de carga de avance de la meta (solo cuando puede y lo abrió) */}
      {showForm && (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          <AvanceForm meta={meta} proyectoId={proyectoId} onClose={() => setShowForm(false)} />
        </div>
      )}
    </div>
  );
}
