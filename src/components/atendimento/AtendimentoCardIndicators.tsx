import type { MouseEvent } from "react";
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
 * As quatro bolinhas são sempre exibidas, com cor fixa por tipo de conteúdo:
 * atraso (vermelho), e-mails (azul/primário), chats (amarelo) e orçamentos (verde).
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
      classe: "bg-destructive text-destructive-foreground",
      texto: `${diasAtraso} ${diasAtraso === 1 ? "dia atrasado" : "dias atrasados"}`,
      onClick: onAtrasoClick,
    },
    {
      chave: "email",
      valor: emailsNaoLidos,
      classe: "bg-primary text-primary-foreground",
      texto: `${emailsNaoLidos} ${emailsNaoLidos === 1 ? "e-mail não lido" : "e-mails não lidos"}`,
      onClick: onEmailClick,
    },
    {
      chave: "chat",
      valor: chatsPendentes,
      classe: "bg-warning text-warning-foreground",
      texto: `${chatsPendentes} ${chatsPendentes === 1 ? "chat pendente" : "chats pendentes"}`,
      onClick: onChatClick,
    },
    {
      chave: "orcamento",
      valor: orcamentosAbertos,
      classe: "bg-success text-success-foreground",
      texto: `${orcamentosAbertos} ${orcamentosAbertos === 1 ? "orçamento em aberto" : "orçamentos em aberto"}`,
      onClick: onOrcamentoClick,
    },
  ];

  return (
    <TooltipProvider>
      <div className={cn("flex flex-col items-center gap-1", className)}>
        {indicadores.map((indicador) => {
          const ativo = indicador.valor > 0;
          const clicavel = ativo && Boolean(indicador.onClick);
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
                    "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold leading-none shadow-sm transition-opacity",
                    ativo ? indicador.classe : "bg-muted text-muted-foreground opacity-60",
                    clicavel ? "cursor-pointer hover:opacity-90" : "cursor-default",
                  )}
                >
                  {indicador.valor}
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
