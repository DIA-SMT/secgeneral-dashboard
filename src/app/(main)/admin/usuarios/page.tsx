import { getPerfilActual } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { UsuariosTable } from "@/components/admin/usuarios-table";
import { UsuariosSinAsignar } from "@/components/admin/usuarios-sin-asignar";
import { CrearUsuarioForm } from "@/components/admin/crear-usuario-form";
import type { PerfilUsuario, UnidadOrganizacional } from "@/types/database";

export const revalidate = 0;

export interface AuthUserOrphan {
  user_id: string;
  email: string;
  nombre: string;
  created_at: string;
}

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

  // Listar usuarios de auth.users que NO tienen perfil_usuario (huérfanos)
  let huerfanos: AuthUserOrphan[] = [];
  try {
    const admin = getSupabaseAdmin();
    const { data: authData } = await admin.auth.admin.listUsers({ perPage: 200 });
    const conPerfil = new Set(perfiles.map((p) => p.user_id));
    huerfanos = (authData?.users ?? [])
      .filter((u) => !conPerfil.has(u.id))
      .map((u) => ({
        user_id: u.id,
        email: u.email ?? "(sin email)",
        nombre:
          (u.user_metadata?.name as string) ||
          (u.user_metadata?.full_name as string) ||
          "",
        created_at: u.created_at ?? "",
      }));
  } catch (err) {
    console.error("No se pudieron listar usuarios huérfanos:", err);
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Administración de Usuarios</h1>
        <p className="text-sm text-muted mt-1">
          {perfiles.length} {perfiles.length === 1 ? "perfil cargado" : "perfiles cargados"}
          {huerfanos.length > 0 && ` · ${huerfanos.length} sin asignar`}
        </p>
      </div>

      <CrearUsuarioForm />

      {huerfanos.length > 0 && (
        <UsuariosSinAsignar usuarios={huerfanos} unidades={unidades} />
      )}

      <UsuariosTable perfiles={perfiles} unidades={unidades} userIdActual={perfil.user_id} />
    </div>
  );
}
