"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";

const navItems = [
  { href: "/dashboard", label: "Panel", icon: "◎" },
  { href: "/proyectos", label: "Proyectos", icon: "▦" },
  { href: "/estructura", label: "Estructura", icon: "◈" },
  { href: "/hitos", label: "Hitos", icon: "◆" },
  { href: "/carga", label: "Cargar", icon: "✎" },
];

export function Topbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex items-center justify-between h-14 px-4 lg:px-6">
        {/* Mobile logo */}
        <div className="flex items-center gap-2 lg:hidden">
          <Image
            src="/logos/Logo Muni- Secre dashboard.png"
            alt="Ciudad SMT"
            width={120}
            height={34}
            className="logo-auto h-7 w-auto"
          />
        </div>

        {/* Page title (desktop) */}
        <div className="hidden lg:block">
          <h2 className="text-sm font-medium text-muted">
            Secretaría General — POA 2026
          </h2>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted hidden sm:inline">
            {new Date().toLocaleDateString("es-AR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </span>
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile navigation */}
      <nav className="flex lg:hidden border-t border-border overflow-x-auto">
        {navItems.map((item) => {
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
