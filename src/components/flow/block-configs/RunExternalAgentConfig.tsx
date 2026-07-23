import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bot, Info } from "lucide-react";

interface Props {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}

const PROVIDER_INFO: Record<string, { label: string; endpoint: string; keyEnv: string; hint: string }> = {
  claude: {
    label: "Claude (Anthropic)",
    endpoint: "https://api.anthropic.com/v1/messages",
    keyEnv: "ANTHROPIC_API_KEY",
    hint: "Requer chave da Anthropic salva no cofre como ANTHROPIC_API_KEY.",
  },
  chatgpt: {
    label: "ChatGPT (OpenAI)",
    endpoint: "https://api.openai.com/v1/chat/completions",
    keyEnv: "OPENAI_API_KEY",
    hint: "Requer chave da OpenAI salva no cofre como OPENAI_API_KEY.",
  },
  cursor: {
    label: "Cursor / Agente customizado",
    endpoint: "",
    keyEnv: "CURSOR_AGENT_TOKEN",
    hint: "Cursor não expõe API pública oficial. Informe a URL do seu agente/webhook (ex.: bridge local ou n8n).",
  },
  lovable_ai: {
    label: "Lovable AI (Gemini)",
    endpoint: "",
    keyEnv: "LOVABLE_API_KEY",
    hint: "Usa o gateway do Lovable — sem chave adicional.",
  },
  custom: {
    label: "Endpoint HTTP customizado",
    endpoint: "",
    keyEnv: "",
    hint: "Envia o prompt em POST JSON { prompt, variables } para a URL informada.",
  },
};

export function RunExternalAgentConfig({ config, handleConfigChange }: Props) {
  const provider = config.provider || "claude";
  const info = PROVIDER_INFO[provider] || PROVIDER_INFO.claude;

  return (
    <div className="space-y-4">
      <Alert>
        <Bot className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Dispara um agente externo (Claude Code, ChatGPT, Cursor ou HTTP customizado) passando o prompt
          + as variáveis do fluxo. A resposta fica salva na variável de saída para blocos seguintes.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label>Provedor</Label>
        <Select value={provider} onValueChange={(v) => handleConfigChange("provider", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(PROVIDER_INFO).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground flex gap-1 items-start">
          <Info className="h-3 w-3 mt-0.5 shrink-0" /> {info.hint}
        </p>
      </div>

      {(provider === "cursor" || provider === "custom") && (
        <div className="space-y-2">
          <Label>URL do agente / webhook</Label>
          <Input
            value={config.endpointUrl || ""}
            onChange={(e) => handleConfigChange("endpointUrl", e.target.value)}
            placeholder="https://meu-agente.exemplo.com/run"
          />
        </div>
      )}

      {provider !== "lovable_ai" && (
        <div className="space-y-2">
          <Label>Nome do secret com a API key {info.keyEnv && <span className="text-muted-foreground">(padrão: {info.keyEnv})</span>}</Label>
          <Input
            value={config.apiKeySecret || ""}
            onChange={(e) => handleConfigChange("apiKeySecret", e.target.value)}
            placeholder={info.keyEnv || "MEU_TOKEN"}
          />
        </div>
      )}

      {(provider === "claude" || provider === "chatgpt" || provider === "lovable_ai") && (
        <div className="space-y-2">
          <Label>Modelo (opcional)</Label>
          <Input
            value={config.model || ""}
            onChange={(e) => handleConfigChange("model", e.target.value)}
            placeholder={
              provider === "claude" ? "claude-sonnet-4-5-20250929"
              : provider === "chatgpt" ? "gpt-4o-mini"
              : "google/gemini-2.5-flash"
            }
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>Instrução / Prompt do agente</Label>
        <Textarea
          rows={6}
          value={config.prompt || ""}
          onChange={(e) => handleConfigChange("prompt", e.target.value)}
          placeholder={"Ex.: Analise a empresa {{empresa.nome}} e gere um plano de abordagem em 5 tópicos."}
        />
        <p className="text-xs text-muted-foreground">
          Use <code>{"{{variavel}}"}</code> para interpolar dados do fluxo.
        </p>
      </div>

      <div className="space-y-2">
        <Label>System prompt (opcional)</Label>
        <Textarea
          rows={3}
          value={config.systemPrompt || ""}
          onChange={(e) => handleConfigChange("systemPrompt", e.target.value)}
          placeholder="Você é um agente comercial sênior..."
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Timeout (segundos)</Label>
          <Input
            type="number"
            min={5}
            max={600}
            value={config.timeoutSeconds ?? 120}
            onChange={(e) => handleConfigChange("timeoutSeconds", Number(e.target.value) || 120)}
          />
        </div>
        <div className="space-y-2">
          <Label>Variável de saída</Label>
          <Input
            value={config.outputVariable || "agente_externo_resposta"}
            onChange={(e) => handleConfigChange("outputVariable", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
