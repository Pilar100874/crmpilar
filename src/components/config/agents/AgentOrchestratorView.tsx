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
import { Network, Bot, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  agents: ChatAgent[];
  onUpdate?: () => void;
}

/* ─── Custom Node ─── */
const AgentFlowNode = memo(({ data }: NodeProps & { data: Record<string, any> }) => {
  const isOrch = data.tipo_agente === 'orquestrador';
  return (
    <div className={`rounded-xl border-2 px-4 py-3 min-w-[180px] max-w-[220px] shadow-md transition-all
      ${isOrch 
        ? 'bg-primary/10 border-primary dark:bg-primary/20' 
        : 'bg-card border-border'}`}
    >
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-primary !border-2 !border-background" />
      <div className="flex items-center gap-2">
        <span className="text-2xl">{data.icone}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{data.nome}</p>
          <p className="text-[10px] text-muted-foreground truncate">{data.descricao || 'Sem descrição'}</p>
        </div>
      </div>
      <div className="flex gap-1 mt-2">
        {isOrch && (
          <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0">
            <Network className="h-3 w-3 mr-0.5" />Orquestrador
          </Badge>
        )}
        <Badge variant={data.ativo ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
          {data.ativo ? 'Ativo' : 'Inativo'}
        </Badge>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-primary !border-2 !border-background" />
    </div>
  );
});
AgentFlowNode.displayName = 'AgentFlowNode';

const nodeTypes = { agentNode: AgentFlowNode };

/* ─── Layout helpers ─── */
function buildLayout(agents: ChatAgent[]): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const placed = new Set<string>();

  const orchestrators = agents.filter(a => a.tipo_agente === 'orquestrador');
  const allSubIds = new Set(orchestrators.flatMap(o => o.sub_agent_ids || []));
  const roots = orchestrators.filter(o => !allSubIds.has(o.id));

  let globalX = 0;

  function placeTree(agent: ChatAgent, x: number, y: number): number {
    if (placed.has(agent.id)) return x;
    placed.add(agent.id);

    const subIds = agent.sub_agent_ids || [];
    const children = agents.filter(a => subIds.includes(a.id));

    if (children.length === 0) {
      nodes.push({
        id: agent.id,
        type: 'agentNode',
        position: { x, y },
        data: { ...agent },
      });
      return x + 250;
    }

    let childX = x;
    for (const child of children) {
      const nextX = placeTree(child, childX, y + 160);
      edges.push({
        id: `${agent.id}->${child.id}`,
        source: agent.id,
        target: child.id,
        animated: true,
        style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary))' },
      });
      childX = nextX;
    }

    const centerX = (x + childX - 250) / 2;
    nodes.push({
      id: agent.id,
      type: 'agentNode',
      position: { x: centerX, y },
      data: { ...agent },
    });

    return childX;
  }

  for (const root of roots) {
    globalX = placeTree(root, globalX, 40);
    globalX += 80;
  }

  // Unlinked agents
  const unlinked = agents.filter(a => !placed.has(a.id));
  unlinked.forEach((agent, i) => {
    nodes.push({
      id: agent.id,
      type: 'agentNode',
      position: { x: i * 250, y: (roots.length > 0 ? 500 : 40) },
      data: { ...agent },
    });
  });

  return { nodes, edges };
}

/* ─── Main Component ─── */
export default function AgentOrchestratorView({ agents, onUpdate }: Props) {
  const initialLayout = useMemo(() => buildLayout(agents), [agents]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialLayout.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialLayout.edges);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const layout = buildLayout(agents);
    setNodes(layout.nodes);
    setEdges(layout.edges);
    setHasChanges(false);
  }, [agents]);

  const onConnect = useCallback((params: Connection) => {
    // Only orchestrators can be sources
    const sourceAgent = agents.find(a => a.id === params.source);
    if (!sourceAgent || sourceAgent.tipo_agente !== 'orquestrador') {
      toast.error('Somente orquestradores podem ter sub-agentes');
      return;
    }
    // Prevent self-loop
    if (params.source === params.target) return;
    // Prevent circular: target's subtree shouldn't contain source
    const wouldCycle = (targetId: string, visited = new Set<string>()): boolean => {
      if (visited.has(targetId)) return false;
      visited.add(targetId);
      const targetAgent = agents.find(a => a.id === targetId);
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
  }, [agents, setEdges]);

  const onEdgesDelete = useCallback(() => {
    setHasChanges(true);
  }, []);

  const handleSave = useCallback(async () => {
    // Build sub_agent_ids map from edges
    const subMap: Record<string, string[]> = {};
    agents.forEach(a => { subMap[a.id] = []; });
    edges.forEach(e => {
      if (!subMap[e.source]) subMap[e.source] = [];
      subMap[e.source].push(e.target);
    });

    // Update each orchestrator
    const promises = agents
      .filter(a => a.tipo_agente === 'orquestrador')
      .map(a =>
        supabase
          .from('chat_agents')
          .update({ sub_agent_ids: subMap[a.id] || [] })
          .eq('id', a.id)
      );

    const results = await Promise.all(promises);
    const hasError = results.some(r => r.error);
    if (hasError) {
      toast.error('Erro ao salvar vínculos');
    } else {
      toast.success('Vínculos salvos com sucesso');
      setHasChanges(false);
      onUpdate?.();
    }
  }, [agents, edges, onUpdate]);

  const handleReset = useCallback(() => {
    const layout = buildLayout(agents);
    setNodes(layout.nodes);
    setEdges(layout.edges);
    setHasChanges(false);
  }, [agents, setNodes, setEdges]);

  if (agents.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg border-dashed">
        <Network className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground">Nenhum agente configurado</p>
        <p className="text-xs text-muted-foreground mt-1">Crie agentes para montar a hierarquia visual</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Arraste conexões de um <strong>orquestrador</strong> (saída inferior) para qualquer agente (entrada superior). Delete arestas com backspace.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} disabled={!hasChanges}>
            <RotateCcw className="h-4 w-4 mr-1" /> Desfazer
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!hasChanges}>
            <Save className="h-4 w-4 mr-1" /> Salvar vínculos
          </Button>
        </div>
      </div>

      <div className="border rounded-xl overflow-hidden" style={{ height: 520 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={(changes) => { onEdgesChange(changes); if (changes.some(c => c.type === 'remove')) setHasChanges(true); }}
          onConnect={onConnect}
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
      </div>
    </div>
  );
}
