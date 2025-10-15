import { Node } from "@xyflow/react";
import { FlowNodeData, BLOCK_DEFINITIONS } from "@/types/flow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface PropertiesPanelProps {
  selectedNode: Node | null;
  onUpdateNode: (nodeId: string, data: Partial<FlowNodeData>) => void;
  onDeleteNode: (nodeId: string) => void;
}

export const PropertiesPanel = ({ 
  selectedNode, 
  onUpdateNode,
  onDeleteNode 
}: PropertiesPanelProps) => {
  if (!selectedNode) {
    return (
      <div className="w-80 border-l bg-card p-4">
        <p className="text-sm text-muted-foreground">
          Selecione um bloco para editar suas propriedades
        </p>
      </div>
    );
  }

  const nodeData = selectedNode.data as any;
  const blockDef = BLOCK_DEFINITIONS.find((b) => b.type === nodeData.type);
  const config = nodeData.config || {};

  const handleConfigChange = (key: string, value: any) => {
    onUpdateNode(selectedNode.id, {
      config: {
        ...config,
        [key]: value,
      },
    });
  };

  const renderConfigFields = () => {
    const nodeData = selectedNode.data as any;
    switch (nodeData.type) {
      case "message":
        return (
          <>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={config.type || "text"}
                onValueChange={(v) => handleConfigChange("type", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texto</SelectItem>
                  <SelectItem value="media">Mídia</SelectItem>
                  <SelectItem value="buttons">Botões</SelectItem>
                  <SelectItem value="carousel">Carrossel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Textarea
                value={config.text || ""}
                onChange={(e) => handleConfigChange("text", e.target.value)}
                placeholder="Digite a mensagem..."
                rows={4}
              />
            </div>
          </>
        );

      case "question":
        return (
          <>
            <div className="space-y-2">
              <Label>Tipo de Pergunta</Label>
              <Select
                value={config.questionType || "free"}
                onValueChange={(v) => handleConfigChange("questionType", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Livre</SelectItem>
                  <SelectItem value="multiple">Múltipla Escolha</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Telefone</SelectItem>
                  <SelectItem value="cpf">CPF/CNPJ</SelectItem>
                  <SelectItem value="date">Data</SelectItem>
                  <SelectItem value="file">Arquivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Pergunta</Label>
              <Input
                value={config.question || ""}
                onChange={(e) => handleConfigChange("question", e.target.value)}
                placeholder="O que deseja perguntar?"
              />
            </div>
            <div className="space-y-2">
              <Label>Variável</Label>
              <Input
                value={config.variable || ""}
                onChange={(e) => handleConfigChange("variable", e.target.value)}
                placeholder="nome_variavel"
              />
            </div>
          </>
        );

      case "api":
        return (
          <>
            <div className="space-y-2">
              <Label>Método</Label>
              <Select
                value={config.method || "GET"}
                onValueChange={(v) => handleConfigChange("method", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                value={config.url || ""}
                onChange={(e) => handleConfigChange("url", e.target.value)}
                placeholder="https://api.exemplo.com/endpoint"
              />
            </div>
            <div className="space-y-2">
              <Label>Retry (tentativas)</Label>
              <Input
                type="number"
                value={config.retries || 3}
                onChange={(e) => handleConfigChange("retries", parseInt(e.target.value))}
                min={0}
                max={10}
              />
            </div>
          </>
        );

      case "delay":
        return (
          <>
            <div className="space-y-2">
              <Label>Duração</Label>
              <Input
                type="number"
                value={config.duration || 5}
                onChange={(e) => handleConfigChange("duration", parseInt(e.target.value))}
                min={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Unidade</Label>
              <Select
                value={config.unit || "seconds"}
                onValueChange={(v) => handleConfigChange("unit", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="seconds">Segundos</SelectItem>
                  <SelectItem value="minutes">Minutos</SelectItem>
                  <SelectItem value="hours">Horas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );

      case "handoff":
        return (
          <>
            <div className="space-y-2">
              <Label>Departamento</Label>
              <Input
                value={config.department || ""}
                onChange={(e) => handleConfigChange("department", e.target.value)}
                placeholder="Suporte, Vendas, etc"
              />
            </div>
            <div className="space-y-2">
              <Label>Nota</Label>
              <Textarea
                value={config.note || ""}
                onChange={(e) => handleConfigChange("note", e.target.value)}
                placeholder="Informações para o agente..."
                rows={3}
              />
            </div>
          </>
        );

      case "n8n":
        return (
          <>
            <div className="space-y-2">
              <Label>Workflow ID</Label>
              <Input
                value={config.workflowId || ""}
                onChange={(e) => handleConfigChange("workflowId", e.target.value)}
                placeholder="ID do workflow n8n"
              />
            </div>
            <div className="space-y-2">
              <Label>Webhook URL (opcional)</Label>
              <Input
                value={config.webhookUrl || ""}
                onChange={(e) => handleConfigChange("webhookUrl", e.target.value)}
                placeholder="https://..."
              />
            </div>
          </>
        );

      case "script":
        return (
          <div className="space-y-2">
            <Label>Código JavaScript</Label>
            <Textarea
              value={config.code || ""}
              onChange={(e) => handleConfigChange("code", e.target.value)}
              placeholder="// Seu código aqui\nreturn { resultado: true };"
              rows={8}
              className="font-mono text-xs"
            />
          </div>
        );

      default:
        return (
          <div className="space-y-2">
            <Label>Label</Label>
            <Input
              value={config.label || ""}
              onChange={(e) => handleConfigChange("label", e.target.value)}
              placeholder="Nome do bloco"
            />
          </div>
        );
    }
  };

  return (
    <div className="w-80 border-l bg-card flex flex-col h-full">
      <div className="p-4 border-b">
        <h3 className="font-medium text-sm">Propriedades</h3>
        {blockDef && (
          <p className="text-xs text-muted-foreground mt-1">{blockDef.label}</p>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {renderConfigFields()}
      </div>

      <div className="p-4 border-t">
        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={() => onDeleteNode(selectedNode.id)}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Excluir Bloco
        </Button>
      </div>
    </div>
  );
};
