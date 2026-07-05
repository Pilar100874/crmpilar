import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ReactFlow, Background, BackgroundVariant, Controls, MiniMap,
  addEdge, useEdgesState, useNodesState, Handle, Position,
  type Connection, type Edge, type Node, type NodeTypes, MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { supabase as supabaseTyped } from "@/integrations/supabase/client";
const supabase = supabaseTyped as any;
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Save, Play, Zap, Bell, MessageSquare, Mail, Smartphone, Webhook,
  GitBranch, MoonStar, FileText, TrendingUp, Timer, ScrollText, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const EVENTOS = [
  { key: "atraso", label: "Atrasos" },
  { key: "falta", label: "Faltas" },
  { key: "he_pendente", label: "Hora extra pendente" },
  { key: "atestado_pendente", label: "Atestado pendente" },
  { key: "bh_expirar", label: "Banco de horas expirando" },
  { key: "fraude", label: "Alerta de fraude" },
];

const BLOCOS = [
  { type: "trigger",         label: "Gatilho",        icon: Zap,          color: "bg-amber-100 text-amber-700 border-amber-300", grupo: "Início" },
  { type: "condicao",        label: "Condição",       icon: GitBranch,    color: "bg-orange-100 text-orange-700 border-orange-300", grupo: "Lógica" },
  { type: "quiet_hours",     label: "Quiet hours",    icon: MoonStar,     color: "bg-indigo-100 text-indigo-700 border-indigo-300", grupo: "Lógica" },
  { type: "delay",           label: "Aguardar",       icon: Timer,        color: "bg-slate-100 text-slate-700 border-slate-300", grupo: "Lógica" },
  { type: "template",        label: "Template",       icon: FileText,     color: "bg-teal-100 text-teal-700 border-teal-300", grupo: "Conteúdo" },
  { type: "canal_push",      label: "Push",           icon: Bell,         color: "bg-violet-100 text-violet-700 border-violet-300", grupo: "Canais" },
  { type: "canal_whatsapp",  label: "WhatsApp",       icon: MessageSquare,color: "bg-emerald-100 text-emerald-700 border-emerald-300", grupo: "Canais" },
  { type: "canal_sms",       label: "SMS",            icon: Smartphone,   color: "bg-cyan-100 text-cyan-700 border-cyan-300", grupo: "Canais" },
  { type: "canal_email",     label: "E-mail",         icon: Mail,         color: "bg-pink-100 text-pink-700 border-pink-300", grupo: "Canais" },
  { type: "canal_webhook",   label: "Webhook",        icon: Webhook,      color: "bg-gray-100 text-gray-700 border-gray-300", grupo: "Canais" },
  { type: "escalonamento",   label: "Escalonar",      icon: TrendingUp,   color: "bg-red-100 text-red-700 border-red-300", grupo: "Ações" },
  { type: "log",             label: "Log",            icon: ScrollText,   color: "bg-neutral-100 text-neutral-700 border-neutral-300", grupo: "Ações" },
];

const BLOCO_MAP = Object.fromEntries(BLOCOS.map(b => [b.type, b]));

function CustomNode({ data, selected }: any) {
  const b = BLOCO_MAP[data.type] || BLOCOS[0];
  const Icon = b.icon;
  return (
    <div className={cn("rounded-xl border-2 shadow-md bg-card min-w-[190px] max-w-[240px] transition-all", selected ? "ring-2 ring-primary border-primary" : "border-border hover:border-primary/40")}>
      <Handle type="target" position={Position.Top} className="!bg-primary !w-3 !h-3 !border-2 !border-background" />
      <div className={cn("px-3 py-2 rounded-t-lg border-b flex items-center gap-2", b.color)}>
        <Icon className="w-4 h-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">{b.label}</span>
      </div>
      <div className="px-3 py-2">
        <div className="text-sm font-medium truncate">{data.label || b.label}</div>
        {data.config?.evento_gatilho && <div className="text-xs text-muted-foreground truncate">Evento: {EVENTOS.find(e => e.key === data.config.evento_gatilho)?.label}</div>}
        {data.config?.mensagem && <div className="text-xs text-muted-foreground truncate">{data.config.mensagem}</div>}
        {data.config?.url && <div className="text-xs text-muted-foreground truncate">{data.config.url}</div>}
      </div>
      {data.type === "condicao" ? (
        <>
          <Handle type="source" id="sim" position={Position.Bottom} style={{ left: "30%" }} className="!bg-green-500 !w-3 !h-3 !border-2 !border-background" />
          <Handle type="source" id="nao" position={Position.Bottom} style={{ left: "70%" }} className="!bg-red-500 !w-3 !h-3 !border-2 !border-background" />
        </>
      ) : (
        <Handle type="source" position={Position.Bottom} className="!bg-primary !w-3 !h-3 !border-2 !border-background" />
      )}
    </div>
  );
}

