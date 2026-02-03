import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Webhook, Save, AlertTriangle, Check, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";

interface WebhookOption {
  id: string;
  name: string;
  url: string;
  method: string;
  type: string;
  description: string;
}

interface EnvioMassaWebhookConfigProps {
  estabelecimentoId: string;
}

export function EnvioMassaWebhookConfig({ estabelecimentoId }: EnvioMassaWebhookConfigProps) {
  const [webhooks, setWebhooks] = useState<WebhookOption[]>([]);
  const [selectedWebhookId, setSelectedWebhookId] = useState<string>("");
  const [currentConfig, setCurrentConfig] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [estabelecimentoId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Carrega webhooks com local de uso "envio-massa"
      const { data: webhooksData, error: webhooksError } = await supabase
        .from('webhooks')
        .select('id, name, url, method, type, description, usage_locations')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('active', true);

      if (webhooksError) throw webhooksError;

      // Filtra webhooks que têm "envio-massa" nos locais de uso
      const filteredWebhooks = (webhooksData || []).filter((w: any) => 
        w.usage_locations?.includes('envio-massa')
      ).map((w: any) => ({
        id: w.id,
        name: w.name,
        url: w.url,
        method: w.method,
        type: w.type,
        description: w.description || ''
      }));

      setWebhooks(filteredWebhooks);

      // Carrega configuração atual - usando tipagem any para nova tabela
      const { data: configData, error: configError } = await (supabase
        .from('envio_massa_config' as any)
        .select('webhook_id')
        .eq('estabelecimento_id', estabelecimentoId)
        .maybeSingle() as any);

      if (configError && configError.code !== 'PGRST116') throw configError;

      if (configData?.webhook_id) {
        setSelectedWebhookId(configData.webhook_id);
        setCurrentConfig(configData.webhook_id);
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedWebhookId) {
      toast.error('Selecione um webhook');
      return;
    }

    try {
      setSaving(true);

      // Verificar se já existe configuração - usando tipagem any para nova tabela
      const { data: existing } = await (supabase
        .from('envio_massa_config' as any)
        .select('id')
        .eq('estabelecimento_id', estabelecimentoId)
        .maybeSingle() as any);

      if (existing) {
        const { error } = await (supabase
          .from('envio_massa_config' as any)
          .update({ webhook_id: selectedWebhookId, updated_at: new Date().toISOString() })
          .eq('estabelecimento_id', estabelecimentoId) as any);

        if (error) throw error;
      } else {
        const { error } = await (supabase
          .from('envio_massa_config' as any)
          .insert({
            estabelecimento_id: estabelecimentoId,
            webhook_id: selectedWebhookId
          }) as any);

        if (error) throw error;
      }

      setCurrentConfig(selectedWebhookId);
      toast.success('Configuração salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  const selectedWebhook = webhooks.find(w => w.id === selectedWebhookId);
  const hasChanges = selectedWebhookId !== currentConfig;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Carregando configurações...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhook de Disparo de Mensagens
          </CardTitle>
          <CardDescription>
            Configure qual webhook será usado para disparar as mensagens do envio em massa.
            O webhook selecionado receberá os dados de cada mensagem a ser enviada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {webhooks.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Nenhum webhook configurado para envio em massa. 
                Vá em <strong>Webhooks de Saída</strong> e crie um webhook com o local de uso <strong>"ENVIO EM MASSA"</strong>.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Webhook Ativo</Label>
                <Select value={selectedWebhookId} onValueChange={setSelectedWebhookId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione um webhook" />
                  </SelectTrigger>
                  <SelectContent>
                    {webhooks.map((webhook) => (
                      <SelectItem key={webhook.id} value={webhook.id}>
                        <div className="flex items-center gap-2">
                          <span>{webhook.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {webhook.method}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedWebhook && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{selectedWebhook.method}</Badge>
                      <code className="text-xs bg-background px-2 py-1 rounded truncate flex-1">
                        {selectedWebhook.url}
                      </code>
                    </div>
                    {selectedWebhook.description && (
                      <p className="text-sm text-muted-foreground">
                        {selectedWebhook.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center gap-2">
                  {currentConfig && (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      <Check className="h-3 w-3 mr-1" />
                      Configurado
                    </Badge>
                  )}
                  {hasChanges && (
                    <Badge variant="secondary">
                      Alterações pendentes
                    </Badge>
                  )}
                </div>
                <Button 
                  onClick={handleSave} 
                  disabled={saving || !hasChanges || !selectedWebhookId}
                >
                  {saving ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar Configuração
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payload do Webhook</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Quando você disparar um envio em massa, o sistema enviará uma requisição para o webhook configurado
            para cada contato da lista. O payload JSON incluirá:
          </p>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-foreground mb-1">Dados do Contato:</h4>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><code className="bg-muted px-1 rounded">contato.id</code> - ID único do contato</li>
                <li><code className="bg-muted px-1 rounded">contato.nome</code> - Nome do contato</li>
                <li><code className="bg-muted px-1 rounded">contato.telefone</code> - Telefone/WhatsApp</li>
                <li><code className="bg-muted px-1 rounded">contato.email</code> - E-mail do contato</li>
                <li><code className="bg-muted px-1 rounded">contato.empresa</code> - Empresa (se houver)</li>
                <li><code className="bg-muted px-1 rounded">contato.tags</code> - Tags do contato (array)</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-foreground mb-1">Canal e Contexto:</h4>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><code className="bg-muted px-1 rounded">canal</code> - "whatsapp" ou "email"</li>
                <li><code className="bg-muted px-1 rounded">estabelecimentoId</code> - ID do estabelecimento</li>
                <li><code className="bg-muted px-1 rounded">usuarioId</code> - ID do usuário que enviou</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-foreground mb-1">Conteúdo (array de itens):</h4>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><code className="bg-muted px-1 rounded">contentItems[]</code> - Array com todos os itens da mensagem</li>
                <li><code className="bg-muted px-1 rounded">contentItems[].type</code> - "text", "image", "video", "catalog", "file", "quick_reply"</li>
                <li><code className="bg-muted px-1 rounded">contentItems[].content</code> - Conteúdo com variáveis substituídas</li>
                <li><code className="bg-muted px-1 rounded">contentItems[].mediaUrl</code> - URL da mídia (se houver)</li>
                <li><code className="bg-muted px-1 rounded">contentItems[].catalogId</code> - ID do catálogo (se for catálogo)</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-foreground mb-1">Campos de Conveniência:</h4>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><code className="bg-muted px-1 rounded">mensagemPrincipal</code> - Primeiro texto da mensagem</li>
                <li><code className="bg-muted px-1 rounded">midia[]</code> - Array de mídias (imagens/vídeos)</li>
                <li><code className="bg-muted px-1 rounded">catalogo[]</code> - Array de catálogos</li>
                <li><code className="bg-muted px-1 rounded">arquivos[]</code> - Array de arquivos anexos</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-foreground mb-1">Agendamento e Meta:</h4>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><code className="bg-muted px-1 rounded">proximaDataContato</code> - Data do próximo contato (YYYY-MM-DD)</li>
                <li><code className="bg-muted px-1 rounded">timestamp</code> - Data/hora do envio (ISO)</li>
                <li><code className="bg-muted px-1 rounded">totalContatos</code> - Total de contatos no lote</li>
                <li><code className="bg-muted px-1 rounded">contatoAtual</code> - Número do contato atual</li>
                <li><code className="bg-muted px-1 rounded">filtrosAplicados</code> - Filtros usados na seleção</li>
              </ul>
            </div>
          </div>

          <p className="pt-2 border-t mt-4">
            Configure seu webhook (N8N, Make, Zapier, etc.) para receber esses dados e realizar o envio via API do WhatsApp ou e-mail.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
