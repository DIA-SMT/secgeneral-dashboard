import { getUnidades, getAgendasSemana, lunesDeSemana } from "@/lib/queries";
import { TotemRotator } from "@/components/agenda/totem-rotator";
import type { AgendaSemana, AgendaActividad } from "@/types/database";

export const revalidate = 60;

interface Props {
  searchParams: Promise<{ subsec?: string; semana?: string }>;
}

export default async function AgendaTotemRotatorPage({ searchParams }: Props) {
  const params = await searchParams;
  const fechaLunes = params.semana ?? lunesDeSemana();
  const [unidades, agendas] = await Promise.all([getUnidades(), getAgendasSemana(fechaLunes)]);

  let unidadesAMostrar = unidades.filter((u) => u.nivel >= 2);
  if (params.subsec) {
    unidadesAMostrar = unidadesAMostrar.filter((u) => u.parent_id === params.subsec);
  }

  const agendasPorUnidad = new Map<string, AgendaSemana & { actividades?: AgendaActividad[] }>();
  for (const a of agendas) agendasPorUnidad.set(a.unidad_id, a as AgendaSemana & { actividades?: AgendaActividad[] });

  return (
    <TotemRotator
      unidades={unidadesAMostrar}
      agendas={Object.fromEntries(agendasPorUnidad)}
      fechaLunes={fechaLunes}
    />
  );
}
