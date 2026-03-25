import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Brain, AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";

interface IAConfig {
  id: string;
  estabelecimento_id: string;
  contexto: string;
  provider: string;
  model: string | null;
  api_key: string | null;
  ativo: boolean;
  configuracoes: any;
  created_at: string;
  updated_at: string;
}

interface IAConfigCRUDProps {
  estabelecimentoId: string;
}

const CONTEXTOS = [
  { value: "suggest_response", label: "Sugestão de Resposta", description: "IA sugere respostas baseadas no contexto da conversa" },
  { value: "summarize", label: "Resumo de Conversa", description: "IA resume conversas longas" },
  { value: "translate", label: "Tradução", description: "IA traduz mensagens em tempo real" },
  { value: "sentiment", label: "Análise de Sentimento", description: "IA analisa sentimento das mensagens" },
  
  { value: "extract_items", label: "Extração de Itens", description: "IA extrai itens de orçamento de imagens" },
  { value: "suggest_products", label: "Sugestão de Produtos", description: "IA sugere produtos com base no contexto" },
  { value: "default", label: "Padrão (Geral)", description: "Configuração padrão para contextos não especificados" },
];

const PROVIDERS = [
  { value: "lovable", label: "Lovable AI (Recomendado)", requiresKey: false },
  { value: "openai", label: "OpenAI", requiresKey: true },
  { value: "anthropic", label: "Anthropic (Claude)", requiresKey: true },
  { value: "google", label: "Google (Gemini)", requiresKey: true },
];

