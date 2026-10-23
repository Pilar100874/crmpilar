import { format, isWeekend } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Check, ChevronDown } from "lucide-react";
import type { AnaliseDestino } from "@/lib/calendario/analiseDestino";
import { TarefasDoDiaResumo } from "./TarefasDoDiaResumo";

export function AnaliseDestinoResumo({ origem, analise, userIds }: {
  origem: Date; analise: AnaliseDestino; userIds: (string | undefined)[];
}) {
  const dia = (data: Date) => format(data, "EEEE, dd/MM", { locale: ptBR });
  return <div className="min-w-0 space-y-2 border-t border-border pt-3">
    {isWeekend(origem) && <p className="text-sm text-foreground"><strong className="capitalize">{dia(origem)}</strong> cai no fim de semana. O próximo dia útil seria <strong>{dia(analise.proximoDiaUtil)}</strong>.</p>}
    {analise.ocupados.map(item => <div key={item.data.toISOString()} className="min-w-0 space-y-2">
      <ChevronDown className="mx-auto h-4 w-4 text-muted-foreground" />
      <p className="break-words text-sm text-foreground"><strong className="capitalize">{dia(item.data)}</strong> também tem uma tarefa de dia todo{item.titulo ? <>: <strong>“{item.titulo}”</strong></> : "."} Para evitar essa interferência, sugerimos avançar novamente.</p>
      <TarefasDoDiaResumo date={item.data} userIds={userIds} collapsible />
    </div>)}
    <div className="flex items-start gap-2 rounded-md border border-primary/30 bg-primary/10 p-3 text-sm">
      {analise.sugerida ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> : <CalendarDays className="h-4 w-4 shrink-0 text-primary" />}
      <div className="min-w-0"><strong className="block text-primary">{analise.sugerida ? `Sugestão: ${dia(analise.sugerida)}` : "Escolha outra data"}</strong><p className="text-muted-foreground">{analise.sugerida ? "Primeiro dia útil sem tarefa de dia todo. Você também pode manter a data ou escolher outra; nada foi movido." : "Não encontramos um dia disponível no próximo ano. Nada foi movido."}</p></div>
    </div>
  </div>;
}