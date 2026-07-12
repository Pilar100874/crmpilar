import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
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
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import {
  Save, Play, Zap, Bell, MessageSquare, Mail, Smartphone, Webhook,
  GitBranch, MoonStar, FileText, TrendingUp, Timer, ScrollText, Trash2,
  MoreVertical, Copy, Pause, SkipForward, StickyNote, Plus, Download, Upload, Wand2, X,
  FolderOpen, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import SmartConnectMenu, { SmartBlockOption } from "@/components/flow/SmartConnectMenu";
import { WorkflowBuilderLayout } from "@/components/workflow/WorkflowBuilderLayout";
import { FloatingAddBlockButton } from "@/components/workflow/FloatingAddBlockButton";
import { getWorkflowBlockCardClass } from "@/components/workflow/workflowBlockStyle";
import { boxSelectionProps } from "@/lib/flowSelection";

// ============================================================
// Domínio — Ponto Notificação
// ============================================================
const EVENTOS = [
  { key: "atraso", label: "Atrasos" },
  { key: "falta", label: "Faltas" },
  { key: "he_pendente", label: "Hora extra pendente" },
  { key: "atestado_pendente", label: "Atestado pendente" },
  { key: "bh_expirar", label: "Banco de horas expirando" },
  { key: "fraude", label: "Alerta de fraude" },
];

type BlocoDef = { type: string; label: string; icon: any; grupo: string; desc?: string };
const BLOCOS: BlocoDef[] = [
  { type: "trigger",         label: "Gatilho",       icon: Zap,           grupo: "Início",   desc: "Evento inicial do ponto" },
  { type: "condicao",        label: "Condição",      icon: GitBranch,     grupo: "Lógica",   desc: "SIM / NÃO baseado em campo" },
  { type: "quiet_hours",     label: "Quiet hours",   icon: MoonStar,      grupo: "Lógica",   desc: "Não perturbe em horários" },
  { type: "delay",           label: "Aguardar",      icon: Timer,         grupo: "Lógica",   desc: "Pausa em minutos" },
  { type: "template",        label: "Template",      icon: FileText,      grupo: "Conteúdo", desc: "Título + mensagem base" },
  { type: "canal_push",      label: "Push",          icon: Bell,          grupo: "Canais",   desc: "Notificação no app" },
  { type: "canal_whatsapp",  label: "WhatsApp",      icon: MessageSquare, grupo: "Canais",   desc: "Mensagem no WhatsApp" },
  { type: "canal_sms",       label: "SMS",           icon: Smartphone,    grupo: "Canais",   desc: "Mensagem SMS" },
  { type: "canal_email",     label: "E-mail",        icon: Mail,          grupo: "Canais",   desc: "Envio de e-mail" },
  { type: "canal_webhook",   label: "Webhook",       icon: Webhook,       grupo: "Canais",   desc: "POST para uma URL" },
  { type: "escalonamento",   label: "Escalonar",     icon: TrendingUp,    grupo: "Ações",    desc: "Aciona hierarquia" },
  { type: "log",             label: "Log",           icon: ScrollText,    grupo: "Ações",    desc: "Registra passagem" },
];
const BLOCO_MAP: Record<string, BlocoDef> = Object.fromEntries(BLOCOS.map(b => [b.type, b]));

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

// Tipos com múltiplas saídas (só condicao usa handles nomeados)
const MULTI_OUTPUT = new Set<string>(["condicao"]);

// ============================================================
// Node visual — mesmo padrão do Bot
// ============================================================
type NodeCallbacks = {
  onDuplicate?: (id: string) => void;
  onToggleBreakpoint?: (id: string) => void;
  onToggleSkip?: (id: string) => void;
  onDelete?: (id: string) => void;
  onAddNote?: (id: string) => void;
  onAddNext?: (id: string, handle: string | null, x: number, y: number) => void;
};
const NodeCallbacksContext = createContext<NodeCallbacks>({});

function CustomNode({ id, data, selected }: any) {
  const b = BLOCO_MAP[data.type] || BLOCOS[0];
  const Icon = b.icon;
  const isBreakpoint = !!data.isBreakpoint;
  const isSkipped = !!data.isSkipped;
  const isHighlighted = !!data.isHighlighted;
  const isCondicao = data.type === "condicao";
  const isTrigger = data.type === "trigger";
  const cbs = useContext(NodeCallbacksContext);

  return (
    <Card className={cn(getWorkflowBlockCardClass({ selected, isBreakpoint, isSkipped, isHighlighted, size: "default" }), "relative group min-w-[220px]")}>
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Top}
          className="!bg-primary !w-3 !h-3 !border-2 !border-background"
        />
      )}

      <div className="p-3">
        <div className="flex items-start gap-2 mb-2">
          <div className="p-1.5 rounded-md bg-primary/10 border border-primary/20 shrink-0">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm text-foreground truncate">{data.label || b.label}</span>
              {isBreakpoint && <Pause className="w-3 h-3 text-orange-500 shrink-0" />}
              {isSkipped && <SkipForward className="w-3 h-3 text-muted-foreground shrink-0" />}
            </div>
            <p className="text-[11px] text-muted-foreground truncate">{b.desc || b.label}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
              <button className="p-1 hover:bg-muted rounded transition-colors shrink-0">
                <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[1001]">
              <DropdownMenuItem onClick={() => cbs.onDuplicate?.(id)}><Copy className="w-3.5 h-3.5 mr-2" />Duplicar</DropdownMenuItem>
              <DropdownMenuItem onClick={() => cbs.onToggleBreakpoint?.(id)}>
                <Pause className="w-3.5 h-3.5 mr-2" />{isBreakpoint ? "Remover breakpoint" : "Pausar aqui"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => cbs.onToggleSkip?.(id)}>
                <SkipForward className="w-3.5 h-3.5 mr-2" />{isSkipped ? "Reativar bloco" : "Pular na execução"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => cbs.onAddNote?.(id)}><StickyNote className="w-3.5 h-3.5 mr-2" />{data.note ? "Editar nota" : "Adicionar nota"}</DropdownMenuItem>
              {!isTrigger && <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => cbs.onDelete?.(id)} className="text-destructive"><Trash2 className="w-3.5 h-3.5 mr-2" />Excluir</DropdownMenuItem>
              </>}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {(data.config?.evento_gatilho || data.config?.mensagem || data.config?.url || data.config?.minutos != null || data.config?.titulo) && (
          <div className="space-y-0.5 mt-1 border-t border-border pt-2">
            {data.config?.evento_gatilho && <div className="text-[11px] text-muted-foreground truncate">📌 {EVENTOS.find(e => e.key === data.config.evento_gatilho)?.label}</div>}
            {data.config?.titulo && <div className="text-[11px] text-foreground font-medium truncate">{data.config.titulo}</div>}
            {data.config?.mensagem && <div className="text-[11px] text-muted-foreground line-clamp-2">{data.config.mensagem}</div>}
            {data.config?.url && <div className="text-[11px] text-muted-foreground truncate">🔗 {data.config.url}</div>}
            {data.type === "delay" && data.config?.minutos != null && <div className="text-[11px] text-muted-foreground">⏱ {data.config.minutos} min</div>}
            {data.type === "quiet_hours" && (data.config?.inicio || data.config?.fim) && <div className="text-[11px] text-muted-foreground">🌙 {data.config?.inicio || "--"} → {data.config?.fim || "--"}</div>}
          </div>
        )}

        {data.note && (
          <div className="mt-2 pt-2 border-t border-border text-[11px] text-muted-foreground whitespace-pre-wrap">
            📝 {data.note}
          </div>
        )}
      </div>

      {isCondicao ? (
        <>
          <Handle type="source" id="sim" position={Position.Bottom} className="!bg-green-500 !w-3 !h-3 !border-2 !border-background" style={{ left: "35%" }} />
          <div className="absolute bottom-0 left-[35%] -translate-x-1/2 translate-y-full mt-1 text-[10px] font-semibold text-green-600">SIM</div>
          <Handle type="source" id="nao" position={Position.Bottom} className="!bg-red-500 !w-3 !h-3 !border-2 !border-background" style={{ left: "65%" }} />
          <div className="absolute bottom-0 left-[65%] -translate-x-1/2 translate-y-full mt-1 text-[10px] font-semibold text-red-600">NÃO</div>
          <button onClick={(e) => { e.stopPropagation(); cbs.onAddNext?.(id, "sim", e.clientX, e.clientY); }}
            className="absolute -bottom-8 left-[35%] -translate-x-1/2 w-5 h-5 rounded-full bg-green-500 text-white shadow flex items-center justify-center opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto hover:scale-110 transition"><Plus className="w-3 h-3" /></button>
          <button onClick={(e) => { e.stopPropagation(); cbs.onAddNext?.(id, "nao", e.clientX, e.clientY); }}
            className="absolute -bottom-8 left-[65%] -translate-x-1/2 w-5 h-5 rounded-full bg-red-500 text-white shadow flex items-center justify-center opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto hover:scale-110 transition"><Plus className="w-3 h-3" /></button>
        </>
      ) : (
        <>
          <Handle type="source" position={Position.Bottom} className="!bg-primary !w-3 !h-3 !border-2 !border-background" />
          <button onClick={(e) => { e.stopPropagation(); cbs.onAddNext?.(id, null, e.clientX, e.clientY); }}
            className="absolute -bottom-7 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-primary text-primary-foreground shadow flex items-center justify-center opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto hover:scale-110 transition"><Plus className="w-3 h-3" /></button>
        </>
      )}
    </Card>
  );
}

