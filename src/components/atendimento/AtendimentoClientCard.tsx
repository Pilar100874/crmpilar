import type { ReactNode } from "react";
import { History, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { abrirHistoricoDoContato } from "@/lib/atendimento/navegacaoContato";

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
  /** Quando informado, mostra o botão que abre o histórico do cliente na tela central. */
  historicoClienteId?: string;
  historicoClienteNome?: string;
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
  const rotuloGenerico = ["Meu Cliente", "Mesmo Seg.", "Cliente"].includes(sideLabel);

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
        "relative min-h-[106px] overflow-hidden rounded-xl border bg-card p-3 shadow-sm transition-all",
        selected
          ? "border-primary/40 bg-primary/10 shadow-md"
          : "border-border/70 hover:border-primary/30 hover:bg-muted/40 hover:shadow-md",
        onClick && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <div
        className={cn(
          "absolute inset-y-0 left-0 flex items-center justify-center rounded-l-xl bg-primary text-primary-foreground",
          rotuloGenerico ? "w-5" : "w-8",
        )}
      >
        <span
          className={cn(
            "-rotate-90 whitespace-nowrap font-semibold",
            rotuloGenerico ? "text-[8px]" : "text-[10px]",
          )}
        >
          {sideLabel}
        </span>
      </div>

      <div className={cn("flex min-w-0 items-start gap-3", rotuloGenerico ? "pl-4" : "pl-7")}>
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            {icon || <User className="h-5 w-5" />}
          </div>
        )}
        <div className="min-w-0 flex-1 pr-12">
          <p className="truncate text-base font-bold text-foreground">{title}</p>
          {customerName && (
            <p className="truncate text-sm font-medium text-muted-foreground">{customerName}</p>
          )}
          {children && <div className="mt-1.5 flex flex-wrap items-center gap-2">{children}</div>}
        </div>
      </div>
      {indicators && (
        <div className="absolute right-2 top-2 flex flex-col items-center gap-1 text-[10px]">{indicators}</div>
      )}
    </div>
  );
}