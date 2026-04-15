interface KpiCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon?: React.ReactNode;
  accent?: "primary" | "success" | "warning" | "danger" | "accent" | "muted";
}

const accentStyles = {
  primary: "border-primary/30 text-primary",
  success: "border-success/30 text-success",
  warning: "border-warning/30 text-warning",
  danger: "border-danger/30 text-danger",
  accent: "border-accent/30 text-accent",
  muted: "border-border text-muted",
};

export function KpiCard({ label, value, sublabel, icon, accent = "primary" }: KpiCardProps) {
  return (
    <div
      className={`rounded-xl border bg-surface p-5 flex flex-col gap-1 ${accentStyles[accent]} border-l-2`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted">
          {label}
        </span>
        {icon && <span className="opacity-60">{icon}</span>}
      </div>
      <span className="text-3xl font-bold tracking-tight text-foreground">
        {value}
      </span>
      {sublabel && (
        <span className="text-xs text-muted">{sublabel}</span>
      )}
    </div>
  );
}
