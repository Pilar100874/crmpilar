import { useEffect, useState, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Info, AlertCircle, HelpCircle, ExternalLink, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}

interface NumeroRow {
  id: string;
  nome: string;
  telefone: string;
  provider: string;
  cloud_phone_number_id?: string;
  cloud_business_account_id?: string;
}

interface TemplateRow {
  name: string;
  language: string;
  status: string;
  category: string;
  components: any[];
}

export const MessageTemplateConfigNew = ({ config, handleConfigChange }: ConfigProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [numeros, setNumeros] = useState<NumeroRow[]>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [showHelp, setShowHelp] = useState(false);

  const load = async (numeroId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-list-templates", {
        body: { numero_id: numeroId },
      });
      if (error) throw error;
      setNumeros(data?.numeros || []);
      setTemplates(data?.templates || []);
      if (data?.error) setError(data.error);
    } catch (e: any) {
      setError(e?.message || "Falha ao carregar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(config.numeroId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedTemplate = useMemo(
    () =>
      templates.find(
        (t) => t.name === config.templateName && (!config.language || t.language === config.language),
      ),
    [templates, config.templateName, config.language],
  );

  const bodyComponent = selectedTemplate?.components?.find((c) => c.type === "BODY");
  const headerComponent = selectedTemplate?.components?.find((c) => c.type === "HEADER");

  // Detect body variable count {{1}} {{2}}...
  const bodyVarCount = useMemo(() => {
    if (!bodyComponent?.text) return 0;
    const matches = String(bodyComponent.text).match(/\{\{\d+\}\}/g) || [];
    return new Set(matches).size;
  }, [bodyComponent]);

  const onSelectNumero = (id: string) => {
    handleConfigChange("numeroId", id);
    const n = numeros.find((x) => x.id === id);
    if (n) handleConfigChange("provider", n.provider);
    load(id);
  };

  const onSelectTemplate = (name: string) => {
    const t = templates.find((x) => x.name === name);
    handleConfigChange("templateName", name);
    if (t) handleConfigChange("language", t.language);
  };

  const updateBodyVar = (index: number, value: string) => {
    const arr = Array.isArray(config.bodyVariables) ? [...config.bodyVariables] : [];
    while (arr.length < index + 1) arr.push("");
    arr[index] = value;
    handleConfigChange("bodyVariables", arr);
  };

  const steps = [
    "Acesse o WhatsApp Business Manager em business.facebook.com e faça login.",
    "Clique no ícone de engrenagem (Configurações) → Mais opções de negócio → Gestão de modelos de mensagem.",
    "Clique em 'Criar modelo'. Escolha a categoria (Marketing, Utilidade ou Autenticação).",
    "Dê um nome ao modelo (somente letras minúsculas, números e underscores). Escolha o idioma.",
    "Preencha o conteúdo: Header (opcional), Body (use {{1}}, {{2}}… para variáveis), Footer e Botões (se necessário).",
    "Revise e envie para aprovação. O tempo de análise da Meta pode variar de minutos a 24 horas.",
    "Após a aprovação, o modelo aparecerá automaticamente nesta lista ao selecionar o número Cloud API.",
  ];

  return (
    <div className="space-y-6">
      {/* Ajuda / Passo a passo */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          className="flex items-center gap-2 w-full text-left"
        >
          <HelpCircle className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-semibold text-foreground flex-1">Como criar um Template no Facebook</span>
          {showHelp ? (
            <span className="text-xs text-muted-foreground">Ocultar</span>
          ) : (
            <span className="text-xs text-muted-foreground">Mostrar passo a passo</span>
          )}
        </button>

        {showHelp && (
          <div className="space-y-3 pt-1">
            <ol className="space-y-2">
              {steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <a
              href="https://business.facebook.com/wa/manage/message-templates/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline mt-1"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Abrir WhatsApp Business Manager — Modelos de Mensagem
            </a>
          </div>
        )}
      </div>

      {/* 1. Número WhatsApp */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">1. Número WhatsApp Business</h3>
          <Button variant="ghost" size="sm" onClick={() => load(config.numeroId)} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Selecione um número Cloud API (Meta) para listar seus Templates aprovados.
        </p>
        <Select value={config.numeroId || ""} onValueChange={onSelectNumero}>
          <SelectTrigger>
            <SelectValue placeholder={numeros.length === 0 ? "Nenhum número cadastrado" : "Selecione o número"} />
          </SelectTrigger>
          <SelectContent>
            {numeros.map((n) => (
              <SelectItem key={n.id} value={n.id}>
                {n.nome} — {n.telefone}
                <Badge variant="outline" className="ml-2 text-[10px]">
                  {n.provider === "cloud_api" ? "Cloud API" : n.provider}
                </Badge>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 2. Template */}
      <div className="space-y-3 border-t pt-4">
        <h3 className="font-semibold text-sm">2. Message Template</h3>
        {config.numeroId && numeros.find((n) => n.id === config.numeroId)?.provider !== "cloud_api" && (
          <div className="flex items-start gap-2 p-2 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Templates HSM só são enviados via Cloud API (Meta). Para Evolution, será enviado o texto de fallback abaixo.</span>
          </div>
        )}
        <Select value={config.templateName || ""} onValueChange={onSelectTemplate} disabled={templates.length === 0}>
          <SelectTrigger>
            <SelectValue
              placeholder={
                loading
                  ? "Carregando..."
                  : templates.length === 0
                    ? "Nenhum template aprovado encontrado"
                    : "Selecione o template"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {templates.map((t) => (
              <SelectItem key={`${t.name}-${t.language}`} value={t.name}>
                {t.name}
                <span className="ml-2 text-xs text-muted-foreground">({t.language})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedTemplate && (
          <div className="rounded border bg-muted/30 p-3 space-y-2">
            {headerComponent?.text && (
              <div className="text-xs">
                <span className="font-semibold">Header:</span> {headerComponent.text}
              </div>
            )}
            {bodyComponent?.text && (
              <div className="text-xs whitespace-pre-wrap">
                <span className="font-semibold">Body:</span> {bodyComponent.text}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Variáveis do body */}
      {bodyVarCount > 0 && (
        <div className="space-y-3 border-t pt-4">
          <h3 className="font-semibold text-sm">3. Variáveis</h3>
          <p className="text-xs text-muted-foreground">
            Use <code className="px-1 bg-muted rounded">{"{{var}}"}</code> para inserir variáveis do fluxo.
          </p>
          {Array.from({ length: bodyVarCount }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Label className="text-xs">Variável {`{{${i + 1}}}`}</Label>
              <Input
                value={config.bodyVariables?.[i] || ""}
                onChange={(e) => updateBodyVar(i, e.target.value)}
                placeholder={`Valor ou {{nome}}`}
              />
            </div>
          ))}
        </div>
      )}

      {/* 4. Fallback */}
      <div className="space-y-3 border-t pt-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="useFallback"
            checked={!!config.useFallback}
            onCheckedChange={(v) => handleConfigChange("useFallback", !!v)}
          />
          <Label htmlFor="useFallback" className="text-sm font-medium cursor-pointer">
            Habilitar texto de fallback
          </Label>
        </div>
        {config.useFallback && (
          <Textarea
            value={config.fallbackText || ""}
            onChange={(e) => handleConfigChange("fallbackText", e.target.value)}
            placeholder="Texto enviado se o template falhar ou se o provider não suportar HSM"
            rows={3}
          />
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-2 rounded bg-destructive/10 border border-destructive/30 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-xs">
        <div className="flex items-center gap-2 font-semibold">
          <Info className="h-3.5 w-3.5" /> Como funciona
        </div>
        <ul className="text-muted-foreground space-y-1 ml-5 list-disc">
          <li>Templates HSM precisam ser aprovados no WhatsApp Business Manager.</li>
          <li>Só funcionam com Cloud API (Meta oficial). Evolution não envia HSM.</li>
          <li>Templates são obrigatórios para enviar mensagem após 24h fora da janela.</li>
        </ul>
      </div>
    </div>
  );
};
