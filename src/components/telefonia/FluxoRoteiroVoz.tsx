import "@xyflow/react/dist/style.css";
import { memo, useEffect, useMemo, useState } from "react";
import {
  Background, Controls, Handle, MiniMap, Position, ReactFlow, useNodesState, type Connection, type Edge, type Node, type NodeProps,
} from "@xyflow/react";
import { CalendarClock, MessageCircleQuestion, PhoneForwarded, PhoneOff, Play, Plus, Percent, MessageSquare, Trash2, Workflow } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { WORKFLOW_MODULES } from "@/components/flow/block-configs/TriggerWorkflowConfig";
import { ACOES, removerEtapa, type CondicaoRoteiro, type RoteiroSalvo } from "@/lib/voz/roteirosLigacao";
import {
  SAIDAS_PRONTAS, adicionarSaida, continuarAposWorkflow, grafoDoRoteiro, ligarSaida, moverPergunta, novaPergunta, soltarSaida, tipoSaida, type TipoSaida,
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

type DadosPergunta = { titulo: string; fala: string; numero: number; condicoes: CondicaoRoteiro[] };
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
      <span className="truncate text-sm font-semibold">{data.titulo || "Pergunta"}</span>
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
  return (
    <Card className="space-y-2 p-3">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${COR_SAIDA[tipoSaida(c)]}`} />
        <Input className="h-8" value={c.gatilho} onChange={(e) => set({ gatilho: e.target.value })} placeholder="Respostas, separadas por vírgula" />
        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" aria-label="Remover saída" onClick={remover}><Trash2 className="h-4 w-4" /></Button>
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

/** Roteiro de voz como workflow de blocos: perguntas com saídas prontas ligadas a perguntas ou ações. */
export function FluxoRoteiroVoz({ roteiro, onChange }: { roteiro: RoteiroSalvo; onChange: (r: RoteiroSalvo) => void }) {
  const [sel, setSel] = useState<string | null>(roteiro.etapas.length ? "e0" : null);
  const grafo = useMemo(() => grafoDoRoteiro(roteiro), [roteiro]);
  const calculados: Node[] = useMemo(() => grafo.nos.map((n) => ({
    id: n.id, type: n.tipo, position: { x: n.x, y: n.y }, selected: n.id === sel,
    draggable: n.tipo === "pergunta",
    data: n.tipo === "pergunta"
      ? { ...roteiro.etapas[n.etapa!], numero: n.etapa! + 1 }
      : n.tipo === "acao" ? { condicao: roteiro.etapas[n.etapa!].condicoes[n.saida!] } : {},
  })), [grafo, roteiro, sel]);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(calculados);
  useEffect(() => { setNodes(calculados); }, [calculados, setNodes]);
  const edges: Edge[] = grafo.arestas.map((a) => ({
    id: a.id, source: a.origem, sourceHandle: a.saida, target: a.destino, animated: a.origem === "inicio",
    style: { strokeWidth: 2 }, deletable: a.origem !== "inicio",
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

  const etapaSel = sel?.startsWith("e") ? Number(sel.slice(1)) : null;
  const acaoSel = sel?.startsWith("a") ? idx(sel) : null;
  const e = etapaSel != null ? roteiro.etapas[etapaSel] : null;
  const setEtapa = (p: Partial<RoteiroSalvo["etapas"][number]>) =>
    onChange({ ...roteiro, etapas: roteiro.etapas.map((x, k) => (k === etapaSel ? { ...x, ...p } : x)) });

  return (
    <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Card className="relative h-[620px] min-w-0 overflow-hidden">
        <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => { onChange(novaPergunta(roteiro)); setSel(`e${roteiro.etapas.length}`); }}><Plus className="mr-1 h-4 w-4" /> Pergunta</Button>
        </div>
        <ReactFlow
          nodes={nodes} edges={edges} nodeTypes={TIPOS} fitView minZoom={0.2}
          onConnect={conectar} onEdgesDelete={apagarArestas}
          onNodeClick={(_, n) => setSel(n.id)} onPaneClick={() => setSel(null)}
          onNodeDragStop={(_, n) => n.id.startsWith("e") && onChange(moverPergunta(roteiro, Number(n.id.slice(1)), n.position))}
          onNodesChange={onNodesChange} proOptions={{ hideAttribution: true }}
        >
          <Background /><Controls showInteractive={false} /><MiniMap pannable zoomable className="!hidden md:!block" />
        </ReactFlow>
      </Card>

      <div className="min-w-0 space-y-3">
        {!e && !acaoSel && (
          <Card className="space-y-2 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Como montar</p>
            <p>Cada bloco é uma pergunta da IA. Cada bolinha à direita é uma resposta possível do cliente.</p>
            <p>Arraste a bolinha até outra pergunta para seguir por ali, ou escolha no painel: transferir, encerrar, reagendar ou disparar um workflow (WhatsApp, Bot, Vendas…).</p>
            <p>Para desfazer uma ligação, clique na linha e aperte Delete.</p>
          </Card>
        )}
        {e && etapaSel != null && (
          <Card className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <Badge>Pergunta {etapaSel + 1}</Badge>
              <Button size="sm" variant="ghost" onClick={() => { onChange({ ...roteiro, etapas: removerEtapa(roteiro.etapas, etapaSel) }); setSel(null); }}><Trash2 className="mr-1 h-4 w-4" /> Remover</Button>
            </div>
            <div className="space-y-1"><Label>Título</Label><Input className="h-8" value={e.titulo} onChange={(x) => setEtapa({ titulo: x.target.value })} /></div>
            <div className="space-y-1"><Label>O que a IA fala</Label><Textarea rows={3} value={e.fala} onChange={(x) => setEtapa({ fala: x.target.value })} placeholder="Uma pergunta curta, ex.: O senhor conseguiu ver o orçamento?" /></div>
            <div className="flex items-center justify-between gap-2">
              <Label>Saídas (respostas do cliente)</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button size="sm" variant="outline" className="h-8"><Plus className="mr-1 h-4 w-4" /> Saída</Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {SAIDAS_PRONTAS.map((s) => <DropdownMenuItem key={s.tipo} onClick={() => onChange(adicionarSaida(roteiro, etapaSel, s.tipo))}>{s.rotulo}</DropdownMenuItem>)}
                  <DropdownMenuItem onClick={() => onChange(adicionarSaida(roteiro, etapaSel, "personalizada"))}>Personalizada…</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {e.condicoes.map((_, j) => <EditorSaida key={j} r={roteiro} i={etapaSel} j={j} onChange={onChange} />)}
          </Card>
        )}
        {acaoSel && roteiro.etapas[acaoSel[0]]?.condicoes[acaoSel[1]] && (
          <div className="space-y-2">
            <Badge variant="secondary">Saída da pergunta {acaoSel[0] + 1}</Badge>
            <EditorSaida r={roteiro} i={acaoSel[0]} j={acaoSel[1]} onChange={onChange} />
          </div>
        )}
      </div>
    </div>
  );
}
