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
import { toast } from "@/lib/toast-config";
import { VariableExplorer } from "./VariableExplorer";
import { FlowVariable } from "./VariableManager";
import { VariableInput, VariableTextarea } from "./VariableInput";
import { VariablePickerDialog } from "./VariablePickerDialog";
import * as BlockConfigs from "./block-configs";
import { PushBlockConfigEditor } from "@/components/workflows/PushBlockConfig";
// import { LiveBlockPreview, PREVIEW_SUPPORTED_TYPES } from "./block-configs/LiveBlockPreview";

interface PropertiesPanelProps {
  selectedNode: Node | null;
  onUpdateNode: (nodeId: string, data: Partial<FlowNodeData>) => void;
  onDeleteNode: (nodeId: string) => void;
  nodes: Node[];
  edges: Edge[];
  flowVariables?: FlowVariable[];
  onClose?: () => void;
}

export const PropertiesPanel = ({ 
  selectedNode, 
  onUpdateNode,
  onDeleteNode,
  nodes,
  edges,
  flowVariables = [],
  onClose
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
      case "send_message":
        return "any"; // Messages can interpolate any variable type
      default:
        return "text"; // Most blocks work with text/string
    }
  };

  if (!selectedNode) {
    return (
      <div className="w-96 flex flex-col h-[calc(100%-1rem)] m-2 rounded-2xl shadow-lg border-2 border-white dark:border-white/10 bg-gradient-to-b from-background to-border p-6 animate-slide-in-right">
        <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
            <span className="text-3xl">👆</span>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">
              Selecione um Bloco
            </p>
            <p className="text-xs text-muted-foreground">
              Clique em qualquer bloco no canvas para editar suas propriedades
            </p>
          </div>
        </div>
      </div>
    );
  }

  const nodeData = selectedNode.data as any;
  const blockDef = BLOCK_DEFINITIONS.find((b) => b.type === nodeData.type);

  const pendingConfigRef = useRef<{ nodeId: string | null; config: any }>({ nodeId: null, config: null });

  const handleConfigChange = (key: string, value: any) => {
    console.log("⚙️ [PropertiesPanel.handleConfigChange] key:", key, "value:", value);
    // Per-node accumulator so multiple synchronous calls don't overwrite each other
    // (e.g. selecting a preset updates preset + presetName + model + negativePrompt em sequência)
    const baseConfig =
      pendingConfigRef.current.nodeId === selectedNode.id && pendingConfigRef.current.config
        ? pendingConfigRef.current.config
        : (selectedNode.data as any).config || {};
    const newConfig = {
      ...baseConfig,
      [key]: value,
    };
    pendingConfigRef.current = { nodeId: selectedNode.id, config: newConfig };
    console.log("✅ [PropertiesPanel.handleConfigChange] Novo config completo:", newConfig);
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
      nodes,
      edges,
      selectedNode,
    };

    const fields = renderConfigSwitch(nodeData, configProps);
    return <>{fields}</>;
  };

  const renderConfigSwitch = (nodeData: any, configProps: any) => {

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
      case "ask_cnpj":
        return <BlockConfigs.AskCNPJConfig {...configProps} />;
      case "ask_cep":
        return <BlockConfigs.AskCEPConfig {...configProps} />;

      // Button Blocks
      case "reply_buttons":
        return <BlockConfigs.ReplyButtonsConfigNew {...configProps} />;
      case "list_buttons":
        return <BlockConfigs.ListButtonsConfigNew {...configProps} />;

      // Evolution-only blocks
      case "button_url":
        return <BlockConfigs.ButtonUrlConfig {...configProps} />;
      case "button_copy":
        return <BlockConfigs.ButtonCopyConfig {...configProps} />;
      case "button_call":
        return <BlockConfigs.ButtonCallConfig {...configProps} />;
      case "button_pix":
        return <BlockConfigs.ButtonPixConfig {...configProps} />;
      case "buttons_mixed":
        return <BlockConfigs.ButtonsMixedConfig {...configProps} />;
      case "buttons_media":
        return <BlockConfigs.ButtonsMediaConfig {...configProps} />;
      case "carousel":
        return <BlockConfigs.CarouselConfig {...configProps} />;

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
      case "global_redirect":
        return <BlockConfigs.GlobalRedirectConfig {...configProps} />;
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
      case "trigger_automation":
        return <BlockConfigs.TriggerAutomationConfigNew {...configProps} />;
      case "dynamic_data":
        return <BlockConfigs.DynamicDataConfig {...configProps} />;
      case "ai_agent":
        return <BlockConfigs.AIAgentConfig {...configProps} />;

      // CRM Blocks
      case "crm_cadastro_empresa":
        return <BlockConfigs.CRMCadastroEmpresaConfig 
          {...configProps} 
          handleConfigChange={(updates: any) => {
            // Adapter: convert object updates to individual key-value calls
            Object.entries(updates).forEach(([key, value]) => {
              handleConfigChange(key, value);
            });
          }}
        />;
      case "crm_agenda_rapida":
        return <BlockConfigs.AgendaRapidaConfig {...configProps} />;
      case "crm_gerar_relatorio":
        return <BlockConfigs.CRMGerarRelatorioConfig 
          {...configProps} 
          handleConfigChange={(updates: any) => {
            console.log("📡 [PropertiesPanel] CRMGerarRelatorioConfig updates:", updates);
            Object.entries(updates).forEach(([key, value]) => {
              console.log("📝 [PropertiesPanel] Chamando handleConfigChange:", key, value);
              handleConfigChange(key, value);
            });
          }}
        />;
      case "attach_catalog":
        return <BlockConfigs.AttachCatalogConfig
          selectedNode={selectedNode}
          handleConfigChange={handleConfigChange}
        />;

      // Routing Blocks
      case "transferir_omnichannel":
        return <BlockConfigs.TransferirOmnichannelConfig {...configProps} />;
      case "enviar_fila":
        return <BlockConfigs.EnviarFilaConfig {...configProps} />;
      case "atribuir_atendente":
        return <BlockConfigs.AtribuirAtendenteConfig {...configProps} />;
      case "definir_prioridade":
        return <BlockConfigs.DefinirPrioridadeConfig {...configProps} />;
      case "enviar_aviso_sistema":
        return <BlockConfigs.EnviarAvisoSistemaConfig {...configProps} />;
      case "enviar_mensagem_interna":
        return <BlockConfigs.EnviarMensagemInternaConfig {...configProps} />;

      // Redes Sociais
      case "publish_social_post":
        return <BlockConfigs.PublishSocialPostConfig {...configProps} />;

      // IA - Geração de Mídia
      case "generate_ai_media":
        return <BlockConfigs.GenerateAIMediaConfig {...configProps} />;
      case "mensagem_pre_definida":
        return <BlockConfigs.MensagemPreDefinidaConfig {...configProps} />;
      case "broadcast_vendedores":
        return <BlockConfigs.BroadcastVendedoresConfig {...configProps} />;
      case "send_contact_card":
        return <BlockConfigs.SendContactCardConfig {...configProps} />;

      // Disparo direto / Loops
      case "send_whatsapp_to_number":
        return <BlockConfigs.SendWhatsappToNumberConfig {...configProps} />;
      case "send_sms":
        return <BlockConfigs.SendSmsConfig {...configProps} />;
      case "api_loop":
        return <BlockConfigs.ApiLoopConfig {...configProps} />;
      case "product_search_select":
        return <BlockConfigs.ProductSearchSelectConfig {...configProps} />;
      case "text_content":
        return <BlockConfigs.TextContentConfig {...configProps} />;
      case "content_type":
        return <BlockConfigs.ContentTypeConfig {...configProps} />;
      case "ask_influencer":
        return <BlockConfigs.AskInfluencerConfig {...configProps} />;
      case "ask_product_image":
        return <BlockConfigs.AskProductImageConfig {...configProps} />;
      case "trigger_workflow":
        return <BlockConfigs.TriggerWorkflowConfig data={selectedNode.data} onChange={(cfg) => Object.entries(cfg).forEach(([k, v]) => handleConfigChange(k, v))} />;
      case "return_response":
        return <BlockConfigs.ReturnResponseConfig data={selectedNode.data} onChange={(cfg) => Object.entries(cfg).forEach(([k, v]) => handleConfigChange(k, v))} />;
      case "disparar_push":
        return <PushBlockConfigEditor
          value={config as any}
          onChange={(patch) => Object.entries(patch).forEach(([k, v]) => handleConfigChange(k, v as any))}
          context="bot"
        />;




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
    <div className="workflow-props animate-slide-in-right fixed inset-y-0 right-0 z-40 w-full sm:w-96 lg:static lg:inset-auto lg:z-auto lg:h-[calc(100%-1rem)] lg:m-2 lg:rounded-2xl lg:border-2 lg:border-white dark:lg:border-white/10 lg:bg-gradient-to-b lg:from-background lg:to-border lg:shadow-lg bg-background border-l border-border flex flex-col h-full shadow-2xl overflow-x-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border bg-white">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-center shrink-0">
              <span className="text-xl">⚙️</span>
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-base text-foreground truncate">Propriedades</h3>
              {blockDef && (
                <div className="text-xs text-primary flex items-center gap-1.5 font-medium mt-0.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary block shrink-0"></span>
                  <span className="truncate">{blockDef.label}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {hasChanges && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <Check className="w-3 h-3 mr-1" />
                Salvo
              </Badge>
            )}
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose} title="Fechar" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>


      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Nome do Bloco */}
          <div className="space-y-2 p-3 rounded-lg bg-muted border border-border">
            <Label className="text-foreground text-sm font-medium flex items-center gap-2">
              <span className="w-1 h-4 bg-primary rounded-full"></span>
              Nome do Bloco
            </Label>
            <Input
              value={nodeData.label || ""}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder={blockDef?.label}
              className="bg-white border-border"
            />
          </div>

          <Separator />

          <div className="space-y-4">
            {renderConfigFields()}
          </div>

          <Separator className="my-4" />

          <VariableExplorer 
            selectedNode={selectedNode}
            nodes={nodes}
            edges={edges}
            flowVariables={flowVariables}
            expectedType={getExpectedType()}
          />
        </div>
      </ScrollArea>

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
