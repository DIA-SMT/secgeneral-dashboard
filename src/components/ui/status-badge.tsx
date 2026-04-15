import type { EstadoSemaforo } from "@/types/database";
import { semaforoColor, semaforoLabel } from "@/lib/utils";

export function StatusBadge({ estado }: { estado: EstadoSemaforo }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span className={`h-2 w-2 rounded-full ${semaforoColor(estado)}`} />
      {semaforoLabel(estado)}
    </span>
  );
}

export function StatusDot({ estado }: { estado: EstadoSemaforo }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${semaforoColor(estado)}`}
      title={semaforoLabel(estado)}
    />
  );
}
