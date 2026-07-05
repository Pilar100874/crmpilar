import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ReactFlow, ReactFlowProvider, Background, BackgroundVariant, Controls, MiniMap,
  addEdge, useEdgesState, useNodesState, Handle, Position,
  type Connection, type Edge, type Node, type NodeTypes, MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { supabase as supabaseTyped } from "@/integrations/supabase/client";
const supabase = supabaseTyped as any;
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  ArrowLeft, Save, Play, Zap, Bell, MessageSquare, Mail, Smartphone, Webhook,
  GitBranch, MoonStar, FileText, TrendingUp, Timer, ScrollText, Trash2,
  MoreVertical, Copy, Pause, SkipForward, StickyNote, Plus, Download, Upload, Wand2, X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import SmartConnectMenu, { SmartBlockOption } from "@/components/flow/SmartConnectMenu";

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

// Regras de próximos blocos permitidos (evita conexões sem sentido)
const NEXT_ALLOWED: Record<string, string[]> = {
  trigger:        ["condicao", "quiet_hours", "delay", "template", "canal_push", "canal_whatsapp", "canal_sms", "canal_email", "canal_webhook", "escalonamento", "log"],
  condicao:       ["condicao", "quiet_hours", "delay", "template", "canal_push", "canal_whatsapp", "canal_sms", "canal_email", "canal_webhook", "escalonamento", "log"],
  quiet_hours:    ["condicao", "delay", "template", "canal_push", "canal_whatsapp", "canal_sms", "canal_email", "canal_webhook", "escalonamento", "log"],
  delay:          ["condicao", "template", "canal_push", "canal_whatsapp", "canal_sms", "canal_email", "canal_webhook", "escalonamento", "log"],
  template:       ["canal_push", "canal_whatsapp", "canal_sms", "canal_email", "canal_webhook", "delay", "escalonamento", "log"],
  canal_push:     ["delay", "canal_whatsapp", "canal_sms", "canal_email", "canal_webhook", "escalonamento", "log", "condicao"],
  canal_whatsapp: ["delay", "canal_push", "canal_sms", "canal_email", "canal_webhook", "escalonamento", "log", "condicao"],
  canal_sms:      ["delay", "canal_push", "canal_whatsapp", "canal_email", "canal_webhook", "escalonamento", "log", "condicao"],
  canal_email:    ["delay", "canal_push", "canal_whatsapp", "canal_sms", "canal_webhook", "escalonamento", "log", "condicao"],
  canal_webhook:  ["delay", "canal_push", "canal_whatsapp", "canal_sms", "canal_email", "escalonamento", "log", "condicao"],
  escalonamento:  ["log", "canal_push", "canal_whatsapp", "canal_sms", "canal_email", "delay"],
  log:            ["canal_push", "canal_whatsapp", "canal_sms", "canal_email", "canal_webhook", "delay", "condicao"],
};

