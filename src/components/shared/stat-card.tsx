import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: string; positive?: boolean };
  className?: string;
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-medium text-slate-500 truncate">
              {title}
            </p>
            <p className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {value}
            </p>
            {(subtitle || trend) && (
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                {trend && (
                  <span
                    className={cn(
                      "text-xs font-medium",
                      trend.positive !== false ? "text-emerald-600" : "text-red-500"
                    )}
                  >
                    {trend.value}
                  </span>
                )}
                {subtitle && (
                  <span className="text-xs text-slate-400 truncate">{subtitle}</span>
                )}
              </div>
            )}
          </div>
          <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
