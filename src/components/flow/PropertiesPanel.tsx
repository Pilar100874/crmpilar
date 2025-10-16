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
import { FlowVariable } from "./VariableManager";
import { VariableInput, VariableTextarea } from "./VariableInput";
import { VariablePickerDialog } from "./VariablePickerDialog";
import * as BlockConfigs from "./block-configs";

interface PropertiesPanelProps {
  selectedNode: Node | null;
  onUpdateNode: (nodeId: string, data: Partial<FlowNodeData>) => void;
  onDeleteNode: (nodeId: string) => void;
  nodes: Node[];
  edges: Edge[];
  flowVariables?: FlowVariable[];
}

export const PropertiesPanel = ({ 
  selectedNode, 
  onUpdateNode,
  onDeleteNode,
  nodes,
  edges,
  flowVariables = []
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

  // Determine expected type based on node type and config field
  const getExpectedType = (): "text" | "number" | "date" | "array" | "boolean" | "any" => {
    if (!selectedNode) return "any";
    
    const nodeData = selectedNode.data as FlowNodeData;
    
    switch (nodeData.type) {
      case "ask_number":
        return "number";
      case "ask_date":
        return "date";
      case "formulas":
        return "any"; // Formulas can work with any type
      case "condition":
        return "any"; // Conditions need to evaluate any type
      case "set_field":
        return "any"; // Set field can work with any type
      case "lead_scoring":
        return "number"; // Lead scoring works with numbers
      default:
        return "text"; // Most blocks work with text/string
    }
  };

  if (!selectedNode) {
    return (
      <div className="w-96 bg-gradient-to-b from-slate-900 via-slate-900/98 to-slate-800/95 backdrop-blur-sm border-l border-cyan-500/30 p-6 shadow-2xl">
        <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-blue-500/15 to-purple-500/20 border-2 border-cyan-500/40 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <span className="text-3xl">👆</span>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-white">
              Selecione um Bloco
            </p>
            <p className="text-xs text-slate-400">
              Clique em qualquer bloco no canvas para editar suas propriedades
            </p>
          </div>
        </div>
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
      
      // Update the input value directly
      input.value = newValue;
      
      // Create and dispatch a synthetic change event
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value'
      )?.set || Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(input, newValue);
      }
      
      const changeEvent = new Event('input', { bubbles: true });
      input.dispatchEvent(changeEvent);
      
      // Set cursor position after inserted variable
      setTimeout(() => {
        input.focus();
        const newPos = start + formattedVar.length;
        input.setSelectionRange(newPos, newPos);
      }, 0);
    }
  };

  const handleVariableInsertAtEnd = (variableName: string) => {
    const formattedVar = `{{${variableName}}}`;
    
    if (activeInputRef?.current) {
      const input = activeInputRef.current;
      const currentValue = input.value || "";
      const newValue = currentValue + formattedVar;
      
      // Update the input value directly
      input.value = newValue;
      
      // Create and dispatch a synthetic change event
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value'
      )?.set || Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(input, newValue);
      }
      
      const changeEvent = new Event('input', { bubbles: true });
      input.dispatchEvent(changeEvent);
      
      // Set cursor position at the end
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(newValue.length, newValue.length);
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
    const configProps = {
      config,
      handleConfigChange,
      inputRefs,
      openVariablePicker,
    };

    switch (nodeData.type) {
      // Message Blocks
      case "send_message":
        return <BlockConfigs.SendMessageConfig {...configProps} />;
      case "media":
        return <BlockConfigs.MediaConfig {...configProps} />;
      case "goodbye":
        return <BlockConfigs.GoodbyeConfigNew {...configProps} />;

      // Question Blocks
      case "ask_name":
        return <BlockConfigs.AskNameConfig {...configProps} />;
      case "ask_question":
        return <BlockConfigs.AskQuestionConfig {...configProps} />;
      case "ask_email":
        return <BlockConfigs.AskEmailConfig {...configProps} />;
      case "ask_number":
        return <BlockConfigs.AskNumberConfig {...configProps} />;
      case "ask_phone":
        return <BlockConfigs.AskPhoneConfig {...configProps} />;
      case "ask_date":
        return <BlockConfigs.AskDateConfig {...configProps} />;
      case "ask_file":
        return <BlockConfigs.AskFileConfig {...configProps} />;
      case "ask_address":
        return <BlockConfigs.AskAddressConfig {...configProps} />;
      case "ask_url":
        return <BlockConfigs.AskUrlConfig {...configProps} />;

      // Button Blocks
      case "reply_buttons":
        return <BlockConfigs.ReplyButtonsConfigNew {...configProps} />;
      case "list_buttons":
        return <BlockConfigs.ListButtonsConfigNew {...configProps} />;

      // WhatsApp Blocks
      case "keyword_options":
        return <BlockConfigs.KeywordOptionsConfig {...configProps} />;
      case "message_template":
        return <BlockConfigs.MessageTemplateConfigNew {...configProps} />;
      case "opt_in_out":
        return <BlockConfigs.OptInOutConfigNew {...configProps} />;
      case "opt_in_check":
        return <BlockConfigs.OptInCheckConfig {...configProps} />;
      case "audience":
        return <BlockConfigs.AudienceConfig {...configProps} />;

      // Logic Blocks
      case "condition":
        return <BlockConfigs.ConditionsConfigNew {...configProps} />;
      case "set_field":
        return <BlockConfigs.SetFieldConfigNew {...configProps} />;
      case "keyword_jump":
        return <BlockConfigs.KeywordJumpConfigNew {...configProps} />;
      case "global_keywords":
        return <BlockConfigs.GlobalKeywordsConfigNew {...configProps} />;
      case "formulas":
        return <BlockConfigs.FormulasConfigNew {...configProps} />;
      case "jump_to":
        return <BlockConfigs.JumpToConfig {...configProps} />;
      case "lead_scoring":
        return <BlockConfigs.LeadScoringConfigNew {...configProps} />;
      case "goal":
        return <BlockConfigs.GoalConfigNew {...configProps} />;

      // Low Code Blocks
      case "webhook":
        return <BlockConfigs.WebhookConfigNew {...configProps} />;
      case "n8n":
        return <BlockConfigs.N8nConfig {...configProps} />;
      case "trigger_automation":
        return <BlockConfigs.TriggerAutomationConfigNew {...configProps} />;
      case "dynamic_data":
        return <BlockConfigs.DynamicDataConfig {...configProps} />;
      case "ai_agent":
        return <BlockConfigs.AIAgentConfig {...configProps} />;

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
    <div className="w-96 bg-gradient-to-b from-slate-900 via-slate-900/98 to-slate-800/95 backdrop-blur-sm border-l border-cyan-500/30 flex flex-col h-full shadow-2xl flow-editor-dark">
      {/* Header aprimorado */}
      <div className="p-4 border-b border-cyan-500/30 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-blue-500/5 to-purple-500/5"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 via-blue-500/15 to-purple-500/20 border border-cyan-500/40 flex items-center justify-center shadow-lg shadow-cyan-500/10">
                <span className="text-xl">⚙️</span>
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Propriedades</h3>
                {blockDef && (
                  <p className="text-xs text-cyan-400 flex items-center gap-1.5 font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50"></div>
                    {blockDef.label}
                  </p>
                )}
              </div>
            </div>
            {hasChanges && (
              <Badge className="bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-400 border border-emerald-500/40 animate-in fade-in shadow-sm shadow-emerald-500/20">
                <Check className="w-3 h-3 mr-1" />
                Salvo
              </Badge>
            )}
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 bg-gradient-to-b from-slate-900/50 to-slate-900/30">
        <div className="p-4 space-y-4">
          {/* Nome do Bloco - Card destacado */}
          <div className="space-y-2 p-3 rounded-lg bg-gradient-to-br from-slate-800/60 to-slate-800/40 border border-cyan-500/20 shadow-md">
            <Label className="text-white text-sm font-semibold flex items-center gap-2">
              <span className="w-1 h-4 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></span>
              Nome do Bloco
            </Label>
            <Input
              value={nodeData.label || ""}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder={blockDef?.label}
              className="bg-slate-900/80 border-slate-700/50 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 shadow-inner"
            />
          </div>

          <Separator className="bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />

          <div className="space-y-4">
            {renderConfigFields()}
          </div>

          <Separator className="bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent my-4" />

          <VariableExplorer 
            selectedNode={selectedNode}
            nodes={nodes}
            edges={edges}
            flowVariables={flowVariables}
            expectedType={getExpectedType()}
          />
        </div>
      </ScrollArea>

      {/* Footer aprimorado */}
      <div className="p-4 border-t border-cyan-500/30 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
        <Button
          variant="destructive"
          size="sm"
          className="w-full bg-gradient-to-r from-red-500/10 to-red-600/10 border border-red-500/40 text-red-400 hover:from-red-500/20 hover:to-red-600/20 hover:text-red-300 hover:border-red-500/60 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg hover:shadow-red-500/10 transition-all"
          onClick={() => onDeleteNode(selectedNode.id)}
          disabled={nodeData.type === "start"}
          title={nodeData.type === "start" ? "O bloco Start não pode ser excluído" : "Excluir bloco"}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Excluir Bloco
        </Button>
      </div>

      <VariablePickerDialog
        open={showVariablePicker}
        onClose={() => setShowVariablePicker(false)}
        onSelectVariable={handleVariableInsert}
        onInsertAtEnd={handleVariableInsertAtEnd}
        selectedNode={selectedNode}
        nodes={nodes}
        edges={edges}
      />
    </div>
  );
};
