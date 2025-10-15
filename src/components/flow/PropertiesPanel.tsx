import { useState, useEffect, useRef } from "react";
import { Node, Edge } from "@xyflow/react";
import { FlowNodeData, BLOCK_DEFINITIONS } from "@/types/flow";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, X, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { VariableExplorer } from "./VariableExplorer";
import { VariableInput, VariableTextarea } from "./VariableInput";
import { VariablePickerDialog } from "./VariablePickerDialog";

interface PropertiesPanelProps {
  selectedNode: Node | null;
  onUpdateNode: (nodeId: string, data: Partial<FlowNodeData>) => void;
  onDeleteNode: (nodeId: string) => void;
  nodes: Node[];
  edges: Edge[];
}

export const PropertiesPanel = ({ 
  selectedNode, 
  onUpdateNode,
  onDeleteNode,
  nodes,
  edges
}: PropertiesPanelProps) => {
  const [hasChanges, setHasChanges] = useState(false);
  const [showVariablePicker, setShowVariablePicker] = useState(false);
  const [activeInputRef, setActiveInputRef] = useState<any>(null);
  const inputRefs = useRef<{ [key: string]: any }>({});

  useEffect(() => {
    if (hasChanges) {
      const timer = setTimeout(() => setHasChanges(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [hasChanges]);

  if (!selectedNode) {
    return (
      <div className="w-96 border-l bg-card p-4">
        <p className="text-sm text-muted-foreground">
          Clique 2x em um bloco para editar suas propriedades
        </p>
      </div>
    );
  }

  const nodeData = selectedNode.data as any;
  const blockDef = BLOCK_DEFINITIONS.find((b) => b.type === nodeData.type);

  const handleConfigChange = (key: string, value: any) => {
    console.log("Config change:", key, value);
    // Get fresh config from selectedNode to avoid stale state
    const currentConfig = (selectedNode.data as any).config || {};
    const newConfig = {
      ...currentConfig,
      [key]: value,
    };
    console.log("New config:", newConfig);
    onUpdateNode(selectedNode.id, {
      config: newConfig,
    });
    setHasChanges(true);
  };

  const handleLabelChange = (label: string) => {
    onUpdateNode(selectedNode.id, { label });
    setHasChanges(true);
  };

  const handleVariableInsert = (variableName: string) => {
    const formattedVar = `{{${variableName}}}`;
    
    if (activeInputRef?.current) {
      const input = activeInputRef.current;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const currentValue = input.value || "";
      
      const newValue = currentValue.substring(0, start) + formattedVar + currentValue.substring(end);
      
      // Update the value based on which field is active
      if (input.name) {
        handleConfigChange(input.name, newValue);
      }
      
      // Set cursor position after inserted variable
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + formattedVar.length, start + formattedVar.length);
      }, 0);
    }
  };

  const openVariablePicker = (ref: any) => {
    setActiveInputRef(ref);
    setShowVariablePicker(true);
  };

  const addCondition = () => {
    const currentConfig = (selectedNode.data as any).config || {};
    console.log("Adding condition, current conditions:", currentConfig.conditions);
    const conditions = currentConfig.conditions || [];
    const newConditions = [
      ...conditions,
      { id: `cond_${Date.now()}`, expression: "", label: "" },
    ];
    console.log("New conditions:", newConditions);
    handleConfigChange("conditions", newConditions);
  };

  const removeCondition = (index: number) => {
    const currentConfig = (selectedNode.data as any).config || {};
    const conditions = [...(currentConfig.conditions || [])];
    conditions.splice(index, 1);
    handleConfigChange("conditions", conditions);
  };

  const updateCondition = (index: number, field: string, value: any) => {
    const currentConfig = (selectedNode.data as any).config || {};
    const conditions = [...(currentConfig.conditions || [])];
    conditions[index] = { ...conditions[index], [field]: value };
    handleConfigChange("conditions", conditions);
  };

  const addHeader = () => {
    const currentConfig = (selectedNode.data as any).config || {};
    const headers = currentConfig.headers || [];
    handleConfigChange("headers", [
      ...headers,
      { key: "", value: "" },
    ]);
  };

  const updateHeader = (index: number, field: string, value: string) => {
    const currentConfig = (selectedNode.data as any).config || {};
    const headers = [...(currentConfig.headers || [])];
    headers[index] = { ...headers[index], [field]: value };
    handleConfigChange("headers", headers);
  };

  const removeHeader = (index: number) => {
    const currentConfig = (selectedNode.data as any).config || {};
    const headers = [...(currentConfig.headers || [])];
    headers.splice(index, 1);
    handleConfigChange("headers", headers);
  };

  // Get fresh config for rendering
  const config = (selectedNode.data as any).config || {};

  const renderConfigFields = () => {
    const nodeData = selectedNode.data as any;
    switch (nodeData.type) {
      case "start":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Trigger</Label>
              <Select
                value={config.trigger || "manual"}
                onValueChange={(v) => handleConfigChange("trigger", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="webhook">Webhook</SelectItem>
                  <SelectItem value="schedule">Agendado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case "message":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Mensagem</Label>
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
                  <SelectItem value="template">Template</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Conteúdo</Label>
              <VariableTextarea
                key={`content-${selectedNode.id}`}
                name="content"
                ref={(el) => (inputRefs.current['content'] = el)}
                defaultValue={config.content || config.text || ""}
                onBlur={(e) => {
                  console.log("Content blur:", e.target.value);
                  handleConfigChange("content", e.target.value);
                }}
                onChange={(e) => {
                  console.log("Content typing:", e.target.value);
                }}
                onVariableRequest={() => openVariablePicker(inputRefs.current['content'])}
                placeholder="Digite a mensagem... Pressione Ctrl+V para inserir variáveis"
                rows={6}
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                💡 Pressione <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">Ctrl+V</kbd> para inserir variáveis
              </p>
            </div>

            {config.type === "buttons" && (
              <div className="space-y-2">
                <Label>Botões (JSON)</Label>
                <Textarea
                  value={config.buttons || '[\n  {"text": "Opção 1", "value": "1"},\n  {"text": "Opção 2", "value": "2"}\n]'}
                  onChange={(e) => handleConfigChange("buttons", e.target.value)}
                  rows={4}
                  className="font-mono text-xs"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Variável de Saída (opcional)</Label>
              <Input
                value={config.outputVariable || ""}
                onChange={(e) => handleConfigChange("outputVariable", e.target.value)}
                placeholder="message_sent"
              />
            </div>
          </div>
        );

      case "question":
        return (
          <div className="space-y-4">
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
                  <SelectItem value="free">Texto Livre</SelectItem>
                  <SelectItem value="multiple">Múltipla Escolha</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Telefone</SelectItem>
                  <SelectItem value="cpf">CPF/CNPJ</SelectItem>
                  <SelectItem value="date">Data</SelectItem>
                  <SelectItem value="number">Número</SelectItem>
                  <SelectItem value="file">Arquivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Pergunta</Label>
              <VariableTextarea
                name="question"
                ref={(el) => (inputRefs.current['question'] = el)}
                value={config.question || ""}
                onChange={(e) => handleConfigChange("question", e.target.value)}
                onVariableRequest={() => openVariablePicker(inputRefs.current['question'])}
                placeholder="Qual é o seu nome? (Ctrl+V para variáveis)"
                rows={3}
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                💡 <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">Ctrl+V</kbd> para inserir variáveis
              </p>
            </div>

            <div className="space-y-2">
              <Label>Salvar resposta em (variável) *</Label>
              <Input
                value={config.variable || ""}
                onChange={(e) => handleConfigChange("variable", e.target.value)}
                placeholder="user_name"
                required
              />
              <p className="text-xs text-muted-foreground">
                Esta variável estará disponível como {"{{"}{config.variable || "variavel"}{"}}"}
              </p>
            </div>

            {config.questionType === "multiple" && (
              <div className="space-y-2">
                <Label>Opções (uma por linha)</Label>
                <Textarea
                  value={config.options || ""}
                  onChange={(e) => handleConfigChange("options", e.target.value)}
                  placeholder="Opção 1\nOpção 2\nOpção 3"
                  rows={4}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Validação (regex opcional)</Label>
              <Input
                value={config.validation || ""}
                onChange={(e) => handleConfigChange("validation", e.target.value)}
                placeholder="^[A-Za-z]+$"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Obrigatória</Label>
              <Switch
                checked={config.required !== false}
                onCheckedChange={(checked) => handleConfigChange("required", checked)}
              />
            </div>
          </div>
        );

      case "api":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Método HTTP</Label>
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
                  <SelectItem value="PATCH">PATCH</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>URL</Label>
              <VariableInput
                name="url"
                ref={(el) => (inputRefs.current['url'] = el)}
                value={config.url || ""}
                onChange={(e) => handleConfigChange("url", e.target.value)}
                onVariableRequest={() => openVariablePicker(inputRefs.current['url'])}
                placeholder="https://api.exemplo.com/endpoint (Ctrl+V para variáveis)"
              />
            </div>

            <div className="space-y-2">
              <Label>Headers</Label>
              <div className="space-y-2">
                {(config.headers || []).map((header: any, index: number) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={header.key || ""}
                      onChange={(e) => updateHeader(index, "key", e.target.value)}
                      placeholder="Authorization"
                      className="flex-1"
                    />
                    <Input
                      value={header.value || ""}
                      onChange={(e) => updateHeader(index, "value", e.target.value)}
                      placeholder="Bearer {{token}}"
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeHeader(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addHeader} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Header
                </Button>
              </div>
            </div>

            {(config.method === "POST" || config.method === "PUT" || config.method === "PATCH") && (
              <div className="space-y-2">
                <Label>Body (JSON)</Label>
                <VariableTextarea
                  name="body"
                  ref={(el) => (inputRefs.current['body'] = el)}
                  value={config.body || ""}
                  onChange={(e) => handleConfigChange("body", e.target.value)}
                  onVariableRequest={() => openVariablePicker(inputRefs.current['body'])}
                  placeholder='{\n  "key": "{{variable}}"\n}\n\nCtrl+V para inserir variáveis'
                  rows={6}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  💡 <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">Ctrl+V</kbd> para inserir variáveis
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Variável de Saída</Label>
              <Input
                value={config.outputVariable || ""}
                onChange={(e) => handleConfigChange("outputVariable", e.target.value)}
                placeholder="api_response"
              />
              <p className="text-xs text-muted-foreground">
                Resultado da API será salvo nesta variável
              </p>
            </div>

            <div className="space-y-2">
              <Label>Retries (tentativas)</Label>
              <Input
                type="number"
                value={config.retries || 3}
                onChange={(e) => handleConfigChange("retries", parseInt(e.target.value))}
                min={0}
                max={10}
              />
            </div>

            <div className="space-y-2">
              <Label>Timeout (ms)</Label>
              <Input
                type="number"
                value={config.timeout || 5000}
                onChange={(e) => handleConfigChange("timeout", parseInt(e.target.value))}
                min={1000}
                max={60000}
              />
            </div>
          </div>
        );

      case "condition":
        return (
          <div className="space-y-4">
            <div>
              <Label>Condições</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Avalia condições em ordem. Use variáveis com {"{{"} variavel {"}}"} 
              </p>
              <div className="space-y-3">
                {(config.conditions || []).map((condition: any, index: number) => (
                  <Card key={index} className="p-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">Condição {index + 1}</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCondition(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <Input
                        value={condition.expression || ""}
                        onChange={(e) =>
                          updateCondition(index, "expression", e.target.value)
                        }
                        placeholder="{{variable}} == 'valor' ou {{age}} > 18"
                      />
                      <Input
                        value={condition.label || ""}
                        onChange={(e) =>
                          updateCondition(index, "label", e.target.value)
                        }
                        placeholder="Label da saída (opcional)"
                      />
                    </div>
                  </Card>
                ))}
                <Button variant="outline" onClick={addCondition} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Condição
                </Button>
              </div>
            </div>
          </div>
        );

      case "variables":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Operação</Label>
              <Select
                value={config.operation || "set"}
                onValueChange={(v) => handleConfigChange("operation", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="set">Set (definir)</SelectItem>
                  <SelectItem value="unset">Unset (remover)</SelectItem>
                  <SelectItem value="merge">Merge (mesclar)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Variáveis (JSON)</Label>
              <Textarea
                value={config.variables || '{\n  "nome": "{{input_name}}",\n  "idade": 25\n}'}
                onChange={(e) => handleConfigChange("variables", e.target.value)}
                rows={8}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Use {"{{"} variavel {"}"} para referenciar outras variáveis
              </p>
            </div>
          </div>
        );

      case "script":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Código JavaScript</Label>
              <Textarea
                value={config.code || ""}
                onChange={(e) => handleConfigChange("code", e.target.value)}
                placeholder="// Acesse variáveis via context\n// Ex: const nome = context.user_name;\n\n// Retorne um objeto com as variáveis de saída\nreturn {\n  resultado: true,\n  mensagem: 'Sucesso'\n};"
                rows={12}
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label>Timeout (ms)</Label>
              <Input
                type="number"
                value={config.timeout || 5000}
                onChange={(e) => handleConfigChange("timeout", parseInt(e.target.value))}
                min={100}
                max={30000}
              />
            </div>
          </div>
        );

      case "delay":
        return (
          <div className="space-y-4">
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
                  <SelectItem value="days">Dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case "handoff":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Departamento</Label>
              <Input
                value={config.department || ""}
                onChange={(e) => handleConfigChange("department", e.target.value)}
                placeholder="Suporte, Vendas, etc"
              />
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select
                value={config.priority || "normal"}
                onValueChange={(v) => handleConfigChange("priority", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nota para o agente</Label>
              <Textarea
                value={config.note || ""}
                onChange={(e) => handleConfigChange("note", e.target.value)}
                placeholder="Informações de contexto para o agente..."
                rows={4}
              />
            </div>
          </div>
        );

      case "n8n":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Workflow ID</Label>
              <Input
                value={config.workflowId || ""}
                onChange={(e) => handleConfigChange("workflowId", e.target.value)}
                placeholder="1234"
              />
            </div>
            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <Input
                value={config.webhookUrl || ""}
                onChange={(e) => handleConfigChange("webhookUrl", e.target.value)}
                placeholder="https://n8n.example.com/webhook/..."
              />
            </div>
            <div className="space-y-2">
              <Label>Dados de Entrada (JSON)</Label>
              <Textarea
                value={config.inputData || '{\n  "message": "{{user_message}}"\n}'}
                onChange={(e) => handleConfigChange("inputData", e.target.value)}
                rows={6}
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label>Variável de Saída</Label>
              <Input
                value={config.outputVariable || ""}
                onChange={(e) => handleConfigChange("outputVariable", e.target.value)}
                placeholder="n8n_result"
              />
            </div>
          </div>
        );

      case "intent":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Confiança Mínima (0-1)</Label>
              <Input
                type="number"
                value={config.minConfidence || 0.7}
                onChange={(e) => handleConfigChange("minConfidence", parseFloat(e.target.value))}
                min={0}
                max={1}
                step={0.1}
              />
            </div>
            <div className="space-y-2">
              <Label>Modelo NLU (endpoint)</Label>
              <Input
                value={config.nluEndpoint || ""}
                onChange={(e) => handleConfigChange("nluEndpoint", e.target.value)}
                placeholder="https://n8n.example.com/webhook/nlu"
              />
            </div>
            <div className="space-y-2">
              <Label>Variável com o texto</Label>
              <Input
                value={config.inputVariable || ""}
                onChange={(e) => handleConfigChange("inputVariable", e.target.value)}
                placeholder="user_message"
              />
            </div>
            <div className="space-y-2">
              <Label>Variável de Saída</Label>
              <Input
                value={config.outputVariable || ""}
                onChange={(e) => handleConfigChange("outputVariable", e.target.value)}
                placeholder="detected_intent"
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-2">
            <Label>Configuração</Label>
            <p className="text-sm text-muted-foreground">
              Propriedades específicas para este bloco serão adicionadas em breve.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="w-96 border-l bg-card flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-sm mb-1">Propriedades do Bloco</h3>
            {blockDef && (
              <p className="text-xs text-muted-foreground">{blockDef.label}</p>
            )}
          </div>
          {hasChanges && (
            <Badge variant="secondary" className="animate-in fade-in">
              <Check className="w-3 h-3 mr-1" />
              Salvo
            </Badge>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <Label>Nome do Bloco</Label>
            <Input
              value={nodeData.label || ""}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder={blockDef?.label}
            />
          </div>

          <Separator />

          {renderConfigFields()}

          <Separator className="my-4" />

          <VariableExplorer 
            selectedNode={selectedNode}
            nodes={nodes}
            edges={edges}
          />
        </div>
      </ScrollArea>

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

      <VariablePickerDialog
        open={showVariablePicker}
        onClose={() => setShowVariablePicker(false)}
        onSelectVariable={handleVariableInsert}
        selectedNode={selectedNode}
        nodes={nodes}
        edges={edges}
      />
    </div>
  );
};
