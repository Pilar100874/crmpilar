import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ReactFlow, ReactFlowProvider, Background, BackgroundVariant, Controls, MiniMap,
  addEdge, useEdgesState, useNodesState, Handle, Position,
  type Connection, type Edge, type Node, type NodeTypes, MarkerType, ConnectionMode,
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
  FolderOpen, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import SmartConnectMenu, { SmartBlockOption } from "@/components/flow/SmartConnectMenu";
import { WorkflowBuilderLayout } from "@/components/workflow/WorkflowBuilderLayout";
import { FloatingAddBlockButton } from "@/components/workflow/FloatingAddBlockButton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { isSingleEdgePerHandleAllowed, SINGLE_OUTPUT_TOAST } from "@/lib/flow-edge-utils";
import { boxSelectionProps } from "@/lib/flowSelection";

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

type NodeCallbacks = {
  onDuplicate?: (id: string) => void;
  onToggleBreakpoint?: (id: string) => void;
  onToggleSkip?: (id: string) => void;
  onDelete?: (id: string) => void;
  onAddNote?: (id: string) => void;
  onAddNext?: (id: string, handle: string | null, x: number, y: number) => void;
  onManualConnectStart?: (id: string, handle: string | null, handleType: "source" | "target") => void;
};
const NodeCallbacksContext = createContext<NodeCallbacks>({});

function CustomNode({ id, data, selected }: any) {
  const b = BLOCO_MAP[data.type] || BLOCOS[0];
  const Icon = b.icon;
  const isBreakpoint = !!data.isBreakpoint;
  const isSkipped = !!data.isSkipped;
  const isHighlighted = !!data.isHighlighted;
  const cbs = useContext(NodeCallbacksContext);

  return (
    <div className={cn(
      "rounded-xl border-2 shadow-md bg-card min-w-[210px] max-w-[260px] transition-all relative group",
      selected && "ring-2 ring-primary border-primary",
      isBreakpoint && "border-orange-500 ring-2 ring-orange-400/40",
      isSkipped && "opacity-50",
      isHighlighted && "ring-4 ring-green-500/60 border-green-500 scale-[1.02]",
      !selected && !isBreakpoint && !isHighlighted && "border-border hover:border-primary/40"
    )}>
      <Handle
        type="target"
        position={Position.Top}
        onMouseDownCapture={() => cbs.onManualConnectStart?.(id, null, "target")}
        onTouchStartCapture={() => cbs.onManualConnectStart?.(id, null, "target")}
        onPointerDownCapture={() => cbs.onManualConnectStart?.(id, null, "target")}
        className="!bg-primary !w-5 !h-5 !border-2 !border-background !rounded-full !cursor-crosshair"
      />

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
            <DropdownMenuItem onClick={() => cbs.onDuplicate?.(id)}><Copy className="w-3.5 h-3.5 mr-2" />Duplicar</DropdownMenuItem>
            <DropdownMenuItem onClick={() => cbs.onToggleBreakpoint?.(id)}>
              <Pause className="w-3.5 h-3.5 mr-2" />{isBreakpoint ? "Remover breakpoint" : "Pausar aqui"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => cbs.onToggleSkip?.(id)}>
              <SkipForward className="w-3.5 h-3.5 mr-2" />{isSkipped ? "Reativar bloco" : "Pular na execução"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => cbs.onAddNote?.(id)}><StickyNote className="w-3.5 h-3.5 mr-2" />{data.note ? "Editar nota" : "Adicionar nota"}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => cbs.onDelete?.(id)} className="text-destructive"><Trash2 className="w-3.5 h-3.5 mr-2" />Excluir</DropdownMenuItem>
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
          <Handle
            type="source"
            id="sim"
            position={Position.Bottom}
            onMouseDownCapture={() => cbs.onManualConnectStart?.(id, "sim", "source")}
            onTouchStartCapture={() => cbs.onManualConnectStart?.(id, "sim", "source")}
            onPointerDownCapture={() => cbs.onManualConnectStart?.(id, "sim", "source")}
            style={{ left: "30%" }}
            className="!bg-green-500 !w-5 !h-5 !border-2 !border-background !rounded-full !cursor-crosshair"
          />
          <Handle
            type="source"
            id="nao"
            position={Position.Bottom}
            onMouseDownCapture={() => cbs.onManualConnectStart?.(id, "nao", "source")}
            onTouchStartCapture={() => cbs.onManualConnectStart?.(id, "nao", "source")}
            onPointerDownCapture={() => cbs.onManualConnectStart?.(id, "nao", "source")}
            style={{ left: "70%" }}
            className="!bg-red-500 !w-5 !h-5 !border-2 !border-background !rounded-full !cursor-crosshair"
          />
          <button onClick={(e) => { e.stopPropagation(); cbs.onAddNext?.(id, "sim", e.clientX, e.clientY); }}
            className="absolute -bottom-7 left-[30%] -translate-x-1/2 w-5 h-5 rounded-full bg-green-500 text-white shadow flex items-center justify-center opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto hover:scale-110 transition"><Plus className="w-3 h-3" /></button>
          <button onClick={(e) => { e.stopPropagation(); cbs.onAddNext?.(id, "nao", e.clientX, e.clientY); }}
            className="absolute -bottom-7 left-[70%] -translate-x-1/2 w-5 h-5 rounded-full bg-red-500 text-white shadow flex items-center justify-center opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto hover:scale-110 transition"><Plus className="w-3 h-3" /></button>
        </>
      ) : (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            onMouseDownCapture={() => cbs.onManualConnectStart?.(id, null, "source")}
            onTouchStartCapture={() => cbs.onManualConnectStart?.(id, null, "source")}
            onPointerDownCapture={() => cbs.onManualConnectStart?.(id, null, "source")}
            className="!bg-primary !w-5 !h-5 !border-2 !border-background !rounded-full !cursor-crosshair"
          />
          <button onClick={(e) => { e.stopPropagation(); cbs.onAddNext?.(id, null, e.clientX, e.clientY); }}
            className="absolute -bottom-7 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-primary text-primary-foreground shadow flex items-center justify-center opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto hover:scale-110 transition"><Plus className="w-3 h-3" /></button>

        </>
      )}
    </div>
  );
}

