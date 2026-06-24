import { getSupabaseServer } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/ui/status-badge";
import { BackButton } from "@/components/layout/back-button";
import { IndicadorCargaForm } from "@/components/indicadores/indicador-carga-form";
import { IndicadorAccionesBar } from "@/components/indicadores/indicador-acciones-bar";
import { getPerfilActual, getScopeUnidades } from "@/lib/auth";
import type { Indicador, Meta, Proyecto, UnidadOrganizacional } from "@/types/database";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 0;

export default async function IndicadorDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("indicador")
    .select("*, meta:meta(*, proyecto:proyecto(*, unidad:unidad_organizacional(*)))")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error || !data) notFound();

  const ind = data as Indicador & { meta?: Meta & { proyecto?: Proyecto & { unidad?: UnidadOrganizacional } } };
  const proyecto = ind.meta?.proyecto;

  const perfil = await getPerfilActual();
  let puedeCargar = false;
  if (perfil) {
    if (perfil.rol === "admin_funcional") {
      puedeCargar = true;
    } else if (
      (perfil.rol === "director" || perfil.rol === "secretario" || perfil.rol === "subsecretario") &&
      proyecto?.unidad_id
    ) {
      const scope = await getScopeUnidades(perfil);
      puedeCargar = scope.includes(proyecto.unidad_id);
    }
  }

  // Valores a mostrar (textual gana sobre numérico cuando ambos existen)
  const valorActualDisplay =
    ind.valor_actual_texto && ind.valor_actual_texto.trim() !== ""
      ? ind.valor_actual_texto
      : ind.valor_actual != null
      ? `${ind.valor_actual}${ind.unidad_medida ? ` ${ind.unidad_medida}` : ""}`
      : "—";

  const valorObjetivoDisplay =
    ind.valor_objetivo_texto && ind.valor_objetivo_texto.trim() !== ""
      ? ind.valor_objetivo_texto
      : ind.valor_objetivo != null
      ? `${ind.valor_objetivo}${ind.unidad_medida ? ` ${ind.unidad_medida}` : ""}`
      : "—";

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
            <p className="text-2xl font-bold text-foreground mt-1 break-words">
              {valorActualDisplay}
            </p>
          </div>
          <div className="rounded-lg bg-border/20 p-4">
            <p className="text-xs text-muted uppercase tracking-wider">Objetivo</p>
            <p className="text-2xl font-bold text-foreground mt-1 break-words">
              {valorObjetivoDisplay}
            </p>
          </div>
        </div>

        {ind.observacion && (
          <div className="mt-4 rounded-lg bg-accent/5 border border-accent/20 p-3">
            <p className="text-[10px] text-accent uppercase tracking-wider mb-1">Última observación</p>
            <p className="text-xs text-foreground">{ind.observacion}</p>
          </div>
        )}

        {ind.formula && (
          <div className="mt-4">
            <p className="text-xs text-muted uppercase tracking-wider mb-1">Fórmula</p>
            <code className="block text-sm bg-border/20 p-2 rounded text-foreground">{ind.formula}</code>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-xs text-muted uppercase tracking-wider mb-3">Cargar / actualizar avance</p>
          {proyecto ? (
            <IndicadorCargaForm
              indicadorId={ind.id}
              proyectoId={proyecto.id}
              valorActual={ind.valor_actual}
              valorActualTexto={ind.valor_actual_texto}
              valorObjetivo={ind.valor_objetivo}
              valorObjetivoTexto={ind.valor_objetivo_texto}
              unidadMedida={ind.unidad_medida}
              observacion={ind.observacion}
              puedeCargar={puedeCargar}
            />
          ) : (
            <p className="text-xs text-muted italic">Este indicador no está vinculado a un proyecto.</p>
          )}
          {ind.ultima_actualizacion && (
            <p className="text-[10px] text-muted mt-3">
              Última actualización: {new Date(ind.ultima_actualizacion).toLocaleString("es-AR")}
            </p>
          )}

          {/* Acciones avanzadas: corregir/borrar/editar metadata */}
          {puedeCargar && proyecto && (
            <IndicadorAccionesBar
              indicadorId={ind.id}
              proyectoId={proyecto.id}
              nombre={ind.nombre}
              unidadMedida={ind.unidad_medida}
              valorObjetivo={ind.valor_objetivo}
              valorObjetivoTexto={ind.valor_objetivo_texto}
              tieneValor={
                ind.valor_actual != null ||
                (ind.valor_actual_texto != null && ind.valor_actual_texto.trim() !== "")
              }
            />
          )}
        </div>
      </div>

      {ind.meta && (
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-xs text-muted uppercase tracking-wider mb-2">Meta vinculada</p>
          <h3 className="text-sm font-semibold text-foreground">{ind.meta.nombre}</h3>
          {ind.meta.valor_meta != null && (
            <p className="text-xs text-muted mt-1">
              Valor de la meta: <span className="text-foreground font-semibold">{ind.meta.valor_meta} {ind.meta.unidad_medida ?? ""}</span>
            </p>
          )}
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
