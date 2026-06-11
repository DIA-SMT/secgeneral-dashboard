"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import type { UnidadOrganizacional } from "@/types/database";

export function IndicadoresFiltros({ unidades }: { unidades: UnidadOrganizacional[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQ = searchParams.get("q") ?? "";
  const currentUnidad = searchParams.get("unidad") ?? "";
  const currentEstado = searchParams.get("estado") ?? "todos";

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!value || value === "todos") params.delete(key);
      else params.set(key, value);
      router.push(`/indicadores?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const sortByName = (a: UnidadOrganizacional, b: UnidadOrganizacional) =>
    (a.nombre_corto ?? a.nombre).localeCompare(b.nombre_corto ?? b.nombre);
  const secretarias = unidades.filter((u) => u.nivel === 0).sort(sortByName);
  const subsecretarias = unidades.filter((u) => u.nivel === 1).sort(sortByName);
  const direcciones = unidades.filter((u) => u.nivel >= 2).sort(sortByName);

  const estados = [
    { value: "todos", label: "Todos" },
    { value: "verde", label: "🟢 Verde — Finalizado" },
    { value: "amarillo", label: "🟡 Amarillo — En ejecución" },
    { value: "rojo", label: "🔴 Rojo — No iniciado" },
    { value: "sin_datos", label: "⚪ Sin datos" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="text"
        placeholder="Buscar indicador..."
        defaultValue={currentQ}
        onChange={(e) => {
          clearTimeout(
            (window as unknown as Record<string, ReturnType<typeof setTimeout>>).__indSearchTimer
          );
          (window as unknown as Record<string, ReturnType<typeof setTimeout>>).__indSearchTimer = setTimeout(() => {
            update("q", e.target.value);
          }, 300);
        }}
        className="text-sm bg-surface border border-border rounded-lg px-3 py-1.5 text-foreground placeholder:text-muted/50 focus:outline-none focus:border-primary/50 w-48"
      />
      <select
        value={currentUnidad}
        onChange={(e) => update("unidad", e.target.value)}
        className="text-sm bg-surface border border-border rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:border-primary/50"
      >
        <option value="">Todas las áreas</option>
        {secretarias.length > 0 && (
          <optgroup label="Secretarías">
            {secretarias.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre_corto ?? u.nombre}
              </option>
            ))}
          </optgroup>
        )}
        <optgroup label="Subsecretarías">
          {subsecretarias.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nombre_corto ?? u.nombre}
            </option>
          ))}
        </optgroup>
        <optgroup label="Direcciones">
          {direcciones.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nombre_corto ?? u.nombre}
            </option>
          ))}
        </optgroup>
      </select>
      <select
        value={currentEstado}
        onChange={(e) => update("estado", e.target.value)}
        className="text-sm bg-surface border border-border rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:border-primary/50"
      >
        {estados.map((e) => (
          <option key={e.value} value={e.value}>
            {e.label}
          </option>
        ))}
      </select>
    </div>
  );
}
