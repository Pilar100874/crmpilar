import { useMemo, useState } from "react";
import { Background, BackgroundVariant, Controls, Handle, MarkerType, Position, ReactFlow, type Edge, type Node, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowRight, CalendarDays, GitBranch, Pencil, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ACOES, GATILHOS, relacaoEntre, rotuloAcao, rotuloGatilho, type RegraBase } from "@/lib/calendario/regrasAutomacao";

type RegraVisual = RegraBase & { descricao: string | null; tela: string | null };
type DadosNo = { titulo: string; detalhe?: string; tipo: "evento" | "regra" | "resultado"; inativa?: boolean; prioridade?: number; editar?: () => void };

function NoFluxo({ data }: NodeProps<Node<DadosNo>>) {
  return (
    <div className={`w-[252px] rounded-md border bg-card p-3 text-card-foreground shadow-sm ${data.inativa ? "opacity-50" : data.tipo === "evento" ? "border-primary/60" : data.tipo === "resultado" ? "border-success/50" : "border-border"}`}>
      {data.tipo !== "evento" && <Handle type="target" position={Position.Left} className="!bg-primary" />}
      <div className="flex items-start gap-2">
        {data.tipo === "evento" ? <GitBranch className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> : data.tipo === "resultado" ? <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-success" /> : <Zap className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">{data.tipo === "evento" ? "Quando" : data.tipo === "resultado" ? "Resultado" : "Regra"}</p>
          <p className="break-words text-sm font-semibold leading-snug">{data.titulo}</p>
          {data.detalhe && <p className="mt-1 break-words text-xs leading-snug text-muted-foreground">{data.detalhe}</p>}
          {data.tipo === "regra" && <div className="mt-2 flex flex-wrap gap-1">{data.prioridade !== undefined && <Badge variant="outline" className="text-[10px]">Prioridade {data.prioridade}</Badge>}{data.inativa && <Badge variant="secondary" className="text-[10px]">Inativa</Badge>}</div>}
        </div>
        {data.editar && <Button className="nodrag h-7 w-7 shrink-0" size="icon" variant="ghost" title="Editar regra" aria-label={`Editar ${data.titulo}`} onClick={data.editar}><Pencil className="h-3.5 w-3.5" /></Button>}
      </div>
      {data.tipo !== "resultado" && <Handle type="source" position={Position.Right} className="!bg-primary" />}
    </div>
  );
}
const nodeTypes = { fluxo: NoFluxo };
const resultado = (r: RegraVisual) => {
  const a = r.acao_config || {};
  if (r.acao === "criar_tarefa") return `${a.titulo || "Nova tarefa"}${typeof a.dias === "number" ? ` · em ${a.dias} dia(s)${a.dias_uteis ? " úteis" : ""}` : ""}${a.canal ? ` · ${a.canal}` : ""}`;
  if (r.acao === "remarcar_tarefa") return `Tarefa remarcada${typeof a.dias === "number" ? ` para daqui a ${a.dias} dia(s)` : ""}`;
  return r.descricao || rotuloAcao(r.acao);
};

export function FluxoVisualRegrasAgenda({ regras, onEditar }: { regras: RegraVisual[]; onEditar: (r: RegraVisual) => void }) {
  const [gatilho, setGatilho] = useState("empresa_criada");
  const opcoes = useMemo(() => Array.from(new Set(regras.map((r) => r.gatilho))), [regras]);
  const atual = opcoes.includes(gatilho) ? gatilho : opcoes[0];
  const diretas = regras.filter((r) => r.gatilho === atual).sort((a, b) => a.prioridade - b.prioridade);
  const origemContato = atual === "empresa_criada" ? diretas.find((r) => r.ativa && r.acao === "criar_contato_temporario") : undefined;
  const secundarias = origemContato ? regras.filter((r) => r.gatilho === "contato_criado") : [];
  const { nodes, edges } = useMemo(() => {
    const nos: Node<DadosNo>[] = [];
    const linhas: Edge[] = [];
    const conectar = (origem: string, destino: string, rotulo?: string, tracejada = false) => linhas.push({ id: `${origem}-${destino}`, source: origem, target: destino, type: "smoothstep", label: rotulo, style: { stroke: "hsl(var(--primary))", strokeDasharray: tracejada ? "5 5" : undefined }, labelStyle: { fill: "hsl(var(--foreground))", fontSize: 11 }, markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--primary))" } });
    nos.push({ id: "inicio", type: "fluxo", position: { x: 0, y: Math.max(0, (diretas.length - 1) * 80) }, data: { tipo: "evento", titulo: rotuloGatilho(atual || ""), detalhe: GATILHOS.find((g) => g.valor === atual)?.tela } });
    diretas.forEach((r, i) => {
      const y = i * 170;
      nos.push({ id: r.id, type: "fluxo", position: { x: 330, y }, data: { tipo: "regra", titulo: r.nome, detalhe: r.condicoes && Object.keys(r.condicoes).length ? "Aplica somente se as condições forem atendidas" : r.descricao || undefined, prioridade: r.prioridade, inativa: !r.ativa, editar: () => onEditar(r) } });
      conectar("inicio", r.id, r.ativa ? undefined : "Inativa");
      const idFim = `fim-${r.id}`;
      nos.push({ id: idFim, type: "fluxo", position: { x: 660, y }, data: { tipo: "resultado", titulo: rotuloAcao(r.acao), detalhe: resultado(r), inativa: !r.ativa } });
      conectar(r.id, idFim);
    });
    if (origemContato) {
      const origem = origemContato;
      {
        const y = diretas.length * 170 + 80;
        nos.push({ id: "evento-contato", type: "fluxo", position: { x: 330, y }, data: { tipo: "evento", titulo: "Contato temporário criado", detalhe: "Também dispara as regras de criação de contato" } });
        conectar(`fim-${origem.id}`, "evento-contato", "Pode disparar", true);
        if (!secundarias.length) {
          nos.push({ id: "sem-regra-contato", type: "fluxo", position: { x: 660, y }, data: { tipo: "resultado", titulo: "Nenhuma regra para contato criado", detalhe: "A agenda não recebe uma tarefa nesta etapa. Um vínculo posterior pode ter suas próprias regras." } });
          conectar("evento-contato", "sem-regra-contato");
        }
        secundarias.forEach((r, i) => {
          const subY = y + i * 160;
          nos.push({ id: r.id, type: "fluxo", position: { x: 660, y: subY }, data: { tipo: "regra", titulo: r.nome, detalhe: r.descricao || undefined, prioridade: r.prioridade, inativa: !r.ativa, editar: () => onEditar(r) } });
          conectar("evento-contato", r.id, r.ativa ? undefined : "Inativa");
          nos.push({ id: `fim-${r.id}`, type: "fluxo", position: { x: 990, y: subY }, data: { tipo: "resultado", titulo: rotuloAcao(r.acao), detalhe: resultado(r), inativa: !r.ativa } });
          conectar(r.id, `fim-${r.id}`);
        });
      }
    }
    return { nodes: nos, edges: linhas };
  }, [atual, diretas, secundarias, origemContato, onEditar]);
  const relacionamentos = diretas.flatMap((a, i) => diretas.slice(i + 1).map((b) => ({ a, b, texto: relacaoEntre(a, b) })).filter((x) => x.texto));
  return (
    <div className="space-y-3 pt-3">
      <div className="flex flex-wrap items-center gap-3"><span className="text-sm font-medium">Começar por</span><Select value={atual} onValueChange={setGatilho}><SelectTrigger className="w-full sm:w-[320px]"><SelectValue placeholder="Escolha um acontecimento" /></SelectTrigger><SelectContent>{opcoes.map((v) => <SelectItem key={v} value={v}>{rotuloGatilho(v)}</SelectItem>)}</SelectContent></Select></div>
      <p className="text-xs text-muted-foreground">Cada caminho mostra uma regra e seu efeito. Caminhos paralelos compartilham o mesmo acontecimento; prioridade menor roda primeiro nas regras automáticas. Linha pontilhada indica um novo disparo possível.</p>
      {diretas.length ? <div className="h-[480px] w-full overflow-hidden rounded-md border bg-background" aria-label="Fluxo visual das regras da agenda"><ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.15 }} minZoom={0.25} maxZoom={1.5} nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} proOptions={{ hideAttribution: true }}><Background variant={BackgroundVariant.Dots} className="!text-border" /><Controls showInteractive={false} /></ReactFlow></div> : <p className="text-sm text-muted-foreground">Nenhuma regra cadastrada para este acontecimento.</p>}
      {relacionamentos.length > 0 && <div className="space-y-1 border-t pt-3"><p className="text-xs font-semibold uppercase text-muted-foreground">Relações entre regras deste fluxo</p>{relacionamentos.map(({ a, b, texto }) => <p key={`${a.id}-${b.id}`} className="flex items-center gap-1 text-xs"><ArrowRight className="h-3 w-3 shrink-0 text-primary" />{texto}</p>)}</div>}
      <p className="text-xs text-muted-foreground">Este desenho mostra as regras configuradas, não uma execução real. Regras de tela seguem o funcionamento da própria tela; condições, duplicidades e vínculos podem impedir uma ação.</p>
    </div>
  );
}