const MODELS_BY_PROVIDER: Record<string, Array<{ value: string; label: string }>> = {
  lovable: [
    { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (Padrão)" },
    { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    { value: "google/gemini-3-pro-preview", label: "Gemini 3 Pro Preview" },
    { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
    { value: "openai/gpt-5", label: "GPT-5" },
    { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
    { value: "openai/gpt-5-nano", label: "GPT-5 Nano" },
  ],
  openai: [
    { value: "gpt-5-2025-08-07", label: "GPT-5" },
    { value: "gpt-5-mini-2025-08-07", label: "GPT-5 Mini" },
    { value: "gpt-5-nano-2025-08-07", label: "GPT-5 Nano" },
    { value: "gpt-4.1-2025-04-14", label: "GPT-4.1" },
    { value: "o3-2025-04-16", label: "O3 (Reasoning)" },
    { value: "o4-mini-2025-04-16", label: "O4 Mini" },
  ],
  anthropic: [
    { value: "claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
    { value: "claude-opus-4-1-20250805", label: "Claude Opus 4.1" },
    { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  ],
  google: [
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    { value: "gemini-3-pro-preview", label: "Gemini 3 Pro Preview" },
  ],
};

export default function IAConfigCRUD({ estabelecimentoId }: IAConfigCRUDProps) {
  const [configs, setConfigs] = useState<IAConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<IAConfig | null>(null);
  
  const [formData, setFormData] = useState({
    contexto: "",
    provider: "lovable",
    model: "google/gemini-2.5-flash",
    api_key: "",
    ativo: true,
    temperature: "0.7",
    max_tokens: "2000",
  });

  useEffect(() => {
    loadConfigs();
  }, [estabelecimentoId]);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("ia_config")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .order("contexto");

      if (error) throw error;
      setConfigs(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar configurações:", error);
      toast.error("Erro ao carregar configurações de IA");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const provider = PROVIDERS.find(p => p.value === formData.provider);
      
      if (provider?.requiresKey && !formData.api_key) {
        toast.error("API Key é obrigatória para este provedor");
        return;
      }

      const configData = {
        estabelecimento_id: estabelecimentoId,
        contexto: formData.contexto,
        provider: formData.provider,
        model: formData.model || null,
        api_key: formData.provider === "lovable" ? null : formData.api_key || null,
        ativo: formData.ativo,
        configuracoes: {
          temperature: parseFloat(formData.temperature),
          max_tokens: parseInt(formData.max_tokens),
        },
      };

      if (editingConfig) {
        const { error } = await supabase
          .from("ia_config")
          .update(configData)
          .eq("id", editingConfig.id);

        if (error) throw error;
        toast.success("Configuração atualizada com sucesso!");
      } else {
        const { error } = await supabase
          .from("ia_config")
          .insert(configData);

        if (error) throw error;
        toast.success("Configuração criada com sucesso!");
      }

      setDialogOpen(false);
      resetForm();
      loadConfigs();
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      if (error.message?.includes("duplicate key")) {
        toast.error("Já existe uma configuração para este contexto");
      } else {
        toast.error("Erro ao salvar configuração");
      }
    }
  };

  const handleEdit = (config: IAConfig) => {
    setEditingConfig(config);
    setFormData({
      contexto: config.contexto,
      provider: config.provider,
      model: config.model || "google/gemini-2.5-flash",
      api_key: config.api_key || "",
      ativo: config.ativo,
      temperature: config.configuracoes?.temperature?.toString() || "0.7",
      max_tokens: config.configuracoes?.max_tokens?.toString() || "2000",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta configuração?")) return;

    try {
      const { error } = await supabase
        .from("ia_config")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Configuração excluída com sucesso!");
      loadConfigs();
    } catch (error: any) {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao excluir configuração");
    }
  };

  const toggleAtivo = async (config: IAConfig) => {
    try {
      const { error } = await supabase
        .from("ia_config")
        .update({ ativo: !config.ativo })
        .eq("id", config.id);

      if (error) throw error;
      toast.success(`Configuração ${!config.ativo ? "ativada" : "desativada"} com sucesso!`);
      loadConfigs();
    } catch (error: any) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  const resetForm = () => {
    setEditingConfig(null);
    setFormData({
      contexto: "",
      provider: "lovable",
      model: "google/gemini-2.5-flash",
      api_key: "",
      ativo: true,
      temperature: "0.7",
      max_tokens: "2000",
    });
  };

  const getContextoLabel = (contexto: string) => {
    return CONTEXTOS.find(c => c.value === contexto)?.label || contexto;
  };

  const selectedProvider = PROVIDERS.find(p => p.value === formData.provider);

  if (loading) {
    return <div className="p-4">Carregando configurações...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header com botão */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Brain className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Configurações de IA</h3>
              <p className="text-xs text-muted-foreground">Configure provedores por contexto</p>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Nova
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingConfig ? "Editar" : "Nova"} Configuração
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Por padrão, usa Lovable AI sem necessidade de chave API.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label className="text-sm">Contexto *</Label>
                  <Select
                    value={formData.contexto}
                    onValueChange={(value) => setFormData({ ...formData, contexto: value })}
                    disabled={!!editingConfig}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTEXTOS.map(ctx => (
                        <SelectItem key={ctx.value} value={ctx.value}>
                          <div>
                            <div className="font-medium text-sm">{ctx.label}</div>
                            <div className="text-xs text-muted-foreground">{ctx.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Provedor *</Label>
                    <Select
                      value={formData.provider}
                      onValueChange={(value) => {
                        const models = MODELS_BY_PROVIDER[value];
                        setFormData({ 
                          ...formData, 
                          provider: value,
                          model: models?.[0]?.value || "",
                          api_key: value === "lovable" ? "" : formData.api_key
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVIDERS.map(provider => (
                          <SelectItem key={provider.value} value={provider.value}>
                            {provider.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Modelo *</Label>
                    <Select
                      value={formData.model}
                      onValueChange={(value) => setFormData({ ...formData, model: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {(MODELS_BY_PROVIDER[formData.provider] || []).map(model => (
                          <SelectItem key={model.value} value={model.value}>
                            {model.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedProvider?.requiresKey && (
                  <div className="space-y-2">
                    <Label className="text-sm">API Key *</Label>
                    <Textarea
                      value={formData.api_key}
                      onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                      placeholder="Insira sua API key"
                      className="font-mono text-xs h-16"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-sm">Temperature</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      value={formData.temperature}
                      onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                      className="h-9"
                    />
                    <p className="text-[10px] text-muted-foreground">0=preciso, 2=criativo</p>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-sm">Max Tokens</Label>
                    <Input
                      type="number"
                      step="100"
                      min="100"
                      max="10000"
                      value={formData.max_tokens}
                      onChange={(e) => setFormData({ ...formData, max_tokens: e.target.value })}
                      className="h-9"
                    />
                    <p className="text-[10px] text-muted-foreground">Limite de resposta</p>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2 border-t">
                  <Label htmlFor="ativo" className="text-sm">Ativa</Label>
                  <Switch
                    id="ativo"
                    checked={formData.ativo}
                    onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                  />
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleSubmit}>
                  {editingConfig ? "Atualizar" : "Criar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </Card>

      {/* Lista de Configurações */}
      {configs.length === 0 ? (
        <Card className="p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Nenhuma configuração personalizada</p>
              <p className="text-xs text-muted-foreground mt-1">
                O sistema está usando Lovable AI como padrão em todos os contextos.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {configs.map((config) => (
            <Card key={config.id} className="p-3 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{getContextoLabel(config.contexto)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      config.ativo 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {config.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    <span>{PROVIDERS.find(p => p.value === config.provider)?.label}</span>
                    {config.model && <span className="ml-2">• {config.model}</span>}
                  </div>
                </div>
                
                <div className="flex items-center gap-1 shrink-0">
                  <Switch
                    checked={config.ativo}
                    onCheckedChange={() => toggleAtivo(config)}
                    className="scale-75"
                  />
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(config)} className="h-8 w-8">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(config.id)} className="h-8 w-8">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}