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
  { href: "/hitos", label: "Hitos", icon: "◆" },
  { href: "/indicadores", label: "Indicadores", icon: "◉" },
  { href: "/agenda", label: "Agenda Semanal", icon: "▤" },
  {
    href: "/carga",
    label: "Cargar Avances",
    icon: "✎",
    roles: ["director", "admin_funcional"],
  },
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
      <div className="p-5 border-b border-border">
        <Image
          src="/logos/Logo Muni- Secre dashboard.png"
          alt="Ciudad San Miguel de Tucumán"
          width={180}
          height={50}
          className="logo-auto h-10 w-auto"
          priority
        />
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
        <div className="flex items-center justify-center">
          <Image
            src="/logos/Direccion IA logo Secregeneral Dashboard.png"
            alt="Dirección de IA"
            width={120}
            height={40}
            className="logo-auto h-8 w-auto opacity-70"
          />
        </div>
        <p className="text-[9px] text-muted/60 text-center leading-relaxed">
          Desarrollo realizado por la Dirección de IA
          en conjunto con la Dirección de Planificación Estratégica
          de la Municipalidad de San Miguel de Tucumán
        </p>
      </div>
    </aside>
  );
}
