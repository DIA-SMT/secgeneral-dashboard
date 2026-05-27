import { getPerfilActual, getScopeUnidades } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase/server";
import { ValidarButtons } from "@/components/validaciones/validar-buttons";
import { formatFecha } from "@/lib/utils";
import { redirect } from "next/navigation";
import Link from "next/link";

export const revalidate = 0;

export default async function ValidacionesPage() {
  const perfil = await getPerfilActual();
  if (!perfil) redirect("/login");

  // Solo Subsec, Sec (lectura), admin
  if (!["subsecretario", "secretario", "admin_funcional"].includes(perfil.rol)) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <p className="text-sm text-muted">No tenés permisos para acceder a esta vista.</p>
      </div>
    );
  }

  const scopeIds = await getScopeUnidades(perfil);
  const sb = await getSupabaseServer();

  // Traer avances pendientes de validación dentro del scope
  const { data: avancesData } = await sb
    .from("avance")
    .select(
      `id, fecha_reporte, valor_numerico, valor_cualitativo, observacion, estado_validacion,
       meta:meta(id, nombre),
       proyecto:proyecto(id, nombre, codigo, unidad:unidad_organizacional(id, nombre, nombre_corto))`
    )
    .eq("estado_validacion", "pendiente")
    .order("fecha_reporte", { ascending: false })
    .limit(100);

  // Supabase devuelve joins como arrays; los aplanamos a un objeto por relación
  type RawRow = {
    id: string;
    fecha_reporte: string;
    valor_numerico: number | null;
    valor_cualitativo: string | null;
    observacion: string | null;
    estado_validacion: string;
    meta: { id: string; nombre: string }[] | { id: string; nombre: string } | null;
    proyecto:
      | {
          id: string;
          nombre: string;
          codigo: string | null;
          unidad: { id: string; nombre: string; nombre_corto: string | null }[] | { id: string; nombre: string; nombre_corto: string | null } | null;
        }[]
      | {
          id: string;
          nombre: string;
          codigo: string | null;
          unidad: { id: string; nombre: string; nombre_corto: string | null }[] | { id: string; nombre: string; nombre_corto: string | null } | null;
        }
      | null;
  };
  const flat = <T,>(v: T | T[] | null | undefined): T | null =>
    Array.isArray(v) ? v[0] ?? null : v ?? null;

  type Row = {
    id: string;
    fecha_reporte: string;
    valor_numerico: number | null;
    valor_cualitativo: string | null;
    observacion: string | null;
    estado_validacion: string;
    meta: { id: string; nombre: string } | null;
    proyecto: {
      id: string;
      nombre: string;
      codigo: string | null;
      unidad: { id: string; nombre: string; nombre_corto: string | null } | null;
    } | null;
  };

  const pendientes: Row[] = ((avancesData ?? []) as RawRow[])
    .map((a) => {
      const py = flat(a.proyecto);
      return {
        id: a.id,
        fecha_reporte: a.fecha_reporte,
        valor_numerico: a.valor_numerico,
        valor_cualitativo: a.valor_cualitativo,
        observacion: a.observacion,
        estado_validacion: a.estado_validacion,
        meta: flat(a.meta),
        proyecto: py ? { ...py, unidad: flat(py.unidad) } : null,
      };
    })
    .filter((a) => scopeIds.includes(a.proyecto?.unidad?.id ?? ""));

  const puedeValidar = ["subsecretario", "admin_funcional"].includes(perfil.rol);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Validaciones pendientes</h1>
        <p className="text-sm text-muted mt-1">
          {pendientes.length} avance{pendientes.length === 1 ? "" : "s"} esperando validación
        </p>
      </div>

      {pendientes.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <p className="text-sm text-muted">No hay avances pendientes en tu ámbito.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendientes.map((av) => (
            <div key={av.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between text-xs text-muted mb-2">
                <span>{formatFecha(av.fecha_reporte)}</span>
                <span className="bg-warning/10 text-warning border border-warning/30 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">
                  pendiente
                </span>
              </div>
              <p className="text-xs text-muted">
                {av.proyecto?.unidad?.nombre_corto ?? av.proyecto?.unidad?.nombre} ·{" "}
                <Link
                  href={`/proyectos/${av.proyecto?.id}`}
                  className="text-primary hover:text-primary-light"
                >
                  {av.proyecto?.codigo ?? "—"} {av.proyecto?.nombre}
                </Link>
              </p>
              {av.meta && (
                <p className="text-sm font-semibold text-foreground mt-1 line-clamp-2">
                  {av.meta.nombre}
                </p>
              )}
              <div className="text-sm text-foreground mt-1">
                {av.valor_numerico != null && <span>Valor: {av.valor_numerico}</span>}
                {av.valor_cualitativo && <span>Nivel: {av.valor_cualitativo}</span>}
              </div>
              {av.observacion && (
                <p className="text-xs text-muted mt-1 italic">{av.observacion}</p>
              )}

              {puedeValidar && <ValidarButtons avanceId={av.id} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
