import type { MouseEvent } from "react";
import { CalendarClock, FileText, Mail, MessageSquare } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface AtendimentoIndicatorData {
  diasAtraso?: number;
  emailsNaoLidos?: number;
  chatsPendentes?: number;
  orcamentosAbertos?: number;
}

interface AtendimentoCardIndicatorsProps extends AtendimentoIndicatorData {
  className?: string;
  onAtrasoClick?: () => void;
  onEmailClick?: () => void;
  onChatClick?: () => void;
  onOrcamentoClick?: () => void;
}

/**
 * Indicadores numéricos compartilhados pelos cartões de todas as abas do Atendimento.
 * Exibe somente indicadores ativos, sempre com o mesmo ícone e número.
 */
export function AtendimentoCardIndicators({
  diasAtraso = 0,
  emailsNaoLidos = 0,
  chatsPendentes = 0,
  orcamentosAbertos = 0,
  className,
  onAtrasoClick,
  onEmailClick,
  onChatClick,
  onOrcamentoClick,
}: AtendimentoCardIndicatorsProps) {
  const indicadores = [
    {
      chave: "atraso",
      valor: diasAtraso,
      Icone: CalendarClock,
      classe: "border-destructive/25 bg-destructive/10 text-destructive",
      texto: `${diasAtraso} ${diasAtraso === 1 ? "dia atrasado" : "dias atrasados"}`,
      onClick: onAtrasoClick,
    },
    {
      chave: "email",
      valor: emailsNaoLidos,
      Icone: Mail,
      classe: "border-info/25 bg-info/10 text-info",
      texto: `${emailsNaoLidos} ${emailsNaoLidos === 1 ? "e-mail não lido" : "e-mails não lidos"}`,
      onClick: onEmailClick,
    },
    {
      chave: "chat",
      valor: chatsPendentes,
      Icone: MessageSquare,
      classe: "border-warning/30 bg-warning/10 text-warning-foreground",
      texto: `${chatsPendentes} ${chatsPendentes === 1 ? "chat pendente" : "chats pendentes"}`,
      onClick: onChatClick,
    },
    {
      chave: "orcamento",
      valor: orcamentosAbertos,
      Icone: FileText,
      classe: "border-success/25 bg-success/10 text-success",
      texto: `${orcamentosAbertos} ${orcamentosAbertos === 1 ? "orçamento em aberto" : "orçamentos em aberto"}`,
      onClick: onOrcamentoClick,
    },
  ];

  return (
    <TooltipProvider>
      <div className={cn("flex shrink-0 items-center justify-end gap-1", className)}>
        {indicadores.filter((indicador) => indicador.valor > 0).map((indicador) => {
          const ativo = indicador.valor > 0;
          const clicavel = ativo && Boolean(indicador.onClick);
          const Icone = indicador.Icone;
          return (
            <Tooltip key={indicador.chave}>
              <TooltipTrigger asChild>
                <span
                  role={clicavel ? "button" : undefined}
                  tabIndex={clicavel ? 0 : undefined}
                  onClick={(event: MouseEvent<HTMLSpanElement>) => {
                    if (!clicavel) return;
                    event.stopPropagation();
                    indicador.onClick?.();
                  }}
                  className={cn(
                    "flex h-5 min-w-5 items-center justify-center gap-0.5 rounded-md border px-1 text-[9px] font-bold tabular-nums transition-opacity",
                    indicador.classe,
                    clicavel ? "cursor-pointer hover:opacity-90" : "cursor-default",
                  )}
                >
                  <Icone className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span aria-label={indicador.texto}>{indicador.valor}</span>
                </span>
              </TooltipTrigger>
              <TooltipContent><p>{indicador.texto}</p></TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
