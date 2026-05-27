import { getUnidades, getAgendasSemana, lunesDeSemana } from "@/lib/queries";
import Link from "next/link";
import type { AgendaSemana, UnidadOrganizacional } from "@/types/database";

export const revalidate = 60;

interface Props {
  searchParams: Promise<{ semana?: string }>;
}

export default async function AgendaPage({ searchParams }: Props) {
  const params = await searchParams;
  const fechaLunes = params.semana ?? lunesDeSemana();
  const [unidades, agendas] = await Promise.all([getUnidades(), getAgendasSemana(fechaLunes)]);

  const subsecretarias = unidades.filter((u) => u.nivel === 1);
  const direccionesPorSubsec = new Map<string, UnidadOrganizacional[]>();
  for (const sub of subsecretarias) {
    direccionesPorSubsec.set(sub.id, unidades.filter((u) => u.parent_id === sub.id));
  }

  const agendasPorUnidad = new Map<string, AgendaSemana>();
  for (const a of agendas) agendasPorUnidad.set(a.unidad_id, a);

  // Calcular semana siguiente/anterior
  const lunesDate = new Date(fechaLunes + "T00:00:00");
  const prev = new Date(lunesDate); prev.setDate(prev.getDate() - 7);
  const next = new Date(lunesDate); next.setDate(next.getDate() + 7);
  const prevIso = prev.toISOString().slice(0, 10);
  const nextIso = next.toISOString().slice(0, 10);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agenda Semanal</h1>
          <p className="text-sm text-muted mt-1">Semana del {fechaLunes}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/agenda?semana=${prevIso}`} className="text-xs text-muted hover:text-foreground border border-border rounded-lg px-3 py-1.5">← Anterior</Link>
          <Link href={`/agenda?semana=${lunesDeSemana()}`} className="text-xs text-muted hover:text-foreground border border-border rounded-lg px-3 py-1.5">Hoy</Link>
          <Link href={`/agenda?semana=${nextIso}`} className="text-xs text-muted hover:text-foreground border border-border rounded-lg px-3 py-1.5">Siguiente →</Link>
          <Link href={`/agenda/cargar?semana=${fechaLunes}`} className="text-xs text-primary border border-primary/30 bg-primary/10 hover:bg-primary/20 rounded-lg px-3 py-1.5">+ Cargar agenda</Link>
        </div>
      </div>

      <div className="space-y-8">
        {subsecretarias.map((sub) => {
          const dirs = direccionesPorSubsec.get(sub.id) ?? [];
          if (dirs.length === 0) return null;
          return (
            <section key={sub.id}>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-6 w-6 rounded-md bg-accent/20 flex items-center justify-center">
                  <span className="text-accent text-xs font-bold">{sub.nombre_corto?.[0]}</span>
                </div>
                <h2 className="text-sm font-semibold text-foreground">{sub.nombre}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {dirs.map((dir) => {
                  const agenda = agendasPorUnidad.get(dir.id);
                  return (
                    <Link
                      key={dir.id}
                      href={`/agenda/${dir.id}/${fechaLunes}`}
                      className={`block rounded-xl border p-4 hover:border-primary/40 transition-colors ${
                        agenda ? "border-success/30 bg-success/5" : "border-border bg-surface"
                      }`}
                    >
                      <p className="text-sm font-semibold text-foreground">{dir.nombre_corto ?? dir.nombre}</p>
                      <p className="text-[10px] text-muted mt-1">
                        {agenda
                          ? agenda.formato_libre
                            ? "Formato libre cargado"
                            : `${(agenda as { actividades?: unknown[] }).actividades?.length ?? 0} actividades`
                          : "Sin agenda cargada"}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