const nodeTypes: NodeTypes = { custom: CustomNode as any };

function stripCallbacks(data: any) {
  const { onDuplicate: _a, onToggleBreakpoint: _b, onToggleSkip: _c, onDelete: _d, onAddNote: _e, onAddNext: _f, isHighlighted: _h, ...rest } = data || {};
  return rest;
}

// ============================================================
// Página
// ============================================================
export default function PontoNotificacaoBuilder() {
  return (
    <ReactFlowProvider>
      <Builder />
    </ReactFlowProvider>
  );
}

function Builder() {
  const { id } = useParams();
  const nav = useNavigate();
  const [wf, setWf] = useState<any>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selected, setSelected] = useState<Node | null>(null);
  const [saving, setSaving] = useState(false);
  const [simOpen, setSimOpen] = useState(false);
  const [simData, setSimData] = useState('{\n  "severidade": "alta",\n  "detalhe": "teste",\n  "quantidade": 1\n}');
  const [simRunning, setSimRunning] = useState(false);
  const [simLog, setSimLog] = useState<any[]>([]);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [rfInstance, setRfInstance] = useState<any>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isLibExpanded, setIsLibExpanded] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const [openCategories, setOpenCategories] = useState<string[]>(["Início", "Lógica", "Conteúdo", "Canais", "Ações"]);
  const [dirty, setDirty] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; nodeId: string | null }>({ open: false, nodeId: null });
  const [smartMenu, setSmartMenu] = useState<{ x: number; y: number; flowX?: number; flowY?: number; fromId: string; handle: string | null; handleType: "source" | "target" } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const initialHashRef = useRef<string>("");
  const connectStartRef = useRef<{ nodeId: string | null; handleId: string | null; handleType: "source" | "target" } | null>(null);

  // ============ Carrega ============
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("ponto_notif_workflows").select("*").eq("id", id).maybeSingle();
      if (!data) { toast.error("Workflow não encontrado"); nav("/ponto/notificacoes"); return; }
      setWf(data);
      const flow = data.flow_data || {};
      const loadedNodes = (flow.nodes || []).map((n: any) => ({ ...n, type: "custom" }));
      const loadedEdges = (flow.edges || []).map((e: any) => ({ ...e }));
      setNodes(loadedNodes);
      setEdges(loadedEdges);
      initialHashRef.current = JSON.stringify({ n: loadedNodes.map((n: any) => ({ ...n, data: stripCallbacks(n.data) })), e: loadedEdges, nome: data.nome, evento: data.evento_gatilho, ativo: data.ativo });
      setDirty(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!wf) return;
    const cur = JSON.stringify({
      n: nodes.map(n => ({ ...n, data: stripCallbacks(n.data) })),
      e: edges,
      nome: wf.nome, evento: wf.evento_gatilho, ativo: wf.ativo,
    });
    setDirty(cur !== initialHashRef.current);
  }, [nodes, edges, wf]);

  // ============ Node ops ============
  const onDuplicate = useCallback((nodeId: string) => {
    setNodes(ns => {
      const orig = ns.find(n => n.id === nodeId); if (!orig) return ns;
      if ((orig.data as any).type === "trigger") { toast.error("Gatilho não pode ser duplicado"); return ns; }
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

  const isTrigger = useCallback((nodeId: string | null) => {
    if (!nodeId) return false;
    const n = nodes.find(x => x.id === nodeId);
    return (n?.data as any)?.type === "trigger";
  }, [nodes]);

  const onDeleteNode = useCallback((nodeId: string) => {
    if (isTrigger(nodeId)) { toast.error("O bloco Gatilho não pode ser excluído."); return; }
    setDeleteConfirm({ open: true, nodeId });
  }, [isTrigger]);

  const confirmDeleteNode = useCallback(() => {
    const nodeId = deleteConfirm.nodeId; if (!nodeId) return;
    setNodes(ns => ns.filter(n => n.id !== nodeId));
    setEdges(es => es.filter(e => e.source !== nodeId && e.target !== nodeId));
    setSelected(s => s?.id === nodeId ? null : s);
    setDeleteConfirm({ open: false, nodeId: null });
    toast.success("Bloco excluído");
  }, [deleteConfirm.nodeId, setNodes, setEdges]);

  const onAddNote = useCallback((nodeId: string) => {
    const n = nodes.find(x => x.id === nodeId);
    setNoteText((n?.data as any)?.note || "");
    setNoteFor(nodeId);
  }, [nodes]);

  const onAddNext = useCallback((fromId: string, handle: string | null, x: number, y: number) => {
    setSmartMenu({ x, y, fromId, handle, handleType: "source" });
  }, []);

  // ============ Conexões (padrão do Bot) ============
  const makeEdge = useCallback((c: Connection): Edge => ({
    ...c,
    id: `e-${c.source}-${c.sourceHandle || "o"}-${c.target}-${c.targetHandle || "t"}-${Date.now()}-${Math.floor(Math.random()*1000)}`,
    type: "smoothstep",
    animated: true,
    label: c.sourceHandle || undefined,
    style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: "hsl(var(--primary))" },
  } as Edge), []);

  const canConnect = useCallback((c: Connection, currentEdges: Edge[]) => {
    if (!c.source || !c.target || c.source === c.target) return false;
    // Nunca conectar em cima da mesma aresta
    if (currentEdges.some(e => e.source === c.source && e.target === c.target && (e.sourceHandle ?? null) === (c.sourceHandle ?? null))) return false;
    // Blocos de saída única: uma saída só
    const src = nodes.find(n => n.id === c.source);
    if (src && !MULTI_OUTPUT.has((src.data as any).type)) {
      if (currentEdges.some(e => e.source === c.source)) return false;
    }
    // Se for multi-output (condicao), uma saída por handle
    if (src && MULTI_OUTPUT.has((src.data as any).type) && c.sourceHandle) {
      if (currentEdges.some(e => e.source === c.source && e.sourceHandle === c.sourceHandle)) return false;
    }
    return true;
  }, [nodes]);

  const onConnect = useCallback((c: Connection) => {
    setEdges((eds) => {
      if (!canConnect(c, eds)) { toast.error("Conexão inválida"); return eds; }
      toast.success("Blocos vinculados");
      return addEdge(makeEdge(c), eds);
    });
  }, [canConnect, makeEdge, setEdges]);

  const isValidConnection = useCallback((c: Connection) => canConnect(c, edges), [canConnect, edges]);

  const onConnectStart = useCallback((_: any, params: any) => {
    connectStartRef.current = {
      nodeId: params?.nodeId ?? null,
      handleId: params?.handleId ?? null,
      handleType: params?.handleType,
    };
  }, []);

  const onConnectEnd = useCallback((event: any) => {
    const start = connectStartRef.current;
    connectStartRef.current = null;
    if (!start || !start.nodeId || !rfInstance) return;

    const target = event.target as HTMLElement;
    const droppedOnPane = !!target?.closest?.(".react-flow__pane") ||
      (!target?.closest?.(".react-flow__node") && !target?.closest?.(".react-flow__handle"));
    if (!droppedOnPane) return;

    const clientX = event.clientX ?? event.changedTouches?.[0]?.clientX;
    const clientY = event.clientY ?? event.changedTouches?.[0]?.clientY;
    if (clientX == null || clientY == null) return;
    const flowPos = rfInstance.screenToFlowPosition({ x: clientX, y: clientY });
    setSmartMenu({
      x: clientX, y: clientY, flowX: flowPos.x, flowY: flowPos.y,
      fromId: start.nodeId, handle: start.handleId ?? null, handleType: start.handleType,
    });
  }, [rfInstance]);

  const onReconnect = useCallback((oldEdge: Edge, newConnection: Connection) => {
    setEdges((eds) => {
      const filtered = eds.filter((e) => e.id !== oldEdge.id);
      if (!canConnect(newConnection, filtered)) { toast.error("Conexão inválida"); return eds; }
      return addEdge(makeEdge(newConnection), filtered);
    });
  }, [canConnect, makeEdge, setEdges]);

  // ============ Adicionar bloco ============
  const addBlockAt = useCallback((type: string, pos?: { x: number; y: number }, connectFrom?: { id: string; handle: string | null; handleType?: "source" | "target" }) => {
    const b = BLOCO_MAP[type]; if (!b) return null;

    if (type === "trigger" && nodes.some(n => (n.data as any).type === "trigger")) {
      toast.error("Só pode haver um Gatilho por workflow"); return null;
    }

    const newId = crypto.randomUUID();
    const position = pos || { x: 200 + Math.random() * 240, y: 200 + Math.random() * 200 };
    const cfg: any = {};
    if (type === "trigger") cfg.evento_gatilho = wf?.evento_gatilho || "falta";
    if (type === "quiet_hours") { cfg.inicio = "22:00"; cfg.fim = "07:00"; }
    if (type === "delay") cfg.minutos = 5;
    if (type === "template") { cfg.titulo = "Alerta do Ponto"; cfg.mensagem = "Olá {funcionario}, evento em {data}. Ver: {link_aprovacao}"; }
    if (type === "condicao") { cfg.campo = "severidade"; cfg.operador = "="; cfg.valor = "alta"; }
    if (type === "canal_webhook") cfg.url = "";
    if (type.startsWith("canal_")) cfg.destino = "funcionario";

    const node: Node = { id: newId, type: "custom", position, data: { type, label: b.label, config: cfg } as any };
    setNodes(ns => [...ns, node]);

    if (connectFrom) {
      const connection: Connection = connectFrom.handleType === "target"
        ? { source: newId, sourceHandle: null, target: connectFrom.id, targetHandle: connectFrom.handle ?? null }
        : { source: connectFrom.id, sourceHandle: connectFrom.handle ?? null, target: newId, targetHandle: null };
      setEdges(es => canConnect(connection, es) ? addEdge(makeEdge(connection), es) : es);
    }
    setSelected(node);
    return node;
  }, [wf?.evento_gatilho, nodes, setNodes, setEdges, canConnect, makeEdge]);

  const onSmartPick = useCallback((type: string) => {
    if (!smartMenu) return;
    const basePos = smartMenu.flowX != null && smartMenu.flowY != null
      ? { x: smartMenu.flowX - 110, y: smartMenu.flowY - 45 }
      : undefined;
    addBlockAt(type, basePos, { id: smartMenu.fromId, handle: smartMenu.handle, handleType: smartMenu.handleType });
    setSmartMenu(null);
  }, [smartMenu, addBlockAt]);

  const smartOptions: SmartBlockOption[] = useMemo(() => {
    if (!smartMenu) return [];
    const src = nodes.find(n => n.id === smartMenu.fromId);
    const allowed = smartMenu.handleType === "target"
      ? BLOCOS.filter(b => b.type !== "trigger" && (NEXT_ALLOWED[b.type] || []).includes((src?.data as any)?.type)).map(b => b.type)
      : src ? (NEXT_ALLOWED[(src.data as any).type] || []) : [];
    return BLOCOS.filter(b => allowed.includes(b.type)).map(b => ({ type: b.type, label: b.label, category: b.grupo, description: b.desc }));
  }, [smartMenu, nodes]);

  // ============ Drag & Drop ============
  const onDragStartBlock = useCallback((event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  }, []);

  const onDragOverCanvas = useCallback((event: React.DragEvent) => {
    event.preventDefault(); event.dataTransfer.dropEffect = "move";
  }, []);

  const onDropCanvas = useCallback((event: React.DragEvent) => {
    event.preventDefault(); event.stopPropagation();
    if (!reactFlowWrapper.current || !rfInstance) return;
    const type = event.dataTransfer.getData("application/reactflow");
    if (!type || !BLOCO_MAP[type]) return;
    const bounds = reactFlowWrapper.current.getBoundingClientRect();
    const position = rfInstance.screenToFlowPosition({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
    if (addBlockAt(type, position)) toast.success(`Bloco "${BLOCO_MAP[type].label}" adicionado`);
  }, [rfInstance, addBlockAt]);

  const addFromLibrary = useCallback((type: string) => {
    let pos: { x: number; y: number } | undefined;
    if (reactFlowWrapper.current && rfInstance) {
      const b = reactFlowWrapper.current.getBoundingClientRect();
      pos = rfInstance.screenToFlowPosition({ x: b.left + b.width / 2, y: b.top + b.height / 3 });
    }
    if (addBlockAt(type, pos)) toast.success(`Bloco "${BLOCO_MAP[type].label}" adicionado`);
  }, [rfInstance, addBlockAt]);

  // ============ Propriedades ============
  function updateNode(patch: any) {
    if (!selected) return;
    setNodes(ns => ns.map(n => n.id === selected.id ? { ...n, data: { ...n.data, ...patch, config: { ...(n.data as any).config, ...(patch.config || {}) } } } : n));
    setSelected(s => s ? { ...s, data: { ...s.data, ...patch, config: { ...(s.data as any).config, ...(patch.config || {}) } } as any } : s);
  }

  // ============ Persistência ============
  async function salvar() {
    if (!wf) return;
    if (!nodes.some(n => (n.data as any).type === "trigger")) {
      toast.error("Adicione um bloco Gatilho antes de salvar"); return;
    }
    setSaving(true);
    const cleanNodes = nodes.map(n => ({ ...n, data: stripCallbacks(n.data) }));
    const flow_data = { nodes: cleanNodes, edges, viewport: { x: 0, y: 0, zoom: 1 } };
    const { error } = await supabase.from("ponto_notif_workflows").update({ flow_data, nome: wf.nome, ativo: wf.ativo, evento_gatilho: wf.evento_gatilho }).eq("id", id);
    setSaving(false);
    if (error) return toast.error(error.message);
    initialHashRef.current = JSON.stringify({ n: cleanNodes, e: edges, nome: wf.nome, evento: wf.evento_gatilho, ativo: wf.ativo });
    setDirty(false);
    toast.success("Workflow salvo");
  }

  function exportar() {
    if (!wf) return;
    const clean = nodes.map(n => ({ ...n, data: stripCallbacks(n.data) }));
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
        setEdges((j.edges || []).map((e: any) => ({ ...e })));
        toast.success("Workflow importado");
      } catch { toast.error("Arquivo inválido"); }
    };
    r.readAsText(file);
  }

  async function duplicarWorkflow() {
    if (!wf) return;
    const { data: novo, error } = await supabase.from("ponto_notif_workflows").insert({
      estabelecimento_id: wf.estabelecimento_id,
      nome: `${wf.nome} (cópia)`,
      evento_gatilho: wf.evento_gatilho,
      ativo: false,
      flow_data: { nodes: nodes.map(n => ({ ...n, data: stripCallbacks(n.data) })), edges, viewport: { x: 0, y: 0, zoom: 1 } },
    }).select().single();
    if (error) return toast.error(error.message);
    toast.success("Workflow duplicado"); nav(`/ponto/notificacoes/${novo.id}`);
  }

  // ============ Simulação ============
  async function simularStepByStep() {
    setSimRunning(true); setSimLog([]);
    let dados: any = {};
    try { dados = JSON.parse(simData || "{}"); } catch { toast.error("JSON inválido"); setSimRunning(false); return; }

    const byId: Record<string, Node> = Object.fromEntries(nodes.map(n => [n.id, n]));
    const targets = new Set(edges.map(e => e.target));
    const starts = nodes.filter(n => (n.data as any).type === "trigger" || !targets.has(n.id));
    const visitados = new Set<string>();
    const logs: any[] = [];

    const highlight = async (nodeId: string) => {
      setNodes(ns => ns.map(n => ({ ...n, data: { ...n.data, isHighlighted: n.id === nodeId } })));
      await new Promise(r => setTimeout(r, 500));
    };

    const step = async (nodeId: string) => {
      if (visitados.has(nodeId)) return;
      visitados.add(nodeId);
      const n = byId[nodeId]; if (!n) return;
      const d: any = n.data;

      if (d.isSkipped) {
        logs.push({ node: nodeId, tipo: d.type, status: "pulado" }); setSimLog([...logs]);
      } else {
        await highlight(nodeId);
        logs.push({ node: nodeId, tipo: d.type, status: "executado", config: d.config });
        setSimLog([...logs]);
        if (d.isBreakpoint) { logs.push({ node: nodeId, status: "⏸ pausado no breakpoint" }); setSimLog([...logs]); return; }
      }

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
        logs.push({ node: nodeId, status: `condição → ${handle.toUpperCase()}` }); setSimLog([...logs]);
        for (const e of edges.filter(e => e.source === nodeId && (e.sourceHandle === handle || e.label === handle))) await step(e.target);
        return;
      }

      for (const e of edges.filter(e => e.source === nodeId)) await step(e.target);
    };

    for (const s of starts) await step(s.id);
    setNodes(ns => ns.map(n => ({ ...n, data: { ...n.data, isHighlighted: false } })));
    setSimRunning(false);
  }

  async function testarReal() {
    toast.info("Disparando execução real...");
    try {
      const { data, error } = await supabase.functions.invoke("ponto-notif-workflow-exec", {
        body: { workflow_id: id, dados: JSON.parse(simData || "{}"), forcar: true },
      });
      if (error) toast.error(error.message); else toast.success(`Execução ok — ${((data as any)?.resultados || []).length} disparos`);
    } catch (e: any) { toast.error(e?.message || "Falha na execução"); }
  }

  // ============ Callbacks estáveis ============
  const nodeCallbacks = useMemo<NodeCallbacks>(() => ({
    onDuplicate, onToggleBreakpoint, onToggleSkip, onDelete: onDeleteNode, onAddNote, onAddNext,
  }), [onDuplicate, onToggleBreakpoint, onToggleSkip, onDeleteNode, onAddNote, onAddNext]);

  const grupos = useMemo(() => {
    const g: Record<string, BlocoDef[]> = {};
    BLOCOS.forEach(b => { (g[b.grupo] ||= []).push(b); });
    return g;
  }, []);

  // ============ Zoom helpers ============
  const zoomIn = () => rfInstance?.zoomIn?.();
  const zoomOut = () => rfInstance?.zoomOut?.();
  const fitView = () => rfInstance?.fitView?.({ padding: 0.2, duration: 400 });

  if (!wf) return <div className="p-6 text-sm text-muted-foreground">Carregando…</div>;

  return (
    <WorkflowBuilderLayout
      title="Notificações do Ponto"
      subtitle={`Gatilho: ${EVENTOS.find(e => e.key === wf.evento_gatilho)?.label || wf.evento_gatilho}`}
      flowName={wf.nome}
      onFlowNameChange={(v) => setWf({ ...wf, nome: v })}
      onSave={salvar}
      isSaving={saving}
      onTest={() => setSimOpen(true)}
      showTest={simOpen}
      testLabel="Simular"
      onZoomIn={zoomIn}
      onZoomOut={zoomOut}
      onFitView={fitView}
      isLocked={isLocked}
      onToggleLock={() => setIsLocked(v => !v)}
      hasUnsavedChanges={dirty}
      defaultReturnUrl="/ponto/notificacoes"
      centerContent={
        <>
          <Select value={wf.evento_gatilho} onValueChange={v => setWf({ ...wf, evento_gatilho: v })}>
            <SelectTrigger className="h-8 w-48 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{EVENTOS.map(e => <SelectItem key={e.key} value={e.key}>Gatilho: {e.label}</SelectItem>)}</SelectContent>
          </Select>
          <div className="flex items-center gap-1.5 px-2 h-8 rounded-md border bg-muted/40">
            <Switch checked={wf.ativo} onCheckedChange={v => setWf({ ...wf, ativo: v })} />
            <span className="text-xs font-medium">{wf.ativo ? "Ativo" : "Inativo"}</span>
          </div>
        </>
      }
      rightContent={
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 px-2"><FolderOpen className="w-4 h-4 sm:mr-1" /><span className="hidden sm:inline text-xs">Arquivo</span></Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-52 p-1 z-[60]">
            <button onClick={exportar} className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-muted flex items-center gap-2"><Download className="w-4 h-4" /> Exportar JSON</button>
            <button onClick={() => fileInputRef.current?.click()} className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-muted flex items-center gap-2"><Upload className="w-4 h-4" /> Importar JSON</button>
            <button onClick={duplicarWorkflow} className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-muted flex items-center gap-2"><Copy className="w-4 h-4" /> Duplicar workflow</button>
            <div className="h-px bg-border my-1" />
            <button onClick={testarReal} className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-muted flex items-center gap-2"><Play className="w-4 h-4" /> Disparar real agora</button>
          </PopoverContent>
        </Popover>
      }
    >
      <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={e => e.target.files?.[0] && importar(e.target.files[0])} />

      {/* Biblioteca lateral */}
      {isLibExpanded && (
        <div className="w-60 flex flex-col h-[calc(100%-1rem)] m-2 rounded-2xl shadow-lg border-2 border-white dark:border-white/10 bg-gradient-to-b from-background to-border relative overflow-hidden animate-slide-in flex-shrink-0 z-40 fixed inset-y-0 left-0 lg:static lg:inset-auto">
          <div className="p-4 pb-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-foreground text-background flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <h3 className="font-bold text-base text-foreground tracking-tight">Blocos</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsLibExpanded(false)} className="h-7 w-7 rounded-md hover:bg-black/5">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Input placeholder="Buscar..." value={librarySearch} onChange={e => setLibrarySearch(e.target.value)} className="h-8 text-xs bg-muted/40 border-0 shadow-sm" />
          </div>

          <ScrollArea className="flex-1">
            <div className="w-[240px] max-w-full px-2 pb-4 space-y-0.5">
              {Object.entries(grupos)
                .map(([g, items]) => ({ name: g, blocks: items.filter(b => b.label.toLowerCase().includes(librarySearch.toLowerCase())) }))
                .filter(cat => cat.blocks.length > 0)
                .map((category) => {
                  const isOpen = openCategories.includes(category.name);
                  return (
                    <Collapsible key={category.name} open={isOpen}
                      onOpenChange={() => setOpenCategories(prev => prev.includes(category.name) ? prev.filter(c => c !== category.name) : [...prev, category.name])}>
                      <CollapsibleTrigger className={`flex items-center justify-between w-full px-3 py-2 rounded-xl transition-colors duration-100 text-left ${isOpen ? "bg-foreground text-background" : "hover:bg-black/5 text-foreground"}`}>
                        <span className="text-xs font-medium">{category.name}</span>
                        <div className="flex items-center gap-2">
                          <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-semibold flex items-center justify-center ${isOpen ? "bg-background/20 text-background" : "bg-foreground text-background"}`}>{category.blocks.length}</span>
                          <span className={`text-xs ${isOpen ? "text-background/70" : "text-muted-foreground"}`}>{isOpen ? "−" : "+"}</span>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="animate-accordion-down">
                        <div className="relative ml-5 pl-4 pt-1 pb-1">
                          <div className="absolute left-0 top-0 bottom-0 w-px bg-foreground/40" />
                          <div className="space-y-0.5">
                            {category.blocks.map((b) => {
                              const Icon = b.icon;
                              return (
                                <div key={b.type} draggable
                                  onDragStart={(e) => onDragStartBlock(e, b.type)}
                                  onDoubleClick={() => addFromLibrary(b.type)}
                                  title="Arraste para o canvas ou dê 2 cliques"
                                  className="w-full px-3 py-2 cursor-grab active:cursor-grabbing bg-transparent hover:bg-muted/60 border-0 shadow-none rounded-xl transition-colors duration-100 select-none text-left">
                                  <div className="flex items-center gap-2">
                                    <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                    <h4 className="text-xs font-normal text-foreground truncate">{b.label}</h4>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Canvas */}
      <div ref={reactFlowWrapper} onDrop={onDropCanvas} onDragOver={onDragOverCanvas} className="flex-1 relative min-w-0 min-h-0 h-full w-full" style={{ touchAction: 'none' }}>
        {!isLibExpanded && (
          <FloatingAddBlockButton onClick={() => setIsLibExpanded(true)} />
        )}

        <NodeCallbacksContext.Provider value={nodeCallbacks}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            onConnectStart={onConnectStart}
            onConnectEnd={onConnectEnd}
            onReconnect={onReconnect}
            onInit={setRfInstance}
            onNodeClick={(_, n) => setSelected(n)}
            onPaneClick={() => { setSelected(null); setSmartMenu(null); }}
            onBeforeDelete={async ({ nodes: nodesToDelete, edges: edgesToDelete }) => {
              const kept = nodesToDelete.filter(n => (n.data as any)?.type !== "trigger");
              if (kept.length !== nodesToDelete.length) toast.error("O bloco Gatilho não pode ser excluído.");
              if (kept.length === 0 && edgesToDelete.length === 0) return false;
              return { nodes: kept, edges: edgesToDelete };
            }}
            nodeTypes={nodeTypes}
            fitView
            nodesDraggable={!isLocked}
            nodesConnectable={!isLocked}
            nodesFocusable={!isLocked}
            edgesFocusable={!isLocked}
            elementsSelectable={!isLocked}
            connectionRadius={80}
            connectOnClick={false}
            autoPanOnConnect={false}
            autoPanOnNodeDrag={true}
            {...boxSelectionProps({ disabled: isLocked })}
            style={{ width: "100%", height: "100%" }}
            defaultEdgeOptions={{
              animated: true,
              type: "smoothstep",
              style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
              markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: "hsl(var(--primary))" } as any,
            }}
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
            <Controls showInteractive={false} />
            <MiniMap pannable className="!bg-card" />
          </ReactFlow>
        </NodeCallbacksContext.Provider>

        {smartMenu && (
          <SmartConnectMenu x={smartMenu.x} y={smartMenu.y}
            title={smartMenu.handleType === "target" ? "Escolha o bloco anterior" : smartMenu.handle ? `Próximo bloco (${smartMenu.handle.toUpperCase()})` : "Escolha o próximo bloco"}
            blocks={smartOptions} onPick={onSmartPick} onClose={() => setSmartMenu(null)} />
        )}
      </div>

      {/* Propriedades */}
      {selected ? (
        <div className="workflow-props animate-slide-in-right fixed inset-y-0 right-0 z-40 w-full sm:w-96 lg:static lg:inset-auto lg:z-auto lg:h-[calc(100%-1rem)] lg:w-96 lg:m-2 lg:rounded-2xl lg:border-2 lg:border-white dark:lg:border-white/10 lg:bg-gradient-to-b lg:from-background lg:to-border lg:shadow-lg bg-background border-l border-border flex flex-col h-full shadow-2xl overflow-x-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border lg:border-b-0 lg:pt-4">
            <span className="text-sm font-semibold text-foreground">Propriedades</span>
            <Button variant="ghost" size="icon" onClick={() => setSelected(null)} className="h-7 w-7 rounded-md hover:bg-black/5">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <PropsPanel node={nodes.find(n => n.id === selected.id) || selected} onChange={updateNode}
              onDelete={() => onDeleteNode(selected.id)}
              onDuplicate={() => onDuplicate(selected.id)}
              onToggleBreakpoint={() => onToggleBreakpoint(selected.id)}
              onToggleSkip={() => onToggleSkip(selected.id)} />
          </ScrollArea>
        </div>
      ) : (
        <div className="hidden lg:flex w-96 flex-col h-[calc(100%-1rem)] m-2 rounded-2xl shadow-lg border-2 border-white dark:border-white/10 bg-gradient-to-b from-background to-border p-6 animate-slide-in-right flex-shrink-0">
          <div className="text-sm text-muted-foreground">
            <div className="font-semibold text-foreground mb-2">Como funciona</div>
            <ul className="list-disc pl-4 space-y-1.5">
              <li>Abra o botão flutuante <b>+</b> para acessar a biblioteca de blocos.</li>
              <li>Arraste blocos para o canvas ou dê 2 cliques.</li>
              <li>Solte a linha do handle em qualquer área vazia para escolher o próximo bloco.</li>
              <li>Menu <b>⋮</b> do bloco: duplicar, breakpoint, pular, nota, excluir.</li>
              <li><b>Simular</b> executa passo a passo; <b>Arquivo → Disparar real</b> envia agora.</li>
              <li>Variáveis: <code>{`{funcionario} {data} {link_aprovacao} {severidade}`}</code>.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Dialog Nota */}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
          <DialogFooter className="flex-col sm:flex-row gap-2">
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

      <DeleteConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm(prev => ({ open, nodeId: open ? prev.nodeId : null }))}
        onConfirm={confirmDeleteNode}
        title="Excluir bloco?"
        description="Esta ação removerá o bloco e todas as suas conexões. Não pode ser desfeita."
      />
    </WorkflowBuilderLayout>
  );
}

// ============================================================
// Painel de Propriedades
// ============================================================
function PropsPanel({ node, onChange, onDelete, onDuplicate, onToggleBreakpoint, onToggleSkip }: {
  node: Node; onChange: (p: any) => void; onDelete: () => void; onDuplicate: () => void; onToggleBreakpoint: () => void; onToggleSkip: () => void;
}) {
  const data: any = node.data || {};
  const cfg = data.config || {};
  const type = data.type as string;
  const b = BLOCO_MAP[type];
  const isTrigger = type === "trigger";

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Badge variant="outline">{b?.label}</Badge>
          <div className="text-xs text-muted-foreground mt-1">ID {node.id.slice(0, 8)}</div>
        </div>
        <div className="flex items-center gap-1">
          {!isTrigger && <Button size="icon" variant="ghost" title="Duplicar" onClick={onDuplicate}><Copy className="w-4 h-4" /></Button>}
          <Button size="icon" variant="ghost" title={data.isBreakpoint ? "Remover breakpoint" : "Pausar aqui"} onClick={onToggleBreakpoint}>
            <Pause className={cn("w-4 h-4", data.isBreakpoint && "text-orange-500")} />
          </Button>
          <Button size="icon" variant="ghost" title={data.isSkipped ? "Reativar" : "Pular"} onClick={onToggleSkip}>
            <SkipForward className={cn("w-4 h-4", data.isSkipped && "text-muted-foreground")} />
          </Button>
          {!isTrigger && <Button size="icon" variant="ghost" title="Excluir" onClick={onDelete}><Trash2 className="w-4 h-4 text-destructive" /></Button>}
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
                <SelectItem value="in">Está em (lista)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Valor</Label>
            <Input value={cfg.valor || ""} onChange={e => onChange({ config: { valor: e.target.value } })} />
          </div>
          <div className="text-xs text-muted-foreground">Saída verde = SIM, vermelha = NÃO.</div>
        </>
      )}

      {type === "quiet_hours" && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Início</Label><Input type="time" value={cfg.inicio || "22:00"} onChange={e => onChange({ config: { inicio: e.target.value } })} /></div>
            <div><Label>Fim</Label><Input type="time" value={cfg.fim || "07:00"} onChange={e => onChange({ config: { fim: e.target.value } })} /></div>
          </div>
          <div className="text-xs text-muted-foreground">Dentro da janela o fluxo para (exceto quando forçado).</div>
        </>
      )}

      {type === "delay" && (
        <div>
          <Label>Minutos</Label>
          <Input type="number" value={cfg.minutos ?? 0} onChange={e => onChange({ config: { minutos: Number(e.target.value) } })} />
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
              <Textarea rows={3} value={(cfg.numeros || []).join("\n")} onChange={e => onChange({ config: { numeros: e.target.value.split("\n").map((s: string) => s.trim()).filter(Boolean) } })} />
            </div>
          )}
          {cfg.destino === "emails_fixos" && (
            <div>
              <Label>E-mails (um por linha)</Label>
              <Textarea rows={3} value={(cfg.emails || []).join("\n")} onChange={e => onChange({ config: { emails: e.target.value.split("\n").map((s: string) => s.trim()).filter(Boolean) } })} />
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
        <div className="text-xs text-muted-foreground">Aciona a rotina hierárquica de escalonamento (<code>ponto-notificar-escalonar</code>) para o evento atual.</div>
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
