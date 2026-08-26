import { getUnidades, getAgendaSemana, lunesDeSemana } from "@/lib/queries";
import { getPerfilActual } from "@/lib/auth";
import { unidadesQueGestionaAgenda } from "@/lib/utils";
import { AgendaCargarForm } from "@/components/agenda/agenda-cargar-form";
import { BackButton } from "@/components/layout/back-button";

export const revalidate = 0;

interface Props {
  searchParams: Promise<{ unidad?: string; semana?: string }>;
}

export default async function CargarAgendaPage({ searchParams }: Props) {
  const params = await searchParams;
  const fechaLunes = params.semana ?? lunesDeSemana();
  const [unidades, perfil] = await Promise.all([getUnidades(), getPerfilActual()]);

  // 06.08: se ofrecen solo las unidades sobre las que el usuario puede cargar
  // —incluida la suya, aunque sea una secretaría o subsecretaría— en vez de
  // "todas las de nivel >= 1". Antes un secretario no podía cargar su agenda.
  const cargables = unidadesQueGestionaAgenda(perfil, unidades);
  const disponibles = cargables.length > 0 ? cargables : unidades.filter((u) => u.nivel >= 1);

  const unidadInicial =
    params.unidad ??
    disponibles.find((u) => u.id === perfil?.unidad_id)?.id ??
    disponibles[0]?.id ??
    "";
  const agendaInicial = unidadInicial ? await getAgendaSemana(unidadInicial, fechaLunes) : null;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between gap-3">
        <BackButton fallback="/agenda" />
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Cargar Agenda Semanal</h1>
        <p className="text-sm text-muted mt-1">Semana del {fechaLunes}</p>
      </div>

      <AgendaCargarForm
        unidades={disponibles}
        unidadInicial={unidadInicial}
        fechaLunes={fechaLunes}
        agendaInicial={agendaInicial}
      />
    </div>
  );
}
