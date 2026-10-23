import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, ChevronDown, Clock, Sun } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Props {
  date: Date | null | undefined;
  userIds: (string | undefined | null)[];
  className?: string;
  /** Quando true, a lista nasce recolhida e abre ao clicar no título. */
  collapsible?: boolean;
}

/** Lista as tarefas já marcadas para o dia, para o usuário decidir se ainda cabe mais uma. */
export function TarefasDoDiaResumo({ date, userIds, className, collapsible = false }: Props) {
  const [tarefas, setTarefas] = useState<any[] | null>(null);
  const [aberto, setAberto] = useState(false);
  const ids = [...new Set(userIds.filter(Boolean) as string[])];
  const chave = `${date ? format(date, "yyyy-MM-dd") : ""}|${ids.join(",")}`;

  useEffect(() => {
    if (!date || ids.length === 0) { setTarefas([]); return; }
    let ativo = true;
    setTarefas(null);
    void (supabase as any)
      .from("calendario_tarefas")
      .select("id, title, time, is_all_day, status, contact_name")
      .in("user_id", ids)
      .eq("date", format(date, "yyyy-MM-dd"))
      .order("is_all_day", { ascending: false })
      .order("time", { ascending: true })
      .then(({ data }: any) => { if (ativo) setTarefas(data || []); });
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  if (!date) return null;

  const titulo = (
    <>
      <CalendarDays className="h-3.5 w-3.5 shrink-0 text-primary" />
      <span className="min-w-0 truncate">Tarefas em {format(date, "EEEE, dd/MM", { locale: ptBR })}</span>
      {tarefas && <span className="ml-auto shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">{tarefas.length}</span>}
    </>
  );

  const corpo = tarefas === null ? (
    <p className="text-xs text-muted-foreground">Carregando…</p>
  ) : tarefas.length === 0 ? (
    <p className="text-xs text-muted-foreground">Nenhuma tarefa neste dia.</p>
  ) : (
    <ul className="max-h-44 space-y-1 overflow-y-auto">
      {tarefas.map((t) => {
        const concluida = ["concluido", "concluida", "completed"].includes(t.status);
        return (
          <li key={t.id} className={cn("flex min-w-0 items-start gap-2 rounded-md bg-background px-2 py-1.5 text-xs", t.is_all_day && "border border-warning/40 bg-warning/10")}>
            <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 font-semibold text-muted-foreground">
              {t.is_all_day ? <><Sun className="h-3 w-3 text-warning" />Dia todo</> : <><Clock className="h-3 w-3" />{(t.time || "--:--").slice(0, 5)}</>}
            </span>
            <span className={cn("min-w-0 break-words", concluida && "line-through text-muted-foreground")}>
              {t.title}{t.contact_name ? ` · ${t.contact_name}` : ""}
            </span>
          </li>
        );
      })}
    </ul>
  );

  if (collapsible) {
    return (
      <div className={cn("overflow-hidden rounded-lg border border-border bg-muted/30", className)}>
        <button
          type="button"
          onClick={() => setAberto((a) => !a)}
          aria-expanded={aberto}
          className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-xs font-semibold text-foreground transition-colors hover:bg-muted/60"
        >
          <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", !aberto && "-rotate-90")} />
          {titulo}
        </button>
        {aberto && <div className="border-t border-border px-3 pb-2.5 pt-2">{corpo}</div>}
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border border-border bg-muted/30 p-3", className)}>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">{titulo}</p>
      {corpo}
    </div>
  );
}
