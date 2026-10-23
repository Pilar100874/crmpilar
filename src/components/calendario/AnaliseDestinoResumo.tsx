import { format, isWeekend } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, CalendarRange, Check, ChevronDown, Info } from "lucide-react";
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
  return <div className="min-w-0 space-y-2.5">
    {analise?.sugerida ? <Button variant="outline" className="h-auto w-full min-w-0 justify-start gap-3 whitespace-normal rounded-xl border-primary/50 bg-primary/5 py-3 text-left hover:border-primary hover:bg-primary/10" disabled={disabled} onClick={() => { if (analise.sugerida) onSugestao?.(analise.sugerida); }}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Check className="h-4 w-4" /></span>
      <span className="min-w-0 leading-tight">
        <span className="block text-[10px] font-semibold uppercase tracking-wider text-primary">Sugestão</span>
        <span className="block text-sm font-semibold capitalize text-foreground">{dia(analise.sugerida)}</span>
        <span className="block text-xs text-muted-foreground">Primeiro dia sem tarefa de dia todo</span>
      </span>
    </Button> : <p className="min-w-0 py-2 text-sm text-muted-foreground">{disabled ? "Analisando datas…" : "Escolha uma data"}</p>}
    {onOutraData && <div className="flex justify-end">
      <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2.5 text-xs text-muted-foreground" disabled={disabled} onClick={onOutraData}><CalendarDays className="h-3.5 w-3.5" />Escolher outra data</Button></TooltipTrigger><TooltipContent side="top">Abrir o calendário para marcar outro dia</TooltipContent></Tooltip>
    </div>}
    <details className="group min-w-0 overflow-hidden rounded-xl border border-border bg-background/60">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted/40 [&::-webkit-details-marker]:hidden">
        <Info className="h-3.5 w-3.5 shrink-0" />Resumo da análise
        <ChevronDown className="ml-auto h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-3 border-t border-border px-3 py-3 text-sm">
        {isWeekend(origem) && <div className="flex items-start gap-2">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-warning/15"><CalendarRange className="h-3 w-3 text-warning" /></span>
          <p className="min-w-0"><strong className="capitalize">{dia(origem)}</strong> é fim de semana{analise && <> · próximo dia útil: <strong className="capitalize">{dia(analise.proximoDiaUtil)}</strong></>}.</p>
        </div>}
        <TarefasDoDiaResumo date={origem} userIds={userIds} collapsible />
        {analise?.ocupados.map(item => <div key={item.data.toISOString()} className="space-y-1.5">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-warning/15"><CalendarDays className="h-3 w-3 text-warning" /></span>
            <p className="min-w-0"><strong className="capitalize">{dia(item.data)}</strong>: reservado para tarefa de dia todo{item.titulo ? <> — <strong>{item.titulo}</strong></> : "."}</p>
          </div>
          <TarefasDoDiaResumo date={item.data} userIds={userIds} collapsible className="ml-7" />
        </div>)}
        {outrosAvisos.map(aviso => <p key={aviso}><strong>{aviso.split("|")[0]}</strong>{aviso.includes("|") && <> — {aviso.split("|").slice(1).join("|")}</>}</p>)}
        {analise?.sugerida && <p className="text-xs italic text-muted-foreground">A sugestão evita fins de semana e reservas de dia todo. Nada é movido até você confirmar.</p>}
      </div>
    </details>
  </div>;
}
