import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  Connection,
  Edge,
  Node,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Save, Play, Menu } from "lucide-react";
import { getEstabelecimentoId } from "@/services/tvSignage/tvSignageService";
import { TvBlockLibrary } from "@/components/tv-workflow/TvBlockLibrary";
import { TvFlowNode } from "@/components/tv-workflow/TvFlowNode";
import { TvPropertiesPanel } from "@/components/tv-workflow/TvPropertiesPanel";
import { TV_BLOCK_BY_TYPE, TV_BLOCK_DEFINITIONS, TvFlowNodeData } from "@/types/tvWorkflow";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { BlockNoteDialog } from "@/components/automacao-vendas/BlockNoteDialog";
import SmartConnectMenu, { SmartBlockOption } from "@/components/flow/SmartConnectMenu";

const nodeTypes = { custom: TvFlowNode };

let counter = 0;
const newId = () => `tvnode_${Date.now()}_${counter++}_${Math.floor(Math.random() * 9999)}`;

function TvBuilderInner() {
  const { id: workflowId } = useParams();
  const navigate = useNavigate();
  const isNew = !workflowId || workflowId === "new";

  const [nome, setNome] = useState("Novo workflow");
  const [ativo, setAtivo] = useState(true);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selected, setSelected] = useState<Node | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [noteNodeId, setNoteNodeId] = useState<string | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  // ─── Carregar workflow existente ────────────────────────
  useEffect(() => {
    if (isNew) return;
    (async () => {
      const { data, error } = await supabase.from("tv_workflows").select("*").eq("id", workflowId).maybeSingle();
      if (error || !data) { toast.error("Workflow não encontrado"); navigate("/tv-signage/workflows"); return; }
      setNome(data.nome);
      setAtivo(data.ativo);
      const flow = (data.flow_json as any) || { nodes: [], edges: [] };
      setNodes(flow.nodes || []);
      setEdges(flow.edges || []);
    })();
  }, [workflowId, isNew, navigate, setNodes, setEdges]);

  // ─── Drag & drop / adicionar bloco ─────────────────────
  const onDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData("application/reactflow", type);
    e.dataTransfer.effectAllowed = "move";
  };

  const addBlock = useCallback((type: string, position?: { x: number; y: number }) => {
    const def = TV_BLOCK_BY_TYPE[type];
    if (!def) return;
    const pos = position || screenToFlowPosition({
      x: (wrapperRef.current?.clientWidth || 800) / 2,
      y: (wrapperRef.current?.clientHeight || 500) / 2,
    });
    const node: Node = {
      id: newId(),
      type: "custom",
      position: pos,
      data: {
        type,
        label: def.label,
        config: JSON.parse(JSON.stringify(def.defaultData)),
      } as unknown as Record<string, unknown>,
    };
    setNodes((nds) => nds.concat(node));
  }, [screenToFlowPosition, setNodes]);

  useEffect(() => {
    const handler = (e: any) => addBlock(e.detail.type);
    window.addEventListener("tv-workflow:add-block", handler);
    return () => window.removeEventListener("tv-workflow:add-block", handler);
  }, [addBlock]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("application/reactflow");
    if (!type) return;
    const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    addBlock(type, pos);
  }, [screenToFlowPosition, addBlock]);

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };

  const onConnect = useCallback((c: Connection) => {
    setEdges((eds) => addEdge({ ...c, type: "smoothstep", animated: true }, eds));
  }, [setEdges]);

  // ─── Smart connect (arrastar linha → menu de blocos compatíveis) ───
  const connectStartRef = useRef<{
    nodeId: string | null;
    handleId: string | null;
    handleType: "source" | "target";
  } | null>(null);
  const [connectMenu, setConnectMenu] = useState<null | {
    x: number; y: number; flowX: number; flowY: number;
    fromNodeId: string; fromHandleId: string | null;
    handleType: "source" | "target";
  }>(null);

  const onConnectStart = useCallback((_: any, params: any) => {
    connectStartRef.current = {
      nodeId: params.nodeId,
      handleId: params.handleId,
      handleType: params.handleType,
    };
  }, []);

  const onConnectEnd = useCallback((event: any) => {
    const start = connectStartRef.current;
    connectStartRef.current = null;
    if (!start || !start.nodeId) return;
    const target = event.target as HTMLElement;
    const droppedOnPane = target?.classList?.contains("react-flow__pane");
    if (!droppedOnPane) return;
    const clientX = event.clientX ?? event.changedTouches?.[0]?.clientX;
    const clientY = event.clientY ?? event.changedTouches?.[0]?.clientY;
    if (clientX == null) return;
    const flowPos = screenToFlowPosition({ x: clientX, y: clientY });
    setConnectMenu({
      x: clientX, y: clientY,
      flowX: flowPos.x, flowY: flowPos.y,
      fromNodeId: start.nodeId,
      fromHandleId: start.handleId,
      handleType: start.handleType,
    });
  }, [screenToFlowPosition]);

  const smartBlockOptions: SmartBlockOption[] = useMemo(() => {
    if (!connectMenu) return [];
    // Arrastando da SAÍDA → precisa que o próximo bloco tenha entrada (hasInput !== false)
    // Arrastando da ENTRADA → precisa que o bloco anterior possa gerar saída (sempre pode)
    return TV_BLOCK_DEFINITIONS.filter((b) => {
      if (connectMenu.handleType === "source") {
        return b.hasInput !== false; // exclui gatilhos como destino
      }
      return true;
    }).map((b) => ({
      type: b.type,
      label: b.label,
      description: b.description,
      icon: "▫️",
      category: b.group,
    }));
  }, [connectMenu]);

  const handleSmartPick = useCallback((type: string) => {
    if (!connectMenu) return;
    const def = TV_BLOCK_BY_TYPE[type];
    if (!def) return;
    const node: Node = {
      id: newId(),
      type: "custom",
      position: { x: connectMenu.flowX - 120, y: connectMenu.flowY - 40 },
      data: {
        type,
        label: def.label,
        config: JSON.parse(JSON.stringify(def.defaultData)),
      } as unknown as Record<string, unknown>,
    };
    setNodes((nds) => nds.concat(node));
    setEdges((eds) => {
      const conn: Connection =
        connectMenu.handleType === "source"
          ? { source: connectMenu.fromNodeId, sourceHandle: connectMenu.fromHandleId ?? null, target: node.id, targetHandle: null }
          : { source: node.id, sourceHandle: null, target: connectMenu.fromNodeId, targetHandle: connectMenu.fromHandleId ?? null };
      return addEdge({ ...conn, type: "smoothstep", animated: true } as any, eds);
    });
    setConnectMenu(null);
    toast.success(`Bloco "${def.label}" adicionado`);
  }, [connectMenu, setNodes, setEdges]);


  // ─── Atualizar / excluir bloco ─────────────────────────
  const updateNode = (id: string, patch: Partial<TvFlowNodeData>) => {
    setNodes((nds) => nds.map((n) => {
      if (n.id !== id) return n;
      const nd = n.data as unknown as TvFlowNodeData;
      return { ...n, data: { ...nd, ...patch } as unknown as Record<string, unknown> };
    }));
    if (selected?.id === id) {
      setSelected((s) => s ? {
        ...s,
        data: { ...(s.data as any), ...patch },
      } as Node : s);
    }
  };

  const deleteNode = (id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setSelected(null);
    setConfirmDelete(null);
  };

  const duplicateNode = (id: string) => {
    setNodes((nds) => {
      const src = nds.find((n) => n.id === id);
      if (!src) return nds;
      const clone: Node = {
        ...src,
        id: newId(),
        position: { x: src.position.x + 40, y: src.position.y + 40 },
        data: JSON.parse(JSON.stringify(src.data)),
        selected: false,
      };
      return nds.concat(clone);
    });
  };

  const toggleFlag = (id: string, flag: "isBreakpoint" | "isSkipped") => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id
          ? ({ ...n, data: { ...(n.data as any), [flag]: !(n.data as any)?.[flag] } } as Node)
          : n,
      ),
    );
  };

  const clearDebug = (id: string) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id
          ? ({ ...n, data: { ...(n.data as any), isBreakpoint: false, isSkipped: false } } as Node)
          : n,
      ),
    );
  };

  const saveNote = (nota: string) => {
    if (!noteNodeId) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === noteNodeId ? ({ ...n, data: { ...(n.data as any), nota } } as Node) : n,
      ),
    );
    setNoteNodeId(null);
  };

  // Inject handlers into every node's data so TvFlowNode can call them.
  const nodesWithHandlers = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: {
          ...(n.data as any),
          onDelete: (id: string) => setConfirmDelete(id),
          onDuplicate: duplicateNode,
          onSetBreakpoint: (id: string) => toggleFlag(id, "isBreakpoint"),
          onSetSkip: (id: string) => toggleFlag(id, "isSkipped"),
          onAddNote: (id: string) => setNoteNodeId(id),
          onClearDebug: clearDebug,
        },
      })),
    [nodes],
  );

  const noteNode = nodes.find((n) => n.id === noteNodeId);

  // ─── Salvar ────────────────────────────────────────────
  const primeiroGatilho = useMemo(() => {
    const g = nodes.find((n) => (n.data as any)?.type?.startsWith("gatilho_"));
    return (g?.data as any)?.config?.evento || "manual";
  }, [nodes]);

  const primeiraAcaoBarra = useMemo(() => {
    return nodes.find((n) => (n.data as any)?.type === "acao_barra");
  }, [nodes]);

  const salvar = async () => {
    if (!nome.trim()) { toast.error("Informe o nome"); return; }
    setSaving(true);
    const estId = await getEstabelecimentoId();
    if (!estId) { toast.error("Estabelecimento não encontrado"); setSaving(false); return; }

    const barraCfg = (primeiraAcaoBarra?.data as any)?.config || {};

    const payload: any = {
      nome,
      ativo,
      estabelecimento_id: estId,
      evento: primeiroGatilho,
      mensagem_template: barraCfg.mensagem || "",
      duracao_segundos: barraCfg.duracao_segundos || 8,
      estilo: barraCfg.estilo || {},
      escopo_tipo: "todos",
      escopo_ids: [],
      dashboard_id: null,
      filtros: {},
      flow_json: { nodes, edges },
    };

    let res;
    if (isNew) {
      res = await supabase.from("tv_workflows").insert(payload).select().single();
    } else {
      res = await supabase.from("tv_workflows").update(payload).eq("id", workflowId).select().single();
    }
    setSaving(false);
    if (res.error) { toast.error("Erro ao salvar: " + res.error.message); return; }
    toast.success("Workflow salvo");
    if (isNew && res.data) navigate(`/tv-signage/workflows/${(res.data as any).id}/builder`, { replace: true });
  };

  const testar = async () => {
    if (isNew) { toast.error("Salve o workflow antes de testar"); return; }
    const { data, error } = await supabase.functions.invoke("tv-workflow-dispatch", {
      body: { workflow_id: workflowId, evento: primeiroGatilho, payload: {} },
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`Disparado para ${data?.execucoes ?? 0} dispositivo(s)`);
  };

  return (
    <div className="fixed inset-0 top-16 flex flex-col bg-background">
      <header className="border-b px-4 py-3 flex items-center gap-3 bg-card/50">
        <Button variant="ghost" size="sm" onClick={() => navigate("/tv-signage/workflows")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <div className="h-6 w-px bg-border" />
        {!libraryOpen && (
          <Button variant="outline" size="sm" onClick={() => setLibraryOpen(true)}>
            <Menu className="w-4 h-4 mr-1" /> Blocos
          </Button>
        )}
        <Input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="max-w-sm font-medium"
          placeholder="Nome do workflow"
        />
        <Badge variant={ativo ? "default" : "secondary"}>{ativo ? "Ativo" : "Inativo"}</Badge>
        <Switch checked={ativo} onCheckedChange={setAtivo} />
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={testar} disabled={isNew}>
            <Play className="w-4 h-4 mr-1" /> Testar
          </Button>
          <Button size="sm" onClick={salvar} disabled={saving}>
            <Save className="w-4 h-4 mr-1" /> {saving ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <TvBlockLibrary onDragStart={onDragStart} isExpanded={libraryOpen} onToggleExpand={() => setLibraryOpen((o) => !o)} />

        <div ref={wrapperRef} className="flex-1 relative" onDrop={onDrop} onDragOver={onDragOver}>
          <ReactFlow
            nodes={nodesWithHandlers}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, n) => setSelected(n)}
            onPaneClick={() => setSelected(null)}
            nodeTypes={nodeTypes}
            fitView
            defaultEdgeOptions={{ type: "smoothstep", animated: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
            <Controls />
            <MiniMap pannable zoomable className="!bg-card !border-border" />
          </ReactFlow>

          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center text-muted-foreground">
                <p className="text-sm">Arraste blocos da lateral esquerda para começar</p>
                <p className="text-xs mt-1">Comece com um <strong>Gatilho</strong> → adicione condições/ações</p>
              </div>
            </div>
          )}
        </div>

        {selected && (
          <TvPropertiesPanel
            node={selected}
            onChange={updateNode}
            onDelete={(id) => setConfirmDelete(id)}
            onClose={() => setSelected(null)}
          />
        )}
      </div>

      <DeleteConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        onConfirm={() => confirmDelete && deleteNode(confirmDelete)}
        title="Excluir bloco?"
        description="O bloco e suas conexões serão removidos do fluxo."
      />

      <BlockNoteDialog
        open={!!noteNodeId}
        onOpenChange={(o) => !o && setNoteNodeId(null)}
        currentNote={(noteNode?.data as any)?.nota || ""}
        onSave={saveNote}
      />
    </div>
  );
}

export default function TvWorkflowBuilder() {
  return (
    <ReactFlowProvider>
      <TvBuilderInner />
    </ReactFlowProvider>
  );
}
