import { useEffect, useMemo, useState } from "react";
import { format, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Check, Clock, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface Tarefa {
  id: string;
  title: string;
  description: string | null;
  date: string;
  time: string | null;
  status: string;
  origem: string;
}

interface Props {
  contactId: string;
  nome: string;
  onClose: () => void;
  top?: number;
}

const concluida = (s: string) => ["completed", "concluida", "concluído", "concluida", "done"].includes((s || "").toLowerCase());

/** Agenda do contato: próximos agendamentos e, opcionalmente, a sequência completa de tarefas. */
export function AgendaContatoPanel({ contactId, nome, onClose, top = 0 }: Props) {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarSequencia, setMostrarSequencia] = useState(() => localStorage.getItem("agendaContato.sequencia") !== "0");

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    supabase
      .from("calendario_tarefas")
      .select("id,title,description,date,time,status,origem")
      .eq("contact_id", contactId)
      .order("date", { ascending: true })
      .order("time", { ascending: true })
      .limit(200)
      .then(({ data }) => {
        if (!ativo) return;
        setTarefas((data as Tarefa[]) || []);
        setCarregando(false);
      });
    return () => { ativo = false; };
  }, [contactId]);

  const hoje = startOfDay(new Date());
  const proximos = useMemo(
    () => tarefas.filter((t) => !concluida(t.status) && parseISO(t.date) >= hoje),
    [tarefas],
  );

  const alternarSequencia = (v: boolean) => {
    setMostrarSequencia(v);
    localStorage.setItem("agendaContato.sequencia", v ? "1" : "0");
  };

  const dataFmt = (t: Tarefa) =>
    `${format(parseISO(t.date), "EEE, dd/MM/yyyy", { locale: ptBR })}${t.time ? ` · ${t.time.slice(0, 5)}` : ""}`;

  return (
    <div style={{ top }} className="absolute inset-x-0 bottom-0 z-[110] flex flex-col bg-background">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><CalendarDays className="h-4 w-4 text-primary" /> Agenda do contato</h3>
          <p className="truncate text-xs text-muted-foreground">{nome}</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Mostrar sequência de tarefas
            <Switch checked={mostrarSequencia} onCheckedChange={alternarSequencia} />
          </label>
          <Button size="sm" variant="ghost" onClick={onClose}><X className="h-4 w-4" /> Fechar</Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {carregando ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <>
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Próximos agendamentos ({proximos.length})</h4>
              {proximos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum agendamento futuro para este contato.</p>
              ) : (
                <div className="space-y-2">
                  {proximos.map((t) => (
                    <div key={t.id} className="flex gap-3 rounded-lg border border-border bg-card p-3">
                      <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-md bg-primary/10 text-primary">
                        <span className="text-lg font-bold leading-none">{format(parseISO(t.date), "dd")}</span>
                        <span className="text-[10px] uppercase">{format(parseISO(t.date), "MMM", { locale: ptBR })}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{t.title}</p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" /> {dataFmt(t)} · {t.origem}</p>
                        {t.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {mostrarSequencia && (
              <section>
                <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Sequência de tarefas ({tarefas.length})</h4>
                {tarefas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma tarefa registrada.</p>
                ) : (
                  <ol className="relative ml-2 border-l border-border">
                    {tarefas.map((t) => {
                      const feita = concluida(t.status);
                      const atrasada = !feita && parseISO(t.date) < hoje;
                      return (
                        <li key={t.id} className="mb-3 ml-4">
                          <span className={cn(
                            "absolute -left-[7px] mt-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-background",
                            feita ? "bg-success" : atrasada ? "bg-destructive" : "bg-primary",
                          )}>{feita && <Check className="h-2 w-2 text-background" />}</span>
                          <p className={cn("text-sm", feita && "text-muted-foreground line-through")}>{t.title}</p>
                          <p className={cn("text-xs", atrasada ? "text-destructive" : "text-muted-foreground")}>
                            {dataFmt(t)} · {feita ? "Concluída" : atrasada ? "Atrasada" : "Pendente"}
                          </p>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
