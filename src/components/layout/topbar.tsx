"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
import { CampanaAlertas } from "./campana-alertas";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import type { AlertaConLectura, IndicadorPorVencer, RolUsuario } from "@/types/database";

type NavItem = { href: string; label: string; icon: string; roles?: RolUsuario[] };

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Panel", icon: "◎" },
  { href: "/proyectos", label: "Proyectos", icon: "▦" },
  { href: "/indicadores", label: "Indicadores", icon: "◉" },
  { href: "/agenda", label: "Agenda", icon: "▤" },
  { href: "/poa-2027", label: "POA 2027", icon: "◆" },
  { href: "/estructura", label: "Estructura", icon: "◈" },
  {
    href: "/validaciones",
    label: "Validar",
    icon: "✓",
    roles: ["subsecretario", "secretario", "admin_funcional"],
  },
];

const rolLabels: Record<RolUsuario, string> = {
  intendenta: "Intendenta",
  secretario: "Secretario",
  subsecretario: "Subsecretario",
  director: "Director",
  coordinador: "Coordinador",
  admin_funcional: "Planificación Estratégica",
  admin_tecnico: "Sistemas",
};

export function Topbar({
  perfilNombre,
  rol,
  alertas = [],
  porVencer = [],
}: {
  perfilNombre: string | null;
  rol: RolUsuario | null;
  alertas?: AlertaConLectura[];
  porVencer?: IndicadorPorVencer[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const visibles = navItems.filter((i) => !i.roles || (rol && i.roles.includes(rol)));

  const logout = async () => {
    const sb = getSupabaseBrowser();
    await sb.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex items-center justify-between h-14 px-4 lg:px-6">
        <div className="flex items-center gap-2 lg:hidden">
          <Image
            src="/logos/logoMuni-sm.png"
            alt="PlanIA"
            width={28}
            height={28}
            className="h-7 w-7"
          />
          <span className="text-base font-bold tracking-tight">
            <span>Plan</span><span className="text-primary">IA</span>
          </span>
        </div>

        <div className="hidden lg:flex items-center gap-2">
          <Image
            src="/logos/logoMuni-sm.png"
            alt="PlanIA"
            width={28}
            height={28}
            className="h-7 w-7"
          />
          <h2 className="text-sm font-medium text-foreground">
            <span className="font-bold">Plan</span>
            <span className="font-bold text-primary">IA</span>
            <span className="text-muted ml-2 font-normal">· Planificación Operativa Anual 2026</span>
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted hidden sm:inline">
            {new Date().toLocaleDateString("es-AR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </span>
          {perfilNombre && (
            <div className="hidden md:flex items-center gap-2 text-xs">
              <div className="text-right">
                <p className="text-foreground font-medium">{perfilNombre}</p>
                {rol && <p className="text-muted text-[10px]">{rolLabels[rol]}</p>}
              </div>
              <button
                onClick={logout}
                title="Cerrar sesión"
                className="text-muted hover:text-foreground border border-border rounded px-2 py-1"
              >
                ⎋
              </button>
            </div>
          )}
          <CampanaAlertas alertas={alertas} porVencer={porVencer} />
          <ThemeToggle />
        </div>
      </div>

      <nav className="flex lg:hidden border-t border-border overflow-x-auto">
        {visibles.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors min-w-[70px]
                ${active ? "text-primary border-b-2 border-primary" : "text-muted"}`}
            >
              <span className="text-sm">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
