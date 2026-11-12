import "@xyflow/react/dist/style.css";
import { memo, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Background, BackgroundVariant, Controls, Handle, Position, ReactFlow, ReactFlowProvider, useNodesState, useReactFlow, type Connection, type Edge, type Node, type NodeProps,
} from "@xyflow/react";
import { AlertTriangle, CheckCircle2, Loader2, Sparkles, Wand2, X, CalendarClock, MessageCircleQuestion, PhoneForwarded, PhoneOff, Play, Plus, Percent, MessageSquare, Trash2, Workflow } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FloatingAddBlockButton } from "@/components/workflow/FloatingAddBlockButton";
import { WorkflowBuilderLayout } from "@/components/workflow/WorkflowBuilderLayout";
import { corrigirPergunta, opcoesEsperadas, validarPergunta } from "@/lib/voz/validacaoPergunta";
import { palavrasGatilho } from "@/lib/voz/roteirosLigacao";
import { aplicarTecnica, FASES_TECNICA, TECNICAS } from "@/lib/voz/tecnicasComerciais";
import { WORKFLOW_MODULES } from "@/components/flow/block-configs/TriggerWorkflowConfig";
import { ACOES, removerEtapa, MODALIDADES_NEGOCIACAO, type ModalidadeNegociacao, type ConfigVendaEtapa, type CondicaoRoteiro, type RoteiroSalvo } from "@/lib/voz/roteirosLigacao";
import {
  MENU_BLOCOS, SAIDAS_PRONTAS, adicionarAcao, adicionarSaida, novaPerguntaTipo, type BlocoMenu, continuarAposWorkflow, grafoDoRoteiro, ligarSaida, moverPergunta, novaPergunta, soltarSaida, tipoSaida, type TipoSaida,
} from "@/lib/voz/fluxoRoteiro";

const COR_SAIDA: Record<TipoSaida, string> = {
  sim: "bg-primary", nao: "bg-destructive", nao_reconheceu: "bg-secondary-foreground", silencio: "bg-muted-foreground",
  atendente: "bg-accent-foreground", objecao: "bg-accent-foreground", outro_dia: "bg-accent-foreground", quem: "bg-accent-foreground", personalizada: "bg-foreground",
};
const ICONE_ACAO: Record<string, typeof Workflow> = {
  transferir: PhoneForwarded, encerrar: PhoneOff, reagendar: CalendarClock, workflow: Workflow, desconto: Percent, responder: MessageSquare,
};
const ROTULO_ACAO: Record<string, string> = {
  transferir: "Transferir para atendente", encerrar: "Agradecer e encerrar", reagendar: "Reagendar retorno",
  workflow: "Disparar workflow", desconto: "Oferecer desconto", responder: "Responder e continuar",
};

type DadosPergunta = { titulo: string; fala: string; numero: number; condicoes: CondicaoRoteiro[]; avisos: number; erros: number };
type DadosAcao = { condicao: CondicaoRoteiro };

const InicioNode = memo(() => (
  <div className="flex items-center gap-2 rounded-full border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow">
    <Play className="h-4 w-4" /> Cliente atendeu
    <Handle type="source" position={Position.Right} className="!h-3 !w-3 !bg-primary-foreground" />
  </div>
));

const PerguntaNode = memo(({ data, selected }: NodeProps<Node<DadosPergunta>>) => (
  <div className={`w-[280px] rounded-xl border-2 bg-card text-card-foreground shadow-md ${selected ? "border-primary" : "border-border"}`}>
    <Handle type="target" position={Position.Left} className="!h-3 !w-3 !bg-primary" />
    <div className="flex items-center gap-2 border-b border-border px-3 py-2">
      <MessageCircleQuestion className="h-4 w-4 shrink-0 text-primary" />
      <Badge variant="secondary" className="shrink-0">{data.numero}</Badge>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{data.titulo || "Pergunta"}</span>
      {data.erros + data.avisos > 0
        ? <span title="Pergunta precisa de ajustes" className={`flex shrink-0 items-center gap-0.5 text-[11px] font-semibold ${data.erros ? "text-destructive" : "text-muted-foreground"}`}><AlertTriangle className="h-3.5 w-3.5" />{data.erros + data.avisos}</span>
        : <CheckCircle2 aria-label="Pergunta validada" className="h-3.5 w-3.5 shrink-0 text-primary" />}
    </div>
    <p className="line-clamp-3 px-3 py-2 text-xs text-muted-foreground">{data.fala || "Defina o que a IA fala…"}</p>
    <div className="space-y-1 border-t border-border py-2">
      {data.condicoes.map((c, j) => (
        <div key={j} className="relative flex items-center gap-2 px-3 py-1 text-xs">
          <span className={`h-2 w-2 shrink-0 rounded-full ${COR_SAIDA[tipoSaida(c)]}`} />
          <span className="truncate pr-3">{c.gatilho || "Saída sem resposta definida"}</span>
          <Handle id={`c${j}`} type="source" position={Position.Right} className={`!h-3 !w-3 ${COR_SAIDA[tipoSaida(c)].replace("bg-", "!bg-")}`} />
        </div>
      ))}
      {!data.condicoes.length && <p className="px-3 text-xs text-destructive">Sem saídas</p>}
    </div>
  </div>
));

