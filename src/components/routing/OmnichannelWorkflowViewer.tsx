import { useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type NodeTypes,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { cn } from '@/lib/utils';

interface OmnichannelWorkflowViewerProps {
  fluxoId: string;
  fluxos: any[];
}

const CustomNode = ({ data }: any) => {
  return (
    <div
      className={cn(
        "px-4 py-3 rounded-lg border-2 shadow-lg transition-all min-w-[180px] bg-background"
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 flex-shrink-0" />
        <span className="font-semibold text-sm truncate">{data.label || data.type || 'Bloco'}</span>
      </div>
      
      {data.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{data.description}</p>
      )}
    </div>
  );
};

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

export default function OmnichannelWorkflowViewer({
  fluxoId,
  fluxos,
}: OmnichannelWorkflowViewerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    const fluxo = fluxos.find(f => f.id === fluxoId);
    
    if (fluxo?.flow_data) {
      const rawFlowData = fluxo.flow_data;
      const flowData = typeof rawFlowData === 'string' ? JSON.parse(rawFlowData) : rawFlowData;
      
      if (flowData?.nodes && Array.isArray(flowData.nodes)) {
        const workflowNodes = flowData.nodes.map((node: any) => ({
          ...node,
          type: 'custom',
          data: {
            ...node.data,
          },
        }));
        
        const workflowEdges = flowData.edges || [];
        
        setNodes(workflowNodes);
        setEdges(workflowEdges);
      }
    }
  }, [fluxoId, fluxos, setNodes, setEdges]);

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/10">
        <p className="text-muted-foreground text-sm">Nenhum workflow encontrado</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-muted/10">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={1.5}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor="#06b6d4"
          className="bg-background border border-border"
        />
      </ReactFlow>
    </div>
  );
}
