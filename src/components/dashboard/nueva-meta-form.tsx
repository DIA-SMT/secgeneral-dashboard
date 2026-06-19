"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { crearMeta } from "@/lib/actions";

export function NuevaMetaForm({ proyectoId }: { proyectoId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [unidad, setUnidad] = useState("");
  const [valorMeta, setValorMeta] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    if (!nombre.trim()) {
      setError("El enunciado de la meta es obligatorio.");
      return;
    }
    startTransition(async () => {
      const r = await crearMeta({
        proyecto_id: proyectoId,
        nombre,
        tipo_medicion: "cuantitativo",
        unidad_medida: unidad || null,
        valor_meta: valorMeta.trim() !== "" && isFinite(Number(valorMeta)) ? Number(valorMeta) : null,
      });
      if (r.success) {
        setNombre("");
        setUnidad("");
        setValorMeta("");
        setOpen(false);
        router.refresh();
      } else {
        setError(r.error ?? "Error al crear la meta");
      }
    });
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-primary border border-primary/30 bg-primary/5 hover:bg-primary/10 rounded-lg px-4 py-2"
      >
        + Nueva meta
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
      <p className="text-[10px] text-muted uppercase tracking-wider">Nueva meta</p>
      <textarea
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        rows={2}
        autoFocus
        placeholder="Enunciado de la meta (ej. Reducir el tiempo de espera de 60 a 45 días)"
        className="w-full text-sm bg-background border border-border rounded px-2 py-1.5 text-foreground"
      />
      <div className="flex gap-2">
        <input
          value={unidad}
          onChange={(e) => setUnidad(e.target.value)}
          placeholder="Unidad (%, días…)"
          className="flex-1 text-xs bg-background border border-border rounded px-2 py-1.5 text-foreground"
        />
        <input
          type="number"
          step="any"
          value={valorMeta}
          onChange={(e) => setValorMeta(e.target.value)}
          placeholder="Valor objetivo (opcional)"
          className="w-40 text-xs bg-background border border-border rounded px-2 py-1.5 text-foreground"
        />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={isPending}
          className="text-xs bg-primary text-white rounded px-3 py-1.5 hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? "Creando..." : "Crear meta"}
        </button>
        <button onClick={() => setOpen(false)} className="text-xs text-muted hover:text-foreground">
          Cancelar
        </button>
      </div>
    </div>
  );
}
