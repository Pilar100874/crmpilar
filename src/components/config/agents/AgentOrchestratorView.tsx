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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Network, Bot, Save, RotateCcw, Plus, ArrowLeft, Search, Trash2, Edit, MoreVertical, Power, PowerOff, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  agents: ChatAgent[];
  estabelecimentoId: string;
  onUpdate?: () => void;
  onCreateAgent?: () => void;
  onEditAgent?: (agent: ChatAgent) => void;
  onDeleteAgent?: (agent: ChatAgent) => void;
}

/* ─── Custom Node with context menu ─── */
const AgentFlowNode = memo(({ data }: NodeProps & { data: Record<string, any> }) => {
  const isOrch = data.tipo_agente === 'orquestrador';
  const isDisabled = data._disabled;

  return (
    <div className={`rounded-xl border-2 px-4 py-3 min-w-[180px] max-w-[220px] shadow-md transition-all
      ${isDisabled ? 'opacity-40 grayscale' : ''}
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
      <div className="flex gap-1 mt-2">
        {isOrch && (
          <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0">
            <Network className="h-3 w-3 mr-0.5" />Orquestrador
          </Badge>
        )}
        <Badge variant={data.ativo && !isDisabled ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
          {isDisabled ? 'Desativado' : data.ativo ? 'Ativo' : 'Inativo'}
        </Badge>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-primary !border-2 !border-background" />
    </div>
  );
});
AgentFlowNode.displayName = 'AgentFlowNode';

const nodeTypes = { agentNode: AgentFlowNode };

/* ─── Layout builder ─── */
function buildWorkflowLayout(orchestrator: ChatAgent, allAgents: ChatAgent[], disabledNodes: Set<string>): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const placed = new Set<string>();

  function placeTree(agent: ChatAgent, x: number, y: number): number {
    if (placed.has(agent.id)) return x;
    placed.add(agent.id);

    const subIds = agent.sub_agent_ids || [];
    const children = allAgents.filter(a => subIds.includes(a.id));

    if (children.length === 0) {
      nodes.push({ id: agent.id, type: 'agentNode', position: { x, y }, data: { ...agent, _disabled: disabledNodes.has(agent.id) } });
      return x + 250;
    }

    let childX = x;
    for (const child of children) {
      const nextX = placeTree(child, childX, y + 160);
      edges.push({
        id: `${agent.id}->${child.id}`,
        source: agent.id,
        target: child.id,
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

    const centerX = (x + childX - 250) / 2;
    nodes.push({ id: agent.id, type: 'agentNode', position: { x: centerX, y }, data: { ...agent, _disabled: disabledNodes.has(agent.id) } });
    return childX;
  }

  placeTree(orchestrator, 40, 40);
  return { nodes, edges };
}

/* ─── Workflow Canvas ─── */
function WorkflowCanvas({ orchestrator, allAgents, onUpdate, onBack, onCreateAgent, onEditAgent, onDeleteAgent }: {
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
    const layout = buildWorkflowLayout(orchestrator, allAgents, disabledNodes);
    setNodes(layout.nodes);
    setEdges(layout.edges);
    setHasChanges(false);
  }, [orchestrator, allAgents]);

  // Update node visuals when disabledNodes changes
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
      const targetAgent = allAgents.find(a => a.id === targetId);
      if (!targetAgent) return false;
      const subs = targetAgent.sub_agent_ids || [];
      if (subs.includes(params.source!)) return true;
      return subs.some(s => wouldCycle(s, visited));
    };
    if (wouldCycle(params.target!)) {
      toast.error('Conexão circular detectada');
      return;
    }

    setEdges(eds => addEdge({
      ...params,
      animated: true,
      style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary))' },
    }, eds));
    setHasChanges(true);
  }, [allAgents, setEdges]);

  const handleAddToCanvas = useCallback((agent: ChatAgent) => {
    const maxY = nodes.reduce((max, n) => Math.max(max, n.position.y), 0);
    const xOffset = (nodes.length % 4) * 250;
    const newNode: Node = {
      id: agent.id,
      type: 'agentNode',
      position: { x: xOffset + 40, y: maxY + 200 },
      data: { ...agent, _disabled: false },
    };
    setNodes(nds => [...nds, newNode]);
    setHasChanges(true);
    toast.success(`${agent.nome} adicionado ao workflow`);
  }, [nodes, setNodes]);

  const handleRemoveFromCanvas = useCallback((agentId: string) => {
    if (agentId === orchestrator.id) {
      toast.error('Não é possível remover o orquestrador raiz');
      return;
    }
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
      if (next.has(agentId)) next.delete(agentId);
      else next.add(agentId);
      return next;
    });
    setHasChanges(true);
  }, [orchestrator.id]);

  const handleSave = useCallback(async () => {
    const subMap: Record<string, string[]> = {};
    nodes.forEach(n => { subMap[n.id] = []; });
    edges.forEach(e => {
      if (!subMap[e.source]) subMap[e.source] = [];
      if (!subMap[e.source].includes(e.target)) subMap[e.source].push(e.target);
    });

    const orchIds = nodes.filter(n => {
      const agent = allAgents.find(a => a.id === n.id);
      return agent?.tipo_agente === 'orquestrador';
    }).map(n => n.id);

    const promises = orchIds.map(id =>
      supabase.from('chat_agents').update({ sub_agent_ids: subMap[id] || [] } as any).eq('id', id)
    );

    const results = await Promise.all(promises);
    const hasError = results.some(r => r.error);
    if (hasError) {
      toast.error('Erro ao salvar vínculos');
    } else {
      toast.success('Workflow salvo com sucesso');
      setHasChanges(false);
      onUpdate?.();
    }
  }, [nodes, edges, allAgents, onUpdate]);

  const handleReset = useCallback(() => {
    const layout = buildWorkflowLayout(orchestrator, allAgents, new Set());
    setNodes(layout.nodes);
    setEdges(layout.edges);
    setDisabledNodes(new Set());
    setHasChanges(false);
    setSelectedNodeId(null);
  }, [orchestrator, allAgents, setNodes, setEdges]);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-xl">{orchestrator.icone}</span>
            <div>
              <h3 className="text-sm font-semibold">{orchestrator.nome}</h3>
              <p className="text-xs text-muted-foreground">Workflow do orquestrador</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {selectedAgent && selectedAgent.id !== orchestrator.id && (
            <div className="flex items-center gap-1 border rounded-lg px-2 py-1 bg-muted/50">
              <span className="text-xs font-medium truncate max-w-[100px]">{selectedAgent.icone} {selectedAgent.nome}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleToggleNode(selectedAgent.id)} title={disabledNodes.has(selectedAgent.id) ? 'Ativar bloco' : 'Desativar bloco'}>
                {disabledNodes.has(selectedAgent.id) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEditAgent?.(selectedAgent)} title="Editar agente">
                <Edit className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleRemoveFromCanvas(selectedAgent.id)} title="Remover do workflow">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={handleReset} disabled={!hasChanges}>
            <RotateCcw className="h-4 w-4 mr-1" /> Desfazer
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!hasChanges}>
            <Save className="h-4 w-4 mr-1" /> Salvar Workflow
          </Button>
        </div>
      </div>

      <div className="flex gap-3" style={{ height: 560 }}>
        {/* Sidebar */}
        <div className="w-64 shrink-0 border rounded-xl overflow-hidden flex flex-col bg-card">
          <div className="p-3 border-b space-y-2">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground">Agentes Disponíveis</h4>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Buscar agente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8 h-8 text-xs" />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {availableAgents.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  {searchTerm ? 'Nenhum agente encontrado' : 'Todos os agentes já estão no workflow'}
                </p>
              )}
              {availableAgents.map(agent => (
                <div key={agent.id} className="flex items-center gap-2 p-2 rounded-lg border border-transparent hover:border-border hover:bg-muted/50 cursor-pointer transition-all group" onClick={() => handleAddToCanvas(agent)}>
                  <span className="text-lg">{agent.icone}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{agent.nome}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{agent.descricao || 'Sem descrição'}</p>
                  </div>
                  {agent.tipo_agente === 'orquestrador' && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0"><Network className="h-2.5 w-2.5" /></Badge>
                  )}
                  <Plus className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="p-2 border-t">
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={onCreateAgent}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Criar Novo Agente
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 border rounded-xl overflow-hidden relative">
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
            onPaneClick={() => setSelectedNodeId(null)}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            deleteKeyCode={['Backspace', 'Delete']}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} className="!bg-muted/30" />
            <Controls className="!bg-card !border-border !shadow-md" />
            <MiniMap
              className="!bg-card !border-border"
              nodeColor={(n) => n.data?.tipo_agente === 'orquestrador' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'}
              maskColor="hsl(var(--background) / 0.7)"
            />
          </ReactFlow>
          <div className="absolute bottom-2 left-2 text-[10px] text-muted-foreground bg-card/80 px-2 py-1 rounded">
            Clique para selecionar • Arraste conexões • Delete para apagar arestas
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component: Workflow List ─── */
export default function AgentOrchestratorView({ agents, estabelecimentoId, onUpdate, onCreateAgent, onEditAgent, onDeleteAgent }: Props) {
  const [selectedOrchestrator, setSelectedOrchestrator] = useState<ChatAgent | null>(null);

  const orchestrators = useMemo(() => agents.filter(a => a.tipo_agente === 'orquestrador'), [agents]);

  if (selectedOrchestrator) {
    const currentOrch = agents.find(a => a.id === selectedOrchestrator.id);
    if (!currentOrch) {
      setSelectedOrchestrator(null);
      return null;
    }
    return (
      <WorkflowCanvas
        orchestrator={currentOrch}
        allAgents={agents}
        onUpdate={onUpdate}
        onBack={() => setSelectedOrchestrator(null)}
        onCreateAgent={onCreateAgent}
        onEditAgent={onEditAgent}
        onDeleteAgent={onDeleteAgent}
      />
    );
  }

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
            Cada orquestrador representa um workflow. Clique para gerenciar a cascata de agentes.
          </p>
        </div>
        <Button size="sm" onClick={onCreateAgent}>
          <Plus className="h-4 w-4 mr-1" /> Novo Orquestrador
        </Button>
      </div>

      {orchestrators.length === 0 ? (
        <div className="text-center py-12 border rounded-lg border-dashed">
          <Network className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">Nenhum workflow criado</p>
          <p className="text-xs text-muted-foreground mt-1">
            Crie um agente do tipo <strong>Orquestrador</strong> para montar um workflow
          </p>
          <Button variant="link" size="sm" className="mt-2" onClick={onCreateAgent}>
            <Plus className="h-4 w-4 mr-1" /> Criar Orquestrador
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {orchestrators.map(orch => {
            const subCount = (orch.sub_agent_ids || []).length;
            const countDescendants = (agentId: string, visited = new Set<string>()): number => {
              if (visited.has(agentId)) return 0;
              visited.add(agentId);
              const agent = agents.find(a => a.id === agentId);
              if (!agent) return 0;
              const subs = agent.sub_agent_ids || [];
              return subs.length + subs.reduce((sum, id) => sum + countDescendants(id, visited), 0);
            };
            const totalDescendants = countDescendants(orch.id);

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
                        {totalDescendants > subCount && (
                          <Badge variant="outline" className="text-[10px]">
                            <Network className="h-3 w-3 mr-0.5" /> {totalDescendants} total
                          </Badge>
                        )}
                        <Badge variant={orch.ativo ? 'default' : 'secondary'} className="text-[10px]">
                          {orch.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Actions menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
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
                        {orch.ativo ? 'Desativar Workflow' : 'Ativar Workflow'}
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
          const collect = (id: string, visited = new Set<string>()) => {
            if (visited.has(id)) return;
            visited.add(id);
            const agent = agents.find(a => a.id === id);
            if (!agent) return;
            (agent.sub_agent_ids || []).forEach(subId => { allLinked.add(subId); collect(subId, visited); });
          };
          collect(o.id);
          allLinked.add(o.id);
        });
        const unlinked = agents.filter(a => !allLinked.has(a.id) && a.tipo_agente !== 'orquestrador');
        if (unlinked.length === 0) return null;
        return (
          <div className="mt-4 p-3 rounded-lg border border-dashed bg-muted/30">
            <p className="text-xs text-muted-foreground mb-2">
              <Bot className="h-3.5 w-3.5 inline mr-1" />
              {unlinked.length} agente{unlinked.length !== 1 ? 's' : ''} não vinculado{unlinked.length !== 1 ? 's' : ''} a nenhum workflow
            </p>
            <div className="flex flex-wrap gap-1">
              {unlinked.map(a => (
                <Badge key={a.id} variant="outline" className="text-xs">{a.icone} {a.nome}</Badge>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
