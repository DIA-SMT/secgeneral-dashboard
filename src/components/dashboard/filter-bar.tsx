"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { UnidadOrganizacional } from "@/types/database";

interface FilterBarProps {
  unidades: UnidadOrganizacional[];
}

export function FilterBar({ unidades }: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentUnidad = searchParams.get("unidad") ?? "";
  const currentEstado = searchParams.get("estado") ?? "todos";

  const sortByName = useCallback(
    (a: UnidadOrganizacional, b: UnidadOrganizacional) =>
      (a.nombre_corto ?? a.nombre).localeCompare(b.nombre_corto ?? b.nombre),
    []
  );

  const unidadById = useMemo(
    () => new Map(unidades.map((u) => [u.id, u])),
    [unidades]
  );

  // Determinar el path desde la unidad seleccionada hasta la raíz
  const path = useMemo(() => {
    const out: { sec?: string; sub?: string; dir?: string } = {};
    if (!currentUnidad) return out;
    let cur = unidadById.get(currentUnidad);
    while (cur) {
      if (cur.nivel === 0) out.sec = cur.id;
      else if (cur.nivel === 1) out.sub = cur.id;
      else if (cur.nivel === 2) out.dir = cur.id;
      if (!cur.parent_id) break;
      cur = unidadById.get(cur.parent_id);
    }
    return out;
  }, [currentUnidad, unidadById]);

  const setUnidad = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set("unidad", id);
      else params.delete("unidad");
      router.push(`/dashboard?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const setEstado = useCallback(
    (estado: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (estado === "todos") params.delete("estado");
      else params.set("estado", estado);
      router.push(`/dashboard?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const secretarias = unidades.filter((u) => u.nivel === 0).sort(sortByName);
  const subsecretarias = path.sec
    ? unidades.filter((u) => u.nivel === 1 && u.parent_id === path.sec).sort(sortByName)
    : [];
  const direcciones = path.sub
    ? unidades.filter((u) => u.nivel === 2 && u.parent_id === path.sub).sort(sortByName)
    : path.sec
    ? unidades.filter((u) => u.nivel === 2 && u.parent_id === path.sec).sort(sortByName)
    : [];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted uppercase tracking-wider">Filtrar</span>

      {/* Secretaría */}
      <select
        value={path.sec ?? ""}
        onChange={(e) => setUnidad(e.target.value)}
        className="text-sm bg-surface border border-border rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:border-primary/50 cursor-pointer"
      >
        <option value="">Todas las Secretarías</option>
        {secretarias.map((u) => (
          <option key={u.id} value={u.id}>
            {u.nombre_corto ?? u.nombre}
          </option>
        ))}
      </select>

      {/* Subsecretaría (solo si hay sec elegida) */}
      {path.sec && subsecretarias.length > 0 && (
        <select
          value={path.sub ?? ""}
          onChange={(e) => setUnidad(e.target.value || path.sec!)}
          className="text-sm bg-surface border border-border rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:border-primary/50 cursor-pointer"
        >
          <option value="">Todas las Subsec.</option>
          {subsecretarias.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nombre_corto ?? u.nombre}
            </option>
          ))}
        </select>
      )}

      {/* Dirección (solo si hay sec o sub elegida) */}
      {(path.sec || path.sub) && direcciones.length > 0 && (
        <select
          value={path.dir ?? ""}
          onChange={(e) => setUnidad(e.target.value || path.sub || path.sec!)}
          className="text-sm bg-surface border border-border rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:border-primary/50 cursor-pointer"
        >
          <option value="">Todas las Direcciones</option>
          {direcciones.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nombre_corto ?? u.nombre}
            </option>
          ))}
        </select>
      )}

      {/* Estado */}
      <div className="flex items-center gap-1 ml-1">
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
              onClick={() => setEstado(estado)}
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
