import { AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { OmnichannelNode, OmnichannelEdge } from "@/types/omnichannelFlow";

interface ValidationIssue {
  type: "error" | "warning" | "info";
  nodeId?: string;
  message: string;
}

interface FlowValidatorProps {
  nodes: OmnichannelNode[];
  edges: OmnichannelEdge[];
  onNodeClick?: (nodeId: string) => void;
}

export const FlowValidator = ({ nodes, edges, onNodeClick }: FlowValidatorProps) => {
  const validateFlow = (): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];
    
    // Verificar se há nó de início
    const hasStartNode = nodes.some(n => n.data.type === "inicio");
    if (!hasStartNode) {
      issues.push({
        type: "error",
        message: "Fluxo deve ter um bloco de Início"
      });
    }

    // Verificar blocos desconectados
    const connectedNodes = new Set<string>();
    edges.forEach(edge => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });

    nodes.forEach(node => {
      if (node.data.type !== "inicio" && !connectedNodes.has(node.id)) {
        issues.push({
          type: "warning",
          nodeId: node.id,
          message: `Bloco "${node.data.label}" não está conectado`
        });
      }
    });

    // Verificar configurações obrigatórias
    nodes.forEach(node => {
      const { data } = node;
      
      if (data.type === "fila") {
        if (!data.config.tipoRoteamento) {
          issues.push({
            type: "error",
            nodeId: node.id,
            message: `Fila "${data.label}" sem tipo de roteamento`
          });
        }
      }

      if (data.type === "atendente") {
        if (!data.config.atendenteId) {
          issues.push({
            type: "error",
            nodeId: node.id,
            message: `Atendente "${data.label}" sem ID configurado`
          });
        }
      }

      if (data.type === "skill") {
        if (!data.config.skillNome) {
          issues.push({
            type: "error",
            nodeId: node.id,
            message: `Skill "${data.label}" sem nome configurado`
          });
        }
      }

      if (data.type === "horario") {
        if (!data.config.diasSemana?.length) {
          issues.push({
            type: "error",
            nodeId: node.id,
            message: `Horário "${data.label}" sem dias configurados`
          });
        }
      }

      if (data.type === "webhook") {
        if (!data.config.webhookUrl) {
          issues.push({
            type: "error",
            nodeId: node.id,
            message: `Webhook "${data.label}" sem URL configurada`
          });
        }
      }
    });

    // Detectar possíveis loops
    const detectLoop = (nodeId: string, visited: Set<string>): boolean => {
      if (visited.has(nodeId)) return true;
      visited.add(nodeId);
      
      const outgoingEdges = edges.filter(e => e.source === nodeId);
      for (const edge of outgoingEdges) {
        if (detectLoop(edge.target, new Set(visited))) return true;
      }
      return false;
    };

    const startNodes = nodes.filter(n => n.data.type === "inicio");
    startNodes.forEach(startNode => {
      if (detectLoop(startNode.id, new Set())) {
        issues.push({
          type: "warning",
          message: "Possível loop infinito detectado no fluxo"
        });
      }
    });

    return issues;
  };

  const issues = validateFlow();
  const errors = issues.filter(i => i.type === "error");
  const warnings = issues.filter(i => i.type === "warning");

  if (issues.length === 0) {
    return (
      <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertTitle>Fluxo Válido</AlertTitle>
        <AlertDescription>
          Todas as verificações passaram com sucesso
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="h-5 w-5 text-destructive" />
        <h3 className="font-semibold">
          Validação do Fluxo ({errors.length} erros, {warnings.length} avisos)
        </h3>
      </div>

      <ScrollArea className="h-[200px]">
        <div className="space-y-2">
          {issues.map((issue, index) => (
            <Alert
              key={index}
              variant={issue.type === "error" ? "destructive" : "default"}
              className={issue.nodeId ? "cursor-pointer" : ""}
              onClick={() => issue.nodeId && onNodeClick?.(issue.nodeId)}
            >
              {issue.type === "error" ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertDescription className="text-sm">
                {issue.message}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
};
