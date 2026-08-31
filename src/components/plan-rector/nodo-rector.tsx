"use client";

import { useState } from "react";
import { recortar, type NodoRectorArbol } from "@/lib/plan-rector-comun";

/**
 * Un nodo del árbol del Plan Rector, desplegable.
 *
 * Las áreas de intervención arrancan abiertas (son 5, y cerradas la pantalla
 * parece vacía); los ejes arrancan cerrados, porque abrir los 17 con sus 63
 * líneas de una es una pared de texto.
 */
export function NodoRector({
  nodo,
  profundidad = 0,
}: {
  nodo: NodoRectorArbol;
  profundidad?: number;
}) {
  const [abierto, setAbierto] = useState(nodo.tipo === "area_intervencion");
  const tieneHijos = nodo.hijos.length > 0;

  // La línea es la hoja: no despliega, muestra el texto completo.
  if (nodo.tipo === "linea") {
    return (
      <li className="border-t border-border/60">
        <div className="flex items-start gap-3 py-2.5 pl-3 pr-3">
          <span className="text-muted/40 text-xs mt-1 shrink-0">—</span>
          <p className="text-sm text-foreground/90 flex-1 min-w-0">{nodo.nombre}</p>
          <ContadorImputados n={nodo.imputados} />
        </div>
      </li>
    );
  }

  const esArea = nodo.tipo === "area_intervencion";
  const esEje = nodo.tipo === "eje";

  return (
    <li className={esArea ? "" : "border-t border-border/60"}>
      <button
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className={`w-full flex items-center gap-3 text-left transition-colors
          ${esArea ? "px-4 py-3 rounded-t-xl bg-surface-hover/50 hover:bg-surface-hover" : "px-3 py-2.5 hover:bg-surface-hover/60"}`}
      >
        <span className="text-muted text-[10px] w-2.5 shrink-0">{abierto ? "▾" : "▸"}</span>

        {esArea && nodo.codigo_cliente && (
          <span className="text-[11px] font-bold text-primary bg-primary/10 rounded px-1.5 py-0.5 shrink-0">
            {nodo.codigo_cliente}
          </span>
        )}
        {esEje && nodo.codigo_cliente && (
          <span className="text-[11px] font-semibold text-muted shrink-0 w-5 text-right tabular-nums">
            {nodo.codigo_cliente}.
          </span>
        )}

        <span
          className={`flex-1 min-w-0 ${
            esArea ? "text-sm font-bold text-foreground" : "text-sm text-foreground"
          }`}
        >
          {esArea
            ? nodo.nombre_corto ?? nodo.nombre
            : esEje
            ? nodo.nombre_corto ?? nodo.nombre
            : recortar(nodo.nombre, 130)}
        </span>

        {tieneHijos && (
          <span className="text-[10px] text-muted/70 shrink-0 hidden sm:inline">
            {resumenHijos(nodo)}
          </span>
        )}
        <ContadorImputados n={nodo.imputadosSubarbol} />
      </button>

      {abierto && (
        <>
          {esEje && nodo.ods.length > 0 && (
            <div className="flex flex-wrap gap-1 px-3 pb-2 pl-9">
              {nodo.ods.map((o) => (
                <span
                  key={o.numero}
                  title={o.nombre}
                  className="text-[10px] text-accent bg-accent/10 rounded-full px-2 py-0.5"
                >
                  ODS {o.numero}
                </span>
              ))}
            </div>
          )}

          {nodo.tipo === "objetivo" && (
            <p className="text-xs text-muted px-3 pb-2 pl-9 leading-relaxed">{nodo.nombre}</p>
          )}

          {tieneHijos && (
            <ul className={profundidad >= 1 ? "pl-4" : "pl-3"}>
              {nodo.hijos.map((h) => (
                <NodoRector key={h.id} nodo={h} profundidad={profundidad + 1} />
              ))}
            </ul>
          )}
        </>
      )}
    </li>
  );
}

function ContadorImputados({ n }: { n: number }) {
  if (n === 0) {
    return (
      <span className="text-[10px] text-muted/50 shrink-0 w-16 text-right" title="Sin proyectos imputados">
        sin imputar
      </span>
    );
  }
  return (
    <span
      className="text-[11px] font-semibold text-foreground shrink-0 w-16 text-right tabular-nums"
      title={`${n} proyecto${n === 1 ? "" : "s"} del POA imputado${n === 1 ? "" : "s"}`}
    >
      {n} proy.
    </span>
  );
}

function resumenHijos(nodo: NodoRectorArbol): string {
  const n = nodo.hijos.length;
  if (nodo.tipo === "area_intervencion") return `${n} eje${n === 1 ? "" : "s"}`;
  if (nodo.tipo === "eje") {
    const lineas = nodo.hijos.reduce((a, o) => a + o.hijos.length, 0);
    return `${n} obj. · ${lineas} línea${lineas === 1 ? "" : "s"}`;
  }
  return `${n} línea${n === 1 ? "" : "s"}`;
}

/** Selector plano de nodo imputable. Se usa en la ficha del proyecto. */
export function SelectorNodo({
  nodos,
  value,
  onChange,
  disabled,
}: {
  nodos: { id: string; tipo: string; ruta: string }[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full text-sm bg-background border border-border rounded px-3 py-2 disabled:opacity-50"
    >
      <option value="">Elegí un eje, objetivo o línea…</option>
      <optgroup label="Ejes estratégicos">
        {nodos.filter((n) => n.tipo === "eje").map((n) => (
          <option key={n.id} value={n.id}>{n.ruta}</option>
        ))}
      </optgroup>
      <optgroup label="Objetivos">
        {nodos.filter((n) => n.tipo === "objetivo").map((n) => (
          <option key={n.id} value={n.id}>{n.ruta}</option>
        ))}
      </optgroup>
      <optgroup label="Líneas estratégicas">
        {nodos.filter((n) => n.tipo === "linea").map((n) => (
          <option key={n.id} value={n.id}>{n.ruta}</option>
        ))}
      </optgroup>
    </select>
  );
}


