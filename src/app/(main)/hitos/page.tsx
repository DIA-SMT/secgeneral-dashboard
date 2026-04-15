import { getPeriodoActivo, getTodosLosHitos } from "@/lib/queries";
import { formatFecha, formatFechaRelativa } from "@/lib/utils";
import Link from "next/link";

export const revalidate = 60;

interface HitoConProyecto {
  id: string;
  nombre: string;
  fecha_esperada: string | null;
  completado: boolean;
  fecha_completado: string | null;
  obligatorio: boolean;
  proyecto: { id: string; nombre: string; codigo: string | null };
}

export default async function HitosPage() {
  const periodo = await getPeriodoActivo();
  const hitos = (await getTodosLosHitos(periodo.id)) as unknown as HitoConProyecto[];

  const ahora = new Date();
  const ahoraStr = ahora.toISOString().slice(0, 10);
  const en30Dias = new Date(ahora.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const completados = hitos.filter((h) => h.completado);
  const vencidos = hitos.filter(
    (h) => !h.completado && h.fecha_esperada && h.fecha_esperada < ahoraStr
  );
  const proximos = hitos.filter(
    (h) => !h.completado && h.fecha_esperada && h.fecha_esperada >= ahoraStr && h.fecha_esperada <= en30Dias
  );
  const futuros = hitos.filter(
    (h) => !h.completado && h.fecha_esperada && h.fecha_esperada > en30Dias
  );
  const sinFecha = hitos.filter((h) => !h.completado && !h.fecha_esperada);

  // Limitar secciones para no saturar
  const MAX_PER_SECTION = 15;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Hitos</h1>
        <p className="text-sm text-muted mt-1">
          {completados.length} completados · {vencidos.length} con fecha vencida · {proximos.length + futuros.length} pendientes
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Completados" count={completados.length} color="bg-success" />
        <StatCard label="Fecha vencida" count={vencidos.length} color="bg-warning" />
        <StatCard label="Próximos 30d" count={proximos.length} color="bg-accent" />
        <StatCard label="Futuros" count={futuros.length} color="bg-border" />
      </div>

      {/* Nota semantica */}
      {vencidos.length > 0 && (
        <div className="rounded-xl border border-warning/20 bg-warning/5 p-4">
          <p className="text-xs text-warning font-medium">
            {vencidos.length} hitos tienen fecha esperada anterior a hoy y no fueron marcados como completados.
            Esto puede significar que necesitan reprogramación o que el avance aún no fue reportado.
          </p>
        </div>
      )}

      {vencidos.length > 0 && (
        <HitoSection titulo="Con fecha vencida" subtitulo="Requieren revisión"
          hitos={vencidos.slice(0, MAX_PER_SECTION)} colorDot="bg-warning" total={vencidos.length} max={MAX_PER_SECTION} />
      )}

      {proximos.length > 0 && (
        <HitoSection titulo="Próximos 30 días" subtitulo="Hitos que vencen pronto"
          hitos={proximos} colorDot="bg-accent" total={proximos.length} max={MAX_PER_SECTION} />
      )}

      {futuros.length > 0 && (
        <HitoSection titulo="Futuros" subtitulo="Más allá de 30 días"
          hitos={futuros.slice(0, MAX_PER_SECTION)} colorDot="bg-border" total={futuros.length} max={MAX_PER_SECTION} />
      )}

      {completados.length > 0 && (
        <HitoSection titulo="Completados" subtitulo=""
          hitos={completados.slice(0, MAX_PER_SECTION)} colorDot="bg-success" total={completados.length} max={MAX_PER_SECTION} />
      )}
    </div>
  );
}

function StatCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 flex items-center gap-3">
      <div className={`h-4 w-4 rounded-full ${color}`} />
      <div>
        <p className="text-2xl font-bold text-foreground">{count}</p>
        <p className="text-xs text-muted">{label}</p>
      </div>
    </div>
  );
}

function HitoSection({ titulo, subtitulo, hitos, colorDot, total, max }: {
  titulo: string; subtitulo: string; hitos: HitoConProyecto[]; colorDot: string; total: number; max: number;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-1">{titulo}</h2>
      {subtitulo && <p className="text-xs text-muted mb-3">{subtitulo}</p>}
      <div className="space-y-2">
        {hitos.map((hito) => (
          <div key={hito.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface">
            <div className={`h-3 w-3 rounded-full ${colorDot} shrink-0`} />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-foreground line-clamp-1">{hito.nombre}</h3>
              <Link href={`/proyectos/${hito.proyecto.id}`}
                className="text-xs text-muted hover:text-primary transition-colors">
                {hito.proyecto.codigo ?? hito.proyecto.nombre}
              </Link>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-medium text-foreground">
                {hito.completado ? formatFecha(hito.fecha_completado) : formatFecha(hito.fecha_esperada)}
              </p>
              <p className="text-[10px] text-muted">
                {hito.completado ? "Completado" : formatFechaRelativa(hito.fecha_esperada)}
              </p>
            </div>
            {hito.obligatorio && (
              <span className="text-[10px] text-warning bg-warning/10 px-1.5 py-0.5 rounded">Oblig.</span>
            )}
          </div>
        ))}
      </div>
      {total > max && (
        <p className="text-xs text-muted mt-2">Mostrando {max} de {total}</p>
      )}
    </div>
  );
}
