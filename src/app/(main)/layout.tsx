import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { CartelAlertas } from "@/components/layout/cartel-alertas";
import { getPerfilActual } from "@/lib/auth";
import { getAlertasDelUsuario, getIndicadoresPorVencer } from "@/lib/queries";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const perfil = await getPerfilActual();

  // Las alertas se traen acá, una vez para todo el layout: la campanita las
  // necesita en la barra y el cartel arriba del contenido. Si algo falla, la
  // navegación no se cae por un aviso — se muestra la campanita vacía. (26.08)
  const [alertas, porVencer] = perfil
    ? await Promise.all([
        getAlertasDelUsuario().catch(() => []),
        getIndicadoresPorVencer().catch(() => []),
      ])
    : [[], []];

  return (
    <div className="flex h-full">
      <Sidebar rol={perfil?.rol ?? null} />
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <Topbar
          perfilNombre={perfil?.nombre ?? perfil?.email ?? null}
          rol={perfil?.rol ?? null}
          alertas={alertas}
          porVencer={porVencer}
        />
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          <CartelAlertas alertas={alertas} />
          {children}
        </main>
      </div>
    </div>
  );
}
