interface KpiCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon?: React.ReactNode;
  accent?: "primary" | "success" | "warning" | "danger" | "accent" | "muted";
}

const bordes = {
  primary: "border-primary/30",
  success: "border-success/30",
  warning: "border-warning/30",
  danger: "border-danger/30",
  accent: "border-accent/30",
  muted: "border-border",
};

const chips = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  accent: "bg-accent/10 text-accent",
  muted: "bg-muted/10 text-muted",
};

// Correcciones 06.08: el ícono pasa a un cuadrado redondeado a la izquierda y
// el texto queda en columna a su derecha (etiqueta / valor / detalle).
export function KpiCard({ label, value, sublabel, icon, accent = "primary" }: KpiCardProps) {
  return (
    <div className={`rounded-2xl border bg-surface p-5 flex items-center gap-4 ${bordes[accent]}`}>
      {icon && (
        <span className={`h-11 w-11 rounded-xl flex items-center justify-center text-lg shrink-0 ${chips[accent]}`}>
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <span className="block text-xs font-medium uppercase tracking-wider text-muted">
          {label}
        </span>
        <span className="block text-3xl font-bold tracking-tight text-foreground tabular-nums leading-tight">
          {value}
        </span>
        {sublabel && <span className="block text-xs text-muted">{sublabel}</span>}
      </div>
    </div>
  );
}
