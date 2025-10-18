import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  icon?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  icon,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {icon && (
        <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center shrink-0">
          {icon}
        </div>
      )}
      <h1 className="text-lg font-semibold">{title}</h1>
    </div>
  );
}
