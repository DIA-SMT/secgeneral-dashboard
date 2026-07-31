"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { UnidadOrganizacional } from "@/types/database";

export type VistaCalendario = "mes" | "semana" | "dia";

interface Props {
  vista: VistaCalendario;
  /** Fecha de referencia de la vista (YYYY-MM-DD). */
  fecha: string;
  /** Título del período mostrado ("Agosto 2026", "4 – 10 de agosto", …). */
  titulo: string;
  unidades: UnidadOrganizacional[];
  /** Filtros activos (ids de unidad). */
  sec: string | null;
  sub: string | null;
  dir: string | null;
  q: string;
  /** Fechas a las que llevan las flechas ‹ ›, ya calculadas en el server. */
  anterior: string;
  siguiente: string;
  hoy: string;
}

/**
 * Barra del calendario (30.07): cambio de vista mes/semana/día, navegación
 * ‹ hoy ›, y los filtros en cascada Secretaría → Subsecretaría → Dirección,
 * más un buscador por texto. Todo vive en la URL para que la vista sea
 * compartible y el render siga siendo server-side.
 */
export function CalendarioToolbar({
  vista,
  fecha,
  titulo,
  unidades,
  sec,
  sub,
  dir,
  q,
  anterior,
  siguiente,
  hoy,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [texto, setTexto] = useState(q);

  const navegar = (cambios: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(cambios)) {
      if (v == null || v === "") params.delete(k);
      else params.set(k, v);
    }
    router.push(`/agenda?${params.toString()}`, { scroll: false });
  };

  const ordenar = (a: UnidadOrganizacional, b: UnidadOrganizacional) =>
    (a.nombre_corto ?? a.nombre).localeCompare(b.nombre_corto ?? b.nombre);

  const secretarias = unidades.filter((u) => u.nivel === 0).sort(ordenar);
  const subsecretarias = unidades
    .filter((u) => u.nivel === 1 && (!sec || u.parent_id === sec))
    .sort(ordenar);
  // Direcciones: las que cuelgan de la subsecretaría elegida, o —si solo hay
  // secretaría— todas las de su árbol (incluidas las que cuelgan directo).
  const idsDe = (raizId: string): Set<string> => {
    const out = new Set<string>();
    const walk = (id: string) => {
      for (const u of unidades.filter((x) => x.parent_id === id)) {
        out.add(u.id);
        walk(u.id);
      }
    };
    walk(raizId);
    return out;
  };
  const ambito = sub ? idsDe(sub) : sec ? idsDe(sec) : null;
  const direcciones = unidades
    .filter((u) => u.nivel >= 2 && (!ambito || ambito.has(u.id)))
    .sort(ordenar);

  const btnVista = (v: VistaCalendario, label: string) => (
    <button
      key={v}
      onClick={() => navegar({ vista: v })}
      className={`text-xs px-3 py-1.5 transition-colors ${
        vista === v
          ? "bg-primary/20 text-primary font-semibold"
          : "text-muted hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => navegar({ fecha: hoy })}
          className="text-xs text-foreground border border-border rounded-lg px-3 py-1.5 hover:border-primary/40"
        >
          Hoy
        </button>
        <div className="flex items-center">
          <button
            onClick={() => navegar({ fecha: anterior })}
            aria-label="Período anterior"
            className="text-muted hover:text-foreground border border-border rounded-l-lg px-2.5 py-1.5"
          >
            ‹
          </button>
          <button
            onClick={() => navegar({ fecha: siguiente })}
            aria-label="Período siguiente"
            className="text-muted hover:text-foreground border border-l-0 border-border rounded-r-lg px-2.5 py-1.5"
          >
            ›
          </button>
        </div>
        <h2 className="text-base font-semibold text-foreground capitalize mx-1">{titulo}</h2>

        <div className="ml-auto flex items-center rounded-lg border border-border overflow-hidden">
          {btnVista("mes", "Mes")}
          {btnVista("semana", "Semana")}
          {btnVista("dia", "Día")}
        </div>

        <input
          type="date"
          value={fecha}
          onChange={(e) => e.target.value && navegar({ fecha: e.target.value })}
          className="text-xs bg-background border border-border rounded-lg px-2 py-1.5 text-foreground"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={sec ?? ""}
          onChange={(e) => navegar({ sec: e.target.value || null, sub: null, dir: null })}
          className="text-xs bg-background border border-border rounded-lg px-2 py-1.5 text-foreground max-w-[220px]"
        >
          <option value="">Todas las secretarías</option>
          {secretarias.map((u) => (
            <option key={u.id} value={u.id}>{u.nombre_corto ?? u.nombre}</option>
          ))}
        </select>

        <select
          value={sub ?? ""}
          onChange={(e) => navegar({ sub: e.target.value || null, dir: null })}
          className="text-xs bg-background border border-border rounded-lg px-2 py-1.5 text-foreground max-w-[220px]"
        >
          <option value="">Todas las subsecretarías</option>
          {subsecretarias.map((u) => (
            <option key={u.id} value={u.id}>{u.nombre_corto ?? u.nombre}</option>
          ))}
        </select>

        <select
          value={dir ?? ""}
          onChange={(e) => navegar({ dir: e.target.value || null })}
          className="text-xs bg-background border border-border rounded-lg px-2 py-1.5 text-foreground max-w-[220px]"
        >
          <option value="">Todas las direcciones</option>
          {direcciones.map((u) => (
            <option key={u.id} value={u.id}>{u.nombre_corto ?? u.nombre}</option>
          ))}
        </select>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            navegar({ q: texto.trim() || null });
          }}
          className="flex items-center gap-1"
        >
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar actividad, lugar…"
            className="text-xs bg-background border border-border rounded-lg px-2 py-1.5 text-foreground w-52"
          />
          <button
            type="submit"
            className="text-xs text-primary border border-primary/30 bg-primary/10 hover:bg-primary/20 rounded-lg px-2.5 py-1.5"
          >
            Buscar
          </button>
        </form>

        {(sec || sub || dir || q) && (
          <button
            onClick={() => {
              setTexto("");
              navegar({ sec: null, sub: null, dir: null, q: null });
            }}
            className="text-xs text-muted hover:text-foreground underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  );
}
