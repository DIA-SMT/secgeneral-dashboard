interface KpiBreakdownTooltipProps {
  verde: number;
  amarillo: number;
  rojo: number;
  sin_datos?: number;
}

/**
 * Tooltip que aparece al pasar el mouse (group-hover) sobre un KPI de conteo,
 * mostrando el desglose por estado en verde / amarillo / rojo.
 * Requiere que el contenedor padre tenga las clases `relative group`.
 */
export function KpiBreakdownTooltip({
  verde,
  amarillo,
  rojo,
  sin_datos = 0,
}: KpiBreakdownTooltipProps) {
  return (
    <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-max rounded-lg border border-border bg-surface px-3 py-2 shadow-lg opacity-0 translate-y-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-y-0">
      <div className="flex items-center gap-3 text-xs font-semibold text-foreground">
        <Item color="bg-success" count={verde} />
        <Item color="bg-warning" count={amarillo} />
        <Item color="bg-danger" count={rojo} />
        {sin_datos > 0 && <Item color="bg-primary/30" count={sin_datos} />}
      </div>
    </div>
  );
}

function Item({ color, count }: { color: string; count: number }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {count}
    </span>
  );
}