const nodeTypes: NodeTypes = { custom: CustomNode as any };

function stripCallbacks(data: any) {
  const { onDuplicate: _a, onToggleBreakpoint: _b, onToggleSkip: _c, onDelete: _d, onAddNote: _e, onAddNext: _f, isHighlighted: _h, ...rest } = data || {};
  return rest;
}

export default function PontoNotificacaoBuilder() {
  return (
    <ReactFlowProvider>
      <PontoNotificacaoBuilderContent />
    </ReactFlowProvider>
  );
}

function PontoNotificacaoBuilderContent() {
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
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [rfInstance, setRfInstance] = useState<any>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [isLibExpanded, setIsLibExpanded] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const [openCategories, setOpenCategories] = useState<string[]>(["Início", "Lógica", "Conteúdo", "Canais", "Ações"]);
  const initialHashRef = useRef<string>("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("ponto_notif_workflows").select("*").eq("id", id).maybeSingle();
      if (!data) { toast.error("Workflow não encontrado"); nav("/ponto/notificacoes"); return; }
      setWf(data);
      const flow = data.flow_data || {};
      const loadedNodes = (flow.nodes || []).map((n: any) => ({ ...n, type: "custom" }));
      const loadedEdges = (flow.edges || []).map((e: any) => ({ ...e, markerEnd: { type: MarkerType.ArrowClosed } }));
      setNodes(loadedNodes);
      setEdges(loadedEdges);
      initialHashRef.current = JSON.stringify({ n: flow.nodes || [], e: flow.edges || [], nome: data.nome, evento: data.evento_gatilho, ativo: data.ativo });
      setDirty(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Marca dirty quando o grafo/config muda
  useEffect(() => {
    if (!wf || !initialHashRef.current) return;
    const cur = JSON.stringify({
      n: nodes.map(n => ({ ...n, data: stripCallbacks(n.data) })),
      e: edges.map(({ markerEnd: _m, ...rest }) => rest),
      nome: wf.nome, evento: wf.evento_gatilho, ativo: wf.ativo,
    });
    setDirty(cur !== initialHashRef.current);
  }, [nodes, edges, wf]);

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

  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; nodeId: string | null }>({ open: false, nodeId: null });

  const isTriggerNode = useCallback((nodeId: string | null | undefined) => {
    if (!nodeId) return false;
    const n = nodes.find(x => x.id === nodeId);
    return (n?.data as any)?.type === "trigger";
  }, [nodes]);

  const onDeleteNode = useCallback((nodeId: string) => {
    if (isTriggerNode(nodeId)) {
      toast.error("O bloco Gatilho não pode ser excluído.");
      return;
    }
    setDeleteConfirm({ open: true, nodeId });
  }, [isTriggerNode]);

  const confirmDeleteNode = useCallback(() => {
    const nodeId = deleteConfirm.nodeId;
    if (!nodeId) return;
    setNodes(ns => ns.filter(n => n.id !== nodeId));
    setEdges(es => es.filter(e => e.source !== nodeId && e.target !== nodeId));
    setSelected(s => s?.id === nodeId ? null : s);
    setDeleteConfirm({ open: false, nodeId: null });
    toast.success("Bloco excluído");
  }, [deleteConfirm.nodeId, setNodes, setEdges]);

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

  // Callbacks estáveis para os nodes (evita recriar data em cada render e cancelar conexões)
  const nodeCallbacks = useMemo<NodeCallbacks>(() => ({
    onDuplicate, onToggleBreakpoint, onToggleSkip, onDelete: onDeleteNode, onAddNote, onAddNext,
  }), [onDuplicate, onToggleBreakpoint, onToggleSkip, onDeleteNode, onAddNote, onAddNext]);

  // ============ Conexões ============
  // Ref sempre atualizada com os nós — evita usar `nodes` como dep e recriar onConnect a cada render
  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const connectStartRef = useRef<{ nodeId: string | null; handleId: string | null; handleType: "source" | "target" } | null>(null);
  const connectSucceededRef = useRef(false);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);

  const addValidatedEdge = useCallback((c: Connection, notifyDuplicate = true) => {
    if (!c.source || !c.target || c.source === c.target) return false;
    let accepted = false;
    setEdges(eds => {
      if (!isSingleEdgePerHandleAllowed(c, eds)) {
        if (notifyDuplicate) toast.error(SINGLE_OUTPUT_TOAST);
        return eds;
      }

      accepted = true;
      return addEdge({
        ...c,
        id: `e-${c.source}-${c.sourceHandle || "o"}-${c.target}-${c.targetHandle || "t"}-${Date.now()}`,
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed },
        animated: true,
        label: c.sourceHandle || undefined,
      }, eds);
    });
    return accepted;
  }, [setEdges]);

  const onConnect = useCallback((c: Connection) => {
    connectSucceededRef.current = addValidatedEdge(c);
  }, [addValidatedEdge]);

  const getPointerPoint = useCallback((event: any) => {
    const touch = event?.changedTouches?.[0] || event?.touches?.[0];
    const x = event?.clientX ?? touch?.clientX;
    const y = event?.clientY ?? touch?.clientY;
    return x == null || y == null ? null : { x, y };
  }, []);

  const findNodeAtPoint = useCallback((x: number, y: number, excludeId?: string | null) => {
    const wrapper = reactFlowWrapper.current;
    if (!wrapper) return null;
    const hitPadding = 72;
    let best: { id: string; distance: number } | null = null;
    wrapper.querySelectorAll<HTMLElement>(".react-flow__node").forEach((el) => {
      const nodeId = el.getAttribute("data-id");
      if (!nodeId || nodeId === excludeId) return;
      const rect = el.getBoundingClientRect();
      const inside = x >= rect.left - hitPadding && x <= rect.right + hitPadding && y >= rect.top - hitPadding && y <= rect.bottom + hitPadding;
      if (!inside) return;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const distance = Math.hypot(x - cx, y - cy);
      if (!best || distance < best.distance) best = { id: nodeId, distance };
    });
    return best?.id ?? null;
  }, []);

  const onConnectStart = useCallback((_: any, params: any) => {
    connectSucceededRef.current = false;
    connectStartRef.current = {
      nodeId: params?.nodeId ?? null,
      handleId: params?.handleId ?? null,
      handleType: params?.handleType,
    };
  }, []);

  const onConnectEnd = useCallback((event: any) => {
    const start = connectStartRef.current;
    connectStartRef.current = null;
    if (!start || !start.nodeId) return;
    if (connectSucceededRef.current) {
      connectSucceededRef.current = false;
      return;
    }

    const point = getPointerPoint(event);
    if (!point) return;
    const droppedNodeId = findNodeAtPoint(point.x, point.y, start.nodeId);
    if (!droppedNodeId) return;

    const connection: Connection = start.handleType === "target"
      ? { source: droppedNodeId, sourceHandle: null, target: start.nodeId, targetHandle: start.handleId ?? null }
      : { source: start.nodeId, sourceHandle: start.handleId ?? null, target: droppedNodeId, targetHandle: null };

    if (addValidatedEdge(connection)) toast.success("Blocos vinculados");
  }, [addValidatedEdge, findNodeAtPoint, getPointerPoint]);

  // Validação visual (feedback durante o arrasto do handle)
  const isValidConnection = useCallback((c: Connection) => {
    if (!c.source || !c.target) return true;
    if (c.source === c.target) return false;
    return isSingleEdgePerHandleAllowed(c, edgesRef.current);
  }, []);


  function addBlockAt(type: string, pos?: { x: number; y: number }, connectFrom?: { id: string; handle: string | null }) {
    const b = BLOCO_MAP[type];
    if (connectFrom && !isSingleEdgePerHandleAllowed({ source: connectFrom.id, sourceHandle: connectFrom.handle ?? null } as Connection, edgesRef.current)) {
      toast.error(SINGLE_OUTPUT_TOAST);
      return null;
    }
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
      setEdges(es => addEdge({
        id: `e-${connectFrom.id}-${newId}`, source: connectFrom.id, target: newId,
        type: "smoothstep",
        sourceHandle: connectFrom.handle || undefined, label: connectFrom.handle || undefined,
        markerEnd: { type: MarkerType.ArrowClosed }, animated: true,
      } as Edge, es));
    }
    setSelected(node);
    return node;
  }

  // ============ Drag & drop (desktop) e evento add-block (mobile: 2 cliques) ============
  const onDragStartBlock = useCallback((event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  }, []);

  const onDragOverCanvas = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDropCanvas = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!reactFlowWrapper.current || !rfInstance) return;
    const type = event.dataTransfer.getData("application/reactflow");
    if (!type || !BLOCO_MAP[type]) return;
    const bounds = reactFlowWrapper.current.getBoundingClientRect();
    const position = rfInstance.screenToFlowPosition({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
    addBlockAt(type, position);
    toast.success(`Bloco "${BLOCO_MAP[type].label}" adicionado!`);
  }, [rfInstance]);

  useEffect(() => {
    const handler = (e: Event) => {
      const type = (e as CustomEvent).detail?.type;
      if (!type || !BLOCO_MAP[type]) return;
      let pos: { x: number; y: number } | undefined;
      if (reactFlowWrapper.current && rfInstance) {
        const b = reactFlowWrapper.current.getBoundingClientRect();
        pos = rfInstance.screenToFlowPosition({ x: b.left + b.width / 2, y: b.top + b.height / 2 });
      }
      addBlockAt(type, pos);
      toast.success(`Bloco "${BLOCO_MAP[type].label}" adicionado!`);
    };
    window.addEventListener("ponto-notif:add-block", handler);
    return () => window.removeEventListener("ponto-notif:add-block", handler);
  }, [rfInstance]);


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
    const cleanNodes = nodes.map(n => ({ ...n, data: stripCallbacks(n.data) }));
    const flow_data = { nodes: cleanNodes, edges: edges.map(({ markerEnd: _m, ...rest }) => rest), viewport: { x: 0, y: 0, zoom: 1 } };
    const { error } = await supabase.from("ponto_notif_workflows").update({ flow_data, nome: wf.nome, ativo: wf.ativo, evento_gatilho: wf.evento_gatilho }).eq("id", id);
    setSaving(false);
    if (error) return toast.error(error.message);
    initialHashRef.current = JSON.stringify({ n: cleanNodes, e: flow_data.edges, nome: wf.nome, evento: wf.evento_gatilho, ativo: wf.ativo });
    setDirty(false);
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
    const clean = nodes.map(n => ({ ...n, data: stripCallbacks(n.data) }));
    const blob = new Blob([JSON.stringify({ nome: wf.nome, evento_gatilho: wf.evento_gatilho, nodes: clean, edges }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `${(wf.nome || "workflow").replace(/\W+/g, "_")}.json`; a.click();
  }

  async function duplicarWorkflow() {
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

  // Zoom / lock helpers
  const zoomIn = () => rfInstance?.zoomIn?.();
  const zoomOut = () => rfInstance?.zoomOut?.();
  const fitView = () => rfInstance?.fitView?.({ padding: 0.2, duration: 400 });

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

      {/* Library — visual idêntico ao BotBuilder */}
      {isLibExpanded && (
        <div className="w-60 flex flex-col h-[calc(100%-1rem)] m-2 rounded-2xl shadow-lg border-2 border-white dark:border-white/10 bg-gradient-to-b from-background to-border relative overflow-hidden animate-slide-in flex-shrink-0 z-40 fixed inset-y-0 left-0 lg:static lg:inset-auto">
          <div className="p-4 pb-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-foreground text-background flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <h3 className="font-bold text-base text-foreground tracking-tight">Menu</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsLibExpanded(false)} className="h-7 w-7 rounded-md hover:bg-black/5">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative">
              <Input
                placeholder="Buscar..."
                value={librarySearch}
                onChange={(e) => setLibrarySearch(e.target.value)}
                className="h-8 text-xs bg-muted/40 border-0 shadow-sm"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="w-[240px] max-w-full px-2 pb-4 space-y-0.5">
              {Object.entries(grupos)
                .map(([g, items]) => ({
                  name: g,
                  blocks: items.filter(b => b.label.toLowerCase().includes(librarySearch.toLowerCase())),
                }))
                .filter(cat => cat.blocks.length > 0)
                .map((category) => {
                  const isOpen = openCategories.includes(category.name);
                  return (
                    <Collapsible
                      key={category.name}
                      open={isOpen}
                      onOpenChange={() =>
                        setOpenCategories(prev => prev.includes(category.name) ? prev.filter(c => c !== category.name) : [...prev, category.name])
                      }
                    >
                      <CollapsibleTrigger
                        className={`flex items-center justify-between w-full px-3 py-2 rounded-xl transition-colors duration-100 text-left ${
                          isOpen ? "bg-foreground text-background" : "hover:bg-black/5 text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-medium">{category.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-semibold flex items-center justify-center ${isOpen ? "bg-background/20 text-background" : "bg-foreground text-background"}`}>
                            {category.blocks.length}
                          </span>
                          <span className={`text-xs ${isOpen ? "text-background/70" : "text-muted-foreground"}`}>
                            {isOpen ? "−" : "+"}
                          </span>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent className="animate-accordion-down">
                        <div className="relative ml-5 pl-4 pt-1 pb-1">
                          <div className="absolute left-0 top-0 bottom-0 w-px bg-foreground/40" />
                          <div className="space-y-0.5">
                            {category.blocks.map((b) => {
                              const Icon = b.icon;
                              return (
                                <div
                                  key={b.type}
                                  draggable
                                  onDragStart={(e) => onDragStartBlock(e, b.type)}
                                  onDoubleClick={() => window.dispatchEvent(new CustomEvent("ponto-notif:add-block", { detail: { type: b.type } }))}
                                  title="Arraste para o canvas ou clique 2x para adicionar"
                                  className="w-full px-3 py-2 cursor-grab active:cursor-grabbing bg-transparent hover:bg-muted/60 border-0 shadow-none rounded-xl transition-colors duration-100 select-none text-left"
                                >
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

      {/* Canvas — precisa de h-full/min-h-0 dentro do layout flex para o ReactFlow medir */}
      <div ref={reactFlowWrapper} onDrop={onDropCanvas} onDragOver={onDragOverCanvas} className="flex-1 relative min-w-0 min-h-0 h-full w-full" style={{ touchAction: 'none' }}>
        {!isLibExpanded && (
          <FloatingAddBlockButton onClick={() => setIsLibExpanded(true)} />
        )}

        <NodeCallbacksContext.Provider value={nodeCallbacks}>
        <ReactFlow
          nodes={nodes} edges={edges}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          isValidConnection={isValidConnection}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
          onInit={setRfInstance}
          onNodeClick={(_, n) => setSelected(n)}
          onPaneClick={() => { setSelected(null); setSmartMenu(null); }}
          onBeforeDelete={async ({ nodes: nodesToDelete, edges: edgesToDelete }) => {
            const kept = nodesToDelete.filter(n => (n.data as any)?.type !== "trigger");
            if (kept.length !== nodesToDelete.length) {
              toast.error("O bloco Gatilho não pode ser excluído.");
            }
            if (kept.length === 0 && edgesToDelete.length === 0) return false;
            // Se houver mais de um item selecionado, confirma direto (sem dialog individual)
            return { nodes: kept, edges: edgesToDelete };
          }}
          nodeTypes={nodeTypes}
          fitView
          nodesDraggable={!isLocked}
          nodesConnectable={!isLocked}
          nodesFocusable={!isLocked}
          edgesFocusable={!isLocked}
          elementsSelectable={!isLocked}
          connectionMode={ConnectionMode.Loose}
          connectionRadius={80}
          connectOnClick={false}
          autoPanOnConnect={false}
          autoPanOnNodeDrag={true}
          {...boxSelectionProps({ disabled: isLocked })}
          style={{ width: "100%", height: "100%" }}
          defaultEdgeOptions={{ animated: true, style: { strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed } as any }}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          <Controls showInteractive={false} />
          <MiniMap pannable className="!bg-card" />
        </ReactFlow>
        </NodeCallbacksContext.Provider>

        {smartMenu && (
          <SmartConnectMenu x={smartMenu.x} y={smartMenu.y}
            title={smartMenu.handle ? `Próximo bloco (${smartMenu.handle.toUpperCase()})` : "Escolha o próximo bloco"}
            blocks={smartOptions} onPick={onSmartPick} onClose={() => setSmartMenu(null)} />
        )}
      </div>

      {/* Properties — visual idêntico ao BotBuilder (drawer mobile / card desktop) */}
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
              <li>Abra o <b>Menu</b> (canto superior esquerdo) e clique num bloco para adicioná-lo.</li>
              <li>Clique no <b>+</b> abaixo de qualquer bloco para escolher o próximo permitido.</li>
              <li>Menu <b>⋮</b> do bloco: duplicar, pausar (breakpoint), pular, adicionar nota, excluir.</li>
              <li><b>Simular</b> executa passo a passo com destaque verde; <b>Arquivo → Disparar real</b> executa nos canais reais.</li>
              <li>Cadeado no topo bloqueia edições acidentais do canvas.</li>
              <li>Variáveis: <code>{`{funcionario} {data} {link_aprovacao} {severidade}`}</code>.</li>
            </ul>
          </div>
        </div>
      )}



      {/* ============ Dialogs ============ */}
      <></>


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
