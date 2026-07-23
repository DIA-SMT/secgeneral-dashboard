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
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaLimite, setFechaLimite] = useState("");
  const [peso, setPeso] = useState("");
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
        fecha_inicio: fechaInicio || null,
        fecha_limite: fechaLimite || null,
        peso: peso.trim() !== "" && isFinite(Number(peso)) ? Number(peso) : null,
      });
      if (r.success) {
        setNombre("");
        setUnidad("");
        setValorMeta("");
        setFechaInicio("");
        setFechaLimite("");
        setPeso("");
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
      <div className="flex gap-2">
        <label className="flex-1 text-[10px] text-muted">
          Inicio del plazo
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="mt-0.5 w-full text-xs bg-background border border-border rounded px-2 py-1.5 text-foreground"
          />
        </label>
        <label className="flex-1 text-[10px] text-muted">
          Fin del plazo
          <input
            type="date"
            value={fechaLimite}
            onChange={(e) => setFechaLimite(e.target.value)}
            className="mt-0.5 w-full text-xs bg-background border border-border rounded px-2 py-1.5 text-foreground"
          />
        </label>
        <label className="w-28 text-[10px] text-muted">
          Peso (valor)
          <input
            type="number"
            step="any"
            min="0"
            max="100"
            value={peso}
            onChange={(e) => setPeso(e.target.value)}
            placeholder="1-100"
            className="mt-0.5 w-full text-xs bg-background border border-border rounded px-2 py-1.5 text-foreground"
          />
        </label>
      </div>
      <p className="text-[10px] text-muted">
        El peso es el &quot;valor particular&quot; de la meta: pondera cuánto influye en el avance global.
      </p>
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
