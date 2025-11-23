import { useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type NodeTypes,
  BackgroundVariant,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Network } from 'lucide-react';
import VariableMonitor from './VariableMonitor';

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
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 flex-shrink-0" />
        <span className="font-semibold text-sm truncate">{data.label || data.type || 'Bloco'}</span>
      </div>
      
      {data.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{data.description}</p>
      )}
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
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
  const [workflowVariables, setWorkflowVariables] = useState<Record<string, any>>({});

  useEffect(() => {
    console.log('🔄 Atualizando workflow para fluxoId:', fluxoId);
    const fluxo = fluxos.find(f => f.id === fluxoId);
    
    if (fluxo?.flow_data) {
      const rawFlowData = fluxo.flow_data;
      const flowData = typeof rawFlowData === 'string' ? JSON.parse(rawFlowData) : rawFlowData;
      
      if (flowData?.nodes && Array.isArray(flowData.nodes)) {
        console.log('✅ Workflow carregado:', flowData.nodes.length, 'nodes');
        const workflowNodes = flowData.nodes.map((node: any) => ({
          ...node,
          type: 'custom',
          data: {
            ...node.data,
          },
        }));
        
        const workflowEdges = flowData.edges || [];
        
        // Extrair variáveis do workflow
        const variables: Record<string, any> = {};
        workflowNodes.forEach((node: any) => {
          if (node.data?.config) {
            Object.entries(node.data.config).forEach(([key, value]) => {
              if (key && value !== undefined) {
                variables[`${node.data.label || node.id}_${key}`] = value;
              }
            });
          }
        });
        
        setNodes(workflowNodes);
        setEdges(workflowEdges);
        setWorkflowVariables(variables);
      }
    } else {
      console.warn('⚠️ Nenhum workflow encontrado para:', fluxoId);
      setNodes([]);
      setEdges([]);
      setWorkflowVariables({});
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
    <div className="flex h-full gap-4">
      {/* Visualização do workflow */}
      <div className="flex-1 flex flex-col min-w-0">
        <Card className="p-4 mb-4">
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-cyan-500" />
            <h3 className="font-semibold text-sm">Workflow Omnichannel</h3>
            <Badge variant="secondary" className="ml-auto">
              {nodes.length} blocos
            </Badge>
          </div>
        </Card>

        <div className="flex-1 bg-muted/10 rounded-lg overflow-hidden">
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
            defaultEdgeOptions={{
              style: { strokeWidth: 2, stroke: '#06b6d4' },
              type: 'smoothstep',
              animated: true,
            }}
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
            <Controls showInteractive={false} />
            <MiniMap
              nodeColor="#06b6d4"
              className="bg-background border border-border"
            />
          </ReactFlow>
        </div>
      </div>

      {/* Painel lateral de variáveis à direita */}
      <div className="w-80 flex-shrink-0">
        <VariableMonitor 
          variables={workflowVariables} 
          title="Configurações do Workflow"
        />
      </div>
    </div>
  );
}
