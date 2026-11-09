import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ChevronLeft, ChevronRight, GraduationCap, ListTree, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATALOGO_ORDENADO, recursosPorModulo, simularRecurso } from "@/lib/atendimento/catalogoAtendimento";

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

/**
 * Tour interativo único do Atendimento: explica cada recurso do catálogo, destaca o ponto
 * da tela e demonstra a regra passo a passo (simulação em memória, nada é gravado).
 */
export function TutorialAtendimentoDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const lista = useMemo(() => CATALOGO_ORDENADO(), []);
  const grupos = useMemo(() => recursosPorModulo(), []);
  const [i, setI] = useState(0);
  const [etapa, setEtapa] = useState(0); // 0 = explicação; 1..n = passos da demonstração revelados
  const [indice, setIndice] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const arraste = useRef<{ dx: number; dy: number } | null>(null);
  useEffect(() => {
    const mover = (e: PointerEvent) => {
      if (!arraste.current) return;
      const w = Math.min(420, window.innerWidth - 16);
      setPos({
        x: Math.max(8, Math.min(window.innerWidth - w - 8, e.clientX - arraste.current.dx)),
        y: Math.max(8, Math.min(window.innerHeight - 80, e.clientY - arraste.current.dy)),
      });
    };
    const soltar = () => { arraste.current = null; };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
    return () => { window.removeEventListener("pointermove", mover); window.removeEventListener("pointerup", soltar); };
  }, []);
  const total = lista.length;
  const r = lista[Math.min(i, total - 1)];
  const demo = useMemo(() => simularRecurso(r), [r]);
  const [praticaFeita, setPraticaFeita] = useState(false);
  const pratica = r.pratica;
  useDestaque(pratica?.alvo ?? r.alvo, open);
  useEffect(() => { setPraticaFeita(false); }, [i]);
  // Espera o usuário clicar/preencher o ponto destacado antes de liberar o avanço.
  useEffect(() => {
    if (!open || !pratica || praticaFeita) return;
    const el = document.querySelector<HTMLElement>(`[data-tour="${pratica.alvo}"]`);
    if (!el) { setPraticaFeita(true); return; }
    el.classList.add("animate-pulse");
    const ok = (e: Event) => {
      if (pratica.tipo === "preencher") {
        const v = (e.target as HTMLInputElement)?.value ?? "";
        if (v.trim().length < 2) return;
      }
      setPraticaFeita(true);
    };
    const evento = pratica.tipo === "preencher" ? "input" : "click";
    el.addEventListener(evento, ok, true);
    return () => { el.removeEventListener(evento, ok, true); el.classList.remove("animate-pulse"); };
  }, [open, pratica, praticaFeita, i]);
  useEffect(() => { if (open) { setI(0); setEtapa(0); } }, [open]);
  useEffect(() => { setEtapa(0); }, [i]);

  if (!open) return null;
  const fechar = () => { localStorage.setItem(CHAVE_TUTORIAL_VISTO, "1"); onOpenChange(false); };
  const nPassos = demo.passos.length;
  const bloqueado = !!pratica && !praticaFeita;
  const proximo = () => {
    if (bloqueado) return;
    if (etapa < nPassos) setEtapa(etapa + 1);
    else if (i < total - 1) setI(i + 1);
    else fechar();
  };
  const anterior = () => {
    if (etapa > 0) setEtapa(etapa - 1);
    else if (i > 0) setI(i - 1);
  };
  const ultimo = i === total - 1 && etapa >= nPassos;

  return createPortal(
    <div role="dialog" aria-label="Tour do Atendimento"
      style={pos ? { left: pos.x, top: pos.y } : { left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
      className="fixed z-[9999] flex max-h-[min(640px,calc(100vh-2rem))] w-[min(420px,calc(100vw-1rem))] flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-2xl">
      <div className="flex cursor-move touch-none select-none items-center gap-2 border-b border-border px-3 py-2" title="Arraste para mover"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          const box = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
          arraste.current = { dx: e.clientX - box.left, dy: e.clientY - box.top };
          setPos({ x: box.left, y: box.top });
        }}>
        <GraduationCap className="h-4 w-4 shrink-0 text-primary" />
        <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{r.modulo} · Recurso {i + 1} de {total}</p>
        <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Índice de recursos" onClick={() => setIndice(!indice)}><ListTree className="h-4 w-4" /></Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Fechar tour" onClick={fechar}><X className="h-4 w-4" /></Button>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 text-sm">
        {indice ? (
          grupos.map((g) => (
            <div key={g.modulo}>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{g.modulo}</p>
              {g.recursos.map((rec) => {
                const idx = lista.indexOf(rec);
                return (
                  <button key={rec.id} type="button" onClick={() => { setI(idx); setIndice(false); }}
                    className={cn("block w-full break-words rounded-md px-2 py-1 text-left text-xs", idx === i ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
                    {rec.titulo}
                  </button>
                );
              })}
            </div>
          ))
        ) : (
          <>
            <h3 className="text-base font-semibold text-foreground">{r.titulo}</h3>
            <p className="text-muted-foreground">{r.oQueE}</p>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-2.5">
              <p className="mb-1 text-xs font-semibold text-foreground">Regra de negócio</p>
              <p className="text-xs text-muted-foreground">{r.regraNegocio}</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold text-foreground">O que você pode fazer</p>
              <ol className="list-decimal space-y-0.5 pl-5 text-xs text-muted-foreground">
                {r.comoUsar.map((c) => <li key={c}>{c}</li>)}
              </ol>
              {r.alvo && <p className="mt-1 text-[11px] text-primary">O ponto da tela está destacado com uma borda.</p>}
            </div>
            {pratica && (
              <div className={cn("rounded-lg border p-2.5", praticaFeita ? "border-success/40 bg-success/10" : "border-warning/50 bg-warning/10")}>
                <p className="mb-0.5 text-xs font-semibold text-foreground">{praticaFeita ? "✓ Feito! Pode avançar." : "Sua vez"}</p>
                <p className="text-xs text-muted-foreground">{pratica.instrucao}</p>
              </div>
            )}
            <div>
              <p className="mb-1 text-xs font-semibold text-foreground">Demonstração com exemplo ({Math.min(etapa, nPassos)}/{nPassos})</p>
              {etapa === 0 ? (
                <p className="text-xs text-muted-foreground">Clique em Próximo para ver, passo a passo, o que o sistema faz neste recurso.</p>
              ) : (
                <ol className="space-y-1 text-xs">
                  {demo.passos.slice(0, etapa).map((p, k) => (
                    <li key={k} className={cn("flex gap-2 rounded-md p-1.5", k === etapa - 1 && "bg-muted")}>
                      {p.ok ? <CheckCircle2 className="h-4 w-4 shrink-0 text-success" /> : <XCircle className="h-4 w-4 shrink-0 text-destructive" />}
                      <span className="min-w-0 break-words text-foreground">{p.descricao}{p.detalhe && <span className="text-muted-foreground"> — {p.detalhe}</span>}</span>
                    </li>
                  ))}
                </ol>
              )}
              <p className="mt-1 text-[11px] text-muted-foreground">Exemplo fictício: nada é enviado nem gravado.</p>
            </div>
          </>
        )}
      </div>
      <div className="space-y-2 border-t border-border p-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${((i + 1) / total) * 100}%` }} />
        </div>
        <div className="flex justify-between gap-2">
          <Button size="sm" variant="outline" disabled={i === 0 && etapa === 0} onClick={anterior}><ChevronLeft className="h-4 w-4" />Anterior</Button>
          <Button size="sm" onClick={proximo} disabled={bloqueado} title={bloqueado ? "Faça a ação indicada para continuar" : undefined}>{ultimo ? "Concluir" : etapa < nPassos ? "Próximo passo" : "Próximo recurso"}<ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
    ,
    document.body,
  );
}
