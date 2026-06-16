"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { UnidadOrganizacional } from "@/types/database";

interface ScopeSelectorProps {
  unidades: UnidadOrganizacional[];
}

export function ScopeSelector({ unidades }: ScopeSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("scope") ?? "";

  const sortByName = (a: UnidadOrganizacional, b: UnidadOrganizacional) =>
    (a.nombre_corto ?? a.nombre).localeCompare(b.nombre_corto ?? b.nombre);
  const secretarias = unidades.filter((u) => u.nivel === 0).sort(sortByName);
  const subsecretarias = unidades.filter((u) => u.nivel === 1).sort(sortByName);
  const direcciones = unidades.filter((u) => u.nivel >= 2).sort(sortByName);

  const onChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("scope", value);
    else params.delete("scope");
    router.push(`/dashboard?${params.toString()}`, { scroll: false });
  };

  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value)}
      className="text-sm bg-surface border border-border rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:border-primary/50 cursor-pointer mt-2"
    >
      <option value="">Todas las Secretarías (Municipalidad)</option>
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
  );
}
