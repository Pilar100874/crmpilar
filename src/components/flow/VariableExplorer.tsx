import { Node, Edge } from "@xyflow/react";
import { FlowNodeData, NodeType } from "@/types/flow";
import { FlowVariable } from "@/components/flow/VariableManager";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Database, Copy, CheckCircle2, Variable } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface VariableExplorerProps {
  selectedNode: Node | null;
  nodes: Node[];
  edges: Edge[];
  flowVariables?: FlowVariable[];
}

// Define what variables each block type outputs
const getBlockOutputVariables = (node: Node): { name: string; description: string; type: string }[] => {
  const data = node.data as FlowNodeData;
  const config = data.config || {};
  const outputs: { name: string; description: string; type: string }[] = [];

  switch (data.type) {
    case "start":
      outputs.push(
        { name: "user_message", description: "Mensagem do usuário", type: "string" },
        { name: "user_phone", description: "Telefone do usuário", type: "string" },
        { name: "user_name", description: "Nome do usuário", type: "string" },
        { name: "session_id", description: "ID da sessão", type: "string" },
        { name: "timestamp", description: "Data/hora do início", type: "datetime" }
      );
      break;

    // Question blocks (all ask_* types)
    case "ask_name":
    case "ask_question":
    case "ask_email":
    case "ask_number":
    case "ask_phone":
    case "ask_date":
    case "ask_file":
    case "ask_address":
    case "ask_url":
      if (config.variable) {
        outputs.push({
          name: config.variable,
          description: `Resposta: ${config.question || 'pergunta'}`,
          type: data.type === "ask_number" ? "number" : 
                data.type === "ask_date" ? "datetime" : 
                data.type === "ask_file" ? "file" : "string"
        });
      }
      break;

    case "webhook":
      if (config.outputVariable) {
        outputs.push({
          name: config.outputVariable,
          description: `Resposta da API ${config.url || ''}`,
          type: "object"
        });
        outputs.push({
          name: `${config.outputVariable}.status`,
          description: "Status HTTP da resposta",
          type: "number"
        });
        outputs.push({
          name: `${config.outputVariable}.data`,
          description: "Dados retornados pela API",
          type: "object"
        });
      }
      break;

    case "set_field":
      if (config.operations && Array.isArray(config.operations)) {
        config.operations.forEach((op: any) => {
          if (op.variable) {
            outputs.push({
              name: op.variable,
              description: `Campo definido: ${op.variable}`,
              type: "any"
            });
          }
        });
      }
      break;

    case "formulas":
      if (config.outputVariable) {
        outputs.push({
          name: config.outputVariable,
          description: `Resultado da fórmula: ${config.formula || ''}`,
          type: "any"
        });
      }
      break;

    case "ai_agent":
      if (config.outputVariable) {
        outputs.push({
          name: config.outputVariable,
          description: "Resposta do agente IA",
          type: "string"
        });
      }
      break;

    case "send_message":
    case "media":
    case "goodbye":
      if (config.outputVariable) {
        outputs.push({
          name: config.outputVariable,
          description: "Confirmação de mensagem enviada",
          type: "boolean"
        });
      }
      break;

    case "trigger_automation":
      if (config.outputVariable) {
        outputs.push({
          name: config.outputVariable,
          description: "Resultado da automação",
          type: "object"
        });
      }
      break;

    case "dynamic_data":
      if (config.outputVariable) {
        outputs.push({
          name: config.outputVariable,
          description: `Dados dinâmicos: ${config.source || ''}`,
          type: "object"
        });
      }
      break;

    case "lead_scoring":
      outputs.push({
        name: config.scoreField || "lead_score",
        description: "Pontuação do lead",
        type: "number"
      });
      break;
  }

  return outputs;
};

// Get all ancestor nodes (nodes that come before the selected node in the flow)
const getAncestorNodes = (nodeId: string, nodes: Node[], edges: Edge[]): Node[] => {
  const ancestors: Node[] = [];
  const visited = new Set<string>();

  const traverse = (currentId: string) => {
    if (visited.has(currentId)) return;
    visited.add(currentId);

    const incomingEdges = edges.filter(e => e.target === currentId);
    incomingEdges.forEach(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      if (sourceNode) {
        ancestors.push(sourceNode);
        traverse(sourceNode.id);
      }
    });
  };

  traverse(nodeId);
  return ancestors;
};

export const VariableExplorer = ({ selectedNode, nodes, edges, flowVariables = [] }: VariableExplorerProps) => {
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  if (!selectedNode) {
    return null;
  }

  const ancestorNodes = getAncestorNodes(selectedNode.id, nodes, edges);
  const availableVariables: { 
    blockName: string; 
    blockType: NodeType | "custom";
    variables: { name: string; description: string; type: string }[] 
  }[] = [];

  // Add manually created flow variables first
  if (flowVariables.length > 0) {
    availableVariables.push({
      blockName: "Variáveis Personalizadas",
      blockType: "custom" as const,
      variables: flowVariables.map(v => ({
        name: v.name,
        description: v.description || `Variável ${v.name}`,
        type: v.type
      }))
    });
  }

  // Collect variables from all ancestor blocks
  ancestorNodes.forEach(node => {
    const outputs = getBlockOutputVariables(node);
    if (outputs.length > 0) {
      availableVariables.push({
        blockName: (node.data as FlowNodeData).label,
        blockType: (node.data as FlowNodeData).type,
        variables: outputs
      });
    }
  });

  const copyToClipboard = (varName: string) => {
    const formatted = `{{${varName}}}`;
    navigator.clipboard.writeText(formatted);
    setCopiedVar(varName);
    toast.success(`Variável copiada: ${formatted}`);
    setTimeout(() => setCopiedVar(null), 2000);
  };

  if (availableVariables.length === 0) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="w-4 h-4" />
            Variáveis Disponíveis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Nenhuma variável disponível. Crie variáveis ou adicione blocos anteriores que geram variáveis.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Database className="w-4 h-4" />
          Variáveis Disponíveis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-4">
            {availableVariables.map((block, blockIdx) => (
              <div key={blockIdx} className="space-y-2">
                <div className="flex items-center gap-2">
                  {block.blockType === "custom" ? (
                    <Badge variant="default" className="text-xs bg-cyan-600 hover:bg-cyan-700">
                      <Variable className="w-3 h-3 mr-1" />
                      {block.blockName}
                    </Badge>
                  ) : (
                    <>
                      <Badge variant="outline" className="text-xs">
                        {block.blockName}
                      </Badge>
                      <span className="text-xs text-muted-foreground">({block.blockType})</span>
                    </>
                  )}
                </div>
                <div className="space-y-1 pl-2 border-l-2 border-muted">
                  {block.variables.map((variable, varIdx) => (
                    <div 
                      key={varIdx} 
                      className="flex items-center justify-between gap-2 p-2 rounded hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                            {variable.name}
                          </code>
                          <Badge variant="secondary" className="text-xs">
                            {variable.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {variable.description}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => copyToClipboard(variable.name)}
                      >
                        {copiedVar === variable.name ? (
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs text-muted-foreground">
            💡 Use <code className="bg-muted px-1 py-0.5 rounded">{"{{"} variavel {"}"}</code> para inserir valores nos campos
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
