"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { RolUsuario } from "@/types/database";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  roles?: RolUsuario[]; // undefined = visible para todos los autenticados
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Panel Ejecutivo", icon: "◎" },
  { href: "/proyectos", label: "Proyectos", icon: "▦" },
  { href: "/estructura", label: "Estructura", icon: "◈" },
  { href: "/indicadores", label: "Indicadores", icon: "◉" },
  { href: "/avance-direcciones", label: "Avance por Dirección", icon: "📊" },
  { href: "/agenda", label: "Agenda Semanal", icon: "▤" },
  {
    href: "/validaciones",
    label: "Validaciones",
    icon: "✓",
    roles: ["subsecretario", "secretario", "admin_funcional"],
  },
  {
    href: "/admin/usuarios",
    label: "Usuarios",
    icon: "⚙",
    roles: ["admin_funcional", "admin_tecnico"],
  },
];

export function Sidebar({ rol }: { rol: RolUsuario | null }) {
  const pathname = usePathname();
  const visibles = navItems.filter((i) => !i.roles || (rol && i.roles.includes(rol)));

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-surface min-h-screen">
      <div className="p-5 border-b border-border flex items-center gap-3">
        <Image
          src="/logos/logoMuni-sm.png"
          alt="PlanIA"
          width={40}
          height={40}
          className="h-10 w-10 shrink-0"
          priority
        />
        <div className="leading-tight">
          <p className="text-xl font-bold text-foreground tracking-tight">
            <span>Plan</span><span className="text-primary">IA</span>
          </p>
          <p className="text-[9px] text-muted uppercase tracking-widest">
            POA 2026 · Muni SMT
          </p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {visibles.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${
                  active
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted hover:text-foreground hover:bg-surface-hover"
                }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border space-y-3">
        <div className="flex items-center justify-center gap-4">
          <Image
            src="/logos/Direccion IA logo Secregeneral Dashboard.png"
            alt="Dirección de IA"
            width={100}
            height={32}
            className="logo-auto h-8 w-auto opacity-70"
          />
          {/* Placeholder de Planificación Estratégica — reemplazar src cuando llegue el archivo */}
          <div
            title="Dirección de Planificación Estratégica"
            className="flex items-center justify-center h-8 w-8 rounded border border-border bg-surface text-[10px] font-bold text-muted/70"
          >
            PE
          </div>
        </div>
        <p className="text-[9px] text-muted/60 text-center leading-relaxed">
          <span className="font-semibold">PlanIA</span> · desarrollado por la Dirección
          de Inteligencia Artificial en conjunto con la Dirección de Planificación
          Estratégica de la Municipalidad de San Miguel de Tucumán
        </p>
      </div>
    </aside>
  );
}
