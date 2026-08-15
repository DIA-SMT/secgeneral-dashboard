import Image from "next/image";
import Link from "next/link";
import { TvClock } from "./tv-clock";
import { TvPanel } from "./tv-panel";
import { TvCalendarioMes } from "./tv-calendario";
import { AutoRefresh } from "@/components/dashboard/auto-refresh";
import { getPeriodoActivo } from "@/lib/queries";

export const revalidate = 30;

type VistaTv = "panel" | "calendario";

interface Props {
  searchParams: Promise<{ vista?: string; fecha?: string; unidad?: string }>;
}

/**
 * Modo TV (pantalla de sala, sin login). Dos vistas:
 *   /tv                    → panel ejecutivo (mismo formato que /dashboard)
 *   /tv?vista=calendario   → agenda del mes en grilla mensual
 *
 * El encabezado, el pie y el refresco automático son comunes a las dos; cada
 * vista trae sus propios datos.
 */
export default async function TvPage({ searchParams }: Props) {
  const params = await searchParams;
  const vista: VistaTv = params.vista === "calendario" ? "calendario" : "panel";
  const periodo = await getPeriodoActivo();

  return (
    <div className="fixed inset-0 bg-background overflow-hidden p-8 flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-5">
          <Image
            src="/logos/logoMuni-sm.png"
            alt="PlanIA"
            width={56}
            height={56}
            className="h-14 w-14"
            priority
          />
          <div className="border-l border-border pl-5">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              <span>Plan</span><span className="text-primary">IA</span>
            </h1>
            <p className="text-sm text-muted mt-0.5">{periodo.nombre} · Muni SMT</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <VistaSwitch vista={vista} unidad={params.unidad ?? null} />
          <TvClock />
        </div>
      </div>

      {vista === "calendario" ? (
        <TvCalendarioMes fecha={params.fecha ?? null} unidadId={params.unidad ?? null} />
      ) : (
        <TvPanel periodoId={periodo.id} periodoNombre={periodo.nombre} />
      )}

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between text-xs text-muted/50">
        <div className="flex items-center gap-3">
          <Image
            src="/logos/Direccion IA logo Secregeneral Dashboard.png"
            alt="Dirección de IA"
            width={80}
            height={28}
            className="logo-auto h-5 w-auto opacity-50"
          />
          <p>Desarrollo realizado por la Dirección de IA — Municipalidad de San Miguel de Tucumán</p>
        </div>
        <AutoRefresh intervalSegundos={60} />
      </div>
    </div>
  );
}

/**
 * Selector de vista. En la TV nadie hace click, pero deja el modo calendario a
 * un click desde la propia pantalla y hace visible que existe.
 */
function VistaSwitch({ vista, unidad }: { vista: VistaTv; unidad: string | null }) {
  const opciones = [
    { key: "panel" as const, label: "Panel", href: "/tv" },
    {
      key: "calendario" as const,
      label: "Calendario",
      href: unidad ? `/tv?vista=calendario&unidad=${unidad}` : "/tv?vista=calendario",
    },
  ];

  return (
    <div className="flex items-center gap-1 rounded-xl border border-border bg-surface p-1">
      {opciones.map((o) => (
        <Link
          key={o.key}
          href={o.href}
          className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
            vista === o.key
              ? "bg-primary/15 text-primary font-semibold"
              : "text-muted hover:text-foreground"
          }`}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}
