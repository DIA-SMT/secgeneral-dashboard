import { getSupabaseServer } from "./supabase/server";
import type { PerfilUsuario, RolUsuario } from "@/types/database";

/**
 * Devuelve el perfil del usuario autenticado actual (o null si no hay sesión).
 * Usar en Server Components y Server Actions.
 */
export async function getPerfilActual(): Promise<PerfilUsuario | null> {
  const supabase = await getSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data, error } = await supabase
    .from("perfil_usuario")
    .select("*, unidad:unidad_organizacional(*)")
    .eq("user_id", userData.user.id)
    .eq("activo", true)
    .maybeSingle();

  if (error || !data) return null;
  return data as PerfilUsuario;
}

/**
 * Devuelve los ids de unidades visibles para un perfil.
 * - intendenta / admins → todas las unidades activas
 * - resto → su unidad + descendientes (via SQL recursivo)
 */
export async function getScopeUnidades(perfil: PerfilUsuario): Promise<string[]> {
  const supabase = await getSupabaseServer();

  const accesoGlobal: RolUsuario[] = ["intendenta", "admin_funcional", "admin_tecnico"];
  if (accesoGlobal.includes(perfil.rol)) {
    const { data } = await supabase
      .from("unidad_organizacional")
      .select("id")
      .eq("activa", true);
    return (data ?? []).map((u) => (u as { id: string }).id);
  }

  if (!perfil.unidad_id) return [];

  const { data } = await supabase.rpc("unidades_descendientes", {
    p_unidad_id: perfil.unidad_id,
  });
  return (data ?? []).map((row: { id: string }) => row.id);
}

/**
 * Lanza error si el perfil actual no tiene uno de los roles permitidos.
 * Para usar al inicio de Server Actions.
 */
export async function requireRol(...roles: RolUsuario[]): Promise<PerfilUsuario> {
  const perfil = await getPerfilActual();
  if (!perfil) throw new Error("No autenticado");
  if (!roles.includes(perfil.rol)) {
    throw new Error(`Permisos insuficientes (requiere: ${roles.join(", ")})`);
  }
  return perfil;
}

/**
 * Verifica que el perfil pueda cargar datos sobre una unidad específica.
 * Director solo carga sobre su propia unidad; admin_funcional sobre cualquiera.
 */
export async function requireCargaSobreUnidad(unidadId: string): Promise<PerfilUsuario> {
  const perfil = await getPerfilActual();
  if (!perfil) throw new Error("No autenticado");
  if (perfil.rol === "admin_funcional") return perfil;
  if (perfil.rol === "director" && perfil.unidad_id === unidadId) return perfil;
  throw new Error("Permisos insuficientes para cargar sobre esta unidad");
}

/**
 * Verifica que el perfil pueda validar avances sobre una unidad.
 * Subsecretario para sus direcciones hijas; admin_funcional siempre.
 */
export async function requireValidacionSobreUnidad(unidadId: string): Promise<PerfilUsuario> {
  const perfil = await getPerfilActual();
  if (!perfil) throw new Error("No autenticado");
  if (perfil.rol === "admin_funcional") return perfil;
  if (perfil.rol === "subsecretario" && perfil.unidad_id) {
    const supabase = await getSupabaseServer();
    const { data } = await supabase.rpc("unidades_descendientes", {
      p_unidad_id: perfil.unidad_id,
    });
    const ids = (data ?? []).map((r: { id: string }) => r.id);
    if (ids.includes(unidadId)) return perfil;
  }
  throw new Error("Permisos insuficientes para validar avances de esta unidad");
}
