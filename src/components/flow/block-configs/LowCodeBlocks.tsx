import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "../RichTextEditor";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { Card } from "@/components/ui/card";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
  inputRefs?: any;
  openVariablePicker?: (ref: any) => void;
  nodes?: any[];
  edges?: any[];
  selectedNode?: any;
}

// Webhook - API Externa
export const WebhookConfig = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => {
  const addHeader = () => {
    const headers = config.headers || [];
    handleConfigChange("headers", [...headers, { key: "", value: "" }]);
  };

  const updateHeader = (index: number, field: string, value: string) => {
    const headers = [...(config.headers || [])];
    headers[index] = { ...headers[index], [field]: value };
    handleConfigChange("headers", headers);
  };

  const removeHeader = (index: number) => {
    const headers = [...(config.headers || [])];
    headers.splice(index, 1);
    handleConfigChange("headers", headers);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Método HTTP</Label>
        <Select
          value={config.method || "POST"}
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
        <Label>URL *</Label>
        <RichTextEditor
          value={config.url || ""}
          onChange={(text) => handleConfigChange("url", text)}
          placeholder="https://api.exemplo.com/endpoint"
          multiline={true}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Headers</Label>
          <Button variant="outline" size="sm" onClick={addHeader}>
            <Plus className="w-4 h-4 mr-1" />
            Header
          </Button>
        </div>

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
      </div>

      {(config.method === "POST" || config.method === "PUT" || config.method === "PATCH") && (
        <div className="space-y-2">
          <Label>Body (JSON)</Label>
          <RichTextEditor
            value={config.body || '{\n  "key": "{{variavel}}"\n}'}
            onChange={(text) => handleConfigChange("body", text)}
            placeholder='{"key": "value"}'
            multiline={true}
            className="font-mono text-xs"
          />
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
          Resultado da API será salvo em {"{{"}{config.outputVariable || "variavel"}{"}}"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label>Retries</Label>
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
    </div>
  );
};

// Trigger Automation - Zapier/Make/etc
export const TriggerAutomationConfig = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Label>Plataforma</Label>
      <Select
        value={config.platform || "zapier"}
        onValueChange={(v) => handleConfigChange("platform", v)}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="zapier">Zapier</SelectItem>
          <SelectItem value="make">Make (Integromat)</SelectItem>
          <SelectItem value="custom">Custom Webhook</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div className="space-y-2">
      <Label>Webhook URL *</Label>
      <Input
        value={config.webhookUrl || ""}
        onChange={(e) => handleConfigChange("webhookUrl", e.target.value)}
        placeholder="https://hooks.zapier.com/hooks/catch/..."
        required
      />
    </div>

    <div className="space-y-2">
      <Label>Parâmetros (JSON)</Label>
      <RichTextEditor
        value={config.parameters || '{\n  "email": "{{email}}",\n  "name": "{{name}}"\n}'}
        onChange={(text) => handleConfigChange("parameters", text)}
        placeholder='{"key": "{{variavel}}"}'
        multiline={true}
        className="font-mono text-xs"
      />
    </div>

    <div className="space-y-2">
      <Label>Variável de Saída (opcional)</Label>
      <Input
        value={config.outputVariable || ""}
        onChange={(e) => handleConfigChange("outputVariable", e.target.value)}
        placeholder="automation_result"
      />
    </div>
  </div>
);

// Dynamic Data - Dados Dinâmicos
export const DynamicDataConfig = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Label>Fonte de Dados</Label>
      <Select
        value={config.source || "api"}
        onValueChange={(v) => handleConfigChange("source", v)}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="api">API Externa</SelectItem>
          <SelectItem value="database">Database</SelectItem>
          <SelectItem value="spreadsheet">Planilha (Google Sheets)</SelectItem>
          <SelectItem value="airtable">Airtable</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div className="space-y-2">
      <Label>URL/Endpoint *</Label>
      <RichTextEditor
        value={config.endpoint || ""}
        onChange={(text) => handleConfigChange("endpoint", text)}
        placeholder="https://api.exemplo.com/data"
        multiline={true}
      />
    </div>

    {config.source === "api" && (
      <div className="space-y-2">
        <Label>Query Parameters (opcional)</Label>
        <Textarea
          value={config.query || ""}
          onChange={(e) => handleConfigChange("query", e.target.value)}
          placeholder='id={{user_id}}&filter=active'
          rows={3}
          className="font-mono text-xs"
        />
      </div>
    )}

    <div className="space-y-2">
      <Label>Variável de Saída *</Label>
      <Input
        value={config.outputVariable || ""}
        onChange={(e) => handleConfigChange("outputVariable", e.target.value)}
        placeholder="dynamic_data"
        required
      />
      <p className="text-xs text-muted-foreground">
        Dados recuperados serão salvos em {"{{"}{config.outputVariable || "variavel"}{"}}"}
      </p>
    </div>

    <div className="space-y-2">
      <Label>Path de Extração (opcional)</Label>
      <Input
        value={config.extractPath || ""}
        onChange={(e) => handleConfigChange("extractPath", e.target.value)}
        placeholder="data.items[0].name"
      />
      <p className="text-xs text-muted-foreground">
        Extrair valor específico do JSON (ex: data.user.email)
      </p>
    </div>
  </div>
);

// AI Agent
export const AIAgentConfig = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => (
  <div className="space-y-4">
    <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-lg p-3">
      <p className="text-xs font-medium">🤖 Agente de IA Conversacional</p>
      <p className="text-xs text-muted-foreground mt-1">
        Usa IA para responder perguntas e manter contexto da conversa
      </p>
    </div>

    <div className="space-y-2">
      <Label>Modelo de IA</Label>
      <Select
        value={config.model || "gpt-4"}
        onValueChange={(v) => handleConfigChange("model", v)}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="gpt-4">GPT-4 (Mais inteligente)</SelectItem>
          <SelectItem value="gpt-3.5">GPT-3.5 Turbo (Mais rápido)</SelectItem>
          <SelectItem value="claude">Claude (Anthropic)</SelectItem>
          <SelectItem value="gemini">Gemini (Google)</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div className="space-y-2">
      <Label>System Prompt (Personalidade)</Label>
      <Textarea
        value={config.systemPrompt || ""}
        onChange={(e) => handleConfigChange("systemPrompt", e.target.value)}
        placeholder="Você é um assistente prestativo e amigável que ajuda usuários com..."
        rows={6}
      />
      <p className="text-xs text-muted-foreground">
        Define como o agente deve se comportar e responder
      </p>
    </div>

    <div className="space-y-2">
      <Label>Contexto Adicional (opcional)</Label>
      <RichTextEditor
        value={config.context || ""}
        onChange={(text) => handleConfigChange("context", text)}
        placeholder="Nome do usuário: {{name}}\nEmail: {{email}}"
        multiline={true}
      />
    </div>

    <div className="space-y-2">
      <Label>Temperatura (Criatividade)</Label>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={config.temperature || 0.7}
          onChange={(e) => handleConfigChange("temperature", parseFloat(e.target.value))}
          className="flex-1"
        />
        <span className="text-sm font-mono w-8">{config.temperature || 0.7}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        0 = Mais preciso | 1 = Mais criativo
      </p>
    </div>

    <div className="space-y-2">
      <Label>Máximo de Tokens (Resposta)</Label>
      <Input
        type="number"
        value={config.maxTokens || 500}
        onChange={(e) => handleConfigChange("maxTokens", parseInt(e.target.value))}
        min={50}
        max={4000}
      />
    </div>

    <div className="space-y-2">
      <Label>Variável de Saída</Label>
      <Input
        value={config.outputVariable || "ai_response"}
        onChange={(e) => handleConfigChange("outputVariable", e.target.value)}
        placeholder="ai_response"
      />
    </div>
  </div>
);
