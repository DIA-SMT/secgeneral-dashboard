import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getPerfilActual } from "@/lib/auth";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const perfil = await getPerfilActual();

  return (
    <div className="flex h-full">
      <Sidebar rol={perfil?.rol ?? null} />
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <Topbar perfilNombre={perfil?.nombre ?? perfil?.email ?? null} rol={perfil?.rol ?? null} />
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
