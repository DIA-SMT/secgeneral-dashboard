import { getUnidades, getAgendasSemana, lunesDeSemana } from "@/lib/queries";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarioMes } from "@/components/agenda/calendario-mes";
import type { AgendaSemana, UnidadOrganizacional } from "@/types/database";

export const revalidate = 0;

interface Props {
  searchParams: Promise<{ semana?: string; sec?: string }>;
}

export default async function AgendaPage({ searchParams }: Props) {
  const params = await searchParams;
  const fechaLunes = params.semana ?? lunesDeSemana();
  const [unidades, agendas] = await Promise.all([getUnidades(), getAgendasSemana(fechaLunes)]);

  const sortByName = (a: UnidadOrganizacional, b: UnidadOrganizacional) =>
    (a.nombre_corto ?? a.nombre).localeCompare(b.nombre_corto ?? b.nombre);

  const unidadById = new Map(unidades.map((u) => [u.id, u]));
  const childrenByParent = new Map<string | null, UnidadOrganizacional[]>();
  for (const u of unidades) {
    const key = u.parent_id;
    (childrenByParent.get(key) ?? childrenByParent.set(key, []).get(key)!).push(u);
  }

  const agendasPorUnidad = new Map<string, AgendaSemana>();
  for (const a of agendas) agendasPorUnidad.set(a.unidad_id, a);

  const secretarias = unidades.filter((u) => u.nivel === 0).sort(sortByName);
  const secFiltro = params.sec || null;
  const secretariasMostrar = secFiltro
    ? secretarias.filter((s) => s.id === secFiltro)
    : secretarias;

  // Todas las direcciones (nivel >= 2) descendientes de una unidad
  const direccionesDe = (unidadId: string): UnidadOrganizacional[] => {
    const out: UnidadOrganizacional[] = [];
    const walk = (id: string) => {
      for (const child of childrenByParent.get(id) ?? []) {
        if (child.nivel >= 2) out.push(child);
        walk(child.id);
      }
    };
    walk(unidadId);
    return out.sort(sortByName);
  };

  // Calcular semana siguiente/anterior
  const lunesDate = new Date(fechaLunes + "T00:00:00");
  const prev = new Date(lunesDate); prev.setDate(prev.getDate() - 7);
  const next = new Date(lunesDate); next.setDate(next.getDate() + 7);
  const prevIso = prev.toISOString().slice(0, 10);
  const nextIso = next.toISOString().slice(0, 10);

  const fechaLegible = lunesDate.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const FichaCard = ({ unidad }: { unidad: UnidadOrganizacional }) => {
    const agenda = agendasPorUnidad.get(unidad.id);
    return (
      <Link
        href={`/agenda/${unidad.id}/${fechaLunes}`}
        className={`block rounded-xl border p-4 hover:border-primary/40 transition-colors ${
          agenda ? "border-success/30 bg-success/5" : "border-border bg-surface"
        }`}
      >
        <p className="text-sm font-semibold text-foreground line-clamp-1">
          {unidad.nombre_corto ?? unidad.nombre}
        </p>
        <p className="text-[10px] text-muted mt-1">
          {agenda
            ? agenda.formato_libre
              ? "Formato libre cargado"
              : `${(agenda as { actividades?: unknown[] }).actividades?.length ?? 0} actividades`
            : "Sin agenda cargada"}
        </p>
      </Link>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agenda Semanal</h1>
          <p className="text-sm text-muted mt-1">Semana del {fechaLegible}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/agenda?semana=${prevIso}${secFiltro ? `&sec=${secFiltro}` : ""}`} className="text-xs text-muted hover:text-foreground border border-border rounded-lg px-3 py-1.5">←</Link>
          <Suspense><CalendarioMes semanaActual={fechaLunes} /></Suspense>
          <Link href={`/agenda?semana=${nextIso}${secFiltro ? `&sec=${secFiltro}` : ""}`} className="text-xs text-muted hover:text-foreground border border-border rounded-lg px-3 py-1.5">→</Link>
          <Link href={`/agenda/cargar?semana=${fechaLunes}`} className="text-xs text-primary border border-primary/30 bg-primary/10 hover:bg-primary/20 rounded-lg px-3 py-1.5">+ Cargar agenda</Link>
        </div>
      </div>

      {/* Filtro por Secretaría */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted uppercase tracking-wider">Secretaría:</span>
        <Link
          href={`/agenda?semana=${fechaLunes}`}
          className={`text-xs px-3 py-1 rounded-lg border ${
            !secFiltro ? "bg-primary/20 text-primary border-primary/30" : "border-border text-muted hover:text-foreground"
          }`}
        >
          Todas
        </Link>
        {secretarias.map((s) => (
          <Link
            key={s.id}
            href={`/agenda?semana=${fechaLunes}&sec=${s.id}`}
            className={`text-xs px-3 py-1 rounded-lg border ${
              secFiltro === s.id ? "bg-primary/20 text-primary border-primary/30" : "border-border text-muted hover:text-foreground"
            }`}
          >
            {s.nombre_corto ?? s.nombre}
          </Link>
        ))}
      </div>

      <div className="space-y-8">
        {secretariasMostrar.map((sec) => {
          const subs = (childrenByParent.get(sec.id) ?? []).filter((u) => u.nivel === 1).sort(sortByName);
          const dirsDirectas = (childrenByParent.get(sec.id) ?? []).filter((u) => u.nivel === 2).sort(sortByName);
          const totalDirs = direccionesDe(sec.id).length;
          if (totalDirs === 0) return null;

          return (
            <section key={sec.id}>
              <div className="flex items-center gap-2 mb-4 border-b border-border pb-2">
                <div className="h-7 w-7 rounded-md bg-primary/20 flex items-center justify-center">
                  <span className="text-primary text-xs font-bold">{sec.nombre_corto?.[0] ?? sec.nombre[0]}</span>
                </div>
                <h2 className="text-base font-bold text-foreground">{sec.nombre}</h2>
                <span className="text-xs text-muted">· {totalDirs} direcciones</span>
              </div>

              {/* Direcciones que cuelgan directo de la secretaría */}
              {dirsDirectas.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
                  {dirsDirectas.map((dir) => (
                    <FichaCard key={dir.id} unidad={dir} />
                  ))}
                </div>
              )}

              {/* Subsecretarías con sus direcciones */}
              {subs.map((sub) => {
                const dirs = direccionesDe(sub.id);
                if (dirs.length === 0) return null;
                return (
                  <div key={sub.id} className="mb-5">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-5 w-5 rounded bg-accent/20 flex items-center justify-center">
                        <span className="text-accent text-[10px] font-bold">{sub.nombre_corto?.[0]}</span>
                      </div>
                      <h3 className="text-xs font-semibold text-accent uppercase tracking-wider">{sub.nombre}</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {dirs.map((dir) => (
                        <FichaCard key={dir.id} unidad={dir} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </section>
          );
        })}
      </div>
    </div>
  );
}
