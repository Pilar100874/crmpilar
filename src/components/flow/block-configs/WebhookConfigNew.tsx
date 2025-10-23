import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Info, Plus } from "lucide-react";
import { VariableInput } from "@/components/flow/VariableInput";
import { useState, useEffect } from "react";

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
    // Carregar webhooks do localStorage
    const savedWebhooks = localStorage.getItem("webhooks");
    if (savedWebhooks) {
      const parsed = JSON.parse(savedWebhooks);
      const botWebhooks = parsed
        .filter((w: WebhookConfig) => w.usageLocations?.includes("bot"))
        .map((w: any) => ({ ...w, createdAt: new Date(w.createdAt) }));
      setWebhooks(botWebhooks);
    }
  }, []);

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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>URL & Method</Label>
            <Button variant="default" size="sm" className="bg-pink-500 hover:bg-pink-600">
              Set Domain Fields
            </Button>
          </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="flex items-center gap-2">
              Select the method and type the url
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </Label>
          </div>
          
          <div className="flex gap-2">
            <Select value={config.method || "POST"} onValueChange={(v) => handleConfigChange("method", v)}>
              <SelectTrigger className="w-32 bg-blue-600 text-white border-blue-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
                <SelectItem value="PATCH">PATCH</SelectItem>
              </SelectContent>
            </Select>
            
            <VariableInput
              ref={(el) => inputRefs && (inputRefs.current['url'] = el)}
              value={config.url || ""}
              onChange={(e) => handleConfigChange("url", e.target.value)}
              onVariableRequest={() => inputRefs?.current['url'] && openVariablePicker?.(inputRefs.current['url'])}
              placeholder="https://"
              className="flex-1"
            />
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1">
              DOMAIN FIELDS
            </Button>
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => inputRefs?.current['url'] && openVariablePicker?.(inputRefs.current['url'])}
            >
              Use field
            </Button>
            <Button variant="ghost" size="icon">
              <Info className="h-4 w-4" />
            </Button>
          </div>
        </div>
        </div>
      )}

      {/* Informações do webhook selecionado (readonly) */}
      {selectedWebhook && (
        <div className="space-y-2 p-3 bg-secondary/30 rounded-lg border">
          <Label className="text-xs font-medium uppercase text-muted-foreground">Configuração do Webhook</Label>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded font-mono">
              {selectedWebhook.method}
            </span>
            <span className="text-sm font-mono break-all">{selectedWebhook.url}</span>
          </div>
        </div>
      )}

      {/* Send Params, Customize Headers e Customize Body - apenas se não houver webhook selecionado */}
      {!selectedWebhook && (
        <>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Send Params</Label>
              <Switch 
                checked={config.sendParams || false}
                onCheckedChange={(checked) => handleConfigChange("sendParams", checked)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Attach parameters to the end of request URL (example: ?email=elon@tesla.com)
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Customize Headers</Label>
              <Switch 
                checked={config.customHeaders || false}
                onCheckedChange={(checked) => handleConfigChange("customHeaders", checked)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Add headers to your request (example: Content-Type: application/json)
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Customize Body</Label>
              <Switch 
                checked={config.customBody || false}
                onCheckedChange={(checked) => handleConfigChange("customBody", checked)}
              />
            </div>
          </div>
        </>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Test Your Request</Label>
          <Switch 
            checked={config.enableTest || false}
            onCheckedChange={(checked) => handleConfigChange("enableTest", checked)}
          />
        </div>

        {config.enableTest && (
          <div className="space-y-3">
            <Label className="text-sm">Manually set values for test fields</Label>
            <p className="text-xs text-muted-foreground">
              If your request contains fields, you can manually set their values for testing purpose.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <Label className="text-xs">Field Name</Label>
              <Label className="text-xs">Test Value</Label>
            </div>

            {testFields.map((field: any, index: number) => (
              <div key={index} className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                  <Input
                    value={field.name}
                    onChange={(e) => {
                      const newFields = [...testFields];
                      newFields[index].name = e.target.value;
                      handleConfigChange("testFields", newFields);
                    }}
                    placeholder="Search fields"
                    className="pl-7"
                  />
                </div>
                <Input
                  value={field.value}
                  onChange={(e) => {
                    const newFields = [...testFields];
                    newFields[index].value = e.target.value;
                    handleConfigChange("testFields", newFields);
                  }}
                />
              </div>
            ))}

            <Button 
              variant="outline" 
              size="sm" 
              onClick={addTestField}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>

            <Button 
              variant="default" 
              size="lg" 
              className="w-full bg-pink-500 hover:bg-pink-600"
            >
              Test the request
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Save Responses as Fields</Label>
          <Switch 
            checked={config.saveResponses || false}
            onCheckedChange={(checked) => handleConfigChange("saveResponses", checked)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Response Routing</Label>
          <Switch 
            checked={config.responseRouting || false}
            onCheckedChange={(checked) => handleConfigChange("responseRouting", checked)}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Split your flow based on response status codes (200, 400, 500, etc)
        </p>
      </div>
    </div>
  );
};
