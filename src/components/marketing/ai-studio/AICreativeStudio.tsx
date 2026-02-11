import React, { useState, useCallback, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Panel,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Play, Save, Trash2, Undo, Redo, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { toast } from 'sonner';
import { StudioNode, StudioEdge, StudioNodeData, NODE_CATEGORIES, getNodeMeta } from './types';
import StudioNodeComponent from './StudioNodeComponent';
import StudioNodeLibrary from './StudioNodeLibrary';
import StudioNodeConfigPanel from './StudioNodeConfigPanel';
import { useStudioExecution } from './useStudioExecution';

const nodeTypes = {
  studioNode: StudioNodeComponent,
};

const initialNodes: StudioNode[] = [];
const initialEdges: StudioEdge[] = [];

const AICreativeStudioInner: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<StudioNode | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const { executeWorkflow, isExecuting } = useStudioExecution();

  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) => addEdge({ ...connection, animated: true, style: { stroke: '#6366f1', strokeWidth: 2 } }, eds));
  }, [setEdges]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/studioNodeType');
    if (!type) return;

    const meta = getNodeMeta(type as any);
    if (!meta) return;

    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });

    const newNode: StudioNode = {
      id: `${type}_${Date.now()}`,
      type: 'studioNode',
      position,
      data: {
        label: meta.label,
        type: type as any,
        config: { ...meta.defaultConfig },
      },
    };

    setNodes((nds) => [...nds, newNode]);
  }, [screenToFlowPosition, setNodes]);

  const onNodeClick = useCallback((_: any, node: any) => {
    setSelectedNode(node as StudioNode);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const updateNodeConfig = useCallback((nodeId: string, config: Record<string, any>) => {
    setNodes((nds) => nds.map((n) => {
      if (n.id === nodeId) {
        const d = n.data as StudioNodeData;
        return { ...n, data: { ...d, config: { ...d.config, ...config } } };
      }
      return n;
    }));
    if (selectedNode && selectedNode.id === nodeId) {
      setSelectedNode((prev) => prev ? { ...prev, data: { ...prev.data, config: { ...prev.data.config, ...config } } } : null);
    }
  }, [setNodes, selectedNode]);

  const deleteSelected = useCallback(() => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
      setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
      setSelectedNode(null);
    }
  }, [selectedNode, setNodes, setEdges]);

  const handleExecute = useCallback(async () => {
    try {
      const updatedNodes = await executeWorkflow(nodes as StudioNode[], edges);
      setNodes(updatedNodes as any);
      toast.success('Workflow executado com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao executar workflow');
    }
  }, [nodes, edges, executeWorkflow, setNodes]);

  const clearAll = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
  }, [setNodes, setEdges]);

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[600px] border rounded-xl overflow-hidden bg-background">
      {/* Node Library */}
      <StudioNodeLibrary />

      {/* Canvas */}
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          snapToGrid
          snapGrid={[16, 16]}
          className="bg-muted/10"
          defaultEdgeOptions={{ animated: true, style: { stroke: '#6366f1', strokeWidth: 2 } }}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="hsl(var(--muted-foreground) / 0.15)" />
          <Controls 
            showInteractive={false}
            className="!bg-background !border-border !shadow-lg !rounded-lg"
          />
          <MiniMap 
            className="!bg-background !border-border !rounded-lg"
            nodeColor={(n) => {
              const meta = getNodeMeta((n.data as StudioNodeData)?.type);
              return meta?.color || '#64748b';
            }}
          />

          {/* Toolbar */}
          <Panel position="top-center">
            <div className="flex items-center gap-2 bg-background/95 backdrop-blur border rounded-xl px-4 py-2 shadow-lg">
              <Button
                size="sm"
                variant="default"
                onClick={handleExecute}
                disabled={isExecuting || nodes.length === 0}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                {isExecuting ? 'Executando...' : 'Executar'}
              </Button>
              <div className="w-px h-6 bg-border" />
              <Button size="icon" variant="ghost" onClick={deleteSelected} disabled={!selectedNode} title="Excluir nó">
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={clearAll} title="Limpar tudo">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </Panel>

          {/* Empty state */}
          {nodes.length === 0 && (
            <Panel position="top-center" className="!top-1/2 !-translate-y-1/2">
              <div className="text-center text-muted-foreground p-8">
                <div className="text-6xl mb-4">🎨</div>
                <h3 className="text-lg font-semibold mb-2">AI Creative Studio</h3>
                <p className="text-sm max-w-md">
                  Arraste blocos do painel lateral para criar seu workflow de IA.
                  Conecte os nós para definir o fluxo de processamento.
                </p>
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>

      {/* Config Panel */}
      {selectedNode && (
        <StudioNodeConfigPanel
          node={selectedNode}
          onUpdateConfig={updateNodeConfig}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
};

const AICreativeStudio: React.FC = () => (
  <ReactFlowProvider>
    <AICreativeStudioInner />
  </ReactFlowProvider>
);

export default AICreativeStudio;
