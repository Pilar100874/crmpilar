import { useState, useCallback, useEffect, useMemo, memo } from 'react';
import { ChatAgent } from '@/hooks/useChatAgents';
import { supabase } from '@/integrations/supabase/client';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Handle,
  Position,
  Node,
  Edge,
  BackgroundVariant,
  NodeProps,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Network, Bot, Save, RotateCcw, Plus, ArrowLeft, Search, Trash2, Edit,
  MoreVertical, Power, PowerOff, Eye, EyeOff, ZoomIn, ZoomOut, Maximize2,
  Lock, Unlock, X,
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  agents: ChatAgent[];
  estabelecimentoId: string;
  onUpdate?: () => void;
  onCreateAgent?: () => void;
  onEditAgent?: (agent: ChatAgent) => void;
  onDeleteAgent?: (agent: ChatAgent) => void;
}

/* ─── Custom Node ─── */
const AgentFlowNode = memo(({ data, selected }: NodeProps & { data: Record<string, any> }) => {
  const isOrch = data.tipo_agente === 'orquestrador';
  const isDisabled = data._disabled;

  return (
    <div className={`rounded-xl border-2 px-4 py-3 min-w-[180px] max-w-[220px] shadow-md transition-all
      ${isDisabled ? 'opacity-40 grayscale' : ''}
      ${selected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
      ${isOrch
        ? 'bg-primary/10 border-primary dark:bg-primary/20'
        : 'bg-card border-border'}`}
    >
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-primary !border-2 !border-background" />
      <div className="flex items-center gap-2">
        <span className="text-2xl">{String(data.icone || '🤖')}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{String(data.nome || '')}</p>
          <p className="text-[10px] text-muted-foreground truncate">{String(data.descricao || 'Sem descrição')}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 mt-2">
        {isOrch && (
          <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0">
            <Network className="h-3 w-3 mr-0.5" />Orquestrador
          </Badge>
        )}
        <Badge variant={data.ativo && !isDisabled ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
          {isDisabled ? 'Desativado' : data.ativo ? 'Ativo' : 'Inativo'}
        </Badge>
        <div className="flex-1" />
        <button
          className="h-5 w-5 rounded flex items-center justify-center hover:bg-muted transition-colors opacity-60 hover:opacity-100"
          title="Clique para editar"
          onClick={(e) => {
            e.stopPropagation();
            window.dispatchEvent(new CustomEvent('edit-agent-node', { detail: { agentId: data.id } }));
          }}
        >
          <Edit className="h-3 w-3" />
        </button>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-primary !border-2 !border-background" />
    </div>
  );
});
AgentFlowNode.displayName = 'AgentFlowNode';

const nodeTypes = { agentNode: AgentFlowNode };

/* ─── Layout builder ─── */
function buildWorkflowLayout(orchestrator: ChatAgent, allAgents: ChatAgent[], disabledNodes: Set<string>, onEditFn?: (agent: ChatAgent) => void): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const placed = new Set<string>();

  function placeTree(agent: ChatAgent, x: number, y: number): number {
    if (placed.has(agent.id)) return x;
    placed.add(agent.id);
    const subIds = agent.sub_agent_ids || [];
    const children = allAgents.filter(a => subIds.includes(a.id));

    if (children.length === 0) {
      nodes.push({ id: agent.id, type: 'agentNode', position: { x, y }, data: { ...agent, _disabled: disabledNodes.has(agent.id), _onEdit: () => onEditFn?.(agent) } });
      return x + 260;
    }

    let childX = x;
    for (const child of children) {
      const nextX = placeTree(child, childX, y + 160);
      edges.push({
        id: `${agent.id}->${child.id}`,
        source: agent.id, target: child.id,
        animated: !disabledNodes.has(child.id),
        style: {
          stroke: disabledNodes.has(child.id) ? 'hsl(var(--muted-foreground))' : 'hsl(var(--primary))',
          strokeWidth: 2,
          strokeDasharray: disabledNodes.has(child.id) ? '5 5' : undefined,
        },
        markerEnd: { type: MarkerType.ArrowClosed, color: disabledNodes.has(child.id) ? 'hsl(var(--muted-foreground))' : 'hsl(var(--primary))' },
      });
      childX = nextX;
    }

    const centerX = (x + childX - 260) / 2;
    nodes.push({ id: agent.id, type: 'agentNode', position: { x: centerX, y }, data: { ...agent, _disabled: disabledNodes.has(agent.id), _onEdit: () => onEditFn?.(agent) } });
    return childX;
  }

  placeTree(orchestrator, 40, 40);
  return { nodes, edges };
}

