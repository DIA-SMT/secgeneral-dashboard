"use client";

import { useState } from "react";
import Link from "next/link";
import type { UnidadOrganizacional, EstadoSemaforo } from "@/types/database";

interface UnidadNodeData {
  id: string;
  nombre: string;
  codigo: string | null;
}

interface UnidadNodeProps {
  unidad: UnidadOrganizacional;
  hijos: UnidadOrganizacional[];
  proyectos: UnidadNodeData[];
  semaforos: Record<EstadoSemaforo, number>;
  childrenByParent: Record<string, UnidadOrganizacional[]>;
  proyectosByUnidad: Record<string, UnidadNodeData[]>;
  semaforosByUnidad: Record<string, Record<EstadoSemaforo, number>>;
  depth: number;
}

export function UnidadNode({
  unidad,
  hijos,
  proyectos,
  semaforos,
  childrenByParent,
  proyectosByUnidad,
  semaforosByUnidad,
  depth,
}: UnidadNodeProps) {
  // Por default: raíz (nivel 0) expandido, subsec/direcciones colapsadas
  const [expanded, setExpanded] = useState(depth === 0);

  const totalMetas = Object.values(semaforos).reduce((a, b) => a + b, 0);
  const tieneHijos = hijos.length > 0 || proyectos.length > 0;
  const bgByDepth = ["bg-surface", "bg-surface/80", "bg-surface/60"];

  return (
    <div className={`rounded-xl border border-border ${bgByDepth[depth] ?? "bg-surface/40"} overflow-hidden`}>
      <button
        type="button"
        onClick={() => tieneHijos && setExpanded((v) => !v)}
        className={`w-full p-4 flex items-center justify-between text-left ${
          tieneHijos ? "hover:bg-surface-hover cursor-pointer" : "cursor-default"
        }`}
      >
        <div className="flex items-center gap-3">
          {tieneHijos && (
            <span className="text-muted text-xs w-3">{expanded ? "▾" : "▸"}</span>
          )}
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold
            ${depth === 0 ? "bg-primary/20 text-primary" : depth === 1 ? "bg-accent/20 text-accent" : "bg-border text-muted"}`}>
            {unidad.nombre_corto?.[0] ?? unidad.nombre[0]}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{unidad.nombre}</h3>
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="capitalize">{unidad.tipo}</span>
              {unidad.responsable_nombre && (
                <>
                  <span>·</span>
                  <span>{unidad.responsable_nombre}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {totalMetas > 0 && (
          <div className="flex items-center gap-2 text-xs">
            {semaforos.verde > 0 && (
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-success" />{semaforos.verde}
              </span>
            )}
            {semaforos.amarillo > 0 && (
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-warning" />{semaforos.amarillo}
              </span>
            )}
            {semaforos.rojo > 0 && (
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-danger" />{semaforos.rojo}
              </span>
            )}
          </div>
        )}
      </button>

      {expanded && proyectos.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-2">
          {proyectos.map((py) => (
            <Link
              key={py.id}
              href={`/proyectos/${py.id}`}
              className="text-xs bg-border/30 hover:bg-primary/10 hover:text-primary px-2.5 py-1 rounded-md transition-colors"
            >
              {py.codigo ?? py.nombre}
            </Link>
          ))}
        </div>
      )}

      {expanded && hijos.length > 0 && (
        <div className="px-4 pb-4 space-y-2">
          {hijos.map((hijo) => (
            <UnidadNode
              key={hijo.id}
              unidad={hijo}
              hijos={childrenByParent[hijo.id] ?? []}
              proyectos={proyectosByUnidad[hijo.id] ?? []}
              semaforos={semaforosByUnidad[hijo.id] ?? { verde: 0, amarillo: 0, rojo: 0, gris: 0, sin_datos: 0 }}
              childrenByParent={childrenByParent}
              proyectosByUnidad={proyectosByUnidad}
              semaforosByUnidad={semaforosByUnidad}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
