import { Bot, Hand, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { descreverOrigem, type InfoOrigem } from "@/lib/calendario/origemAgendamento";

const ICONE = { manual: Hand, automatico: Bot, inteligente: Sparkles } as const;

/** Mostra como e por que o agendamento foi criado. */
export function OrigemAgendamento({ info }: { info: InfoOrigem }) {
  const d = descreverOrigem(info);
  const Icone = ICONE[d.modo];
  return (
    <section className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
      <p className="flex items-center gap-2 font-semibold text-foreground"><Icone className="h-4 w-4 text-primary" />Agendamento {d.rotuloModo}</p>
      <p><span className="text-muted-foreground">Canal: </span>{d.canal}</p>
      <p><span className="text-muted-foreground">Motivo: </span>{d.motivo}</p>
      {info.created_at && <p className="text-muted-foreground">Criado em {format(new Date(info.created_at), "dd/MM/yyyy HH:mm")}</p>}
    </section>
  );
}
