import React, { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
  Zap, 
  Mail, 
  MessageSquare, 
  Database, 
  Globe, 
  Code, 
  Clock, 
  FileText,
  Send,
  Bot,
  Webhook,
  Settings,
  Play,
  Filter,
  GitBranch,
  Repeat,
  PlusCircle
} from 'lucide-react';

interface N8nWorkflowVisualizerProps {
  jsonData: string;
}

// Icon mapping for n8n node types
const getNodeIcon = (type: string) => {
  const typeLC = type.toLowerCase();
  if (typeLC.includes('trigger') || typeLC.includes('start')) return <Play className="h-4 w-4" />;
  if (typeLC.includes('webhook')) return <Webhook className="h-4 w-4" />;
  if (typeLC.includes('http') || typeLC.includes('request')) return <Globe className="h-4 w-4" />;
  if (typeLC.includes('openai') || typeLC.includes('ai') || typeLC.includes('gpt')) return <Bot className="h-4 w-4" />;
  if (typeLC.includes('email') || typeLC.includes('gmail') || typeLC.includes('smtp')) return <Mail className="h-4 w-4" />;
  if (typeLC.includes('slack') || typeLC.includes('discord') || typeLC.includes('telegram')) return <MessageSquare className="h-4 w-4" />;
  if (typeLC.includes('postgres') || typeLC.includes('mysql') || typeLC.includes('database') || typeLC.includes('supabase')) return <Database className="h-4 w-4" />;
  if (typeLC.includes('code') || typeLC.includes('function') || typeLC.includes('javascript')) return <Code className="h-4 w-4" />;
  if (typeLC.includes('schedule') || typeLC.includes('cron') || typeLC.includes('interval')) return <Clock className="h-4 w-4" />;
  if (typeLC.includes('if') || typeLC.includes('switch') || typeLC.includes('filter')) return <Filter className="h-4 w-4" />;
  if (typeLC.includes('merge') || typeLC.includes('split')) return <GitBranch className="h-4 w-4" />;
  if (typeLC.includes('loop') || typeLC.includes('batch')) return <Repeat className="h-4 w-4" />;
  if (typeLC.includes('set') || typeLC.includes('edit')) return <Settings className="h-4 w-4" />;
  if (typeLC.includes('send') || typeLC.includes('respond')) return <Send className="h-4 w-4" />;
  if (typeLC.includes('google') || typeLC.includes('sheet')) return <FileText className="h-4 w-4" />;
  return <Zap className="h-4 w-4" />;
};

// Get node color based on type
const getNodeColor = (type: string) => {
  const typeLC = type.toLowerCase();
  if (typeLC.includes('trigger') || typeLC.includes('start') || typeLC.includes('webhook')) return '#22c55e';
  if (typeLC.includes('openai') || typeLC.includes('ai') || typeLC.includes('gpt') || typeLC.includes('anthropic')) return '#8b5cf6';
  if (typeLC.includes('http') || typeLC.includes('request')) return '#3b82f6';
  if (typeLC.includes('if') || typeLC.includes('switch') || typeLC.includes('filter')) return '#f59e0b';
  if (typeLC.includes('code') || typeLC.includes('function')) return '#6366f1';
  if (typeLC.includes('email') || typeLC.includes('gmail')) return '#ef4444';
  if (typeLC.includes('database') || typeLC.includes('postgres') || typeLC.includes('supabase')) return '#06b6d4';
  if (typeLC.includes('slack') || typeLC.includes('discord')) return '#ec4899';
  return '#64748b';
};

// Custom node component
const N8nNode = ({ data }: NodeProps) => {
  const color = getNodeColor(data.type as string || '');
  
  return (
    <div 
      className="px-3 py-2 shadow-lg rounded-lg border-2 bg-background min-w-[150px] max-w-[200px]"
      style={{ borderColor: color }}
    >
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
      />
      
      <div className="flex items-center gap-2">
        <div 
          className="p-1.5 rounded-md text-white"
          style={{ backgroundColor: color }}
        >
          {getNodeIcon(data.type as string || '')}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate" title={data.label as string}>
            {data.label as string}
          </div>
          <div className="text-[10px] text-muted-foreground truncate" title={data.type as string}>
            {data.type as string}
          </div>
        </div>
      </div>
      
      <Handle 
        type="source" 
        position={Position.Right} 
        className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
      />
    </div>
  );
};

const nodeTypes = {
  n8nNode: N8nNode,
};

const N8nWorkflowVisualizer: React.FC<N8nWorkflowVisualizerProps> = ({ jsonData }) => {
  const { nodes, edges, error } = useMemo(() => {
    if (!jsonData.trim()) {
      return { nodes: [], edges: [], error: null };
    }

    try {
      const parsed = JSON.parse(jsonData);
      const n8nNodes = parsed.nodes || [];
      const n8nConnections = parsed.connections || {};

      // Convert n8n nodes to React Flow nodes
      const flowNodes: Node[] = n8nNodes.map((node: any, index: number) => {
        // Try to get position from node, or calculate a default
        let x = 100 + (index % 4) * 250;
        let y = 100 + Math.floor(index / 4) * 150;
        
        if (node.position && typeof node.position === 'object') {
          x = node.position[0] || node.position.x || x;
          y = node.position[1] || node.position.y || y;
        }

        return {
          id: node.id || node.name || `node-${index}`,
          type: 'n8nNode',
          position: { x, y },
          data: {
            label: node.name || node.displayName || `Node ${index + 1}`,
            type: node.type || 'Unknown',
            parameters: node.parameters || {},
          },
        };
      });

      // Convert n8n connections to React Flow edges
      const flowEdges: Edge[] = [];
      let edgeId = 0;

      Object.entries(n8nConnections).forEach(([sourceNodeName, connectionData]: [string, any]) => {
        const sourceNode = flowNodes.find(n => n.data.label === sourceNodeName);
        if (!sourceNode) return;

        // n8n connections structure: { "NodeName": { "main": [[{ "node": "TargetNode", "type": "main", "index": 0 }]] }}
        if (connectionData.main) {
          connectionData.main.forEach((outputs: any[], outputIndex: number) => {
            if (Array.isArray(outputs)) {
              outputs.forEach((conn: any) => {
                const targetNode = flowNodes.find(n => n.data.label === conn.node);
                if (targetNode) {
                  flowEdges.push({
                    id: `edge-${edgeId++}`,
                    source: sourceNode.id,
                    target: targetNode.id,
                    type: 'smoothstep',
                    animated: true,
                    style: { stroke: '#64748b', strokeWidth: 2 },
                  });
                }
              });
            }
          });
        }
      });

      return { nodes: flowNodes, edges: flowEdges, error: null };
    } catch (e) {
      return { nodes: [], edges: [], error: 'JSON inválido' };
    }
  }, [jsonData]);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Code className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <PlusCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Cole um JSON de workflow para visualizar</p>
        </div>
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.1}
      maxZoom={2}
      defaultEdgeOptions={{
        type: 'smoothstep',
        animated: true,
      }}
    >
      <Background color="#333" gap={16} size={1} />
      <Controls className="!bg-background !border !rounded-lg" />
      <MiniMap 
        className="!bg-background !border !rounded-lg"
        nodeColor={(node) => getNodeColor(node.data?.type as string || '')}
        maskColor="rgba(0,0,0,0.5)"
      />
    </ReactFlow>
  );
};

export default N8nWorkflowVisualizer;
