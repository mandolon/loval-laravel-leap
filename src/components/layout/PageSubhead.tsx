import { cn } from "@/lib/utils";

interface PageSubheadProps {
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageSubhead({
  description,
  actions,
  className,
}: PageSubheadProps) {
  if (!description && !actions) return null;

  return (
    <div className={cn("flex items-center justify-between gap-3 mt-1", className)}>
      {description && (
        <p className="text-muted-foreground flex-1">
          {description}
        </p>
      )}
      {actions && (
        <div className="shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
