import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lightbulb } from "lucide-react";
import { CATALOGO_ATENDIMENTO } from "@/lib/atendimento/catalogoAtendimento";

export const CHAVE_TUTORIAL_VISTO = "atendimento:tutorial-visto-v1";

/** Destaca o elemento real da tela marcado com data-tour enquanto o passo está aberto. */
function useDestaque(alvo?: string, ativo?: boolean) {
  useEffect(() => {
    if (!ativo || !alvo) return;
    const el = document.querySelector<HTMLElement>(`[data-tour="${alvo}"]`);
    if (!el) return;
    el.classList.add("ring-2", "ring-primary", "ring-offset-2", "rounded-lg");
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    return () => el.classList.remove("ring-2", "ring-primary", "ring-offset-2", "rounded-lg");
  }, [alvo, ativo]);
}

export function TutorialAtendimentoDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [i, setI] = useState(0);
  const total = CATALOGO_ATENDIMENTO.length;
  const r = CATALOGO_ATENDIMENTO[Math.min(i, total - 1)];
  useDestaque(r.alvo, open);
  useEffect(() => { if (open) setI(0); }, [open]);

  const fechar = () => { localStorage.setItem(CHAVE_TUTORIAL_VISTO, "1"); onOpenChange(false); };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : fechar())} modal={false}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <p className="text-xs text-muted-foreground">Passo {i + 1} de {total}</p>
          <DialogTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-primary" />{r.titulo}</DialogTitle>
          <DialogDescription>{r.oQueE}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
            <p className="mb-1 font-semibold text-foreground">Por que funciona assim</p>
            <p className="text-muted-foreground">{r.regraNegocio}</p>
          </div>
          <div>
            <p className="mb-1 font-semibold text-foreground">Como usar</p>
            <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
              {r.comoUsar.map((c) => <li key={c}>{c}</li>)}
            </ol>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${((i + 1) / total) * 100}%` }} />
          </div>
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          <Button variant="ghost" onClick={fechar}>Pular tutorial</Button>
          <div className="flex gap-2">
            <Button variant="outline" disabled={i === 0} onClick={() => setI(i - 1)}>Anterior</Button>
            {i < total - 1 ? <Button onClick={() => setI(i + 1)}>Próximo</Button> : <Button onClick={fechar}>Concluir</Button>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
