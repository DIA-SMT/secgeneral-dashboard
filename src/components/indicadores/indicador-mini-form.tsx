"use client";

import { useState, useTransition } from "react";
import { actualizarIndicador, crearIndicador } from "@/lib/actions";
import type { Indicador } from "@/types/database";

interface Props {
  metaId: string;
  proyectoId: string;
  indicadores: Indicador[];
}

export function IndicadoresPanel({ metaId, proyectoId, indicadores }: Props) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-2 mt-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted uppercase tracking-wider">Indicadores ({indicadores.length})</p>
        <button
          onClick={() => setAdding(!adding)}
          className="text-[10px] text-primary hover:text-primary-light"
        >
          {adding ? "Cancelar" : "+ Agregar"}
        </button>
      </div>

      {adding && (
        <CreateForm
          onSubmit={(data) => {
            startTransition(async () => {
              await crearIndicador({ ...data, meta_id: metaId, proyecto_id: proyectoId });
              setAdding(false);
            });
          }}
          isPending={isPending}
        />
      )}

      {indicadores.length === 0 ? (
        <p className="text-[10px] text-muted/50 italic">Sin indicadores cargados</p>
      ) : (
        <ul className="space-y-1">
          {indicadores.map((ind) => (
            <li key={ind.id} className="flex items-center gap-2 text-xs bg-border/20 rounded px-2 py-1.5">
              <span className={`h-2 w-2 rounded-full shrink-0 ${
                ind.estado_semaforo === "verde" ? "bg-success" :
                ind.estado_semaforo === "amarillo" ? "bg-warning" :
                ind.estado_semaforo === "rojo" ? "bg-danger" : "bg-muted/40"
              }`} />
              <span className="flex-1 min-w-0 line-clamp-1">{ind.nombre}</span>
              {editingId === ind.id ? (
                <EditValue
                  indicador={ind}
                  onSubmit={(valor) => {
                    startTransition(async () => {
                      await actualizarIndicador({ indicador_id: ind.id, valor_actual: valor, proyecto_id: proyectoId });
                      setEditingId(null);
                    });
                  }}
                  onCancel={() => setEditingId(null)}
                  isPending={isPending}
                />
              ) : (
                <>
                  <span className="text-muted shrink-0">
                    {ind.valor_actual ?? "—"} / {ind.valor_objetivo ?? "—"} {ind.unidad_medida ?? ""}
                  </span>
                  <button
                    onClick={() => setEditingId(ind.id)}
                    className="text-[10px] text-primary hover:text-primary-light shrink-0"
                  >
                    Cargar
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CreateForm({
  onSubmit,
  isPending,
}: {
  onSubmit: (data: { nombre: string; unidad_medida?: string | null; valor_objetivo?: number | null }) => void;
  isPending: boolean;
}) {
  const [nombre, setNombre] = useState("");
  const [unidad, setUnidad] = useState("");
  const [objetivo, setObjetivo] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!nombre.trim()) return;
        onSubmit({
          nombre,
          unidad_medida: unidad || null,
          valor_objetivo: objetivo ? Number(objetivo) : null,
        });
        setNombre("");
        setUnidad("");
        setObjetivo("");
      }}
      className="space-y-2 p-2 bg-surface rounded border border-border"
    >
      <input
        type="text"
        placeholder="Nombre del indicador"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        className="w-full text-xs bg-background border border-border rounded px-2 py-1 text-foreground"
        required
      />
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Unidad (días, %, etc)"
          value={unidad}
          onChange={(e) => setUnidad(e.target.value)}
          className="flex-1 text-xs bg-background border border-border rounded px-2 py-1 text-foreground"
        />
        <input
          type="number"
          step="any"
          placeholder="Objetivo"
          value={objetivo}
          onChange={(e) => setObjetivo(e.target.value)}
          className="w-24 text-xs bg-background border border-border rounded px-2 py-1 text-foreground"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="w-full text-xs bg-primary/20 text-primary border border-primary/30 rounded px-2 py-1 hover:bg-primary/30 disabled:opacity-50"
      >
        {isPending ? "Guardando..." : "Guardar indicador"}
      </button>
    </form>
  );
}

function EditValue({
  indicador,
  onSubmit,
  onCancel,
  isPending,
}: {
  indicador: Indicador;
  onSubmit: (valor: number) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [valor, setValor] = useState(indicador.valor_actual?.toString() ?? "");
  return (
    <span className="flex items-center gap-1 shrink-0">
      <input
        type="number"
        step="any"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        autoFocus
        className="w-16 text-xs bg-background border border-border rounded px-1.5 py-0.5 text-foreground"
      />
      <button
        onClick={() => valor && onSubmit(Number(valor))}
        disabled={isPending}
        className="text-[10px] text-success hover:text-success/80 disabled:opacity-50"
      >
        ✓
      </button>
      <button onClick={onCancel} className="text-[10px] text-muted hover:text-foreground">
        ✕
      </button>
    </span>
  );
}
