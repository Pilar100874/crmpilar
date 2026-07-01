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
    <div className="relative overflow-hidden rounded-xl border bg-card shadow-sm">
      <div
        className="absolute inset-0 opacity-90"
        style={{ background: "var(--gradient-hero)" }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent" />
      <div className="relative flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm ring-1 ring-white/30">
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight text-white sm:text-xl md:text-2xl">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-white/85 sm:text-sm">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
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
    <div className="group relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</p>
          <p className={`mt-1 text-2xl font-bold tracking-tight sm:text-3xl ${t.text}`}>{value}</p>
          {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${t.bg} ring-1 ${t.ring} transition-transform group-hover:scale-110`}>
          <Icon className={`h-5 w-5 ${t.text}`} />
        </div>
      </div>
    </div>
  );
}
