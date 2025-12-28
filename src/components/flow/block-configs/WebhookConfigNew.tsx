import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Info, Plus } from "lucide-react";
import { VariableInput } from "@/components/flow/VariableInput";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "@/lib/toast-config";

interface WebhookVariable {
  id: string;
  name: string;
  type: string;
  description?: string;
  defaultValue?: string;
  required?: boolean;
  format?: string;
}

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  method: string;
  type: string;
  description: string;
  usageLocations: string[];
  hasVariables: boolean;
  variables?: WebhookVariable[];
  createdAt: Date;
}

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
  inputRefs?: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement | null }>;
  openVariablePicker?: (ref: HTMLInputElement | HTMLTextAreaElement) => void;
}

export const WebhookConfigNew = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookConfig | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, any>>(config.variableValues || {});
  const testFields = config.testFields || [];

  useEffect(() => {
    loadWebhooks();
  }, []);

  const loadWebhooks = async () => {
    const estabId = await getEstabelecimentoId();
    if (!estabId) {
      toast.error("Estabelecimento não identificado");
      return;
    }

    const { data, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('estabelecimento_id', estabId)
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Erro ao carregar webhooks:", error);
      toast.error("Erro ao carregar webhooks");
      return;
    }

    // Filtrar webhooks que possuem "bot" nos locais de uso
    const botWebhooks = (data || [])
      .filter((w: any) => {
        const usageLocations = w.usage_locations || [];
        return usageLocations.includes("bot");
      })
      .map((w: any) => ({
        id: w.id,
        name: w.name,
        url: w.url,
        method: w.method,
        type: w.type,
        description: w.description || "",
        usageLocations: w.usage_locations || [],
        hasVariables: w.has_variables || false,
        variables: w.variables || [],
        createdAt: new Date(w.created_at),
      }));
    
    setWebhooks(botWebhooks);
  };

  useEffect(() => {
    // Quando um webhook é selecionado, carregar seus dados
    if (config.selectedWebhookId) {
      const webhook = webhooks.find(w => w.id === config.selectedWebhookId);
      setSelectedWebhook(webhook || null);
      
      if (webhook) {
        // Preencher URL e método do webhook
        handleConfigChange("url", webhook.url);
        handleConfigChange("method", webhook.method);
        
        // Inicializar valores das variáveis com valores padrão
        if (webhook.hasVariables && webhook.variables) {
          const defaultValues: Record<string, any> = {};
          webhook.variables.forEach(variable => {
            defaultValues[variable.name] = config.variableValues?.[variable.name] || variable.defaultValue || "";
          });
          setVariableValues(defaultValues);
          handleConfigChange("variableValues", defaultValues);
        }
      }
    } else {
      setSelectedWebhook(null);
    }
  }, [config.selectedWebhookId, webhooks]);

  const handleWebhookSelect = (webhookId: string) => {
    handleConfigChange("selectedWebhookId", webhookId);
  };

  const handleVariableChange = (variableName: string, value: any) => {
    const newValues = { ...variableValues, [variableName]: value };
    setVariableValues(newValues);
    handleConfigChange("variableValues", newValues);
  };

  const addTestField = () => {
    handleConfigChange("testFields", [
      ...testFields,
      { name: "", value: "" }
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Seleção de Webhook Cadastrado */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Selecionar Webhook Cadastrado</Label>
          <Select 
            value={config.selectedWebhookId || ""} 
            onValueChange={handleWebhookSelect}
          >
            <SelectTrigger>
              <SelectValue placeholder="Escolha um webhook configurado" />
            </SelectTrigger>
            <SelectContent>
              {webhooks.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  Nenhum webhook do tipo Bot cadastrado
                </div>
              ) : (
                webhooks.map((webhook) => (
                  <SelectItem key={webhook.id} value={webhook.id}>
                    <div className="flex items-center gap-2">
                      <span>{webhook.name}</span>
                      <span className="text-xs text-muted-foreground">({webhook.method})</span>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {selectedWebhook && (
            <p className="text-xs text-muted-foreground">
              {selectedWebhook.description}
            </p>
          )}
        </div>

        {/* Mostrar variáveis do webhook selecionado */}
        {selectedWebhook && selectedWebhook.hasVariables && selectedWebhook.variables && selectedWebhook.variables.length > 0 && (
          <div className="space-y-3 p-4 border rounded-lg bg-secondary/20">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Parâmetros do Webhook</Label>
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                {selectedWebhook.variables.length} parâmetro(s)
              </span>
            </div>
            
            {selectedWebhook.variables.map((variable) => (
              <div key={variable.id} className="space-y-2">
                <Label className="text-sm flex items-center gap-2">
                  {variable.name}
                  {variable.required && <span className="text-destructive">*</span>}
                  <span className="text-xs text-muted-foreground">
                    ({variable.type === "json" ? "JSON" :
                      variable.type === "query" ? "Query" :
                      variable.type === "header" ? "Header" :
                      variable.type === "path" ? "Path" :
                      "Form Data"})
                  </span>
                </Label>
                
                {variable.description && (
                  <p className="text-xs text-muted-foreground">{variable.description}</p>
                )}

                {variable.type === "json" && variable.format === "boolean" ? (
                  <Select 
                    value={variableValues[variable.name] || variable.defaultValue || "false"}
                    onValueChange={(value) => handleVariableChange(variable.name, value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">true</SelectItem>
                      <SelectItem value="false">false</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <VariableInput
                    ref={(el) => inputRefs && (inputRefs.current[`var_${variable.name}`] = el)}
                    value={variableValues[variable.name] || ""}
                    onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                    onVariableRequest={() => inputRefs?.current[`var_${variable.name}`] && openVariablePicker?.(inputRefs.current[`var_${variable.name}`])}
                    placeholder={variable.defaultValue || `Digite ${variable.name}...`}
                    required={variable.required}
                  />
                )}

                {variable.format && variable.type === "json" && (
                  <p className="text-xs text-muted-foreground">
                    Formato esperado: <span className="font-mono">{variable.format}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* URL & Method - Somente se não houver webhook selecionado */}
      {!selectedWebhook && (
        <div className="p-4 border rounded-lg bg-secondary/20 text-center">
          <p className="text-sm text-muted-foreground">
            Selecione um webhook cadastrado acima para continuar
          </p>
        </div>
      )}

      {/* Informações do webhook selecionado (readonly) */}
      {selectedWebhook && (
        <div className="space-y-2 p-3 bg-secondary/30 rounded-lg border">
          <Label className="text-xs font-medium uppercase text-muted-foreground">Configuração do Webhook</Label>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded font-mono">
              {selectedWebhook.method}
            </span>
            <span className="text-sm font-mono break-all">{selectedWebhook.url}</span>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Locais de uso:</Label>
            <div className="flex gap-1 flex-wrap">
              {selectedWebhook.usageLocations?.map((location) => (
                <span 
                  key={location} 
                  className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded"
                >
                  {location === "bot" ? "Bot" : 
                   location === "campaigns" ? "Campanhas" : 
                   location === "chat" ? "Chat" : location}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

        {/* Opções avançadas - apenas se houver webhook selecionado */}
      {selectedWebhook && (
        <>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Aguardar Retorno</Label>
              <Switch 
                checked={config.hasReturn !== false}
                onCheckedChange={(checked) => handleConfigChange("hasReturn", checked)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {config.hasReturn !== false 
                ? "O fluxo aguardará a resposta do webhook antes de continuar" 
                : "O webhook será chamado sem aguardar resposta (fire and forget)"}
            </p>
          </div>

          {config.hasReturn !== false && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Salvar Respostas como Campos</Label>
                  <Switch 
                    checked={config.saveResponses || false}
                    onCheckedChange={(checked) => handleConfigChange("saveResponses", checked)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Roteamento por Resposta</Label>
                  <Switch 
                    checked={config.responseRouting || false}
                    onCheckedChange={(checked) => handleConfigChange("responseRouting", checked)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Dividir o fluxo com base nos códigos de status da resposta (200, 400, 500, etc)
                </p>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};