const AcaoNode = memo(({ data, selected }: NodeProps<Node<DadosAcao>>) => {
  const c = data.condicao;
  const Icone = ICONE_ACAO[c.acao] ?? MessageSquare;
  const destrutivo = c.acao === "encerrar";
  return (
    <div className={`w-[220px] rounded-lg border-2 bg-card px-3 py-2 text-card-foreground shadow ${selected ? "border-primary" : destrutivo ? "border-destructive/60" : "border-border"}`}>
      <Handle type="target" position={Position.Top} className="!h-3 !w-3 !bg-primary" />
      <div className="flex items-center gap-2 text-sm font-semibold"><Icone className="h-4 w-4 shrink-0 text-primary" /><span className="truncate">{ROTULO_ACAO[c.acao]}</span></div>
      {c.acao === "workflow" && <p className="truncate text-xs text-muted-foreground">{c.workflow?.nome ?? "Escolha o workflow"}</p>}
      {c.acao !== "workflow" && c.texto && <p className="line-clamp-2 text-xs text-muted-foreground">{c.texto}</p>}
      {c.acao === "workflow" && <Handle id="continuar" type="source" position={Position.Right} className="!h-3 !w-3 !bg-primary" />}
    </div>
  );
});

const TIPOS = { inicio: InicioNode, pergunta: PerguntaNode, acao: AcaoNode };

