import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATALOGO_ORDENADO, recursosPorModulo } from "@/lib/atendimento/catalogoAtendimento";

export const CHAVE_TUTORIAL_VISTO = "atendimento:tutorial-visto-v2";

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
  const lista = useMemo(() => CATALOGO_ORDENADO(), []);
  const grupos = useMemo(() => recursosPorModulo(), []);
  const [i, setI] = useState(0);
  const total = lista.length;
  const r = lista[Math.min(i, total - 1)];
  useDestaque(r.alvo, open);
  useEffect(() => { if (open) setI(0); }, [open]);

  const fechar = () => { localStorage.setItem(CHAVE_TUTORIAL_VISTO, "1"); onOpenChange(false); };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : fechar())} modal={false}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-primary" />Guia completo do Atendimento</DialogTitle>
          <DialogDescription>{total} recursos explicados com a regra de negócio e o passo a passo. Clique em qualquer item do índice.</DialogDescription>
        </DialogHeader>
        <div className="grid min-w-0 gap-4 md:grid-cols-[220px_1fr]">
          <nav className="min-w-0 space-y-3 md:max-h-[60vh] md:overflow-y-auto md:border-r md:border-border md:pr-3">
            {grupos.map((g) => (
              <div key={g.modulo}>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{g.modulo}</p>
                <ul className="space-y-0.5">
                  {g.recursos.map((rec) => {
                    const idx = lista.indexOf(rec);
                    return (
                      <li key={rec.id}>
                        <button type="button" onClick={() => setI(idx)}
                          className={cn("w-full rounded-md px-2 py-1 text-left text-xs transition-colors break-words",
                            idx === i ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted")}>
                          {rec.titulo}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
          <div className="min-w-0 space-y-3 text-sm">
            <p className="text-xs text-muted-foreground">{r.modulo} · Passo {i + 1} de {total}</p>
            <h3 className="text-lg font-semibold text-foreground">{r.titulo}</h3>
            <p className="text-muted-foreground">{r.oQueE}</p>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <p className="mb-1 font-semibold text-foreground">Regra de negócio: por que funciona assim</p>
              <p className="text-muted-foreground">{r.regraNegocio}</p>
            </div>
            <div>
              <p className="mb-1 font-semibold text-foreground">Como usar</p>
              <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
                {r.comoUsar.map((c) => <li key={c}>{c}</li>)}
              </ol>
            </div>
            {r.alvo && <p className="text-xs text-muted-foreground">O ponto da tela relacionado fica destacado com uma borda.</p>}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${((i + 1) / total) * 100}%` }} />
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <Button variant="ghost" onClick={fechar}>Fechar guia</Button>
              <div className="flex gap-2">
                <Button variant="outline" disabled={i === 0} onClick={() => setI(i - 1)}>Anterior</Button>
                {i < total - 1 ? <Button onClick={() => setI(i + 1)}>Próximo</Button> : <Button onClick={fechar}>Concluir</Button>}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
