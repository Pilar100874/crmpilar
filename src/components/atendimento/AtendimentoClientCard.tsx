import type { ReactNode } from "react";
import { CalendarCheck, History, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { abrirHistoricoDoContato } from "@/lib/atendimento/navegacaoContato";
import { parseTituloCartao, ICONES_CANAL, ROTULOS_CANAL } from "@/lib/atendimento/tituloCartao";
import { pedirFinalizacao } from "@/lib/atendimento/finalizarAtendimento";
import { usePendenciasAtendimento } from "@/hooks/usePendenciasAtendimento";

interface AtendimentoClientCardProps {
  title: string;
  companyName?: string;
  customerName?: string;
  sideLabel?: string;
  selected?: boolean;
  selectionTone?: "primary" | "info";
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
  companyName,
  customerName,
  sideLabel = "Meu Cliente",
  selected = false,
  selectionTone = "primary",
  onClick,
  icon,
  indicators,
  children,
  className,
  historicoClienteId,
  historicoClienteNome,
}: AtendimentoClientCardProps) {
  const rotuloGenerico = ["Meu Cliente", "Mesmo Seg.", "Cliente"].includes(sideLabel);
  const nomeCartao = parseTituloCartao(title).nome;
  const tituloPrincipal = companyName || nomeCartao;
  const nomeDuplicado = !!customerName && customerName.trim().toLowerCase() === tituloPrincipal.trim().toLowerCase();
  const iniciais = tituloPrincipal
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte.charAt(0))
    .join("")
    .toUpperCase();
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
        "group relative min-h-[116px] overflow-hidden rounded-lg border bg-card p-3.5 font-cardBody shadow-sm transition-[border-color,box-shadow,transform,background-color] duration-200",
        selected
          ? selectionTone === "info"
            ? "border-info bg-info/15 shadow-md ring-2 ring-info/60"
            : "border-primary bg-primary/15 shadow-md ring-2 ring-primary/60"
          : "border-border/80 hover:border-primary/50 hover:bg-card hover:shadow-lg hover:-translate-y-0.5",
        onClick && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        bloqueado && "opacity-50 grayscale",
        pendente && "ring-2 ring-destructive/60",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3 pr-7">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 font-cardTitle text-sm font-bold text-primary shadow-sm">
          {icon || iniciais || <User className="h-5 w-5" />}
          <span className={cn("absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-card", pendente ? "bg-destructive" : "bg-success")} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-cardTitle text-[15px] font-bold leading-tight text-foreground" title={tituloPrincipal}>{tituloPrincipal}</p>
          {customerName && !nomeDuplicado && (
            <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground" title={customerName}>{customerName}</p>
          )}
          <div className="mt-1.5 flex min-w-0 items-center gap-1.5">
            <span className={cn(
              "max-w-[110px] truncate rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase text-muted-foreground",
              pendente ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-border bg-muted/60",
            )} title={rotuloGenerico ? sideLabel : `Cliente de ${sideLabel}`}>
              {pendente ? "Pendente" : rotuloGenerico ? sideLabel : sideLabel}
            </span>
            {children && <div className="flex min-w-0 flex-wrap items-center gap-1.5">{children}</div>}
          </div>
        </div>
      </div>
      {historicoClienteId && (
        <div className="mt-3 flex items-center gap-1.5 border-t border-border/60 pt-2.5">
          <button
            type="button"
            title="Ver histórico do cliente"
            aria-label="Ver histórico do cliente"
            onClick={(event) => {
              event.stopPropagation();
              abrirHistoricoDoContato({ customerId: historicoClienteId, nome: historicoClienteNome });
            }}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-border/70 bg-background text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              "flex h-7 items-center gap-1 rounded-md border px-2 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              pendente
                ? "border-destructive/50 bg-destructive/10 text-destructive"
                : "cursor-not-allowed border-border/50 bg-muted/40 text-muted-foreground/50",
            )}
          >
            <CalendarCheck className="h-3.5 w-3.5" />
            {pendente ? "Pendente" : "Finalizar"}
          </button>
          {(() => {
            const { canal } = parseTituloCartao(title);
            if (!canal) return null;
            const IconeCanal = ICONES_CANAL[canal];
            return (
              <span
                title={ROTULOS_CANAL[canal]}
                className="ml-auto flex h-7 w-7 items-center justify-center rounded-md border border-border/70 bg-background text-muted-foreground"
              >
                <IconeCanal className="h-3.5 w-3.5" />
              </span>
            );
          })()}
        </div>
      )}
      {indicators && (
        <div className="absolute right-2.5 top-2.5 flex flex-col items-center gap-1 text-[10px]">
          {indicators}
        </div>
      )}

    </div>
  );
}