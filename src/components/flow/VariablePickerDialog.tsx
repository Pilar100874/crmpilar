import { useState, useEffect } from "react";
import { Node, Edge } from "@xyflow/react";
import { FlowNodeData, NodeType } from "@/types/flow";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, Database } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VariablePickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectVariable: (variable: string) => void;
  selectedNode: Node | null;
  nodes: Node[];
  edges: Edge[];
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

    // Question blocks
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
        outputs.push(
          {
            name: config.outputVariable,
            description: `Resposta da API ${config.url || ''}`,
            type: "object"
          },
          {
            name: `${config.outputVariable}.status`,
            description: "Status HTTP da resposta",
            type: "number"
          },
          {
            name: `${config.outputVariable}.data`,
            description: "Dados retornados pela API",
            type: "object"
          }
        );
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
          description: `Resultado: ${config.formula || ''}`,
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
          description: "Confirmação de envio",
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
          description: `Dados: ${config.source || ''}`,
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

// Get all ancestor nodes
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

export const VariablePickerDialog = ({
  open,
  onClose,
  onSelectVariable,
  selectedNode,
  nodes,
  edges,
}: VariablePickerDialogProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (open) {
      setSearchQuery("");
    }
  }, [open]);

  if (!selectedNode) return null;

  const ancestorNodes = getAncestorNodes(selectedNode.id, nodes, edges);
  const allVariables: { 
    blockName: string; 
    blockType: NodeType;
    variable: { name: string; description: string; type: string };
  }[] = [];

  ancestorNodes.forEach(node => {
    const outputs = getBlockOutputVariables(node);
    outputs.forEach(variable => {
      allVariables.push({
        blockName: (node.data as FlowNodeData).label,
        blockType: (node.data as FlowNodeData).type,
        variable,
      });
    });
  });

  const filteredVariables = allVariables.filter(item => 
    item.variable.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.variable.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.blockName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] bg-background">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Selecionar Variável
          </DialogTitle>
          <DialogDescription>
            Escolha uma variável para inserir no campo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar variável..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          {filteredVariables.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">
                {searchQuery 
                  ? "Nenhuma variável encontrada"
                  : "Nenhuma variável disponível. Adicione blocos anteriores que geram variáveis."}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {filteredVariables.map((item, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    className="w-full h-auto p-4 flex flex-col items-start gap-2 hover:bg-accent"
                    onClick={() => {
                      onSelectVariable(item.variable.name);
                      onClose();
                    }}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <code className="text-sm font-mono bg-muted px-2 py-1 rounded flex-1 text-left">
                        {item.variable.name}
                      </code>
                      <Badge variant="secondary" className="text-xs">
                        {item.variable.type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 w-full text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        {item.blockName}
                      </Badge>
                      <span className="flex-1 text-left">
                        {item.variable.description}
                      </span>
                    </div>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            💡 A variável será inserida no formato <code className="bg-muted px-1 py-0.5 rounded">{"{{"} variavel {"}"}</code>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
