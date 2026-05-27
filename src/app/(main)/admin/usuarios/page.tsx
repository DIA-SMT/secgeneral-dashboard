import { getPerfilActual } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { UsuariosTable } from "@/components/admin/usuarios-table";
import type { PerfilUsuario, UnidadOrganizacional } from "@/types/database";

export const revalidate = 0;

export default async function AdminUsuariosPage() {
  const perfil = await getPerfilActual();
  if (!perfil) redirect("/login");
  if (!["admin_funcional", "admin_tecnico"].includes(perfil.rol)) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <p className="text-sm text-muted">No tenés permisos para acceder a esta sección.</p>
      </div>
    );
  }

  const sb = await getSupabaseServer();
  const [{ data: perfilesData }, { data: unidadesData }] = await Promise.all([
    sb.from("perfil_usuario")
      .select("*, unidad:unidad_organizacional(id, nombre, nombre_corto, nivel)")
      .order("rol")
      .order("nombre"),
    sb.from("unidad_organizacional")
      .select("id, nombre, nombre_corto, nivel, parent_id, activa")
      .eq("activa", true)
      .order("nivel")
      .order("nombre"),
  ]);

  const perfiles = (perfilesData ?? []) as PerfilUsuario[];
  const unidades = (unidadesData ?? []) as UnidadOrganizacional[];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Administración de Usuarios</h1>
        <p className="text-sm text-muted mt-1">
          {perfiles.length} {perfiles.length === 1 ? "perfil cargado" : "perfiles cargados"}
        </p>
      </div>

      <UsuariosTable perfiles={perfiles} unidades={unidades} rolActual={perfil.rol} />
    </div>
  );
}
