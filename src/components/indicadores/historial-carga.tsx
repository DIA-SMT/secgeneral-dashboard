import type { AccionHistorial, IndicadorHistorial } from "@/types/database";
import { StatusDot } from "@/components/ui/status-badge";

const ACCION_LABEL: Record<AccionHistorial, string> = {
  carga: "Carga de avance",
  edicion: "Edición del indicador",
  borrado: "Borrado del valor",
};

const ACCION_ESTILO: Record<AccionHistorial, string> = {
  carga: "bg-success/10 text-success border-success/20",
  edicion: "bg-accent/10 text-accent border-accent/20",
  borrado: "bg-muted/10 text-muted border-border",
};

interface Props {
  historial: IndicadorHistorial[];
  unidadMedida?: string | null;
}

/**
 * Historial de Carga (30.07): trazabilidad del indicador. Lista cada carga o
 * actualización con el valor que quedó, quién la hizo y cuándo, de la más
 * reciente a la más vieja, para poder leer la evolución en el tiempo.
 */
export function HistorialCarga({ historial, unidadMedida }: Props) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-xs text-muted uppercase tracking-wider">Historial de carga</p>
        {historial.length > 0 && (
          <span className="text-[10px] text-muted">
            {historial.length} {historial.length === 1 ? "registro" : "registros"}
          </span>
        )}
      </div>

      {historial.length === 0 ? (
        <p className="text-xs text-muted italic">
          Todavía no hay cargas registradas para este indicador. Cada avance que se
          guarde a partir de ahora queda acá con su valor y su fecha.
        </p>
      ) : (
        <ol className="space-y-0">
          {historial.map((h, i) => (
            <li
              key={h.id}
              className={`flex items-start gap-3 py-2.5 ${
                i > 0 ? "border-t border-border/60" : ""
              }`}
            >
              <div className="w-32 shrink-0">
                <p className="text-[11px] text-foreground font-medium">
                  {new Date(h.created_at).toLocaleDateString("es-AR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </p>
                <p className="text-[10px] text-muted">
                  {new Date(h.created_at).toLocaleTimeString("es-AR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground break-words">
                    {valorDisplay(h, unidadMedida)}
                  </span>
                  {h.estado_semaforo && <StatusDot estado={h.estado_semaforo} />}
                  <span
                    className={`text-[9px] uppercase tracking-wider border rounded px-1.5 py-0.5 ${
                      ACCION_ESTILO[h.accion]
                    }`}
                  >
                    {ACCION_LABEL[h.accion]}
                  </span>
                </div>
                {h.valor_objetivo != null || h.valor_objetivo_texto ? (
                  <p className="text-[10px] text-muted mt-0.5">
                    Objetivo: {h.valor_objetivo_texto ?? h.valor_objetivo}
                    {h.unidad_medida ? ` ${h.unidad_medida}` : ""}
                  </p>
                ) : null}
                {h.observacion && (
                  <p className="text-[11px] text-muted/90 mt-1 break-words">{h.observacion}</p>
                )}
              </div>

              <div className="w-40 shrink-0 text-right">
                <p className="text-[10px] text-muted truncate" title={h.registrado_por_email ?? ""}>
                  {h.registrado_por_nombre ?? h.registrado_por_email ?? "—"}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// El valor textual gana sobre el numérico, igual que en el detalle del indicador.
function valorDisplay(h: IndicadorHistorial, unidadMedida?: string | null): string {
  if (h.accion === "borrado") return "Sin valor";
  if (h.valor_actual_texto && h.valor_actual_texto.trim() !== "") return h.valor_actual_texto;
  if (h.valor_actual != null) {
    const um = h.unidad_medida ?? unidadMedida;
    return `${h.valor_actual}${um ? ` ${um}` : ""}`;
  }
  return "—";
}
