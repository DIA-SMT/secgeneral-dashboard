import { getPerfilActual } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase/server";
import { BackButton } from "@/components/layout/back-button";
import { FichasList } from "@/components/prisma/fichas-list";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { FichaPrisma, UnidadOrganizacional } from "@/types/database";

export const revalidate = 0;

export default async function MisFichasPage() {
  const perfil = await getPerfilActual();
  if (!perfil) redirect("/login");

  const sb = await getSupabaseServer();

  // Director/admin ve fichas de su unidad. admin_funcional sin unidad ve todas.
  let query = sb
    .from("ficha_prisma")
    .select("*, unidad:unidad_organizacional(id, nombre, nombre_corto)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (perfil.unidad_id) query = query.eq("unidad_id", perfil.unidad_id);

  const { data } = await query;
  const fichas = (data ?? []) as (FichaPrisma & { unidad?: UnidadOrganizacional })[];

  const puedeEditar = perfil.rol === "director" || perfil.rol === "admin_funcional";

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-3">
        <BackButton fallback="/poa-2027" />
        {puedeEditar && (
          <Link
            href="/poa-2027/cargar"
            className="text-sm bg-primary/20 text-primary border border-primary/30 rounded-lg px-4 py-2 hover:bg-primary/30"
          >
            ➕ Nueva ficha
          </Link>
        )}
      </div>

      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mis Fichas PRISMA</h1>
          <p className="text-sm text-muted mt-1">
            {fichas.length} {fichas.length === 1 ? "ficha cargada" : "fichas cargadas"} para POA 2027
          </p>
        </div>
        {fichas.length > 0 && (
          <Link
            href="/poa-2027/exportar"
            className="text-xs text-primary hover:text-primary-light border border-primary/30 rounded-lg px-3 py-1.5"
          >
            📥 Generar POA 2027
          </Link>
        )}
      </div>

      {fichas.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <p className="text-sm text-muted">Todavía no cargaste ninguna ficha.</p>
          {puedeEditar && (
            <Link
              href="/poa-2027/cargar"
              className="inline-block mt-3 text-xs text-primary hover:text-primary-light"
            >
              Cargar la primera ficha →
            </Link>
          )}
        </div>
      ) : (
        <FichasList fichas={fichas} puedeEditar={puedeEditar} />
      )}
    </div>
  );
}
