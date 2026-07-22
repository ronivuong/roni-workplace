import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-4 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 text-balance">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-slate-500 leading-relaxed max-w-2xl text-pretty">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
