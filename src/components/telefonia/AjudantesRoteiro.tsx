import { useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2, Sparkles, Wand2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { corrigirAutomatico, diagnosticarRoteiro, mapaRoteiro, MODELOS_ROTEIRO, roteiroDoModelo, roteiroGerado } from "@/lib/voz/qualidadeRoteiro";
import { DEPARTAMENTOS, type RoteiroSalvo } from "@/lib/voz/roteirosLigacao";

/** Descreve o objetivo em texto livre e recebe o roteiro completo montado pela IA (abre no editor, sem salvar). */
export function CriarComIaDialog({ aberto, onFechar, onCriado }: { aberto: boolean; onFechar: () => void; onCriado: (r: RoteiroSalvo) => void }) {
  const [texto, setTexto] = useState("");
  const [gerando, setGerando] = useState(false);
  const gerar = async () => {
    setGerando(true);
    const { data, error } = await supabase.functions.invoke("voz-roteiro-teste", { body: { acao: "gerar", descricao: texto } });
    setGerando(false);
    if (error || data?.error) return void toast.error(data?.error ?? "Não foi possível criar o roteiro");
    const r = roteiroGerado(data.roteiro ?? {});
    if (!r.etapas.length) return void toast.error("A IA não devolveu etapas. Descreva o objetivo com mais detalhes.");
    onCriado(r); setTexto(""); toast.success("Roteiro criado. Revise e salve.");
  };
  return (
    <Dialog open={aberto} onOpenChange={(a) => { if (!a && !gerando) onFechar(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Criar roteiro com IA</DialogTitle>
          <DialogDescription>Explique o objetivo da ligação ou cole o roteiro que sua equipe já usa.</DialogDescription>
        </DialogHeader>
        <Textarea rows={6} value={texto} maxLength={2000} onChange={(e) => setTexto(e.target.value)}
          placeholder="Ex.: oferecer impermeabilizante para quem comprou argamassa no mês passado, com 10% de desconto e frete grátis acima de R$ 500." />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onFechar} disabled={gerando}>Cancelar</Button>
          <Button onClick={() => void gerar()} disabled={gerando || texto.trim().length < 15}>
            {gerando ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Wand2 className="mr-1 h-4 w-4" />} Criar roteiro
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ModelosProntosDialog({ aberto, onFechar, onEscolher }: { aberto: boolean; onFechar: () => void; onEscolher: (r: RoteiroSalvo) => void }) {
  return (
    <Dialog open={aberto} onOpenChange={(a) => { if (!a) onFechar(); }}>
      <DialogContent className="max-h-[85dvh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modelos prontos</DialogTitle>
          <DialogDescription>Escolha um modelo para abrir como roteiro novo e ajustar antes de salvar.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 sm:grid-cols-2">
          {MODELOS_ROTEIRO.map((m) => (
            <Card key={m.id} className="flex min-w-0 flex-col gap-2 p-3">
              <div className="flex min-w-0 items-start justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{m.nome}</p>
                <Badge variant="outline" className="shrink-0 text-[10px]">{DEPARTAMENTOS.find((d) => d.id === m.departamento)?.rotulo}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{m.descricao}</p>
              <p className="text-xs text-muted-foreground">{m.etapas.length} etapas · {m.etapas.reduce((n, e) => n + e.condicoes.length, 0)} regras</p>
              <Button size="sm" variant="outline" className="mt-auto h-8" onClick={() => onEscolher(roteiroDoModelo(m))}>Usar modelo</Button>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Nota de fluidez e alertas do roteiro em edição, com correção automática das regras de escape. */
export function DiagnosticoRoteiroCard({ roteiro, onCorrigir }: { roteiro: RoteiroSalvo; onCorrigir: (r: RoteiroSalvo) => void }) {
  const d = diagnosticarRoteiro(roteiro);
  const cor = d.nota >= 9 ? "text-primary" : d.nota >= 6 ? "text-foreground" : "text-destructive";
  return (
    <Card className="space-y-2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">Qualidade da conversa: <span className={cor}>{d.nota}/10</span></p>
        {d.alertas.length > 0 && <Button size="sm" variant="outline" className="h-8" onClick={() => onCorrigir(corrigirAutomatico(roteiro))}><Wand2 className="mr-1 h-3.5 w-3.5" /> Ajustar automaticamente</Button>}
      </div>
      {d.alertas.length === 0
        ? <p className="flex items-center gap-1 text-xs text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Falas curtas e todas as respostas têm um caminho.</p>
        : <ul className="space-y-1">{d.alertas.map((a, i) => (
            <li key={i} className="flex items-start gap-1 text-xs text-muted-foreground">
              {a.nivel === "erro" ? <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />}
              <span className="break-words">{a.etapa !== null && <b>Etapa {a.etapa + 1}: </b>}{a.texto}</span>
            </li>))}</ul>}
      {d.alertas.length > 0 && <p className="text-[11px] text-muted-foreground">"Ajustar automaticamente" acrescenta só as regras de "não" e de silêncio que faltam e uma transferência. Falas longas você ajusta.</p>}
    </Card>
  );
}

/** Árvore de decisão: cada etapa com seus caminhos (somente leitura). */
export function MapaConversa({ roteiro }: { roteiro: RoteiroSalvo }) {
  const nos = mapaRoteiro(roteiro);
  return (
    <div className="space-y-3">
      {nos.map((n) => (
        <Card key={n.indice} className={`space-y-2 p-3 ${n.semSaida ? "border-destructive" : ""}`}>
          <div className="flex min-w-0 items-center gap-2">
            <Badge>{n.indice + 1}</Badge>
            <p className="truncate text-sm font-semibold text-foreground">{n.titulo || `Etapa ${n.indice + 1}`}</p>
            {n.semSaida && <Badge variant="destructive" className="shrink-0 text-[10px]">Sem saída</Badge>}
          </div>
          <p className="break-words text-xs italic text-muted-foreground">"{n.fala || "sem fala"}"</p>
          <div className="space-y-1 border-l-2 border-border pl-3">
            {n.ramos.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma regra: a IA decide sozinha.</p>}
            {n.ramos.map((r, i) => (
              <div key={i} className="flex min-w-0 flex-wrap items-center gap-1 text-xs">
                <span className="text-muted-foreground">Se</span>
                <span className="min-w-0 break-words font-medium text-foreground">{r.gatilho}</span>
                <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                <Badge variant={r.semSaida ? "destructive" : r.acao === "transferir" ? "default" : "secondary"} className="text-[10px]">{r.destino}</Badge>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
