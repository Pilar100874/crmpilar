import { format, isWeekend } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import type { AnaliseDestino } from "@/lib/calendario/analiseDestino";
import { TarefasDoDiaResumo } from "./TarefasDoDiaResumo";

export function AnaliseDestinoResumo({ origem, analise, userIds, avisos = [], onSugestao, onOutraData, disabled = false }: {
  origem: Date; analise: AnaliseDestino | null; userIds: (string | undefined)[];
  avisos?: string[]; onSugestao?: (data: Date) => void; onOutraData?: () => void; disabled?: boolean;
}) {
  const dia = (data: Date) => format(data, "EEEE, dd/MM", { locale: ptBR });
  const outrosAvisos = [...new Set(avisos)].filter(aviso => !analise || !/fim de semana|dia todo|próximo dia/i.test(aviso));
  return <div className="min-w-0 space-y-2">
    <div className="flex min-w-0 items-center gap-2">
      {analise?.sugerida && <Button className="h-auto min-w-0 flex-1 justify-start gap-2 whitespace-normal py-3 text-left" disabled={disabled} onClick={() => { if (analise.sugerida) onSugestao?.(analise.sugerida); }}>
        <Check className="h-4 w-4 shrink-0" /><span><span className="block text-xs font-normal">Data sugerida</span><span className="capitalize">{dia(analise.sugerida)}</span></span>
      </Button>}
      {!analise?.sugerida && <p className="min-w-0 flex-1 text-sm text-muted-foreground">{disabled ? "Analisando datas…" : "Escolha uma data"}</p>}
      {onOutraData && <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="shrink-0" aria-label="Escolher outra data" disabled={disabled} onClick={onOutraData}><CalendarDays className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent side="top">Escolher outra data</TooltipContent></Tooltip>}
    </div>
    <details className="group min-w-0 rounded-md border border-border bg-background">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">Resumo da análise<ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" /></summary>
      <div className="space-y-3 border-t border-border p-3 text-sm">
        {isWeekend(origem) && <p><strong className="capitalize">{dia(origem)}</strong> é fim de semana.{analise && <> Próximo dia útil: <strong>{dia(analise.proximoDiaUtil)}</strong>.</>}</p>}
        <TarefasDoDiaResumo date={origem} userIds={userIds} collapsible />
        {analise?.ocupados.map(item => <div key={item.data.toISOString()} className="space-y-2">
          <p><strong className="capitalize">{dia(item.data)}</strong>: reservado para tarefa de dia todo{item.titulo ? <> — <strong>{item.titulo}</strong></> : "."}</p>
          <TarefasDoDiaResumo date={item.data} userIds={userIds} collapsible />
        </div>)}
        {outrosAvisos.map(aviso => <p key={aviso}><strong>{aviso.split("|")[0]}</strong>{aviso.includes("|") && <> — {aviso.split("|").slice(1).join("|")}</>}</p>)}
        {analise?.sugerida && <p className="text-muted-foreground">A sugestão evita fins de semana e reservas de dia todo. A data só será aplicada quando você confirmar.</p>}
      </div>
    </details>
  </div>;
}