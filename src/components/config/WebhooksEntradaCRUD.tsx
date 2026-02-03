import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Plus, Copy, Play, Loader2, Webhook } from "lucide-react";
import { toast } from "@/lib/toast-config";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

interface WebhookEntrada {
  id: string;
  estabelecimento_id: string;
  nome: string;
  descricao?: string;
  url_gerada: string;
  ativo: boolean;
  metodo: string;
  aceita_json: boolean;
  aceita_form_data: boolean;
  acao_tipo: string;
  automacao_id?: string;
  url_customizada?: string;
  bot_id?: string;
  ultimo_trigger?: string;
  total_triggers: number;
  created_at: string;
  updated_at: string;
}

interface MarketingAutomation {
  id: string;
  name: string;
  active: boolean;
}

interface BotFlow {
  id: string;
  name: string;
  active: boolean;
}

export function WebhooksEntradaCRUD() {
  const [webhooks, setWebhooks] = useState<WebhookEntrada[]>([]);
  const [automacoes, setAutomacoes] = useState<MarketingAutomation[]>([]);
  const [bots, setBots] = useState<BotFlow[]>([]);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<string | null>(null);
  const [testingWebhook, setTestingWebhook] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    ativo: true,
    metodo: "POST",
    aceita_json: true,
    aceita_form_data: true,
    acao_tipo: "url_customizada",
    automacao_id: "",
    url_customizada: "",
    bot_id: "",
  });

  useEffect(() => {
    loadWebhooks();
    loadAutomacoes();
    loadBots();
  }, []);

  const loadWebhooks = async () => {
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) {
        toast.error("Estabelecimento não identificado");
        return;
      }

      const { data, error } = await supabase
        .from("webhooks_entrada")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWebhooks(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar webhooks:", error);
      toast.error("Erro ao carregar webhooks de entrada");
    }
  };

  const loadAutomacoes = async () => {
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) return;

      const { data, error } = await supabase
        .from("marketing_automations")
        .select("id, name, active")
        .eq("estabelecimento_id", estabelecimentoId)
        .eq("active", true)
        .order("name");

      if (error) throw error;
      setAutomacoes(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar automações:", error);
    }
  };

  const loadBots = async () => {
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) return;

      const { data, error } = await supabase
        .from("bot_flows")
        .select("id, name, active")
        .eq("estabelecimento_id", estabelecimentoId)
        .eq("active", true)
        .order("name");

      if (error) throw error;
      setBots(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar bots:", error);
    }
  };

  const generateUniqueUrl = () => {
    const randomStr = Math.random().toString(36).substring(2, 15);
    return `webhook-${randomStr}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) {
        toast.error("Estabelecimento não identificado");
        return;
      }

      if (!formData.nome) {
        toast.error("Nome é obrigatório");
        return;
      }

      if (formData.acao_tipo === "automacao_marketing" && !formData.automacao_id) {
        toast.error("Selecione uma automação de marketing");
        return;
      }

      if (formData.acao_tipo === "url_customizada" && !formData.url_customizada) {
        toast.error("URL customizada é obrigatória");
        return;
      }

      if (formData.acao_tipo === "rodar_bot" && !formData.bot_id) {
        toast.error("Selecione um bot");
        return;
      }

      const webhookData = {
        estabelecimento_id: estabelecimentoId,
        nome: formData.nome,
        descricao: formData.descricao,
        ativo: formData.ativo,
        metodo: formData.metodo,
        aceita_json: formData.aceita_json,
        aceita_form_data: formData.aceita_form_data,
        acao_tipo: formData.acao_tipo,
        automacao_id: formData.acao_tipo === "automacao_marketing" ? formData.automacao_id : null,
        url_customizada: formData.acao_tipo === "url_customizada" ? formData.url_customizada : null,
        bot_id: formData.acao_tipo === "rodar_bot" ? formData.bot_id : null,
        url_gerada: editingWebhook ? undefined : generateUniqueUrl(),
      };

      if (editingWebhook) {
        const { error } = await supabase
          .from("webhooks_entrada")
          .update(webhookData)
          .eq("id", editingWebhook);

        if (error) throw error;
        toast.success("Webhook atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from("webhooks_entrada")
          .insert([webhookData]);

        if (error) throw error;
        toast.success("Webhook criado com sucesso!");
      }

      resetForm();
      loadWebhooks();
    } catch (error: any) {
      console.error("Erro ao salvar webhook:", error);
      toast.error("Erro ao salvar webhook de entrada");
    }
  };

  const handleEdit = (webhook: WebhookEntrada) => {
    setEditingWebhook(webhook.id);
    setFormData({
      nome: webhook.nome,
      descricao: webhook.descricao || "",
      ativo: webhook.ativo,
      metodo: webhook.metodo,
      aceita_json: webhook.aceita_json,
      aceita_form_data: webhook.aceita_form_data,
      acao_tipo: webhook.acao_tipo,
      automacao_id: webhook.automacao_id || "",
      url_customizada: webhook.url_customizada || "",
      bot_id: webhook.bot_id || "",
    });
    setIsFormDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este webhook?")) return;

    try {
      const { error } = await supabase
        .from("webhooks_entrada")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast.success("Webhook excluído com sucesso!");
      loadWebhooks();
    } catch (error: any) {
      console.error("Erro ao excluir webhook:", error);
      toast.error("Erro ao excluir webhook");
    }
  };

  const handleTest = async (webhook: WebhookEntrada) => {
    setTestingWebhook(webhook.id);
    
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const webhookUrl = `https://${projectId}.supabase.co/functions/v1/webhook-entrada/${webhook.url_gerada}`;
      
      const testData = {
        test: true,
        timestamp: new Date().toISOString(),
        message: "Teste de webhook de entrada"
      };

      const response = await fetch(webhookUrl, {
        method: webhook.metodo,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      toast.success("Webhook testado com sucesso!");
      console.log("Resultado do teste:", result);
      
      // Recarregar para atualizar contadores
      loadWebhooks();
    } catch (error: any) {
      console.error("Erro ao testar webhook:", error);
      toast.error("Erro ao testar webhook: " + error.message);
    } finally {
      setTestingWebhook(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("URL copiada para área de transferência!");
  };

  const resetForm = () => {
    setFormData({
      nome: "",
      descricao: "",
      ativo: true,
      metodo: "POST",
      aceita_json: true,
      aceita_form_data: true,
      acao_tipo: "url_customizada",
      automacao_id: "",
      url_customizada: "",
      bot_id: "",
    });
    setEditingWebhook(null);
    setIsFormDialogOpen(false);
  };

  const getFullWebhookUrl = (urlGerada: string) => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    return `https://${projectId}.supabase.co/functions/v1/webhook-entrada/${urlGerada}`;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header com gradiente */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Webhook className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold">Webhooks de Entrada</h2>
              <p className="text-sm text-muted-foreground hidden sm:block">
                Configure webhooks para disparar automações ou ações customizadas
              </p>
            </div>
          </div>
          <Dialog open={isFormDialogOpen} onOpenChange={(open) => {
            setIsFormDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button size="lg" className="w-full sm:w-auto gap-2">
                <Plus className="w-4 h-4" />
                Novo Webhook
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">
                  {editingWebhook ? "Editar" : "Novo"} Webhook de Entrada
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">
                <div className="space-y-2">
                  <Label htmlFor="nome" className="text-sm">Nome *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Webhook Cadastro Lead"
                    required
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descricao" className="text-sm">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Descreva para que serve este webhook"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="metodo" className="text-sm">Método HTTP</Label>
                    <Select
                      value={formData.metodo}
                      onValueChange={(value) => setFormData({ ...formData, metodo: value })}
                    >
                      <SelectTrigger id="metodo" className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2 sm:pt-7">
                    <Switch
                      id="ativo"
                      checked={formData.ativo}
                      onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                    />
                    <Label htmlFor="ativo" className="text-sm">Webhook Ativo</Label>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-6 p-3 sm:p-4 bg-muted rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="aceita_json"
                      checked={formData.aceita_json}
                      onCheckedChange={(checked) => setFormData({ ...formData, aceita_json: checked })}
                    />
                    <Label htmlFor="aceita_json" className="text-sm">Aceita JSON</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="aceita_form_data"
                      checked={formData.aceita_form_data}
                      onCheckedChange={(checked) => setFormData({ ...formData, aceita_form_data: checked })}
                    />
                    <Label htmlFor="aceita_form_data" className="text-sm">Aceita Form Data</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="acao_tipo" className="text-sm">Tipo de Ação</Label>
                  <Select
                    value={formData.acao_tipo}
                    onValueChange={(value) => setFormData({ ...formData, acao_tipo: value })}
                  >
                    <SelectTrigger id="acao_tipo" className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="automacao_marketing">Automação de Marketing</SelectItem>
                      <SelectItem value="rodar_bot">Rodar Bot</SelectItem>
                      <SelectItem value="url_customizada">URL Customizada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.acao_tipo === "automacao_marketing" && (
                  <div className="space-y-2">
                    <Label htmlFor="automacao_id" className="text-sm">Automação de Marketing *</Label>
                    <Select
                      value={formData.automacao_id}
                      onValueChange={(value) => setFormData({ ...formData, automacao_id: value })}
                    >
                      <SelectTrigger id="automacao_id" className="h-10">
                        <SelectValue placeholder="Selecione uma automação" />
                      </SelectTrigger>
                      <SelectContent>
                        {automacoes.map((auto) => (
                          <SelectItem key={auto.id} value={auto.id}>
                            {auto.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {automacoes.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Nenhuma automação ativa encontrada
                      </p>
                    )}
                  </div>
                )}

                {formData.acao_tipo === "rodar_bot" && (
                  <div className="space-y-2">
                    <Label htmlFor="bot_id" className="text-sm">Bot *</Label>
                    <Select
                      value={formData.bot_id}
                      onValueChange={(value) => setFormData({ ...formData, bot_id: value })}
                    >
                      <SelectTrigger id="bot_id" className="h-10">
                        <SelectValue placeholder="Selecione um bot" />
                      </SelectTrigger>
                      <SelectContent>
                        {bots.map((bot) => (
                          <SelectItem key={bot.id} value={bot.id}>
                            {bot.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {bots.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Nenhum bot ativo encontrado
                      </p>
                    )}
                  </div>
                )}

                {formData.acao_tipo === "url_customizada" && (
                  <div className="space-y-2">
                    <Label htmlFor="url_customizada" className="text-sm">URL Customizada *</Label>
                    <Input
                      id="url_customizada"
                      value={formData.url_customizada}
                      onChange={(e) => setFormData({ ...formData, url_customizada: e.target.value })}
                      placeholder="https://sua-api.com/endpoint"
                      type="url"
                      required
                      className="h-10 font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Esta URL será chamada quando o webhook for acionado
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t">
                  <Button type="submit" className="flex-1">
                    {editingWebhook ? "Atualizar" : "Criar"} Webhook
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Lista de webhooks */}
      <div className="space-y-3 sm:space-y-4">
        {webhooks.length === 0 ? (
          <Card className="p-8 sm:p-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-muted mb-4">
                <Webhook className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium text-sm sm:text-base">
                Nenhum webhook de entrada configurado
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Clique em "Novo Webhook" para criar seu primeiro webhook
              </p>
            </div>
          </Card>
        ) : (
          webhooks.map((webhook) => (
            <Card key={webhook.id} className="overflow-hidden hover:shadow-md transition-all duration-200 border-l-4 border-l-primary/50">
              <div className="p-3 sm:p-4 lg:p-5">
                {/* Header do card */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3 sm:mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm sm:text-base truncate max-w-[200px] sm:max-w-none">
                        {webhook.nome}
                      </h4>
                      <div className="flex gap-1.5 flex-wrap">
                        <Badge 
                          variant={webhook.ativo ? "default" : "secondary"}
                          className="text-[10px] sm:text-xs"
                        >
                          {webhook.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] sm:text-xs font-mono">
                          {webhook.metodo}
                        </Badge>
                      </div>
                    </div>
                    {webhook.descricao && (
                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                        {webhook.descricao}
                      </p>
                    )}
                  </div>
                  
                  {/* Botões de ação */}
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTest(webhook)}
                      disabled={testingWebhook === webhook.id}
                      title="Testar webhook"
                      className="h-8 px-3 sm:h-9 sm:w-9 sm:p-0 flex items-center gap-2"
                    >
                      {testingWebhook === webhook.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                      <span className="sm:hidden text-xs">Testar</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(webhook)}
                      title="Editar"
                      className="h-8 px-3 sm:h-9 sm:w-9 sm:p-0 flex items-center gap-2"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span className="sm:hidden text-xs">Editar</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(webhook.id)}
                      title="Excluir"
                      className="h-8 px-3 sm:h-9 sm:w-9 sm:p-0 flex items-center gap-2 hover:bg-destructive/10 hover:border-destructive/50"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      <span className="sm:hidden text-xs text-destructive">Excluir</span>
                    </Button>
                  </div>
                </div>

                {/* URL do Webhook */}
                <div className="space-y-2 mb-3 sm:mb-4">
                  <Label className="text-xs sm:text-sm font-medium text-muted-foreground">URL do Webhook</Label>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-muted/50 rounded-md px-2 sm:px-3 py-1.5 sm:py-2 overflow-hidden">
                      <p className="font-mono text-[10px] sm:text-xs text-muted-foreground truncate">
                        {getFullWebhookUrl(webhook.url_gerada)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(getFullWebhookUrl(webhook.url_gerada))}
                      title="Copiar URL"
                      className="h-8 w-8 sm:h-9 sm:w-9 p-0 shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 text-xs sm:text-sm">
                  <div className="bg-muted/30 rounded-md p-2 sm:p-3">
                    <span className="text-muted-foreground text-[10px] sm:text-xs block mb-0.5">Tipo de Ação</span>
                    <p className="font-medium text-xs sm:text-sm truncate">
                      {webhook.acao_tipo === "automacao_marketing" 
                        ? "Automação Marketing" 
                        : webhook.acao_tipo === "rodar_bot"
                        ? "Rodar Bot"
                        : "URL Customizada"}
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-md p-2 sm:p-3">
                    <span className="text-muted-foreground text-[10px] sm:text-xs block mb-0.5">Total Triggers</span>
                    <p className="font-medium text-xs sm:text-sm">{webhook.total_triggers}</p>
                  </div>
                  {webhook.ultimo_trigger && (
                    <div className="col-span-2 sm:col-span-1 bg-muted/30 rounded-md p-2 sm:p-3">
                      <span className="text-muted-foreground text-[10px] sm:text-xs block mb-0.5">Último Trigger</span>
                      <p className="font-medium text-xs sm:text-sm truncate">
                        {new Date(webhook.ultimo_trigger).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  )}
                </div>

                {/* Badges de formatos */}
                <div className="flex gap-1.5 mt-3 pt-3 border-t">
                  {webhook.aceita_json && (
                    <Badge variant="outline" className="text-[10px] sm:text-xs bg-primary/5">
                      JSON
                    </Badge>
                  )}
                  {webhook.aceita_form_data && (
                    <Badge variant="outline" className="text-[10px] sm:text-xs bg-primary/5">
                      Form Data
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}