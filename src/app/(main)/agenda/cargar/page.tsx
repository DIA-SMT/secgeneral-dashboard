import { getUnidades, getAgendaSemana, lunesDeSemana } from "@/lib/queries";
import { AgendaCargarForm } from "@/components/agenda/agenda-cargar-form";
import { BackButton } from "@/components/layout/back-button";

export const revalidate = 0;

interface Props {
  searchParams: Promise<{ unidad?: string; semana?: string }>;
}

export default async function CargarAgendaPage({ searchParams }: Props) {
  const params = await searchParams;
  const fechaLunes = params.semana ?? lunesDeSemana();
  const unidades = await getUnidades();
  const direcciones = unidades.filter((u) => u.nivel >= 1);

  const unidadInicial = params.unidad ?? direcciones[0]?.id ?? "";
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
        unidades={direcciones}
        unidadInicial={unidadInicial}
        fechaLunes={fechaLunes}
        agendaInicial={agendaInicial}
      />
    </div>
  );
}
