import { getPerfilActual } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase/server";
import { BackButton } from "@/components/layout/back-button";
import { FichaForm } from "@/components/prisma/ficha-form";
import { redirect } from "next/navigation";
import type { UnidadOrganizacional } from "@/types/database";

export const revalidate = 0;

export default async function CargarFichaPage() {
  const perfil = await getPerfilActual();
  if (!perfil) redirect("/login");
  if (!["director", "admin_funcional"].includes(perfil.rol)) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <p className="text-sm text-muted">Solo los Directores pueden cargar fichas PRISMA.</p>
      </div>
    );
  }
  if (!perfil.unidad_id) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <p className="text-sm text-muted">Tu perfil no tiene una dirección asignada. Contactá a un administrador.</p>
      </div>
    );
  }

  const sb = await getSupabaseServer();
  const { data: unidadData } = await sb
    .from("unidad_organizacional")
    .select("*")
    .eq("id", perfil.unidad_id)
    .single();
  const unidad = unidadData as UnidadOrganizacional | null;

  // Buscar la secretaría ancestro para pre-cargar el campo S
  let secretariaNombre: string | null = null;
  if (unidad) {
    let cur = unidad;
    while (cur.parent_id) {
      const { data: padre } = await sb
        .from("unidad_organizacional")
        .select("*")
        .eq("id", cur.parent_id)
        .single();
      if (!padre) break;
      cur = padre as UnidadOrganizacional;
    }
    if (cur.nivel === 0) secretariaNombre = cur.nombre;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-3">
        <BackButton fallback="/poa-2027" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Nueva Ficha PRISMA</h1>
        <p className="text-sm text-muted mt-1">Planificación POA 2027</p>
      </div>
      <FichaForm
        direccionNombre={unidad?.nombre ?? "—"}
        secretariaNombre={secretariaNombre}
      />
    </div>
  );
}
