import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, FlaskConical, Loader2, XCircle } from "lucide-react";
import { CATALOGO_ATENDIMENTO, recursosPorModulo, simularRecurso, type ResultadoSimulacao, type RecursoAtendimento } from "@/lib/atendimento/catalogoAtendimento";

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function SimulacoesAtendimentoDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [resultados, setResultados] = useState<Record<string, ResultadoSimulacao>>({});
  const [rodando, setRodando] = useState<string | null>(null);

  const rodar = async (ids: string[]) => {
    for (const id of ids) {
      const r = CATALOGO_ATENDIMENTO.find((x) => x.id === id)!;
      setRodando(id);
      await espera(200);
      const res = simularRecurso(r);
      setResultados((ant) => ({ ...ant, [id]: res }));
    }
    setRodando(null);
  };

  const feitos = Object.values(resultados);
  const falhas = feitos.filter((r) => !r.ok).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FlaskConical className="h-5 w-5 text-primary" />Simulações do Atendimento</DialogTitle>
          <DialogDescription>Testes com dados de exemplo. Nenhuma mensagem é enviada e nada é gravado.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {feitos.length === 0 ? `${CATALOGO_ATENDIMENTO.length} recursos para testar` : `${feitos.length - falhas} aprovados · ${falhas} com atenção`}
          </p>
          <Button disabled={!!rodando} onClick={() => { setResultados({}); void rodar(recursosPorModulo().flatMap((g) => g.recursos.map((r) => r.id))); }}>Testar tudo</Button>
        </div>
        {recursosPorModulo().map((g) => (
        <div key={g.modulo} className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.modulo}</p>
            <Button size="sm" variant="ghost" disabled={!!rodando} onClick={() => void rodar(g.recursos.map((x: RecursoAtendimento) => x.id))}>Testar módulo</Button>
          </div>
          {g.recursos.map((r) => {
            const res = resultados[r.id];
            return (
              <div key={r.id} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-medium text-foreground">
                      {rodando === r.id ? <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        : res ? (res.ok ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />) : null}
                      {r.titulo}
                    </p>
                    <p className="text-xs text-muted-foreground">{r.regraNegocio}</p>
                  </div>
                  <Button size="sm" variant="outline" disabled={!!rodando} onClick={() => void rodar([r.id])}>Simular</Button>
                </div>
                {res && (
                  <ol className="mt-2 space-y-1 text-xs">
                    {res.passos.map((p, k) => (
                      <li key={k} className="flex gap-2">
                        <span className={p.ok ? "text-success" : "text-destructive"}>{p.ok ? "✓" : "✗"}</span>
                        <span className="min-w-0 break-words text-foreground">{k + 1}. {p.descricao}{p.detalhe && <span className="text-muted-foreground"> — {p.detalhe}</span>}</span>
                      </li>
                    ))}
                    <li className="text-muted-foreground">Tempo: {res.ms} ms</li>
                  </ol>
                )}
              </div>
            );
          })}
        </div>
        ))}
      </DialogContent>
    </Dialog>
  );
}
