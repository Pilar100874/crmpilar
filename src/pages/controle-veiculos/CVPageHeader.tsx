import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface Props {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function CVPageHeader({ icon: Icon, title, subtitle, actions }: Props) {
  return (
    <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold tracking-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

interface KPIProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  tone?: "primary" | "success" | "warning" | "destructive" | "info";
}

const toneMap: Record<NonNullable<KPIProps["tone"]>, { text: string; bg: string; ring: string }> = {
  primary: { text: "text-primary", bg: "bg-primary/10", ring: "ring-primary/20" },
  success: { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", ring: "ring-emerald-500/20" },
  warning: { text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", ring: "ring-amber-500/20" },
  destructive: { text: "text-destructive", bg: "bg-destructive/10", ring: "ring-destructive/20" },
  info: { text: "text-sky-600 dark:text-sky-400", bg: "bg-sky-500/10", ring: "ring-sky-500/20" },
};

export function CVKpiCard({ label, value, sub, icon: Icon, tone = "primary" }: KPIProps) {
  const t = toneMap[tone];
  return (
    <div className="group relative overflow-hidden rounded-xl border bg-card p-3 sm:p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] leading-tight font-medium text-muted-foreground sm:text-sm">{label}</p>
          <p className={`mt-1 text-lg sm:text-2xl lg:text-3xl font-bold tracking-tight break-words ${t.text}`}>{value}</p>
          {sub && <p className="mt-1 text-[10px] sm:text-xs text-muted-foreground line-clamp-2">{sub}</p>}
        </div>
        <div className={`flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl ${t.bg} ring-1 ${t.ring} transition-transform group-hover:scale-110`}>
          <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${t.text}`} />
        </div>
      </div>
    </div>
  );
}
