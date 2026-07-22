import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CadastroStat {
  label: string;
  value: React.ReactNode;
  tone?: "primary" | "success" | "warning" | "muted";
}

interface CadastroHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  stats?: CadastroStat[];
  actions?: React.ReactNode;
  toolbar?: React.ReactNode;
  className?: string;
}

const toneClasses: Record<NonNullable<CadastroStat["tone"]>, string> = {
  primary: "bg-primary/10 text-primary ring-primary/20",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20",
  muted: "bg-muted text-muted-foreground ring-border/50",
};

/**
 * Cabeçalho unificado dos cadastros — visual moderno, amigável e responsivo.
 * Desktop: header rico com stats. Tablet/celular: compacto e vertical.
 */
export const CadastroHeader: React.FC<CadastroHeaderProps> = ({
  icon: Icon,
  title,
  subtitle,
  stats,
  actions,
  toolbar,
  className,
}) => {
  return (
    <div
      className={cn(
        "relative overflow-hidden border-b border-border/60 bg-gradient-to-br from-primary/8 via-background to-background",
        "px-3 sm:px-6 md:px-8 pt-4 sm:pt-6 pb-3 sm:pb-4",
        className
      )}
    >
      {/* orbe decorativo */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative flex flex-col gap-4 sm:gap-5">
        {/* Linha 1: título + ações */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                "shrink-0 grid place-items-center rounded-2xl",
                "h-11 w-11 sm:h-12 sm:w-12",
                "bg-gradient-to-br from-primary/25 to-primary/5",
                "ring-1 ring-primary/20 text-primary shadow-sm"
              )}
            >
              <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-[26px] font-semibold tracking-tight text-foreground truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-2">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {actions && (
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              {actions}
            </div>
          )}
        </div>

        {/* Linha 2: stats (opcional) */}
        {stats && stats.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {stats.map((s, i) => (
              <div
                key={i}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs sm:text-sm ring-1 backdrop-blur-sm",
                  toneClasses[s.tone ?? "muted"]
                )}
              >
                <span className="font-semibold tabular-nums">{s.value}</span>
                <span className="opacity-80">{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Linha 3: toolbar de filtros/busca */}
        {toolbar && (
          <div className="rounded-2xl border border-border/50 bg-card/70 backdrop-blur-sm p-2 sm:p-3 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
              {toolbar}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CadastroHeader;
