"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import type { UnidadOrganizacional } from "@/types/database";

interface FilterBarProps {
  unidades: UnidadOrganizacional[];
}

export function FilterBar({ unidades }: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentUnidad = searchParams.get("unidad") ?? "todas";
  const currentEstado = searchParams.get("estado") ?? "todos";

  const setFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "todas" || value === "todos") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      router.push(`/dashboard?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const sortByName = (a: UnidadOrganizacional, b: UnidadOrganizacional) =>
    (a.nombre_corto ?? a.nombre).localeCompare(b.nombre_corto ?? b.nombre);
  const secretarias = unidades.filter((u) => u.nivel === 0).sort(sortByName);
  const subsecretarias = unidades.filter((u) => u.nivel === 1).sort(sortByName);
  const direcciones = unidades.filter((u) => u.nivel >= 2).sort(sortByName);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-xs text-muted uppercase tracking-wider">Filtrar</span>

      {/* Filtro por unidad: Secretarías, Subsecretarías, Direcciones */}
      <select
        value={currentUnidad}
        onChange={(e) => setFilter("unidad", e.target.value)}
        className="text-sm bg-surface border border-border rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:border-primary/50 cursor-pointer"
      >
        <option value="todas">Todas las áreas</option>
        {secretarias.length > 0 && (
          <optgroup label="Secretarías">
            {secretarias.map((u) => (
              <option key={u.id} value={u.id}>{u.nombre_corto ?? u.nombre}</option>
            ))}
          </optgroup>
        )}
        <optgroup label="Subsecretarías">
          {subsecretarias.map((u) => (
            <option key={u.id} value={u.id}>{u.nombre_corto ?? u.nombre}</option>
          ))}
        </optgroup>
        <optgroup label="Direcciones">
          {direcciones.map((u) => (
            <option key={u.id} value={u.id}>{u.nombre_corto ?? u.nombre}</option>
          ))}
        </optgroup>
      </select>

      {/* Filtro por estado */}
      <div className="flex items-center gap-1">
        {(["todos", "verde", "amarillo", "rojo"] as const).map((estado) => {
          const active = currentEstado === estado;
          const colors: Record<string, string> = {
            todos: active ? "bg-primary/20 text-primary border-primary/30" : "",
            verde: active ? "bg-success/20 text-success border-success/30" : "",
            amarillo: active ? "bg-warning/20 text-warning border-warning/30" : "",
            rojo: active ? "bg-danger/20 text-danger border-danger/30" : "",
          };
          const labels: Record<string, string> = {
            todos: "Todos",
            verde: "FINALIZADO",
            amarillo: "EN EJECUCIÓN",
            rojo: "NO INICIADO",
          };
          return (
            <button
              key={estado}
              onClick={() => setFilter("estado", estado)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                active
                  ? colors[estado]
                  : "border-border text-muted hover:text-foreground hover:border-border"
              }`}
            >
              {labels[estado]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