/** Escolhe um workflow de outro módulo (Bot, Omnichannel, Vendas…) para disparar ao fim da ligação. */
function EscolherWorkflow({ valor, onChange }: { valor?: CondicaoRoteiro["workflow"]; onChange: (w: CondicaoRoteiro["workflow"]) => void }) {
  const [modulo, setModulo] = useState(valor?.modulo ?? "omnichannel");
  const [lista, setLista] = useState<{ id: string; nome: string }[]>([]);
  const mod = WORKFLOW_MODULES.find((m) => m.key === modulo) ?? WORKFLOW_MODULES[0];
  useEffect(() => {
    let vivo = true;
    void (supabase as any).from(mod.table).select(`id, ${mod.nameCol}`).order(mod.nameCol).limit(200)
      .then(({ data }: any) => { if (vivo) setLista((data ?? []).map((r: any) => ({ id: String(r.id), nome: r[mod.nameCol] || "(sem nome)" }))); });
    return () => { vivo = false; };
  }, [mod.table, mod.nameCol]);
  return (
    <div className="grid gap-2">
      <Select value={modulo} onValueChange={setModulo}>
        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
        <SelectContent>{WORKFLOW_MODULES.map((m) => <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={valor?.modulo === modulo ? valor.id : ""} onValueChange={(id) => onChange({ modulo, id, nome: lista.find((w) => w.id === id)?.nome ?? id })}>
        <SelectTrigger className="h-8"><SelectValue placeholder={lista.length ? "Escolha o workflow" : "Nenhum workflow neste módulo"} /></SelectTrigger>
        <SelectContent>{lista.map((w) => <SelectItem key={w.id} value={w.id}>{w.nome}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

/** Edita uma saída (resposta do cliente → o que acontece). */
function EditorSaida({ r, i, j, onChange }: { r: RoteiroSalvo; i: number; j: number; onChange: (r: RoteiroSalvo) => void }) {
  const c = r.etapas[i].condicoes[j];
  const set = (p: Partial<CondicaoRoteiro>) => onChange({ ...r, etapas: r.etapas.map((e, k) => (k !== i ? e : { ...e, condicoes: e.condicoes.map((x, m) => (m === j ? { ...x, ...p } : x)) })) });
  const remover = () => onChange({ ...r, etapas: r.etapas.map((e, k) => (k !== i ? e : { ...e, condicoes: e.condicoes.filter((_, m) => m !== j) })) });
  const outras = r.etapas.map((e, k) => ({ k, nome: `${k + 1}. ${e.titulo || "Pergunta"}` })).filter((x) => x.k !== i);
  const [sug, setSug] = useState<string[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const sugerir = async () => {
    setCarregando(true);
    const { data, error } = await supabase.functions.invoke("voz-roteiro-teste", { body: { acao: "sinonimos", pergunta: r.etapas[i].fala, gatilho: c.gatilho } });
    setCarregando(false);
    if (error || data?.error) return void toast.error(data?.error ?? "Falha ao sugerir");
    const ja = new Set(palavrasGatilho(c.gatilho).map((p) => p.toLowerCase()));
    const v = ((data.variacoes as string[]) ?? []).filter((p) => !ja.has(p.toLowerCase()));
    if (!v.length) toast.info("Nenhuma variação nova");
    setSug(v);
  };
  return (
    <Card className="space-y-2 p-3">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${COR_SAIDA[tipoSaida(c)]}`} />
        <Input className="h-8" value={c.gatilho} onChange={(e) => set({ gatilho: e.target.value })} placeholder="Respostas, separadas por vírgula" />
        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" aria-label="Remover saída" onClick={remover}><Trash2 className="h-4 w-4" /></Button>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-[11px]" disabled={!c.gatilho.trim() || carregando} onClick={() => void sugerir()}>
          {carregando ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />} Sugerir variações
        </Button>
        {sug?.map((p) => (
          <Badge key={p} variant="outline" className="cursor-pointer text-[10px]" onClick={() => { set({ gatilho: [...palavrasGatilho(c.gatilho), p].join(", ") }); setSug((x) => x?.filter((y) => y !== p) ?? null); }}>+ {p}</Badge>
        ))}
      </div>
      <Select value={c.acao} onValueChange={(v) => {
        const acao = v as CondicaoRoteiro["acao"];
        if (acao === "ir_etapa") return set({ acao, etapa: outras[0]?.k, workflow: undefined });
        const { etapa: _e, workflow: _w, ...base } = c;
        onChange({ ...r, etapas: r.etapas.map((e, k) => (k !== i ? e : { ...e, condicoes: e.condicoes.map((x, m) => (m === j ? { ...base, acao } : x)) })) });
      }}>
        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
        <SelectContent>{ACOES.map((a) => <SelectItem key={a.id} value={a.id}>{a.rotulo}</SelectItem>)}</SelectContent>
      </Select>
      {c.acao === "ir_etapa" && (
        <Select value={c.etapa != null ? String(c.etapa) : ""} onValueChange={(v) => onChange(ligarSaida(r, i, j, Number(v)))}>
          <SelectTrigger className="h-8"><SelectValue placeholder="Escolha a pergunta" /></SelectTrigger>
          <SelectContent>{outras.map((o) => <SelectItem key={o.k} value={String(o.k)}>{o.nome}</SelectItem>)}</SelectContent>
        </Select>
      )}
      {c.acao === "workflow" && (
        <>
          <EscolherWorkflow valor={c.workflow} onChange={(w) => set({ workflow: w })} />
          <Select value={c.etapa != null ? String(c.etapa) : "fim"} onValueChange={(v) => onChange(continuarAposWorkflow(r, i, j, v === "fim" ? null : Number(v)))}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fim">Depois: agradecer e encerrar</SelectItem>
              {r.etapas.map((e, k) => <SelectItem key={k} value={String(k)}>Depois: {k + 1}. {e.titulo || "Pergunta"}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">O workflow é disparado quando a ligação termina, com o número e a conversa.</p>
        </>
      )}
      <Input className="h-8" value={c.texto ?? ""} onChange={(e) => set({ texto: e.target.value })} placeholder="Instrução extra para a IA (opcional)" />
    </Card>
  );
}

const PAINEL = "workflow-props animate-slide-in-right fixed inset-y-0 right-0 z-40 flex h-full w-full flex-col overflow-x-hidden border-l border-border bg-background shadow-2xl sm:w-96 lg:static lg:inset-auto lg:z-auto lg:m-2 lg:h-[calc(100%-1rem)] lg:rounded-2xl lg:border-2 lg:border-border lg:bg-gradient-to-b lg:from-background lg:to-border lg:shadow-lg";

/** Menu lateral de blocos (mesmo visual do menu do Criar Bot). */
function MenuBlocosVoz({ onFechar, onAdicionar }: { onFechar: () => void; onAdicionar: (b: BlocoMenu) => void }) {
  const [busca, setBusca] = useState("");
  const [abertos, setAbertos] = useState<string[]>(["Perguntas", "Ações"]);
  const q = busca.toLowerCase();
  const grupos = MENU_BLOCOS.map((g) => ({ ...g, blocos: g.blocos.filter((b) => b.rotulo.toLowerCase().includes(q) || b.descricao.toLowerCase().includes(q)) })).filter((g) => g.blocos.length);
  return (
    <div className="relative m-2 flex h-[calc(100%-1rem)] w-60 shrink-0 flex-col overflow-hidden rounded-2xl border-2 border-border bg-gradient-to-b from-background to-border shadow-lg animate-slide-in">
      <div className="p-4 pb-2">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-foreground text-background"><Sparkles className="h-3.5 w-3.5" /></div>
            <h3 className="text-base font-bold tracking-tight text-foreground">Menu</h3>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onFechar} aria-label="Fechar menu"><X className="h-4 w-4" /></Button>
        </div>
        <Input placeholder="Buscar..." value={busca} onChange={(e) => setBusca(e.target.value)} className="h-8 border-0 bg-muted/40 text-xs shadow-sm" />
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-0.5 px-2 pb-4">
          {grupos.map((g) => {
            const aberto = abertos.includes(g.grupo) || !!q;
            return (
              <Collapsible key={g.grupo} open={aberto} onOpenChange={() => setAbertos((a) => (a.includes(g.grupo) ? a.filter((x) => x !== g.grupo) : [...a, g.grupo]))}>
                <CollapsibleTrigger className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors ${aberto ? "bg-foreground text-background" : "text-foreground hover:bg-muted"}`}>
                  <span className="text-xs font-medium">{g.grupo}</span>
                  <span className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold ${aberto ? "bg-background/20 text-background" : "bg-foreground text-background"}`}>{g.blocos.length}</span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="relative ml-5 py-1 pl-4">
                    <div className="absolute bottom-0 left-0 top-0 w-px bg-foreground/40" />
                    {g.blocos.map((b) => (
                      <div key={`${b.tipo}-${b.id}`} draggable title="Arraste para o quadro ou clique 2x"
                        onDragStart={(ev) => { ev.dataTransfer.setData("application/vozbloco", JSON.stringify(b)); ev.dataTransfer.effectAllowed = "move"; }}
                        onDoubleClick={() => onAdicionar(b)}
                        className="cursor-grab select-none rounded-xl px-3 py-2 transition-colors hover:bg-muted/60 active:cursor-grabbing">
                        <p className="truncate text-xs text-foreground">{b.rotulo}</p>
                        <p className="truncate text-[10px] text-muted-foreground">{b.descricao}</p>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

/** Propriedades do bloco "Negociação Inteligente": modalidade, limites e diretrizes escritas pela empresa. */
const EXEMPLO_DIRETRIZ: Record<ModalidadeNegociacao, string> = {
  venda: "Ex.: Boleto 28 dias acima de R$ 500 ou Pix com 3% de desconto. Frete grátis a partir de 10 fardos. Destaque a marca X; se achar caro, ofereça a linha econômica.",
  cobranca: "Ex.: Entrada mínima de 30%. Vencimento da 1ª parcela em até 7 dias. Nunca ameace negativação; se o cliente contestar a dívida, transfira.",
  orcamento: "Ex.: Pode antecipar a entrega em 2 dias para fechar hoje. Pagamento em 30/60 só acima de R$ 2.000. Lembre a validade da proposta.",
  livre: "Descreva o objetivo, o que pode ceder, os limites e quando transferir para o atendente.",
};
function ConfigVenda({ v, onChange }: { v: ConfigVendaEtapa; onChange: (v: ConfigVendaEtapa) => void }) {
  const m = v.modalidade ?? "venda";
  const info = MODALIDADES_NEGOCIACAO.find((x) => x.id === m)!;
  return (
    <Card className="space-y-3 p-3">
      <p className="text-xs font-semibold text-foreground">Negociação Inteligente</p>
      <div className="space-y-1">
        <Label>Tipo de negociação</Label>
        <Select value={m} onValueChange={(x) => onChange({ ...v, modalidade: x as ModalidadeNegociacao })}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent className="z-[60]">{MODALIDADES_NEGOCIACAO.map((x) => <SelectItem key={x.id} value={x.id}>{x.rotulo}</SelectItem>)}</SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground">{info.desc}</p>
      </div>
      <div className="space-y-1">
        <Label>{m === "cobranca" ? "Desconto máximo em juros/multa (%)" : m === "livre" ? "Concessão máxima (%)" : "Desconto máximo para negociar (%)"}</Label>
        <Input className="h-8" type="number" min={0} max={50} value={v.descontoMax} onChange={(x) => onChange({ ...v, descontoMax: Math.max(0, Math.min(50, Number(x.target.value) || 0)) })} />
        {m === "venda" && <p className="text-[11px] text-muted-foreground">O preço mínimo do produto, quando cadastrado, também é respeitado.</p>}
      </div>
      {m === "cobranca" && (
        <div className="space-y-1">
          <Label>Parcelamento máximo (vezes)</Label>
          <Input className="h-8" type="number" min={1} max={24} value={v.parcelasMax ?? 1} onChange={(x) => onChange({ ...v, parcelasMax: Math.max(1, Math.min(24, Number(x.target.value) || 1)) })} />
        </div>
      )}
      {m === "venda" && (
        <>
          <div className="flex items-center justify-between gap-2">
            <Label>Oferecer similares quando faltar</Label>
            <Switch checked={v.similares} onCheckedChange={(similares) => onChange({ ...v, similares })} />
          </div>
          <div className="space-y-1">
            <Label>Produtos considerados (opcional)</Label>
            <Input className="h-8" value={v.filtro} maxLength={200} placeholder="Ex.: papel, toalha, interfolha" onChange={(x) => onChange({ ...v, filtro: x.target.value })} />
            <p className="text-[11px] text-muted-foreground">Vazio usa todo o catálogo ativo. Separe palavras por vírgula.</p>
          </div>
        </>
      )}
      <div className="space-y-1">
        <Label>Diretrizes da negociação (como a IA deve agir)</Label>
        <Textarea rows={6} maxLength={1500} value={v.instrucoes ?? ""} placeholder={EXEMPLO_DIRETRIZ[m]} onChange={(x) => onChange({ ...v, instrucoes: x.target.value })} />
        <p className="text-[11px] text-muted-foreground">Escreva as regras da sua empresa: pagamento, frete, prazos, pedido mínimo, argumentos e quando transferir. Elas valem acima das regras gerais. {(v.instrucoes ?? "").length}/1500</p>
      </div>
    </Card>
  );
}

/** Validação da pergunta: orienta para que a fala leve o cliente a uma resposta que siga o fluxo. */
/** Técnicas comerciais aplicáveis à pergunta selecionada (acrescenta a saída da técnica). */
function TecnicasEtapa({ r, i, onChange }: { r: RoteiroSalvo; i: number; onChange: (r: RoteiroSalvo) => void }) {
  const ativas = r.etapas[i]?.tecnicas ?? [];
  return (
    <Collapsible className="rounded-md border border-border">
      <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold text-foreground">
        <span className="flex items-center gap-1"><Sparkles className="h-4 w-4 text-primary" /> Técnicas comerciais</span>
        {ativas.length > 0 && <Badge variant="secondary" className="text-[10px]">{ativas.length}</Badge>}
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 border-t border-border p-3">
        {FASES_TECNICA.map((f) => (
          <div key={f.id} className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase text-muted-foreground">{f.rotulo}</p>
            {TECNICAS.filter((t) => t.fase === f.id).map((t) => {
              const on = ativas.includes(t.id);
              return (
                <div key={t.id} className="min-w-0 space-y-1 rounded-md bg-muted/40 p-2">
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-foreground">{t.nome}</p>
                    <Button size="sm" variant={on ? "secondary" : "outline"} className="h-6 shrink-0 px-2 text-[11px]" disabled={on} onClick={() => onChange(aplicarTecnica(r, i, t.id))}>{on ? "Aplicada" : "Aplicar"}</Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{t.resumo}</p>
                  <p className="break-words text-[11px] italic text-muted-foreground">Ex.: {t.exemplo}</p>
                </div>
              );
            })}
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

function ValidacaoPergunta({ r, i, onChange }: { r: RoteiroSalvo; i: number; onChange: (r: RoteiroSalvo) => void }) {
  const e = r.etapas[i];
  const avisos = validarPergunta(e);
  const ops = opcoesEsperadas(e);
  const [reescrevendo, setReescrevendo] = useState(false);
  const reescrever = async () => {
    setReescrevendo(true);
    const { data, error } = await supabase.functions.invoke("voz-roteiro-teste", { body: { acao: "orientar", fala: e.fala, opcoes: (ops.length ? ops : ["qualquer resposta"]).join(", ") } });
    setReescrevendo(false);
    if (error || data?.error || !data?.fala) return void toast.error(data?.error ?? "Falha ao reescrever");
    onChange({ ...r, etapas: r.etapas.map((x, k) => (k === i ? { ...x, fala: data.fala } : x)) });
    toast.success("Pergunta reescrita para guiar o cliente");
  };
  return (
    <Card className="space-y-2 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-foreground">Validação da pergunta</p>
        <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" disabled={!e.fala.trim() || reescrevendo} onClick={() => void reescrever()}>
          {reescrevendo ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Wand2 className="mr-1 h-3 w-3" />} Reescrever com IA
        </Button>
      </div>
      {ops.length > 0 && <p className="text-[11px] text-muted-foreground">Respostas que seguem o fluxo: {ops.map((o) => <Badge key={o} variant="secondary" className="mr-1 text-[10px]">{o}</Badge>)}</p>}
      {!avisos.length && <p className="flex items-center gap-1 text-xs text-primary"><CheckCircle2 className="h-3.5 w-3.5" /> A pergunta conduz o cliente a uma resposta prevista.</p>}
      {avisos.map((a) => (
        <div key={a.codigo} className={`flex items-start gap-2 rounded-md border p-2 text-xs ${a.nivel === "erro" ? "border-destructive/50 text-destructive" : "border-border text-muted-foreground"}`}>
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 flex-1">{a.texto}</span>
          {a.corrigivel && <Button size="sm" variant="ghost" className="h-6 shrink-0 px-2 text-[11px]" onClick={() => onChange(corrigirPergunta(r, i, a.codigo))}>Corrigir</Button>}
        </div>
      ))}
    </Card>
  );
}

export interface FluxoRoteiroVozProps {
  roteiro: RoteiroSalvo; onChange: (r: RoteiroSalvo) => void;
  onSalvar: () => void; onFechar: () => void; salvando?: boolean; sujo?: boolean;
  /** Painel "Testar" (simulador) mostrado à direita no lugar das propriedades. */
  painelTeste: ReactNode;
  /** Propriedades do roteiro (quando nenhum bloco está selecionado). */
  propriedadesRoteiro: ReactNode;
  acoesTopo?: ReactNode;
}

function Editor(p: FluxoRoteiroVozProps) {
  const { roteiro, onChange } = p;
  const rf = useReactFlow();
  const [sel, setSel] = useState<string | null>(null);
  const [menu, setMenu] = useState(true);
  const [testando, setTestando] = useState(false);
  const [painel, setPainel] = useState(true);
  const [travado, setTravado] = useState(false);
  const grafo = useMemo(() => grafoDoRoteiro(roteiro), [roteiro]);
  const calculados: Node[] = useMemo(() => grafo.nos.map((n) => {
    const av = n.tipo === "pergunta" ? validarPergunta(roteiro.etapas[n.etapa!]) : [];
    return {
      id: n.id, type: n.tipo, position: { x: n.x, y: n.y }, selected: n.id === sel, deletable: n.tipo !== "inicio" && !travado, draggable: n.tipo === "pergunta" && !travado,
      data: n.tipo === "pergunta"
        ? { ...roteiro.etapas[n.etapa!], numero: n.etapa! + 1, erros: av.filter((a) => a.nivel === "erro").length, avisos: av.filter((a) => a.nivel === "aviso").length }
        : n.tipo === "acao" ? { condicao: roteiro.etapas[n.etapa!].condicoes[n.saida!] } : {},
    };
  }), [grafo, roteiro, sel, travado]);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(calculados);
  useEffect(() => { setNodes(calculados); }, [calculados, setNodes]);
  const edges: Edge[] = grafo.arestas.map((a) => ({
    id: a.id, source: a.origem, sourceHandle: a.saida, target: a.destino, animated: true, type: "smoothstep",
    style: { stroke: "hsl(var(--primary))", strokeWidth: 2 }, markerEnd: { type: "arrowclosed" as never, color: "hsl(var(--primary))" }, deletable: a.origem !== "inicio",
  }));
  const idx = (id: string) => id.slice(1).split("-").map(Number);

  const conectar = (c: Connection) => {
    if (!c.target?.startsWith("e") || !c.source) return;
    const destino = Number(c.target.slice(1));
    if (c.source.startsWith("e") && c.sourceHandle?.startsWith("c")) onChange(ligarSaida(roteiro, Number(c.source.slice(1)), Number(c.sourceHandle.slice(1)), destino));
    else if (c.source.startsWith("a")) { const [i, j] = idx(c.source); onChange(continuarAposWorkflow(roteiro, i, j, destino)); }
  };
  const apagarArestas = (es: Edge[]) => {
    let r = roteiro;
    for (const e of es) {
      if (e.source.startsWith("e") && e.sourceHandle?.startsWith("c")) r = soltarSaida(r, Number(e.source.slice(1)), Number(e.sourceHandle.slice(1)));
      else if (e.source.startsWith("a")) { const [i, j] = idx(e.source); r = continuarAposWorkflow(r, i, j, null); }
    }
    onChange(r);
  };

  /** Tecla Delete/Backspace: apaga de verdade no roteiro (perguntas e saídas de ação), sem recriar o bloco. */
  const apagarNos = (ns: Node[]) => {
    let etapas = roteiro.etapas;
    const acoes = ns.filter((n) => n.id.startsWith("a")).map((n) => idx(n.id)).sort((x, y) => y[1] - x[1]);
    for (const [i, j] of acoes) etapas = etapas.map((e, k) => (k === i ? { ...e, condicoes: e.condicoes.filter((_, m) => m !== j) } : e));
    const perguntas = ns.filter((n) => n.id.startsWith("e")).map((n) => Number(n.id.slice(1))).sort((x, y) => y - x);
    for (const i of perguntas) etapas = removerEtapa(etapas, i);
    onChange({ ...roteiro, etapas }); setSel(null);
  };

  const etapaSel = sel?.startsWith("e") ? Number(sel.slice(1)) : null;
  /** Adiciona um bloco do menu: perguntas viram blocos; respostas e ações entram na pergunta alvo (ou selecionada). */
  const adicionar = useCallback((b: BlocoMenu, pos?: { x: number; y: number }, alvo?: number | null) => {
    if (b.tipo === "pergunta") {
      const centro = pos ?? rf.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
      onChange(novaPerguntaTipo(roteiro, b.id, { x: Math.round(centro.x), y: Math.round(centro.y) }));
      setSel(`e${roteiro.etapas.length}`); setPainel(true); setTestando(false);
      return;
    }
    const i = alvo ?? (sel?.startsWith("a") ? idx(sel)[0] : etapaSel);
    if (i == null || !roteiro.etapas[i]) return void toast.info("Solte sobre uma pergunta (ou selecione uma) para adicionar essa saída");
    onChange(b.tipo === "saida" ? adicionarSaida(roteiro, i, b.id) : adicionarAcao(roteiro, i, b.id));
    setSel(`e${i}`); setPainel(true); setTestando(false);
    toast.success(`${b.rotulo} adicionado à pergunta ${i + 1}`);
  }, [roteiro, onChange, rf, sel, etapaSel]);

  const soltar = (ev: React.DragEvent) => {
    ev.preventDefault();
    const raw = ev.dataTransfer.getData("application/vozbloco");
    if (!raw || travado) return;
    const b = JSON.parse(raw) as BlocoMenu;
    const no = (ev.target as Element).closest(".react-flow__node")?.getAttribute("data-id") ?? "";
    const alvo = no.startsWith("e") ? Number(no.slice(1)) : no.startsWith("a") ? idx(no)[0] : null;
    adicionar(b, rf.screenToFlowPosition({ x: ev.clientX, y: ev.clientY }), alvo);
  };

  const acaoSel = sel?.startsWith("a") ? idx(sel) : null;
  const e = etapaSel != null ? roteiro.etapas[etapaSel] : null;
  const setEtapa = (x: Partial<RoteiroSalvo["etapas"][number]>) =>
    onChange({ ...roteiro, etapas: roteiro.etapas.map((y, k) => (k === etapaSel ? { ...y, ...x } : y)) });
  const tituloPainel = testando ? "Testar roteiro" : e ? `Pergunta ${etapaSel! + 1}` : acaoSel ? `Saída da pergunta ${acaoSel[0] + 1}` : "Propriedades do roteiro";

  return (
    <WorkflowBuilderLayout
      title="AGENTE DE VOZ" subtitle="Roteiro de ligação em blocos"
      flowName={roteiro.nome} onFlowNameChange={(nome) => onChange({ ...roteiro, nome })}
      onSave={p.onSalvar} isSaving={p.salvando} hasUnsavedChanges={p.sujo} onClose={p.onFechar}
      onTest={() => { setTestando((t) => !t); setPainel(true); }} showTest={testando} isTestActive={testando} testLabel="Testar"
      onZoomIn={() => rf.zoomIn()} onZoomOut={() => rf.zoomOut()} onFitView={() => rf.fitView({ padding: 0.2, duration: 300 })}
      isLocked={travado} onToggleLock={() => setTravado((t) => !t)}
      rightContent={p.acoesTopo}
    >
      {menu && <MenuBlocosVoz onFechar={() => setMenu(false)} onAdicionar={(b) => adicionar(b)} />}
      <div className="relative min-w-0 flex-1" onDragOver={(ev) => { ev.preventDefault(); ev.dataTransfer.dropEffect = "move"; }} onDrop={soltar}>
        {!menu && <FloatingAddBlockButton onClick={() => setMenu(true)} />}
        <ReactFlow
          nodes={nodes} edges={edges} nodeTypes={TIPOS} fitView fitViewOptions={{ padding: 0.2, maxZoom: 1 }} minZoom={0.2}
          onConnect={conectar} onDelete={({ nodes: ns, edges: es }) => (ns.length ? apagarNos(ns) : apagarArestas(es))} nodesConnectable={!travado} edgesFocusable={!travado}
          onNodeClick={(_, n) => { setSel(n.id); setPainel(true); setTestando(false); }} onPaneClick={() => setSel(null)}
          onNodeDragStop={(_, n) => n.id.startsWith("e") && onChange(moverPergunta(roteiro, Number(n.id.slice(1)), n.position))}
          onNodesChange={onNodesChange} proOptions={{ hideAttribution: true }} className="bg-background"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} className="opacity-40" />
          <Controls showInteractive={false} className="rounded-lg border border-border bg-card shadow-lg" />
        </ReactFlow>
        {!painel && <Button size="sm" variant="outline" className="absolute right-3 top-3 z-10" onClick={() => setPainel(true)}>Propriedades</Button>}
      </div>

      {painel && (
        <div className={PAINEL}>
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <h3 className="truncate text-sm font-bold text-foreground">{tituloPainel}</h3>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label="Fechar painel" onClick={() => { setPainel(false); setTestando(false); }}><X className="h-4 w-4" /></Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="min-w-0 space-y-3 p-4">
              {testando && p.painelTeste}
              {!testando && !e && !acaoSel && p.propriedadesRoteiro}
              {!testando && e && etapaSel != null && (
                <>
                  <div className="flex items-center justify-end">
                    <Button size="sm" variant="ghost" onClick={() => { onChange({ ...roteiro, etapas: removerEtapa(roteiro.etapas, etapaSel) }); setSel(null); }}><Trash2 className="mr-1 h-4 w-4" /> Remover bloco</Button>
                  </div>
                  <div className="space-y-1"><Label>Título</Label><Input className="h-8" value={e.titulo} onChange={(x) => setEtapa({ titulo: x.target.value })} /></div>
                  <div className="space-y-1"><Label>O que a IA fala</Label><Textarea rows={3} value={e.fala} maxLength={400} onChange={(x) => setEtapa({ fala: x.target.value })} placeholder="Uma pergunta curta, ex.: O senhor conseguiu ver o orçamento?" /></div>
                  {e.venda && <ConfigVenda v={e.venda} onChange={(venda) => setEtapa({ venda })} />}
                  {!e.venda && <ValidacaoPergunta r={roteiro} i={etapaSel} onChange={onChange} />}
                  <TecnicasEtapa r={roteiro} i={etapaSel} onChange={onChange} />
                  <div className="flex items-center justify-between gap-2">
                    <Label>Saídas (respostas do cliente)</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button size="sm" variant="outline" className="h-8"><Plus className="mr-1 h-4 w-4" /> Saída</Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="z-[60]">
                        {SAIDAS_PRONTAS.map((s) => <DropdownMenuItem key={s.tipo} onClick={() => onChange(adicionarSaida(roteiro, etapaSel, s.tipo))}>{s.rotulo}</DropdownMenuItem>)}
                        <DropdownMenuItem onClick={() => onChange(adicionarSaida(roteiro, etapaSel, "personalizada"))}>Personalizada…</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {e.condicoes.map((_, j) => <EditorSaida key={j} r={roteiro} i={etapaSel} j={j} onChange={onChange} />)}
                </>
              )}
              {!testando && acaoSel && roteiro.etapas[acaoSel[0]]?.condicoes[acaoSel[1]] && <EditorSaida r={roteiro} i={acaoSel[0]} j={acaoSel[1]} onChange={onChange} />}
            </div>
          </ScrollArea>
        </div>
      )}
    </WorkflowBuilderLayout>
  );
}

/** Editor do roteiro de voz em tela cheia, no mesmo padrão dos workflows (menu de blocos, quadro e propriedades). */
export function FluxoRoteiroVoz(p: FluxoRoteiroVozProps) {
  return <ReactFlowProvider><Editor {...p} /></ReactFlowProvider>;
}
