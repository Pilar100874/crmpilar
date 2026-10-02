import { CalendarCog, ArrowRight } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { GRUPOS_REGRAS_AGENDA } from "@/lib/calendario/regrasAgenda";

export function RegrasAgendaPorTela() {
  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <CalendarCog className="h-5 w-5 text-primary" /> Regras do sistema que afetam a agenda
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">Agrupadas pela tela onde acontecem.</p>
      <Accordion type="multiple" className="mt-3">
        {GRUPOS_REGRAS_AGENDA.map((g) => (
          <AccordionItem key={g.tela} value={g.tela}>
            <AccordionTrigger className="text-sm">
              {g.tela} <span className="ml-auto mr-2 text-xs text-muted-foreground">{g.regras.length} regras</span>
            </AccordionTrigger>
            <AccordionContent>
              <p className="mb-2 text-xs text-muted-foreground">{g.descricao}</p>
              <ul className="space-y-2">
                {g.regras.map((r) => (
                  <li key={r.gatilho} className="rounded-md border bg-background p-2 text-sm">
                    <span className="font-medium">{r.gatilho}</span>
                    <span className="flex items-start gap-1 text-muted-foreground">
                      <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /> {r.efeito}
                    </span>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
