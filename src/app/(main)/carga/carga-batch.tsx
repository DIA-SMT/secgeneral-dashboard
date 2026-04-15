"use client";

import { useState, useTransition } from "react";
import { cargarAvance } from "@/lib/actions";
import type { Meta, UnidadOrganizacional, NivelEscala } from "@/types/database";

interface ProyectoConMetas {
  id: string;
  codigo: string | null;
  nombre: string;
  unidad_id: string;
  unidad_nombre: string;
  metas: Meta[];
}

interface CargaBatchProps {
  proyectos: ProyectoConMetas[];
  direcciones: UnidadOrganizacional[];
}

interface AvancePendiente {
  metaId: string;
  proyectoId: string;
  tipoMedicion: "cuantitativo" | "cualitativo" | "hito_unico";
  valorNum: string;
  valorCual: string;
  observacion: string;
  dirty: boolean;
}

export function CargaBatch({ proyectos, direcciones }: CargaBatchProps) {
  const [dirId, setDirId] = useState<string>(direcciones[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const [values, setValues] = useState<Map<string, AvancePendiente>>(new Map());

  const pysFiltrados = proyectos.filter((p) => p.unidad_id === dirId);

  function getValue(metaId: string): AvancePendiente | undefined {
    return values.get(metaId);
  }

  function setValue(meta: Meta, proyectoId: string, field: "valorNum" | "valorCual" | "observacion", val: string) {
    const prev = values.get(meta.id) ?? {
      metaId: meta.id,
      proyectoId,
      tipoMedicion: meta.tipo_medicion as "cuantitativo" | "cualitativo" | "hito_unico",
      valorNum: "",
      valorCual: "",
      observacion: "",
      dirty: false,
    };
    const next = { ...prev, [field]: val, dirty: true };
    setValues(new Map(values).set(meta.id, next));
  }

  function guardarMeta(meta: Meta, proyectoId: string) {
    const v = values.get(meta.id);
    if (!v?.dirty) return;

    startTransition(async () => {
      const result = await cargarAvance({
        proyecto_id: proyectoId,
        meta_id: meta.id,
        tipo_medicion: meta.tipo_medicion as "cuantitativo" | "cualitativo" | "hito_unico",
        valor_numerico: meta.tipo_medicion === "cuantitativo" && v.valorNum ? Number(v.valorNum) : null,
        valor_cualitativo: meta.tipo_medicion === "cualitativo" ? v.valorCual : null,
        observacion: v.observacion || null,
      });

      if (result.success) {
        setSaved(new Set(saved).add(meta.id));
        const next = new Map(values);
        next.delete(meta.id);
        setValues(next);
      } else {
        setErrors(new Map(errors).set(meta.id, result.error ?? "Error"));
      }
    });
  }

  const dirtyCount = Array.from(values.values()).filter((v) => v.dirty).length;

  return (
    <div className="space-y-6">
      {/* Selector de direccion */}
      <div className="flex items-center gap-4">
        <label className="text-xs text-muted uppercase tracking-wider">Área</label>
        <select
          value={dirId}
          onChange={(e) => { setDirId(e.target.value); setSaved(new Set()); }}
          className="text-sm bg-surface border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary/50 flex-1 max-w-sm"
        >
          {direcciones.map((d) => (
            <option key={d.id} value={d.id}>{d.nombre_corto ?? d.nombre}</option>
          ))}
        </select>
        {dirtyCount > 0 && (
          <span className="text-xs text-primary font-medium">{dirtyCount} pendiente{dirtyCount > 1 ? "s" : ""}</span>
        )}
      </div>

      {/* Lista de proyectos y metas */}
      {pysFiltrados.length === 0 ? (
        <p className="text-sm text-muted py-8 text-center">No hay proyectos activos en esta área</p>
      ) : (
        <div className="space-y-6">
          {pysFiltrados.map((py) => (
            <div key={py.id} className="rounded-xl border border-border bg-surface overflow-hidden">
              {/* Header proyecto */}
              <div className="px-4 py-3 bg-border/20 border-b border-border">
                <div className="flex items-center gap-2">
                  {py.codigo && (
                    <span className="text-[10px] font-mono text-muted bg-border/50 px-1.5 py-0.5 rounded">{py.codigo}</span>
                  )}
                  <h3 className="text-sm font-semibold text-foreground">{py.nombre}</h3>
                </div>
              </div>

              {/* Metas */}
              <div className="divide-y divide-border/50">
                {py.metas.map((meta) => {
                  const v = getValue(meta.id);
                  const isSaved = saved.has(meta.id);
                  const err = errors.get(meta.id);

                  return (
                    <div key={meta.id} className={`px-4 py-3 ${isSaved ? "bg-success/5" : ""}`}>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        {/* Meta info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground font-medium line-clamp-1">{meta.nombre}</p>
                          <p className="text-[10px] text-muted">
                            {meta.tipo_medicion}
                            {meta.valor_actual != null && ` · actual: ${meta.valor_actual}`}
                            {meta.nivel_actual && ` · actual: ${meta.nivel_actual}`}
                            {meta.valor_meta != null && ` · obj: ${meta.valor_meta}`}
                            {meta.unidad_medida && ` ${meta.unidad_medida}`}
                          </p>
                        </div>

                        {/* Input */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                          {isSaved ? (
                            <span className="text-xs text-success font-semibold">✓ Guardado</span>
                          ) : (
                            <>
                              {meta.tipo_medicion === "cuantitativo" && (
                                <input
                                  type="number"
                                  step="any"
                                  placeholder={meta.valor_meta != null ? `Obj: ${meta.valor_meta}` : "Valor"}
                                  value={v?.valorNum ?? ""}
                                  onChange={(e) => setValue(meta, py.id, "valorNum", e.target.value)}
                                  className="w-24 text-sm bg-background border border-border rounded-lg px-2 py-1.5 text-foreground placeholder:text-muted/40 focus:outline-none focus:border-primary/50"
                                />
                              )}

                              {meta.tipo_medicion === "cualitativo" && meta.escala_cualitativa && (
                                <select
                                  value={v?.valorCual ?? ""}
                                  onChange={(e) => setValue(meta, py.id, "valorCual", e.target.value)}
                                  className="w-36 text-xs bg-background border border-border rounded-lg px-2 py-1.5 text-foreground focus:outline-none focus:border-primary/50"
                                >
                                  <option value="">Seleccionar...</option>
                                  {meta.escala_cualitativa.niveles.map((n: NivelEscala) => (
                                    <option key={n.clave} value={n.clave}>{n.label}</option>
                                  ))}
                                </select>
                              )}

                              {meta.tipo_medicion === "hito_unico" && meta.valor_actual !== 1 && (
                                <button
                                  onClick={() => {
                                    const v2: AvancePendiente = {
                                      metaId: meta.id, proyectoId: py.id,
                                      tipoMedicion: "hito_unico", valorNum: "", valorCual: "",
                                      observacion: "", dirty: true,
                                    };
                                    setValues(new Map(values).set(meta.id, v2));
                                    guardarMeta(meta, py.id);
                                  }}
                                  className="text-xs text-primary hover:text-primary-light font-medium"
                                >
                                  Marcar cumplido
                                </button>
                              )}

                              {v?.dirty && meta.tipo_medicion !== "hito_unico" && (
                                <button
                                  onClick={() => guardarMeta(meta, py.id)}
                                  disabled={isPending}
                                  className="text-xs font-semibold bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary-light disabled:opacity-40 transition-colors"
                                >
                                  {isPending ? "..." : "Guardar"}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      {err && <p className="text-[10px] text-danger mt-1">{err}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
