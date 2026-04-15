"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import type { UnidadOrganizacional } from "@/types/database";

export function ProyectosSearch({ direcciones }: { direcciones: UnidadOrganizacional[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQ = searchParams.get("q") ?? "";
  const currentDir = searchParams.get("dir") ?? "";

  const update = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value) params.delete(key);
    else params.set(key, value);
    router.push(`/proyectos?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        placeholder="Buscar proyecto..."
        defaultValue={currentQ}
        onChange={(e) => {
          clearTimeout((window as unknown as Record<string, ReturnType<typeof setTimeout>>).__searchTimer);
          (window as unknown as Record<string, ReturnType<typeof setTimeout>>).__searchTimer = setTimeout(() => {
            update("q", e.target.value);
          }, 300);
        }}
        className="text-sm bg-surface border border-border rounded-lg px-3 py-1.5 text-foreground placeholder:text-muted/50 focus:outline-none focus:border-primary/50 w-48"
      />
      <select
        value={currentDir}
        onChange={(e) => update("dir", e.target.value)}
        className="text-sm bg-surface border border-border rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:border-primary/50"
      >
        <option value="">Todas las áreas</option>
        {direcciones.map((d) => (
          <option key={d.id} value={d.id}>{d.nombre_corto ?? d.nombre}</option>
        ))}
      </select>
    </div>
  );
}
