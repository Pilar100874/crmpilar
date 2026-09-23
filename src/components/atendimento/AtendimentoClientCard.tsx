import type { ReactNode } from "react";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface AtendimentoClientCardProps {
  title: string;
  customerName?: string;
  sideLabel?: string;
  selected?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
  indicators?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/** Cartão único das listas do Atendimento, baseado no cartão da Agenda. */
export function AtendimentoClientCard({
  title,
  customerName,
  sideLabel = "Meu Cliente",
  selected = false,
  onClick,
  icon,
  indicators,
  children,
  className,
}: AtendimentoClientCardProps) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick || (event.key !== "Enter" && event.key !== " ")) return;
        event.preventDefault();
        onClick();
      }}
      className={cn(
        "relative min-h-[106px] overflow-hidden rounded-xl border bg-card pl-10 pr-4 py-3 shadow-sm transition-all",
        selected
          ? "border-primary/40 bg-primary/10 shadow-md"
          : "border-border/70 hover:border-primary/30 hover:bg-muted/40 hover:shadow-md",
        onClick && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <div className="absolute inset-y-0 left-0 flex w-8 items-center justify-center bg-primary text-primary-foreground">
        <span className="max-w-[88px] -rotate-90 truncate whitespace-nowrap text-[10px] font-semibold">
          {sideLabel}
        </span>
      </div>

      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            {icon || <User className="h-5 w-5" />}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-foreground">{title}</p>
          {customerName && (
            <p className="truncate text-sm font-medium text-muted-foreground">{customerName}</p>
          )}
          {children && <div className="mt-2 flex flex-wrap items-center gap-1.5">{children}</div>}
        </div>
        {indicators && <div className="flex shrink-0 flex-col items-center gap-1">{indicators}</div>}
      </div>
    </div>
  );
}