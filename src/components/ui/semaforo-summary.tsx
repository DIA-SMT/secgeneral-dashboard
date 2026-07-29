interface SemaforoSummaryProps {
  verde: number;
  amarillo: number;
  rojo: number;
  sin_datos: number;
  label?: string;
}

export function SemaforoSummary({
  verde,
  amarillo,
  rojo,
  sin_datos,
  label = "metas",
}: SemaforoSummaryProps) {
  const total = verde + amarillo + rojo + sin_datos;
  return (
    <div className="flex items-center gap-4">
      <SemaforoItem color="bg-success" count={verde} label="FINALIZADO" />
      <SemaforoItem color="bg-warning" count={amarillo} label="EN EJECUCIÓN" />
      <SemaforoItem color="bg-info" count={rojo} label="NO INICIADO" />
      {sin_datos > 0 && (
        <SemaforoItem color="bg-primary/30" count={sin_datos} label="Sin datos" />
      )}
      <span className="text-xs text-muted ml-2">
        {total} {label}
      </span>
    </div>
  );
}

function SemaforoItem({ color, count, label }: { color: string; count: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5" title={label}>
      <span className={`h-3 w-3 rounded-full ${color}`} />
      <span className="text-sm font-semibold text-foreground">{count}</span>
    </div>
  );
}
