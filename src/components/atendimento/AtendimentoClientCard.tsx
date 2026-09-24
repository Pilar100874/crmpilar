import { createContext, useContext, type ReactNode } from "react";
import { CalendarCheck, History, Rows3, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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

const AtendimentoCardsDensityContext = createContext({ compact: false, onToggle: () => undefined });

export function AtendimentoCardsDensityProvider({ compact, onToggle, children }: { compact: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <AtendimentoCardsDensityContext.Provider value={{ compact, onToggle }}>
      {children}
    </AtendimentoCardsDensityContext.Provider>
  );
}

export function useAtendimentoCardsCompactos() {
  return useContext(AtendimentoCardsDensityContext).compact;
}

export function AtendimentoCardsDensityButton() {
  const { compact, onToggle } = useContext(AtendimentoCardsDensityContext);
  return (
    <Button
      type="button"
      size="icon"
      variant={compact ? "secondary" : "ghost"}
      onClick={onToggle}
      className="h-6 w-6 shrink-0"
      title={compact ? "Usar cartões normais" : "Exibir cartões em duas linhas"}
      aria-label={compact ? "Usar cartões normais" : "Exibir cartões em duas linhas"}
      aria-pressed={compact}
    >
      <Rows3 className="h-3.5 w-3.5" />
    </Button>
  );
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
  const compacto = useAtendimentoCardsCompactos();
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
        "group relative overflow-hidden rounded-lg border bg-card font-cardBody shadow-sm transition-[border-color,box-shadow,transform,background-color] duration-200",
        compacto ? "min-h-[58px] px-2 py-1.5" : "min-h-[116px] p-3.5",
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
      <div className={cn("flex min-w-0", compacto ? "items-center gap-1.5" : "items-start gap-3")}>
        <div className={cn("relative flex shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 font-cardTitle font-bold text-primary shadow-sm", compacto ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm")}>
          {icon || iniciais || <User className="h-5 w-5" />}
          <span className={cn("absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-card", pendente ? "bg-destructive" : "bg-success")} />
        </div>
        <div className="min-w-0 flex-1">
          <div className={cn(compacto && "flex min-w-0 items-baseline gap-1.5")}>
          <p className={cn("truncate font-cardTitle font-bold leading-tight text-foreground", compacto ? "text-xs" : "text-[15px]")} title={tituloPrincipal}>{tituloPrincipal}</p>
          {customerName && !nomeDuplicado && (
            <p className={cn("truncate font-medium text-muted-foreground", compacto ? "text-[10px]" : "mt-0.5 text-xs")} title={customerName}>{customerName}</p>
          )}
          </div>
          <div className={cn("flex min-w-0 items-center gap-1.5", compacto ? "mt-1" : "mt-1.5")}>
            {pendente && (
              <span className="max-w-[110px] truncate rounded-md border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-destructive">
                Pendente
              </span>
            )}
            {children && <div className="flex min-w-0 flex-wrap items-center gap-1.5">{children}</div>}
          </div>
        </div>
        {indicators && <div className="shrink-0 pr-7">{indicators}</div>}
      </div>
      {historicoClienteId && (
        <div className={cn("flex items-center gap-1.5", compacto ? "absolute bottom-1.5 right-2" : "mt-3 border-t border-border/60 pt-2.5")}>
          <button
            type="button"
            title="Ver histórico do cliente"
            aria-label="Ver histórico do cliente"
            onClick={(event) => {
              event.stopPropagation();
              abrirHistoricoDoContato({ customerId: historicoClienteId, nome: historicoClienteNome });
            }}
            className={cn("flex items-center justify-center rounded-md border border-border/70 bg-background text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", compacto ? "h-6 w-6" : "h-7 w-7")}
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
              "flex items-center gap-1 rounded-md border text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              compacto ? "h-6 w-6 justify-center p-0" : "h-7 px-2",
              pendente
                ? "border-destructive/50 bg-destructive/10 text-destructive"
                : "cursor-not-allowed border-border/50 bg-muted/40 text-muted-foreground/50",
            )}
          >
            <CalendarCheck className="h-3.5 w-3.5" />
            {!compacto && (pendente ? "Pendente" : "Finalizar")}
          </button>
          {(() => {
            const { canal } = parseTituloCartao(title);
            if (!canal) return null;
            const IconeCanal = ICONES_CANAL[canal];
            return (
              <span
                title={ROTULOS_CANAL[canal]}
                className={cn("ml-auto flex items-center justify-center rounded-md border border-border/70 bg-background text-muted-foreground", compacto ? "h-6 w-6" : "h-7 w-7")}
              >
                <IconeCanal className="h-3.5 w-3.5" />
              </span>
            );
          })()}
        </div>
      )}
    </div>
  );
}