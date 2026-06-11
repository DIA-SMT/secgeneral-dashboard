import { getPerfilActual } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase/server";
import { BackButton } from "@/components/layout/back-button";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { FichaPrisma, UnidadOrganizacional } from "@/types/database";

export const revalidate = 0;

export default async function ExportarPage() {
  const perfil = await getPerfilActual();
  if (!perfil) redirect("/login");

  const sb = await getSupabaseServer();
  let query = sb
    .from("ficha_prisma")
    .select("*, unidad:unidad_organizacional(id, nombre, nombre_corto)")
    .is("deleted_at", null)
    .order("created_at");
  if (perfil.unidad_id) query = query.eq("unidad_id", perfil.unidad_id);
  const { data } = await query;
  const fichas = (data ?? []) as (FichaPrisma & { unidad?: UnidadOrganizacional })[];
  const direccionNombre = fichas[0]?.unidad?.nombre ?? "tu dirección";

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <BackButton fallback="/poa-2027" />
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Generar POA 2027</h1>
        <p className="text-sm text-muted mt-1">
          Documento editable (Word) que reúne todas las fichas PRISMA de {direccionNombre}.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-primary/20 flex items-center justify-center text-2xl">
            📄
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">
              POA 2027 — {direccionNombre}
            </p>
            <p className="text-xs text-muted mt-0.5">
              {fichas.length} {fichas.length === 1 ? "ficha PRISMA" : "fichas PRISMA"} · formato .doc editable en Word
            </p>
          </div>
        </div>

        {fichas.length === 0 ? (
          <div className="mt-5 rounded-lg bg-border/20 p-4 text-center">
            <p className="text-sm text-muted">
              Todavía no hay fichas para exportar.
            </p>
            <Link
              href="/poa-2027/cargar"
              className="inline-block mt-2 text-xs text-primary hover:text-primary-light"
            >
              Cargar la primera ficha →
            </Link>
          </div>
        ) : (
          <a
            href="/api/poa-2027/exportar"
            className="mt-5 inline-flex items-center gap-2 text-sm bg-primary text-white rounded-lg px-5 py-2.5 hover:bg-primary/90"
          >
            📥 Descargar documento POA 2027
          </a>
        )}

        <p className="text-[10px] text-muted mt-4 leading-relaxed">
          El archivo se descarga en formato <strong>.doc</strong> y se abre directamente en Microsoft
          Word (o Google Docs), donde podés editarlo libremente antes de presentarlo como la POA 2027
          de tu dirección.
        </p>
      </div>
    </div>
  );
}
