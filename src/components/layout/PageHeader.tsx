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
    <div className={cn("flex items-center gap-3", className)}>
      {icon && (
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          {icon}
        </div>
      )}
      <h1 className="text-3xl font-bold">{title}</h1>
    </div>
  );
}