function CustomNode({ id, data, selected }: any) {
  const b = BLOCO_MAP[data.type] || BLOCOS[0];
  const Icon = b.icon;
  const isBreakpoint = !!data.isBreakpoint;
  const isSkipped = !!data.isSkipped;
  const isHighlighted = !!data.isHighlighted;

  return (
    <div className={cn(
      "rounded-xl border-2 shadow-md bg-card min-w-[210px] max-w-[260px] transition-all relative group",
      selected && "ring-2 ring-primary border-primary",
      isBreakpoint && "border-orange-500 ring-2 ring-orange-400/40",
      isSkipped && "opacity-50",
      isHighlighted && "ring-4 ring-green-500/60 border-green-500 scale-[1.02]",
      !selected && !isBreakpoint && !isHighlighted && "border-border hover:border-primary/40"
    )}>
      <Handle type="target" position={Position.Top} className="!bg-primary !w-3 !h-3 !border-2 !border-background" />

      <div className={cn("px-3 py-2 rounded-t-lg border-b flex items-center gap-2", b.color)}>
        <Icon className="w-4 h-4" />
        <span className="text-xs font-semibold uppercase tracking-wide flex-1">{b.label}</span>
        {isBreakpoint && <Pause className="w-3 h-3" />}
        {isSkipped && <SkipForward className="w-3 h-3" />}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
            <button className="p-0.5 hover:bg-black/10 rounded opacity-60 group-hover:opacity-100">
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[1001]">
            <DropdownMenuItem onClick={() => data.onDuplicate?.(id)}><Copy className="w-3.5 h-3.5 mr-2" />Duplicar</DropdownMenuItem>
            <DropdownMenuItem onClick={() => data.onToggleBreakpoint?.(id)}>
              <Pause className="w-3.5 h-3.5 mr-2" />{isBreakpoint ? "Remover breakpoint" : "Pausar aqui"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => data.onToggleSkip?.(id)}>
              <SkipForward className="w-3.5 h-3.5 mr-2" />{isSkipped ? "Reativar bloco" : "Pular na execução"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => data.onAddNote?.(id)}><StickyNote className="w-3.5 h-3.5 mr-2" />{data.note ? "Editar nota" : "Adicionar nota"}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => data.onDelete?.(id)} className="text-destructive"><Trash2 className="w-3.5 h-3.5 mr-2" />Excluir</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="px-3 py-2">
        <div className="text-sm font-medium truncate">{data.label || b.label}</div>
        {data.config?.evento_gatilho && <div className="text-xs text-muted-foreground truncate">Evento: {EVENTOS.find(e => e.key === data.config.evento_gatilho)?.label}</div>}
        {data.config?.mensagem && <div className="text-xs text-muted-foreground truncate">{data.config.mensagem}</div>}
        {data.config?.url && <div className="text-xs text-muted-foreground truncate">{data.config.url}</div>}
        {data.note && <div className="text-[11px] mt-1 p-1.5 rounded bg-yellow-50 border border-yellow-200 text-yellow-900 truncate">📝 {data.note}</div>}
      </div>

      {data.type === "condicao" ? (
        <>
          <div className="flex justify-around pb-1 text-[10px] font-semibold">
            <span className="text-green-600">SIM</span>
            <span className="text-red-600">NÃO</span>
          </div>
          <Handle type="source" id="sim" position={Position.Bottom} style={{ left: "30%" }} className="!bg-green-500 !w-3 !h-3 !border-2 !border-background" />
          <Handle type="source" id="nao" position={Position.Bottom} style={{ left: "70%" }} className="!bg-red-500 !w-3 !h-3 !border-2 !border-background" />
          <button onClick={(e) => { e.stopPropagation(); data.onAddNext?.(id, "sim", e.clientX, e.clientY); }}
            className="absolute -bottom-3 left-[30%] -translate-x-1/2 w-5 h-5 rounded-full bg-green-500 text-white shadow flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-110 transition"><Plus className="w-3 h-3" /></button>
          <button onClick={(e) => { e.stopPropagation(); data.onAddNext?.(id, "nao", e.clientX, e.clientY); }}
            className="absolute -bottom-3 left-[70%] -translate-x-1/2 w-5 h-5 rounded-full bg-red-500 text-white shadow flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-110 transition"><Plus className="w-3 h-3" /></button>
        </>
      ) : (
        <>
          <Handle type="source" position={Position.Bottom} className="!bg-primary !w-3 !h-3 !border-2 !border-background" />
          <button onClick={(e) => { e.stopPropagation(); data.onAddNext?.(id, null, e.clientX, e.clientY); }}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-primary text-primary-foreground shadow flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-110 transition"><Plus className="w-3 h-3" /></button>
        </>
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
  const [smartMenu, setSmartMenu] = useState<{ x: number; y: number; fromId: string; handle: string | null } | null>(null);
  const [simOpen, setSimOpen] = useState(false);
  const [simData, setSimData] = useState('{\n  "severidade": "alta",\n  "detalhe": "teste",\n  "quantidade": 1\n}');
  const [simRunning, setSimRunning] = useState(false);
  const [simLog, setSimLog] = useState<any[]>([]);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("ponto_notif_workflows").select("*").eq("id", id).maybeSingle();
      if (!data) { toast.error("Workflow não encontrado"); nav("/ponto/notificacoes"); return; }
      setWf(data);
      const flow = data.flow_data || {};
      setNodes((flow.nodes || []).map((n: any) => ({ ...n, type: "custom" })));
      setEdges((flow.edges || []).map((e: any) => ({ ...e, markerEnd: { type: MarkerType.ArrowClosed } })));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ============ Handlers passados para os nodes ============
  const onDuplicate = useCallback((nodeId: string) => {
    setNodes(ns => {
      const orig = ns.find(n => n.id === nodeId); if (!orig) return ns;
      const copy: Node = { ...orig, id: crypto.randomUUID(), position: { x: (orig.position.x || 0) + 40, y: (orig.position.y || 0) + 40 }, data: { ...(orig.data as any) } };
      return [...ns, copy];
    });
    toast.success("Bloco duplicado");
  }, [setNodes]);

  const onToggleBreakpoint = useCallback((nodeId: string) => {
    setNodes(ns => ns.map(n => n.id === nodeId ? { ...n, data: { ...n.data, isBreakpoint: !(n.data as any).isBreakpoint } } : n));
  }, [setNodes]);

  const onToggleSkip = useCallback((nodeId: string) => {
    setNodes(ns => ns.map(n => n.id === nodeId ? { ...n, data: { ...n.data, isSkipped: !(n.data as any).isSkipped } } : n));
  }, [setNodes]);

  const onDeleteNode = useCallback((nodeId: string) => {
    setNodes(ns => ns.filter(n => n.id !== nodeId));
    setEdges(es => es.filter(e => e.source !== nodeId && e.target !== nodeId));
    setSelected(s => s?.id === nodeId ? null : s);
  }, [setNodes, setEdges]);

  const onAddNote = useCallback((nodeId: string) => {
    setNodes(ns => {
      const n = ns.find(x => x.id === nodeId);
      setNoteText((n?.data as any)?.note || "");
      return ns;
    });
    setNoteFor(nodeId);
  }, [setNodes]);

  const onAddNext = useCallback((fromId: string, handle: string | null, x: number, y: number) => {
    setSmartMenu({ x, y, fromId, handle });
  }, []);

  // Aplica callbacks a todos os nodes sempre que mudam
  const enhancedNodes = useMemo(() => nodes.map(n => ({
    ...n,
    data: { ...n.data, onDuplicate, onToggleBreakpoint, onToggleSkip, onDelete: onDeleteNode, onAddNote, onAddNext } as any,
  })), [nodes, onDuplicate, onToggleBreakpoint, onToggleSkip, onDeleteNode, onAddNote, onAddNext]);

  // ============ Conexões ============
  const onConnect = useCallback((c: Connection) => {
    const src = nodes.find(n => n.id === c.source);
    const tgt = nodes.find(n => n.id === c.target);
    if (src && tgt) {
      const allowed = NEXT_ALLOWED[(src.data as any).type] || [];
      if (allowed.length && !allowed.includes((tgt.data as any).type)) {
        toast.error(`"${BLOCO_MAP[(tgt.data as any).type]?.label}" não pode vir depois de "${BLOCO_MAP[(src.data as any).type]?.label}"`);
        return;
      }
    }
    setEdges(eds => addEdge({ ...c, markerEnd: { type: MarkerType.ArrowClosed }, animated: true, label: c.sourceHandle || undefined }, eds));
  }, [nodes, setEdges]);

  function addBlockAt(type: string, pos?: { x: number; y: number }, connectFrom?: { id: string; handle: string | null }) {
    const b = BLOCO_MAP[type];
    const newId = crypto.randomUUID();
    const position = pos || { x: 200 + Math.random() * 240, y: 200 + Math.random() * 200 };
    const cfgDefault: any = {};
    if (type === "trigger") cfgDefault.evento_gatilho = wf?.evento_gatilho || "falta";
    if (type === "quiet_hours") { cfgDefault.inicio = "22:00"; cfgDefault.fim = "07:00"; }
    if (type === "delay") cfgDefault.minutos = 5;
    if (type === "template") { cfgDefault.titulo = "Alerta do Ponto"; cfgDefault.mensagem = "Olá {funcionario}, evento em {data}. Ver: {link_aprovacao}"; }
    if (type === "condicao") { cfgDefault.campo = "severidade"; cfgDefault.operador = "="; cfgDefault.valor = "alta"; }
    if (type === "canal_webhook") cfgDefault.url = "";
    if (type.startsWith("canal_")) cfgDefault.destino = "funcionario";
    const node: Node = { id: newId, type: "custom", position, data: { type, label: b.label, config: cfgDefault } as any };
    setNodes(ns => [...ns, node]);
    if (connectFrom) {
      setEdges(es => [...es, {
        id: `e-${connectFrom.id}-${newId}`, source: connectFrom.id, target: newId,
        sourceHandle: connectFrom.handle || undefined, label: connectFrom.handle || undefined,
        markerEnd: { type: MarkerType.ArrowClosed }, animated: true,
      } as Edge]);
    }
  }

  function onSmartPick(type: string) {
    if (!smartMenu) return;
    const src = nodes.find(n => n.id === smartMenu.fromId);
    const basePos = src ? { x: src.position.x, y: (src.position.y || 0) + 180 } : undefined;
    addBlockAt(type, basePos, { id: smartMenu.fromId, handle: smartMenu.handle });
    setSmartMenu(null);
  }

  const smartOptions: SmartBlockOption[] = useMemo(() => {
    if (!smartMenu) return [];
    const src = nodes.find(n => n.id === smartMenu.fromId);
    const allowed = src ? (NEXT_ALLOWED[(src.data as any).type] || []) : [];
    return BLOCOS.filter(b => allowed.includes(b.type)).map(b => ({
      type: b.type, label: b.label, category: b.grupo,
    }));
  }, [smartMenu, nodes]);

  function updateNode(patch: any) {
    if (!selected) return;
    setNodes(ns => ns.map(n => n.id === selected.id ? { ...n, data: { ...n.data, ...patch, config: { ...(n.data as any).config, ...(patch.config || {}) } } } : n));
    setSelected(s => s ? { ...s, data: { ...s.data, ...patch, config: { ...(s.data as any).config, ...(patch.config || {}) } } as any } : s);
  }

  async function salvar() {
    setSaving(true);
    // Limpar callbacks antes de salvar
    const cleanNodes = nodes.map(n => {
      const { onDuplicate: _a, onToggleBreakpoint: _b, onToggleSkip: _c, onDelete: _d, onAddNote: _e, onAddNext: _f, isHighlighted: _h, ...rest } = n.data as any;
      return { ...n, data: rest };
    });
    const flow_data = { nodes: cleanNodes, edges, viewport: { x: 0, y: 0, zoom: 1 } };
    const { error } = await supabase.from("ponto_notif_workflows").update({ flow_data, nome: wf.nome, ativo: wf.ativo, evento_gatilho: wf.evento_gatilho }).eq("id", id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Workflow salvo");
  }

  // ============ Simulação passo a passo ============
  async function simularStepByStep() {
    setSimRunning(true); setSimLog([]);
    let dados: any = {};
    try { dados = JSON.parse(simData || "{}"); } catch { toast.error("JSON inválido"); setSimRunning(false); return; }

    const byId: Record<string, Node> = Object.fromEntries(nodes.map(n => [n.id, n]));
    const targets = new Set(edges.map(e => e.target));
    const starts = nodes.filter(n => (n.data as any).type === "trigger" || !targets.has(n.id));
    const visitados = new Set<string>();
    const logs: any[] = [];

    async function highlight(nodeId: string) {
      setNodes(ns => ns.map(n => ({ ...n, data: { ...n.data, isHighlighted: n.id === nodeId } })));
      await new Promise(r => setTimeout(r, 600));
    }

    async function step(nodeId: string) {
      if (visitados.has(nodeId)) return;
      visitados.add(nodeId);
      const n = byId[nodeId]; if (!n) return;
      const d: any = n.data;

      if (d.isSkipped) {
        logs.push({ node: nodeId, tipo: d.type, status: "pulado" });
        setSimLog([...logs]);
      } else {
        await highlight(nodeId);
        logs.push({ node: nodeId, tipo: d.type, status: "executado", config: d.config });
        setSimLog([...logs]);

        if (d.isBreakpoint) {
          logs.push({ node: nodeId, status: "⏸ pausado no breakpoint" });
          setSimLog([...logs]);
          return;
        }
      }

      // Bifurcação da condição na simulação
      if (d.type === "condicao") {
        const cfg = d.config || {};
        const v = dados[cfg.campo];
        let ok = false;
        if (cfg.operador === "=") ok = String(v) === String(cfg.valor);
        else if (cfg.operador === "!=") ok = String(v) !== String(cfg.valor);
        else if (cfg.operador === ">") ok = Number(v) > Number(cfg.valor);
        else if (cfg.operador === "<") ok = Number(v) < Number(cfg.valor);
        else if (cfg.operador === "in") ok = String(cfg.valor || "").split(",").map(s => s.trim()).includes(String(v));
        const handle = ok ? "sim" : "nao";
        logs.push({ node: nodeId, status: `condição → ${handle.toUpperCase()}` });
        setSimLog([...logs]);
        for (const e of edges.filter(e => e.source === nodeId && (e.sourceHandle === handle || e.label === handle))) await step(e.target);
        return;
      }

      for (const e of edges.filter(e => e.source === nodeId)) await step(e.target);
    }

    for (const s of starts) await step(s.id);
    // limpa highlight
    setNodes(ns => ns.map(n => ({ ...n, data: { ...n.data, isHighlighted: false } })));
    setSimRunning(false);
  }

  async function testarReal() {
    toast.info("Disparando execução real...");
    const { data, error } = await supabase.functions.invoke("ponto-notif-workflow-exec", {
      body: { workflow_id: id, dados: JSON.parse(simData || "{}"), forcar: true },
    });
    if (error) toast.error(error.message); else toast.success(`Execução ok — ${((data as any)?.resultados || []).length} disparos`);
  }

  function exportar() {
    const clean = nodes.map(n => {
      const { onDuplicate: _a, onToggleBreakpoint: _b, onToggleSkip: _c, onDelete: _d, onAddNote: _e, onAddNext: _f, ...rest } = n.data as any;
      return { ...n, data: rest };
    });
    const blob = new Blob([JSON.stringify({ nome: wf.nome, evento_gatilho: wf.evento_gatilho, nodes: clean, edges }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `${(wf.nome || "workflow").replace(/\W+/g, "_")}.json`; a.click();
  }

  function importar(file: File) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const j = JSON.parse(String(r.result));
        setNodes((j.nodes || []).map((n: any) => ({ ...n, type: "custom" })));
        setEdges((j.edges || []).map((e: any) => ({ ...e, markerEnd: { type: MarkerType.ArrowClosed } })));
        toast.success("Workflow importado");
      } catch { toast.error("Arquivo inválido"); }
    };
    r.readAsText(file);
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
          <Button variant="outline" size="sm" onClick={exportar}><Download className="w-4 h-4 mr-1" /> Exportar</Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><Upload className="w-4 h-4 mr-1" /> Importar</Button>
          <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={e => e.target.files?.[0] && importar(e.target.files[0])} />
          <Button variant="outline" size="sm" onClick={() => setSimOpen(true)}><Wand2 className="w-4 h-4 mr-1" /> Simular</Button>
          <Button variant="outline" size="sm" onClick={testarReal}><Play className="w-4 h-4 mr-1" /> Disparar real</Button>
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
                    <button key={b.type} onClick={() => addBlockAt(b.type)}
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
        <div className="flex-1 relative">
          <ReactFlow
            nodes={enhancedNodes} edges={edges}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, n) => setSelected(n)}
            onPaneClick={() => { setSelected(null); setSmartMenu(null); }}
            nodeTypes={nodeTypes}
            fitView
            defaultEdgeOptions={{ animated: true, style: { strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed } as any }}
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
            <Controls />
            <MiniMap pannable />
          </ReactFlow>

          {smartMenu && (
            <SmartConnectMenu x={smartMenu.x} y={smartMenu.y}
              title={smartMenu.handle ? `Próximo bloco (${smartMenu.handle.toUpperCase()})` : "Escolha o próximo bloco"}
              blocks={smartOptions} onPick={onSmartPick} onClose={() => setSmartMenu(null)} />
          )}
        </div>

        {/* Properties */}
        <div className="w-80 border-l overflow-y-auto bg-muted/10">
          {selected ? (
            <PropsPanel node={enhancedNodes.find(n => n.id === selected.id) || selected} onChange={updateNode}
              onDelete={() => onDeleteNode(selected.id)}
              onDuplicate={() => onDuplicate(selected.id)}
              onToggleBreakpoint={() => onToggleBreakpoint(selected.id)}
              onToggleSkip={() => onToggleSkip(selected.id)} />
          ) : (
            <div className="p-4 text-sm text-muted-foreground">
              <div className="font-semibold mb-2">Como funciona</div>
              <ul className="list-disc pl-4 space-y-1.5">
                <li>Passe o mouse sobre um bloco e clique no <b>+</b> abaixo para escolher o próximo bloco permitido.</li>
                <li>Clique no <b>⋮</b> do bloco para: duplicar, pausar (breakpoint), pular na execução, adicionar nota ou excluir.</li>
                <li>Use <b>Simular</b> para rodar o fluxo passo a passo com dados de teste (destaca cada bloco em verde).</li>
                <li>Use <b>Disparar real</b> para executar o workflow contra os canais reais (Push/WhatsApp/SMS/E-mail).</li>
                <li>Variáveis nos templates: <code>{`{funcionario}`}</code>, <code>{`{data}`}</code>, <code>{`{link_aprovacao}`}</code>, <code>{`{severidade}`}</code>.</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Nota dialog */}
      <Dialog open={!!noteFor} onOpenChange={(v) => !v && setNoteFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nota do bloco</DialogTitle></DialogHeader>
          <Textarea rows={5} value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Anotação livre visível no bloco..." />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteFor(null)}>Cancelar</Button>
            <Button onClick={() => {
              setNodes(ns => ns.map(n => n.id === noteFor ? { ...n, data: { ...n.data, note: noteText } } : n));
              setNoteFor(null);
            }}>Salvar nota</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Simulador */}
      <Dialog open={simOpen} onOpenChange={setSimOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Wand2 className="w-4 h-4" /> Simulador do workflow</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Dados de entrada (JSON)</Label>
              <Textarea rows={12} value={simData} onChange={e => setSimData(e.target.value)} className="font-mono text-xs" />
              <div className="text-[11px] text-muted-foreground mt-1">Campos usados por Condições ({`{severidade}`}, {`{detalhe}`}...) e templates.</div>
            </div>
            <div>
              <Label>Execução</Label>
              <div className="border rounded-md p-2 h-[250px] overflow-y-auto text-xs bg-muted/30 space-y-1">
                {simLog.length === 0 && <div className="text-muted-foreground">Clique em "Simular" para rodar passo a passo.</div>}
                {simLog.map((l, i) => (
                  <div key={i} className={cn("flex items-start gap-2 py-0.5",
                    l.status === "pulado" && "opacity-60",
                    String(l.status).includes("pausado") && "text-orange-600 font-semibold")}>
                    <Badge variant="outline" className="text-[10px]">{l.tipo || "-"}</Badge>
                    <span>{l.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSimLog([]); setNodes(ns => ns.map(n => ({ ...n, data: { ...n.data, isHighlighted: false } }))); }}>
              <X className="w-4 h-4 mr-1" /> Limpar
            </Button>
            <Button onClick={simularStepByStep} disabled={simRunning}>
              <Play className="w-4 h-4 mr-1" /> {simRunning ? "Simulando..." : "Simular passo a passo"}
            </Button>
            <Button variant="default" onClick={testarReal}>
              <Play className="w-4 h-4 mr-1" /> Disparar real
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PropsPanel({ node, onChange, onDelete, onDuplicate, onToggleBreakpoint, onToggleSkip }: {
  node: Node; onChange: (p: any) => void; onDelete: () => void; onDuplicate: () => void; onToggleBreakpoint: () => void; onToggleSkip: () => void;
}) {
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
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" title="Duplicar" onClick={onDuplicate}><Copy className="w-4 h-4" /></Button>
          <Button size="icon" variant="ghost" title={data.isBreakpoint ? "Remover breakpoint" : "Pausar aqui"} onClick={onToggleBreakpoint}>
            <Pause className={cn("w-4 h-4", data.isBreakpoint && "text-orange-500")} />
          </Button>
          <Button size="icon" variant="ghost" title={data.isSkipped ? "Reativar" : "Pular"} onClick={onToggleSkip}>
            <SkipForward className={cn("w-4 h-4", data.isSkipped && "text-muted-foreground")} />
          </Button>
          <Button size="icon" variant="ghost" title="Excluir" onClick={onDelete}><Trash2 className="w-4 h-4 text-destructive" /></Button>
        </div>
      </div>
      {(data.isBreakpoint || data.isSkipped) && (
        <div className="flex gap-1">
          {data.isBreakpoint && <Badge className="bg-orange-500">⏸ Breakpoint</Badge>}
          {data.isSkipped && <Badge variant="outline">↷ Pulado</Badge>}
        </div>
      )}
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
