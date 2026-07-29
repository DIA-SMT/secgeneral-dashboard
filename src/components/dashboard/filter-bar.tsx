"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import type { UnidadOrganizacional } from "@/types/database";

// El filtro de área del dashboard lo maneja el ScopeSelector (param `scope`).
// Esta barra solo filtra por estado/semáforo, sobre el ámbito ya seleccionado.
// Mantiene la prop `unidades` por compatibilidad aunque no la use.
export function FilterBar({ unidades: _unidades }: { unidades?: UnidadOrganizacional[] }) {
  void _unidades;
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentEstado = searchParams.get("estado") ?? "todos";

  const setEstado = useCallback(
    (estado: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (estado === "todos") params.delete("estado");
      else params.set("estado", estado);
      router.push(`/dashboard?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted uppercase tracking-wider">Estado</span>
      <div className="flex items-center gap-1">
        {(["todos", "verde", "amarillo", "rojo"] as const).map((estado) => {
          const active = currentEstado === estado;
          const colors: Record<string, string> = {
            todos: active ? "bg-primary/20 text-primary border-primary/30" : "",
            verde: active ? "bg-success/20 text-success border-success/30" : "",
            amarillo: active ? "bg-warning/20 text-warning border-warning/30" : "",
            rojo: active ? "bg-info/20 text-info border-info/30" : "",
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
                active ? colors[estado] : "border-border text-muted hover:text-foreground hover:border-border"
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