const nodeTypes: NodeTypes = { custom: CustomNode as any };

export default function PontoNotificacaoBuilder() {
  const { id } = useParams();
  const nav = useNavigate();
  const [wf, setWf] = useState<any>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selected, setSelected] = useState<Node | null>(null);
  const [saving, setSaving] = useState(false);
  const rfWrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("ponto_notif_workflows").select("*").eq("id", id).maybeSingle();
      if (!data) { toast.error("Workflow não encontrado"); nav("/ponto/notificacoes"); return; }
      setWf(data);
      const flow = data.flow_data || {};
      setNodes((flow.nodes || []).map((n: any) => ({ ...n, type: "custom" })));
      setEdges((flow.edges || []).map((e: any) => ({ ...e, markerEnd: { type: MarkerType.ArrowClosed } })));
    })();
  }, [id]);

  const onConnect = useCallback((c: Connection) => {
    setEdges(eds => addEdge({ ...c, markerEnd: { type: MarkerType.ArrowClosed }, animated: true, label: c.sourceHandle || undefined }, eds));
  }, [setEdges]);

  function addBlock(type: string) {
    const b = BLOCO_MAP[type];
    const id = crypto.randomUUID();
    const pos = { x: 200 + Math.random() * 240, y: 200 + Math.random() * 200 };
    const cfgDefault: any = {};
    if (type === "trigger") cfgDefault.evento_gatilho = wf?.evento_gatilho || "falta";
    if (type === "quiet_hours") { cfgDefault.inicio = "22:00"; cfgDefault.fim = "07:00"; }
    if (type === "delay") cfgDefault.minutos = 5;
    if (type === "template") { cfgDefault.titulo = "Alerta do Ponto"; cfgDefault.mensagem = "Olá {funcionario}, evento em {data}. Ver: {link_aprovacao}"; }
    if (type === "condicao") { cfgDefault.campo = "severidade"; cfgDefault.operador = "="; cfgDefault.valor = "alta"; }
    if (type === "canal_webhook") cfgDefault.url = "";
    if (type.startsWith("canal_")) cfgDefault.destino = "funcionario";
    const node: Node = { id, type: "custom", position: pos, data: { type, label: b.label, config: cfgDefault } as any };
    setNodes(ns => [...ns, node]);
  }

  function updateNode(patch: any) {
    if (!selected) return;
    setNodes(ns => ns.map(n => n.id === selected.id ? { ...n, data: { ...n.data, ...patch, config: { ...(n.data as any).config, ...(patch.config || {}) } } } : n));
    setSelected(s => s ? { ...s, data: { ...s.data, ...patch, config: { ...(s.data as any).config, ...(patch.config || {}) } } as any } : s);
  }

  function deleteSelected() {
    if (!selected) return;
    setNodes(ns => ns.filter(n => n.id !== selected.id));
    setEdges(es => es.filter(e => e.source !== selected.id && e.target !== selected.id));
    setSelected(null);
  }

  async function salvar() {
    setSaving(true);
    const flow_data = { nodes, edges, viewport: { x: 0, y: 0, zoom: 1 } };
    const { error } = await supabase.from("ponto_notif_workflows").update({ flow_data, nome: wf.nome, ativo: wf.ativo, evento_gatilho: wf.evento_gatilho }).eq("id", id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Workflow salvo");
  }

  async function testar() {
    toast.info("Disparando execução de teste...");
    const { data, error } = await supabase.functions.invoke("ponto-notif-workflow-exec", {
      body: { workflow_id: id, dados: { severidade: "alta", data: new Date().toISOString().slice(0,10) }, forcar: true },
    });
    if (error) toast.error(error.message); else toast.success(`Execução ok — ${((data as any)?.resultados || []).length} disparos`);
  }

  const grupos = useMemo(() => {
    const g: Record<string, typeof BLOCOS> = {};
    BLOCOS.forEach(b => { (g[b.grupo] ||= []).push(b); });
    return g;
  }, []);

  if (!wf) return <div className="p-6">Carregando...</div>;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="border-b px-4 py-2 flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => nav("/ponto/notificacoes")}><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Button>
        <Input value={wf.nome} onChange={e => setWf({ ...wf, nome: e.target.value })} className="max-w-xs" />
        <Select value={wf.evento_gatilho} onValueChange={v => setWf({ ...wf, evento_gatilho: v })}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>{EVENTOS.map(e => <SelectItem key={e.key} value={e.key}>Gatilho: {e.label}</SelectItem>)}</SelectContent>
        </Select>
        <div className="flex items-center gap-2 ml-2">
          <Switch checked={wf.ativo} onCheckedChange={v => setWf({ ...wf, ativo: v })} />
          <span className="text-xs">{wf.ativo ? "Ativo" : "Inativo"}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={testar}><Play className="w-4 h-4 mr-1" /> Testar</Button>
          <Button size="sm" onClick={salvar} disabled={saving}><Save className="w-4 h-4 mr-1" /> {saving ? "Salvando..." : "Salvar"}</Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Library */}
        <div className="w-56 border-r overflow-y-auto p-3 space-y-3 bg-muted/20">
          {Object.entries(grupos).map(([g, items]) => (
            <div key={g}>
              <div className="text-[11px] font-semibold uppercase text-muted-foreground mb-1">{g}</div>
              <div className="space-y-1">
                {items.map(b => {
                  const Icon = b.icon;
                  return (
                    <button key={b.type} onClick={() => addBlock(b.type)}
                      className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded-md border text-left text-xs hover:shadow-sm transition-all", b.color)}>
                      <Icon className="w-3.5 h-3.5" /> {b.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Canvas */}
        <div className="flex-1 relative" ref={rfWrap}>
          <ReactFlow
            nodes={nodes} edges={edges}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, n) => setSelected(n)}
            onPaneClick={() => setSelected(null)}
            nodeTypes={nodeTypes}
            fitView
            defaultEdgeOptions={{ animated: true, style: { strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed } as any }}
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
            <Controls />
            <MiniMap pannable />
          </ReactFlow>
        </div>

        {/* Properties */}
        <div className="w-80 border-l overflow-y-auto bg-muted/10">
          {selected ? (
            <PropsPanel node={selected} onChange={updateNode} onDelete={deleteSelected} />
          ) : (
            <div className="p-4 text-sm text-muted-foreground">
              <div className="font-semibold mb-2">Como funciona</div>
              <ul className="list-disc pl-4 space-y-1">
                <li>Arraste blocos da esquerda para o canvas.</li>
                <li>O bloco <b>Gatilho</b> define quando o workflow dispara (evento de ponto).</li>
                <li>Conecte os blocos ligando a saída de um na entrada do próximo.</li>
                <li>Use <b>Condição</b> para bifurcar (sim/não), <b>Quiet hours</b> para bloquear horários e <b>Escalonar</b> para hierarquia.</li>
                <li>Variáveis nos templates: <code>{`{funcionario}`}</code>, <code>{`{data}`}</code>, <code>{`{link_aprovacao}`}</code>, <code>{`{severidade}`}</code>.</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PropsPanel({ node, onChange, onDelete }: { node: Node; onChange: (p: any) => void; onDelete: () => void }) {
  const data: any = node.data || {};
  const cfg = data.config || {};
  const type = data.type as string;
  const b = BLOCO_MAP[type];

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Badge variant="outline">{b?.label}</Badge>
          <div className="text-xs text-muted-foreground mt-1">ID {node.id.slice(0, 8)}</div>
        </div>
        <Button size="icon" variant="ghost" onClick={onDelete}><Trash2 className="w-4 h-4 text-destructive" /></Button>
      </div>
      <Separator />
      <div>
        <Label>Rótulo</Label>
        <Input value={data.label || ""} onChange={e => onChange({ label: e.target.value })} />
      </div>

      {type === "trigger" && (
        <div>
          <Label>Evento gatilho</Label>
          <Select value={cfg.evento_gatilho || "falta"} onValueChange={v => onChange({ config: { evento_gatilho: v } })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{EVENTOS.map(e => <SelectItem key={e.key} value={e.key}>{e.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}

      {type === "condicao" && (
        <>
          <div>
            <Label>Campo</Label>
            <Input value={cfg.campo || ""} onChange={e => onChange({ config: { campo: e.target.value } })} placeholder="severidade | quantidade | detalhe" />
          </div>
          <div>
            <Label>Operador</Label>
            <Select value={cfg.operador || "="} onValueChange={v => onChange({ config: { operador: v } })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="=">Igual</SelectItem>
                <SelectItem value="!=">Diferente</SelectItem>
                <SelectItem value=">">Maior que</SelectItem>
                <SelectItem value="<">Menor que</SelectItem>
                <SelectItem value="in">Está em (lista separada por vírgula)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Valor</Label>
            <Input value={cfg.valor || ""} onChange={e => onChange({ config: { valor: e.target.value } })} />
          </div>
          <div className="text-xs text-muted-foreground">Saída verde = sim, vermelha = não.</div>
        </>
      )}

      {type === "quiet_hours" && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Início</Label><Input type="time" value={cfg.inicio || "22:00"} onChange={e => onChange({ config: { inicio: e.target.value } })} /></div>
            <div><Label>Fim</Label><Input type="time" value={cfg.fim || "07:00"} onChange={e => onChange({ config: { fim: e.target.value } })} /></div>
          </div>
          <div className="text-xs text-muted-foreground">Se estiver dentro da janela, o fluxo para aqui (exceto quando forçado).</div>
        </>
      )}

      {type === "delay" && (
        <div>
          <Label>Minutos</Label>
          <Input type="number" value={cfg.minutos || 0} onChange={e => onChange({ config: { minutos: Number(e.target.value) } })} />
          <div className="text-xs text-muted-foreground">Cap de 25s por execução.</div>
        </div>
      )}

      {type === "template" && (
        <>
          <div><Label>Título</Label><Input value={cfg.titulo || ""} onChange={e => onChange({ config: { titulo: e.target.value } })} /></div>
          <div><Label>Mensagem</Label>
            <Textarea rows={5} value={cfg.mensagem || ""} onChange={e => onChange({ config: { mensagem: e.target.value } })} />
          </div>
          <div className="text-xs text-muted-foreground">Variáveis: {`{funcionario} {data} {link_aprovacao} {severidade} {detalhe} {quantidade}`}</div>
        </>
      )}

      {(type === "canal_push" || type === "canal_whatsapp" || type === "canal_sms" || type === "canal_email") && (
        <>
          <div>
            <Label>Destino</Label>
            <Select value={cfg.destino || "funcionario"} onValueChange={v => onChange({ config: { destino: v } })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="funcionario">Funcionário do evento</SelectItem>
                {type !== "canal_push" && <SelectItem value="numeros_fixos">Números fixos</SelectItem>}
                {type === "canal_email" && <SelectItem value="emails_fixos">E-mails fixos</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          {cfg.destino === "numeros_fixos" && (
            <div>
              <Label>Números (um por linha)</Label>
              <Textarea rows={3} value={(cfg.numeros || []).join("\n")} onChange={e => onChange({ config: { numeros: e.target.value.split("\n").map(s => s.trim()).filter(Boolean) } })} />
            </div>
          )}
          {cfg.destino === "emails_fixos" && (
            <div>
              <Label>E-mails (um por linha)</Label>
              <Textarea rows={3} value={(cfg.emails || []).join("\n")} onChange={e => onChange({ config: { emails: e.target.value.split("\n").map(s => s.trim()).filter(Boolean) } })} />
            </div>
          )}
          <div>
            <Label>Mensagem (opcional — sobrepõe Template)</Label>
            <Textarea rows={3} value={cfg.mensagem || ""} onChange={e => onChange({ config: { mensagem: e.target.value } })} />
          </div>
        </>
      )}

      {type === "canal_webhook" && (
        <div>
          <Label>URL</Label>
          <Input value={cfg.url || ""} onChange={e => onChange({ config: { url: e.target.value } })} placeholder="https://..." />
        </div>
      )}

      {type === "escalonamento" && (
        <div className="text-xs text-muted-foreground">Aciona a rotina hierárquica de escalonamento (`ponto-notificar-escalonar`) para o evento atual.</div>
      )}

      {type === "log" && (
        <div>
          <Label>Rótulo do log</Label>
          <Input value={cfg.rotulo || ""} onChange={e => onChange({ config: { rotulo: e.target.value } })} />
        </div>
      )}
    </div>
  );
}
