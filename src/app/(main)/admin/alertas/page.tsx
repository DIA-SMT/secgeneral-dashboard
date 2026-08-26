import { redirect } from "next/navigation";
import { getPerfilActual } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase/server";
import { NuevaAlertaForm, type DestinatarioOpcion } from "@/components/admin/nueva-alerta-form";
import { AlertasEnviadas, type AlertaEnviada } from "@/components/admin/alertas-enviadas";
import type { RolUsuario } from "@/types/database";

export const revalidate = 0;

export default async function AdminAlertasPage() {
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

  const [{ data: perfilesData }, { data: alertasData }] = await Promise.all([
    sb
      .from("perfil_usuario")
      .select("user_id, nombre, email, rol, unidad:unidad_organizacional(nombre_corto, nombre)")
      .eq("activo", true)
      .order("rol")
      .order("nombre"),
    // Se traen los destinatarios de cada aviso para poder contar cuántos lo
    // leyeron. Con 72 personas por aviso el volumen es chico; si algún día
    // crece, esto pasa a una vista con el conteo hecho en la base.
    sb
      .from("alerta")
      .select(
        "id, titulo, cuerpo, importante, vigente_hasta, created_at, creado_por_nombre, destinatarios:alerta_destinatario(leida_at)"
      )
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const perfiles: DestinatarioOpcion[] = ((perfilesData ?? []) as any[]).map((p) => ({
    user_id: p.user_id as string,
    nombre: (p.nombre as string | null) ?? null,
    email: p.email as string,
    rol: p.rol as RolUsuario,
    unidad_nombre: p.unidad?.nombre_corto ?? p.unidad?.nombre ?? null,
  }));

  const alertas: AlertaEnviada[] = ((alertasData ?? []) as any[]).map((a) => {
    const dest = (a.destinatarios ?? []) as { leida_at: string | null }[];
    return {
      id: a.id as string,
      titulo: a.titulo as string,
      cuerpo: a.cuerpo as string,
      importante: a.importante as boolean,
      vigente_hasta: (a.vigente_hasta as string | null) ?? null,
      created_at: a.created_at as string,
      creado_por_nombre: (a.creado_por_nombre as string | null) ?? null,
      destinatarios: dest.length,
      leidas: dest.filter((d) => d.leida_at).length,
    };
  });
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Avisos y alertas</h1>
        <p className="text-sm text-muted mt-1">
          Mensajes que se muestran dentro del sistema. Las alertas de indicadores
          próximos a vencer son automáticas: aparecen solas en la campanita de cada
          área y se van cuando el indicador se carga.
        </p>
      </div>

      <NuevaAlertaForm perfiles={perfiles} />

      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">
          Avisos enviados {alertas.length > 0 && <span className="text-muted font-normal">({alertas.length})</span>}
        </h2>
        <AlertasEnviadas alertas={alertas} />
      </div>
    </div>
  );
}
