import type { ReactNode } from "react";
import { CalendarCheck, History, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { abrirHistoricoDoContato } from "@/lib/atendimento/navegacaoContato";
import { pedirFinalizacao } from "@/lib/atendimento/finalizarAtendimento";
import { usePendenciasAtendimento } from "@/hooks/usePendenciasAtendimento";

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
  historicoClienteId,
  historicoClienteNome,
}: AtendimentoClientCardProps) {
  const rotuloGenerico = ["Meu Cliente", "Mesmo Seg.", "Cliente"].includes(sideLabel);
  const pendencias = usePendenciasAtendimento();
  const pendente = !!historicoClienteId && pendencias.includes(historicoClienteId);
  const bloqueado = pendencias.length > 0 && !pendente;

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
        bloqueado && "opacity-50 grayscale pointer-events-none",
        pendente && "ring-2 ring-destructive/60",
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
          {historicoClienteId && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <button
                type="button"
                title="Ver histórico do cliente"
                aria-label="Ver histórico do cliente"
                onClick={(event) => {
                  event.stopPropagation();
                  abrirHistoricoDoContato({ customerId: historicoClienteId, nome: historicoClienteNome });
                }}
                className="flex h-6 w-6 items-center justify-center rounded-full border border-border/70 bg-background/90 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <History className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={!pendente}
                title={pendente ? "Finalizar atendimento (próximo contato)" : "Disponível após uma ação com o cliente (mensagem, e-mail, orçamento, ligação ou visita)"}
                aria-label="Finalizar atendimento"
                onClick={(event) => {
                  event.stopPropagation();
                  pedirFinalizacao({ customerId: historicoClienteId, nome: historicoClienteNome });
                }}
                className={cn(
                  "flex h-6 items-center gap-1 rounded-full border px-2 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  pendente
                    ? "border-destructive/50 bg-destructive/10 text-destructive"
                    : "cursor-not-allowed border-border/50 bg-muted/40 text-muted-foreground/50",
                )}
              >
                <CalendarCheck className="h-3.5 w-3.5" />
                {pendente ? "Pendente" : "Finalizar"}
              </button>
            </div>
          )}
        </div>
      </div>
      {indicators && (
        <div className="absolute right-2 top-2 flex flex-col items-center gap-1 text-[10px]">
          {indicators}
        </div>
      )}

    </div>
  );
}