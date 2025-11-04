import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Plus, Copy, Play, Loader2, Webhook } from "lucide-react";
import { toast } from "sonner";
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Webhooks de Entrada</h3>
          <p className="text-sm text-muted-foreground">
            Configure webhooks para disparar automações ou ações customizadas
          </p>
        </div>
        <Dialog open={isFormDialogOpen} onOpenChange={(open) => {
          setIsFormDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingWebhook ? "Editar" : "Novo"} Webhook de Entrada
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Webhook Cadastro Lead"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descreva para que serve este webhook"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="metodo">Método HTTP</Label>
                  <Select
                    value={formData.metodo}
                    onValueChange={(value) => setFormData({ ...formData, metodo: value })}
                  >
                    <SelectTrigger id="metodo">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2 pt-8">
                  <Switch
                    id="ativo"
                    checked={formData.ativo}
                    onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                  />
                  <Label htmlFor="ativo">Webhook Ativo</Label>
                </div>
              </div>

              <div className="flex items-center justify-between space-x-6 p-4 bg-muted rounded-lg">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="aceita_json"
                    checked={formData.aceita_json}
                    onCheckedChange={(checked) => setFormData({ ...formData, aceita_json: checked })}
                  />
                  <Label htmlFor="aceita_json">Aceita JSON</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="aceita_form_data"
                    checked={formData.aceita_form_data}
                    onCheckedChange={(checked) => setFormData({ ...formData, aceita_form_data: checked })}
                  />
                  <Label htmlFor="aceita_form_data">Aceita Form Data</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="acao_tipo">Tipo de Ação</Label>
                <Select
                  value={formData.acao_tipo}
                  onValueChange={(value) => setFormData({ ...formData, acao_tipo: value })}
                >
                  <SelectTrigger id="acao_tipo">
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
                  <Label htmlFor="automacao_id">Automação de Marketing *</Label>
                  <Select
                    value={formData.automacao_id}
                    onValueChange={(value) => setFormData({ ...formData, automacao_id: value })}
                  >
                    <SelectTrigger id="automacao_id">
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
                    <p className="text-sm text-muted-foreground">
                      Nenhuma automação ativa encontrada
                    </p>
                  )}
                </div>
              )}

              {formData.acao_tipo === "rodar_bot" && (
                <div className="space-y-2">
                  <Label htmlFor="bot_id">Bot *</Label>
                  <Select
                    value={formData.bot_id}
                    onValueChange={(value) => setFormData({ ...formData, bot_id: value })}
                  >
                    <SelectTrigger id="bot_id">
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
                    <p className="text-sm text-muted-foreground">
                      Nenhum bot ativo encontrado
                    </p>
                  )}
                </div>
              )}

              {formData.acao_tipo === "url_customizada" && (
                <div className="space-y-2">
                  <Label htmlFor="url_customizada">URL Customizada *</Label>
                  <Input
                    id="url_customizada"
                    value={formData.url_customizada}
                    onChange={(e) => setFormData({ ...formData, url_customizada: e.target.value })}
                    placeholder="https://sua-api.com/endpoint"
                    type="url"
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Esta URL será chamada quando o webhook for acionado
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
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

      <div className="grid gap-4">
        {webhooks.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Webhook className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Nenhum webhook de entrada configurado ainda
              </p>
              <p className="text-sm text-muted-foreground text-center mt-2">
                Clique em "Novo Webhook" para criar seu primeiro webhook
              </p>
            </CardContent>
          </Card>
        ) : (
          webhooks.map((webhook) => (
            <Card key={webhook.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{webhook.nome}</CardTitle>
                      <Badge variant={webhook.ativo ? "default" : "secondary"}>
                        {webhook.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                      <Badge variant="outline">{webhook.metodo}</Badge>
                    </div>
                    {webhook.descricao && (
                      <CardDescription>{webhook.descricao}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleTest(webhook)}
                      disabled={testingWebhook === webhook.id}
                      title="Testar webhook"
                    >
                      {testingWebhook === webhook.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEdit(webhook)}
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(webhook.id)}
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">URL do Webhook</Label>
                  <div className="flex gap-2">
                    <Input
                      value={getFullWebhookUrl(webhook.url_gerada)}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(getFullWebhookUrl(webhook.url_gerada))}
                      title="Copiar URL"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Tipo de Ação:</span>
                    <p className="font-medium">
                      {webhook.acao_tipo === "automacao_marketing" 
                        ? "Automação de Marketing" 
                        : webhook.acao_tipo === "rodar_bot"
                        ? "Rodar Bot"
                        : "URL Customizada"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total de Triggers:</span>
                    <p className="font-medium">{webhook.total_triggers}</p>
                  </div>
                  {webhook.ultimo_trigger && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Último Trigger:</span>
                      <p className="font-medium">
                        {new Date(webhook.ultimo_trigger).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 text-xs text-muted-foreground">
                  {webhook.aceita_json && <Badge variant="outline">JSON</Badge>}
                  {webhook.aceita_form_data && <Badge variant="outline">Form Data</Badge>}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}