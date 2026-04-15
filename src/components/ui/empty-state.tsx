interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: string;
}

export function EmptyState({ title, description, icon = "◇" }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-4xl text-muted/30 mb-4">{icon}</span>
      <h3 className="text-base font-semibold text-muted">{title}</h3>
      {description && (
        <p className="text-sm text-muted/60 mt-1 max-w-sm">{description}</p>
      )}
    </div>
  );
}
