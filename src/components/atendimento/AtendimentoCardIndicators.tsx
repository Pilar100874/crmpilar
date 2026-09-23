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
}

/** Indicadores numéricos compartilhados pelos cartões de todas as abas do Atendimento. */
export function AtendimentoCardIndicators({
  diasAtraso = 0,
  emailsNaoLidos = 0,
  chatsPendentes = 0,
  orcamentosAbertos = 0,
  className,
}: AtendimentoCardIndicatorsProps) {
  const indicadores = [
    {
      valor: diasAtraso,
      classe: "bg-destructive text-destructive-foreground",
      texto: `${diasAtraso} ${diasAtraso === 1 ? "dia atrasado" : "dias atrasados"}`,
    },
    {
      valor: emailsNaoLidos,
      classe: "bg-primary text-primary-foreground",
      texto: `${emailsNaoLidos} ${emailsNaoLidos === 1 ? "e-mail não lido" : "e-mails não lidos"}`,
    },
    {
      valor: chatsPendentes,
      classe: "bg-warning text-warning-foreground",
      texto: `${chatsPendentes} ${chatsPendentes === 1 ? "chat pendente" : "chats pendentes"}`,
    },
    {
      valor: orcamentosAbertos,
      classe: "bg-success text-success-foreground",
      texto: `${orcamentosAbertos} ${orcamentosAbertos === 1 ? "orçamento em aberto" : "orçamentos em aberto"}`,
    },
  ].filter((indicador) => indicador.valor > 0);

  if (indicadores.length === 0) return null;

  return (
    <TooltipProvider>
      <div className={cn("flex flex-col items-center gap-1", className)}>
        {indicadores.map((indicador) => (
          <Tooltip key={indicador.texto}>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  "flex h-5 w-5 cursor-default items-center justify-center rounded-full text-[10px] font-bold shadow-sm",
                  indicador.classe,
                )}
              >
                {indicador.valor}
              </span>
            </TooltipTrigger>
            <TooltipContent><p>{indicador.texto}</p></TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}