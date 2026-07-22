import { cn } from "@/lib/utils";

export function Logo({
  className,
  showText = true,
  size = "md",
}: {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: { box: "h-8 w-8", text: "text-base", icon: "text-sm" },
    md: { box: "h-9 w-9", text: "text-lg", icon: "text-base" },
    lg: { box: "h-12 w-12", text: "text-2xl", icon: "text-xl" },
  };
  const s = sizes[size];

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-md shadow-emerald-500/20",
          s.box
        )}
      >
        <span className={cn("font-bold text-white", s.icon)}>R</span>
      </div>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={cn("font-bold tracking-tight text-slate-900", s.text)}>
            Roni <span className="text-emerald-600">Workplace</span>
          </span>
          {size === "lg" && (
            <span className="mt-1 text-xs text-slate-500">AI Content Operating System</span>
          )}
        </div>
      )}
    </div>
  );
}