/* ─── Inner Canvas (needs ReactFlowProvider parent) ─── */
function WorkflowCanvasInner({ orchestrator, allAgents, onUpdate, onBack, onCreateAgent, onEditAgent, onDeleteAgent }: {
  orchestrator: ChatAgent;
  allAgents: ChatAgent[];
  onUpdate?: () => void;
  onBack: () => void;
  onCreateAgent?: () => void;
  onEditAgent?: (agent: ChatAgent) => void;
  onDeleteAgent?: (agent: ChatAgent) => void;
}) {
  const [disabledNodes, setDisabledNodes] = useState<Set<string>>(new Set());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [workflowName, setWorkflowName] = useState(orchestrator.nome);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { zoomIn, zoomOut, fitView } = useReactFlow();

  const handleEditFromNode = useCallback((agent: ChatAgent) => {
    onEditAgent?.(agent);
  }, [onEditAgent]);

  // Listen for edit events from node buttons
  useEffect(() => {
    const handler = (e: Event) => {
      const agentId = (e as CustomEvent).detail?.agentId;
      const agent = allAgents.find(a => a.id === agentId);
      if (agent) onEditAgent?.(agent);
    };
    window.addEventListener('edit-agent-node', handler);
    return () => window.removeEventListener('edit-agent-node', handler);
  }, [allAgents, onEditAgent]);

  const initialLayout = useMemo(() => buildWorkflowLayout(orchestrator, allAgents, disabledNodes), [orchestrator, allAgents, disabledNodes]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialLayout.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialLayout.edges);

  const canvasAgentIds = useMemo(() => new Set(nodes.map(n => n.id)), [nodes]);

  const availableAgents = useMemo(() => {
    return allAgents.filter(a => {
      if (canvasAgentIds.has(a.id)) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return a.nome.toLowerCase().includes(term) || (a.descricao || '').toLowerCase().includes(term);
      }
      return true;
    });
  }, [allAgents, canvasAgentIds, searchTerm]);

  const selectedAgent = useMemo(() => {
    if (!selectedNodeId) return null;
    return allAgents.find(a => a.id === selectedNodeId) || null;
  }, [selectedNodeId, allAgents]);

  useEffect(() => {
    const layout = buildWorkflowLayout(orchestrator, allAgents, disabledNodes, handleEditFromNode);
    setNodes(layout.nodes);
    setEdges(layout.edges);
    setHasChanges(false);
    setWorkflowName(orchestrator.nome);
  }, [orchestrator, allAgents]);

  useEffect(() => {
    setNodes(nds => nds.map(n => ({
      ...n,
      data: { ...n.data, _disabled: disabledNodes.has(n.id) },
    })));
    setEdges(eds => eds.map(e => ({
      ...e,
      animated: !disabledNodes.has(e.target),
      style: {
        stroke: disabledNodes.has(e.target) ? 'hsl(var(--muted-foreground))' : 'hsl(var(--primary))',
        strokeWidth: 2,
        strokeDasharray: disabledNodes.has(e.target) ? '5 5' : undefined,
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: disabledNodes.has(e.target) ? 'hsl(var(--muted-foreground))' : 'hsl(var(--primary))' },
    })));
  }, [disabledNodes]);

  const onConnect = useCallback((params: Connection) => {
    const sourceAgent = allAgents.find(a => a.id === params.source);
    if (!sourceAgent || sourceAgent.tipo_agente !== 'orquestrador') {
      toast.error('Somente orquestradores podem ter sub-agentes');
      return;
    }
    if (params.source === params.target) return;
    const wouldCycle = (targetId: string, visited = new Set<string>()): boolean => {
      if (visited.has(targetId)) return false;
      visited.add(targetId);
      const t = allAgents.find(a => a.id === targetId);
      if (!t) return false;
      const subs = t.sub_agent_ids || [];
      if (subs.includes(params.source!)) return true;
      return subs.some(s => wouldCycle(s, visited));
    };
    if (wouldCycle(params.target!)) {
      toast.error('Conexão circular detectada');
      return;
    }
    setEdges(eds => addEdge({
      ...params, animated: true,
      style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary))' },
    }, eds));
    setHasChanges(true);
  }, [allAgents, setEdges]);

  const handleAddToCanvas = useCallback((agent: ChatAgent) => {
    const maxY = nodes.reduce((max, n) => Math.max(max, n.position.y), 0);
    const xOffset = (nodes.length % 4) * 260;
    setNodes(nds => [...nds, {
      id: agent.id, type: 'agentNode',
      position: { x: xOffset + 40, y: maxY + 200 },
      data: { ...agent, _disabled: false, _onEdit: () => handleEditFromNode(agent) },
    }]);
    setHasChanges(true);
    toast.success(`${agent.nome} adicionado`);
  }, [nodes, setNodes, handleEditFromNode]);

  const handleRemoveFromCanvas = useCallback((agentId: string) => {
    if (agentId === orchestrator.id) { toast.error('Não é possível remover o orquestrador raiz'); return; }
    setNodes(nds => nds.filter(n => n.id !== agentId));
    setEdges(eds => eds.filter(e => e.source !== agentId && e.target !== agentId));
    setDisabledNodes(prev => { const next = new Set(prev); next.delete(agentId); return next; });
    setSelectedNodeId(null);
    setHasChanges(true);
  }, [orchestrator.id, setNodes, setEdges]);

  const handleToggleNode = useCallback((agentId: string) => {
    if (agentId === orchestrator.id) return;
    setDisabledNodes(prev => {
      const next = new Set(prev);
      if (next.has(agentId)) next.delete(agentId); else next.add(agentId);
      return next;
    });
    setHasChanges(true);
  }, [orchestrator.id]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const subMap: Record<string, string[]> = {};
      nodes.forEach(n => { subMap[n.id] = []; });
      edges.forEach(e => {
        if (!subMap[e.source]) subMap[e.source] = [];
        if (!subMap[e.source].includes(e.target)) subMap[e.source].push(e.target);
      });

      const orchIds = nodes.filter(n => allAgents.find(a => a.id === n.id)?.tipo_agente === 'orquestrador').map(n => n.id);
      const promises = orchIds.map(id =>
        supabase.from('chat_agents').update({ sub_agent_ids: subMap[id] || [] } as any).eq('id', id)
      );

      // Also save name if changed
      if (workflowName !== orchestrator.nome) {
        promises.push(
          supabase.from('chat_agents').update({ nome: workflowName } as any).eq('id', orchestrator.id)
        );
      }

      const results = await Promise.all(promises);
      if (results.some(r => r.error)) {
        toast.error('Erro ao salvar workflow');
      } else {
        toast.success('Workflow salvo');
        setHasChanges(false);
        onUpdate?.();
      }
    } finally {
      setIsSaving(false);
    }
  }, [nodes, edges, allAgents, onUpdate, workflowName, orchestrator]);

  const handleReset = useCallback(() => {
    const layout = buildWorkflowLayout(orchestrator, allAgents, new Set());
    setNodes(layout.nodes);
    setEdges(layout.edges);
    setDisabledNodes(new Set());
    setHasChanges(false);
    setSelectedNodeId(null);
    setWorkflowName(orchestrator.nome);
  }, [orchestrator, allAgents, setNodes, setEdges]);

  const handleNameChange = (name: string) => {
    setWorkflowName(name);
    if (name !== orchestrator.nome) setHasChanges(true);
  };

  return (
    <div className="flex flex-col h-full">
      {/* ─── Top toolbar (same style as other workflow builders) ─── */}
      <div className="flex items-center justify-between border-b bg-card px-4 py-2 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
            <X className="h-4 w-4" />
          </Button>
          <div className="h-6 w-px bg-border" />
          <span className="text-xl">{orchestrator.icone}</span>
          {isEditingName ? (
            <Input
              value={workflowName}
              onChange={e => handleNameChange(e.target.value)}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={e => e.key === 'Enter' && setIsEditingName(false)}
              className="h-8 w-64 text-sm font-semibold"
              autoFocus
            />
          ) : (
            <button
              className="text-sm font-semibold hover:text-primary transition-colors cursor-text flex items-center gap-1.5"
              onClick={() => setIsEditingName(true)}
            >
              {workflowName}
              <Edit className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
          <Badge variant="outline" className="text-[10px]">Orquestrador</Badge>
        </div>

        <div className="flex items-center gap-1">
          {/* Selected node actions */}
          {selectedAgent && selectedAgent.id !== orchestrator.id && (
            <>
              <div className="flex items-center gap-1 border rounded-lg px-2 py-1 bg-muted/50 mr-2">
                <span className="text-xs truncate max-w-[80px]">{selectedAgent.icone} {selectedAgent.nome}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleToggleNode(selectedAgent.id)}>
                  {disabledNodes.has(selectedAgent.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEditAgent?.(selectedAgent)}>
                  <Edit className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleRemoveFromCanvas(selectedAgent.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <div className="h-6 w-px bg-border mr-1" />
            </>
          )}

          {/* Zoom controls */}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => zoomOut()}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => zoomIn()}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => fitView({ padding: 0.3 })}>
            <Maximize2 className="h-4 w-4" />
          </Button>

          <div className="h-6 w-px bg-border mx-1" />

          <Button variant="outline" size="sm" onClick={handleReset} disabled={!hasChanges}>
            <RotateCcw className="h-4 w-4 mr-1" /> Desfazer
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!hasChanges && workflowName === orchestrator.nome}>
            <Save className="h-4 w-4 mr-1" /> {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>

      {/* ─── Main area ─── */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <div className="w-60 shrink-0 border-r flex flex-col bg-card">
          <div className="p-3 border-b space-y-2">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
              <Plus className="h-3 w-3" /> Adicionar Agente
            </h4>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8 h-7 text-xs" />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {availableAgents.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  {searchTerm ? 'Nenhum encontrado' : 'Todos no workflow'}
                </p>
              )}
              {availableAgents.map(agent => (
                <div key={agent.id} className="flex items-center gap-2 p-2 rounded-lg border border-dashed border-transparent hover:border-border hover:bg-muted/50 cursor-pointer transition-all group" onClick={() => handleAddToCanvas(agent)}>
                  <span className="text-base">{agent.icone}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{agent.nome}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{agent.descricao || ''}</p>
                  </div>
                  {agent.tipo_agente === 'orquestrador' && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0"><Network className="h-2.5 w-2.5" /></Badge>
                  )}
                  <Plus className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="p-2 border-t">
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={onCreateAgent}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Novo Agente
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={(changes) => {
              onEdgesChange(changes);
              if (changes.some(c => c.type === 'remove')) setHasChanges(true);
            }}
            onConnect={onConnect}
            onNodeClick={(_e, node) => setSelectedNodeId(node.id)}
            onNodeDoubleClick={(_e, node) => {
              const agent = allAgents.find(a => a.id === node.id);
              if (agent) onEditAgent?.(agent);
            }}
            onPaneClick={() => setSelectedNodeId(null)}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            deleteKeyCode={['Backspace', 'Delete']}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} className="!bg-muted/30" />
            <MiniMap
              className="!bg-card !border-border"
              nodeColor={(n) => n.data?.tipo_agente === 'orquestrador' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'}
              maskColor="hsl(var(--background) / 0.7)"
            />
          </ReactFlow>
          <div className="absolute bottom-2 left-2 text-[10px] text-muted-foreground bg-card/80 backdrop-blur px-2 py-1 rounded-md border">
            Duplo-clique p/ editar agente • Clique p/ selecionar • Arraste conexões • Delete p/ apagar arestas
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Wrapper with ReactFlowProvider ─── */
function WorkflowCanvas(props: {
  orchestrator: ChatAgent;
  allAgents: ChatAgent[];
  onUpdate?: () => void;
  onBack: () => void;
  onCreateAgent?: () => void;
  onEditAgent?: (agent: ChatAgent) => void;
  onDeleteAgent?: (agent: ChatAgent) => void;
}) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

/* ─── Main Component: Workflow List ─── */
export default function AgentOrchestratorView({ agents, estabelecimentoId, onUpdate, onCreateAgent, onEditAgent, onDeleteAgent }: Props) {
  const [selectedOrchestrator, setSelectedOrchestrator] = useState<ChatAgent | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const orchestrators = useMemo(() => agents.filter(a => a.tipo_agente === 'orquestrador'), [agents]);

  // Fullscreen workflow canvas
  if (selectedOrchestrator) {
    const currentOrch = agents.find(a => a.id === selectedOrchestrator.id);
    if (!currentOrch) {
      setSelectedOrchestrator(null);
      return null;
    }
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        <WorkflowCanvas
          orchestrator={currentOrch}
          allAgents={agents}
          onUpdate={onUpdate}
          onBack={() => setSelectedOrchestrator(null)}
          onCreateAgent={onCreateAgent}
          onEditAgent={onEditAgent}
          onDeleteAgent={onDeleteAgent}
        />
      </div>
    );
  }

  const handleCreateWorkflow = async () => {
    if (!newWorkflowName.trim()) {
      toast.error('Digite um nome para o workflow');
      return;
    }
    setIsCreating(true);
    try {
      const { data, error } = await supabase.from('chat_agents').insert({
        estabelecimento_id: estabelecimentoId,
        nome: newWorkflowName.trim(),
        descricao: 'Workflow orquestrador',
        icone: '🧠',
        cor: '#8B5CF6',
        modo_operacao: 'automatico',
        permite_cliente: true,
        system_prompt: `Você é o orquestrador "${newWorkflowName.trim()}". Analise a intenção do usuário e direcione para o agente especialista mais adequado.`,
        modelo_ia: 'google/gemini-3-flash-preview',
        knowledge_base_type: 'nenhuma',
        tipo_agente: 'orquestrador',
        sub_agent_ids: [],
        ativo: true,
        ordem: orchestrators.length,
      } as any).select().single();

      if (error) throw error;
      toast.success(`Workflow "${newWorkflowName}" criado!`);
      setShowCreateDialog(false);
      setNewWorkflowName('');
      onUpdate?.();
      // Open the new workflow
      if (data) setSelectedOrchestrator(data as unknown as ChatAgent);
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleOrchestrator = async (orch: ChatAgent) => {
    const newStatus = !orch.ativo;
    const { error } = await supabase.from('chat_agents').update({ ativo: newStatus } as any).eq('id', orch.id);
    if (error) {
      toast.error('Erro ao atualizar status');
    } else {
      toast.success(newStatus ? 'Workflow ativado' : 'Workflow desativado');
      onUpdate?.();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Workflows de Orquestração</h3>
          <p className="text-xs text-muted-foreground">
            Cada workflow organiza uma cascata de agentes. Clique para editar.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-1" /> Novo Workflow
        </Button>
      </div>

      {orchestrators.length === 0 ? (
        <div className="text-center py-12 border rounded-lg border-dashed">
          <Network className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">Nenhum workflow criado</p>
          <p className="text-xs text-muted-foreground mt-1">
            Crie um workflow para organizar seus agentes em cascata
          </p>
          <Button variant="link" size="sm" className="mt-2" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-1" /> Criar Workflow
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {orchestrators.map(orch => {
            const subCount = (orch.sub_agent_ids || []).length;
            const countDesc = (id: string, v = new Set<string>()): number => {
              if (v.has(id)) return 0; v.add(id);
              const a = agents.find(x => x.id === id);
              if (!a) return 0;
              const s = a.sub_agent_ids || [];
              return s.length + s.reduce((sum, sid) => sum + countDesc(sid, v), 0);
            };
            const totalDesc = countDesc(orch.id);

            return (
              <Card key={orch.id} className={`p-4 transition-all ${!orch.ativo ? 'opacity-60' : 'hover:border-primary/50 hover:shadow-md'}`}>
                <div className="flex items-start gap-3">
                  <div className="cursor-pointer flex-1 min-w-0 flex items-start gap-3" onClick={() => setSelectedOrchestrator(orch)}>
                    <span className="text-3xl">{orch.icone}</span>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-semibold truncate">{orch.nome}</h4>
                      <p className="text-xs text-muted-foreground truncate">{orch.descricao || 'Sem descrição'}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline" className="text-[10px]">
                          <Bot className="h-3 w-3 mr-0.5" /> {subCount} direto{subCount !== 1 ? 's' : ''}
                        </Badge>
                        {totalDesc > subCount && (
                          <Badge variant="outline" className="text-[10px]">
                            <Network className="h-3 w-3 mr-0.5" /> {totalDesc} total
                          </Badge>
                        )}
                        <Badge variant={orch.ativo ? 'default' : 'secondary'} className="text-[10px]">
                          {orch.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSelectedOrchestrator(orch)}>
                        <Network className="h-4 w-4 mr-2" /> Abrir Workflow
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEditAgent?.(orch)}>
                        <Edit className="h-4 w-4 mr-2" /> Editar Orquestrador
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleOrchestrator(orch)}>
                        {orch.ativo ? <PowerOff className="h-4 w-4 mr-2" /> : <Power className="h-4 w-4 mr-2" />}
                        {orch.ativo ? 'Desativar' : 'Ativar'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => onDeleteAgent?.(orch)}>
                        <Trash2 className="h-4 w-4 mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Unlinked agents */}
      {(() => {
        const allLinked = new Set<string>();
        orchestrators.forEach(o => {
          const collect = (id: string, v = new Set<string>()) => {
            if (v.has(id)) return; v.add(id);
            const a = agents.find(x => x.id === id); if (!a) return;
            (a.sub_agent_ids || []).forEach(s => { allLinked.add(s); collect(s, v); });
          };
          collect(o.id); allLinked.add(o.id);
        });
        const unlinked = agents.filter(a => !allLinked.has(a.id) && a.tipo_agente !== 'orquestrador');
        if (unlinked.length === 0) return null;
        return (
          <div className="mt-4 p-3 rounded-lg border border-dashed bg-muted/30">
            <p className="text-xs text-muted-foreground mb-2">
              <Bot className="h-3.5 w-3.5 inline mr-1" />
              {unlinked.length} agente{unlinked.length !== 1 ? 's' : ''} sem workflow
            </p>
            <div className="flex flex-wrap gap-1">
              {unlinked.map(a => (
                <Badge key={a.id} variant="outline" className="text-xs">{a.icone} {a.nome}</Badge>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Create Workflow Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Network className="h-5 w-5 text-primary" /> Novo Workflow
            </DialogTitle>
            <DialogDescription>
              Crie um workflow orquestrador para organizar seus agentes em cascata
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nome do Workflow *</Label>
              <Input
                value={newWorkflowName}
                onChange={e => setNewWorkflowName(e.target.value)}
                placeholder="Ex: Atendimento Comercial, Suporte Técnico..."
                onKeyDown={e => e.key === 'Enter' && handleCreateWorkflow()}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreateWorkflow} disabled={isCreating || !newWorkflowName.trim()}>
              {isCreating ? 'Criando...' : 'Criar Workflow'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
