import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/ui/status-badge";
import { BackButton } from "@/components/layout/back-button";
import type { Indicador, Meta, Proyecto } from "@/types/database";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 60;

export default async function IndicadorDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("indicador")
    .select("*, meta:meta(*, proyecto:proyecto(*, unidad:unidad_organizacional(*)))")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error || !data) notFound();

  const ind = data as Indicador & { meta?: Meta & { proyecto?: Proyecto } };
  const proyecto = ind.meta?.proyecto;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <BackButton fallback="/indicadores" />
        <nav className="flex items-center gap-2 text-sm text-muted min-w-0">
          <Link href="/indicadores" className="hover:text-primary">Indicadores</Link>
          <span>/</span>
          <span className="text-foreground line-clamp-1">{ind.nombre}</span>
        </nav>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <StatusBadge estado={ind.estado_semaforo} />
              {ind.codigo && (
                <span className="text-xs font-mono text-muted bg-border/50 px-2 py-0.5 rounded">{ind.codigo}</span>
              )}
            </div>
            <h1 className="text-xl font-bold text-foreground">{ind.nombre}</h1>
            {ind.descripcion && (
              <p className="text-sm text-muted/80 mt-2">{ind.descripcion}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="rounded-lg bg-border/20 p-4">
            <p className="text-xs text-muted uppercase tracking-wider">Valor actual</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {ind.valor_actual ?? "—"} <span className="text-sm text-muted">{ind.unidad_medida ?? ""}</span>
            </p>
          </div>
          <div className="rounded-lg bg-border/20 p-4">
            <p className="text-xs text-muted uppercase tracking-wider">Objetivo</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {ind.valor_objetivo ?? "—"} <span className="text-sm text-muted">{ind.unidad_medida ?? ""}</span>
            </p>
          </div>
        </div>

        {ind.formula && (
          <div className="mt-4">
            <p className="text-xs text-muted uppercase tracking-wider mb-1">Fórmula</p>
            <code className="block text-sm bg-border/20 p-2 rounded text-foreground">{ind.formula}</code>
          </div>
        )}
      </div>

      {ind.meta && (
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-xs text-muted uppercase tracking-wider mb-2">Meta vinculada</p>
          <h3 className="text-sm font-semibold text-foreground">{ind.meta.nombre}</h3>
          {proyecto && (
            <Link
              href={`/proyectos/${proyecto.id}`}
              className="inline-block mt-3 text-xs text-primary hover:text-primary-light"
            >
              Ver proyecto: {proyecto.nombre} →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
