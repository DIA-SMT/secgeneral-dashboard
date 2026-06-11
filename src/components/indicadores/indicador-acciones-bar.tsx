"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { borrarValorIndicador, editarIndicador, eliminarIndicador } from "@/lib/actions";

interface Props {
  indicadorId: string;
  proyectoId: string;
  nombre: string;
  unidadMedida: string | null;
  valorObjetivo: number | null;
  valorObjetivoTexto: string | null;
  tieneValor: boolean;
}

export function IndicadorAccionesBar({
  indicadorId,
  proyectoId,
  nombre,
  unidadMedida,
  valorObjetivo,
  valorObjetivoTexto,
  tieneValor,
}: Props) {
  const router = useRouter();
  const [editMeta, setEditMeta] = useState(false);
  const [nombreEdit, setNombreEdit] = useState(nombre);
  const [unidadEdit, setUnidadEdit] = useState(unidadMedida ?? "");
  const [objetivoNum, setObjetivoNum] = useState(valorObjetivo?.toString() ?? "");
  const [objetivoTxt, setObjetivoTxt] = useState(valorObjetivoTexto ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const borrarValor = () => {
    if (!confirm("¿Borrar el valor cargado? El indicador vuelve a estado sin datos.")) return;
    startTransition(async () => {
      const r = await borrarValorIndicador({ indicador_id: indicadorId, proyecto_id: proyectoId });
      if (!r.success) setError(r.error ?? "Error");
    });
  };

  const eliminarTodo = () => {
    if (
      !confirm(
        `¿Eliminar el indicador "${nombre}" completamente? Esta acción es reversible solo desde la base de datos.`
      )
    )
      return;
    startTransition(async () => {
      const r = await eliminarIndicador({ indicador_id: indicadorId, proyecto_id: proyectoId });
      if (r.success) {
        router.push(`/proyectos/${proyectoId}`);
      } else {
        setError(r.error ?? "Error");
      }
    });
  };

  const guardarMeta = () => {
    setError(null);
    startTransition(async () => {
      const r = await editarIndicador({
        indicador_id: indicadorId,
        nombre: nombreEdit.trim() || undefined,
        unidad_medida: unidadEdit || null,
        valor_objetivo: objetivoNum ? Number(objetivoNum) : null,
        valor_objetivo_texto: objetivoTxt || null,
        proyecto_id: proyectoId,
      });
      if (r.success) setEditMeta(false);
      else setError(r.error ?? "Error");
    });
  };

  return (
    <div className="mt-6 pt-4 border-t border-border/50 space-y-3">
      <p className="text-[10px] text-muted uppercase tracking-wider">Acciones del indicador</p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setEditMeta(!editMeta)}
          className="text-xs bg-accent/10 text-accent border border-accent/20 rounded px-3 py-1.5 hover:bg-accent/20"
        >
          ✎ Editar metadatos
        </button>
        {tieneValor && (
          <button
            onClick={borrarValor}
            disabled={isPending}
            className="text-xs bg-warning/10 text-warning border border-warning/30 rounded px-3 py-1.5 hover:bg-warning/20 disabled:opacity-50"
          >
            🗑 Borrar valor cargado
          </button>
        )}
        <button
          onClick={eliminarTodo}
          disabled={isPending}
          className="text-xs bg-danger/10 text-danger border border-danger/30 rounded px-3 py-1.5 hover:bg-danger/20 disabled:opacity-50"
        >
          ✕ Eliminar indicador
        </button>
      </div>

      {editMeta && (
        <div className="space-y-2 p-3 bg-background border border-border rounded">
          <div>
            <label className="text-[10px] text-muted uppercase tracking-wider">Nombre</label>
            <input
              type="text"
              value={nombreEdit}
              onChange={(e) => setNombreEdit(e.target.value)}
              className="mt-1 w-full text-sm bg-surface border border-border rounded px-2 py-1 text-foreground"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted uppercase tracking-wider">Unidad de medida</label>
            <input
              type="text"
              value={unidadEdit}
              onChange={(e) => setUnidadEdit(e.target.value)}
              placeholder="Ej: %, días, personas..."
              className="mt-1 w-full text-sm bg-surface border border-border rounded px-2 py-1 text-foreground"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted uppercase tracking-wider">Objetivo (numérico)</label>
              <input
                type="number"
                step="any"
                value={objetivoNum}
                onChange={(e) => setObjetivoNum(e.target.value)}
                placeholder="Ej: 80"
                className="mt-1 w-full text-sm bg-surface border border-border rounded px-2 py-1 text-foreground"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted uppercase tracking-wider">Objetivo (texto)</label>
              <input
                type="text"
                value={objetivoTxt}
                onChange={(e) => setObjetivoTxt(e.target.value)}
                placeholder='Ej: "Sí", "Realizado"'
                className="mt-1 w-full text-sm bg-surface border border-border rounded px-2 py-1 text-foreground"
              />
            </div>
          </div>
          <p className="text-[10px] text-muted">
            Usá objetivo numérico si la meta tiene una cifra concreta. Usá texto si es Sí/No o
            cualitativo. Para borrar uno, dejá el campo vacío.
          </p>
          <div className="flex gap-2">
            <button
              onClick={guardarMeta}
              disabled={isPending}
              className="text-xs bg-primary text-white rounded px-3 py-1.5 hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? "..." : "Guardar"}
            </button>
            <button
              onClick={() => {
                setEditMeta(false);
                setError(null);
              }}
              className="text-xs text-muted hover:text-foreground"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
