import React, { useState, useEffect } from 'react';
import { Workflow, Wand2, Copy, Check, Loader2, Sparkles, RefreshCw, Download, AlertCircle, Server, FileCode, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MarketingResource, FIELD_TYPE_LABELS, RETURN_TYPE_LABELS, CHANNEL_CONFIG, ResourceField, PublishChannel } from './types';

interface EnvVariable {
  name: string;
  description: string;
  example: string;
}

interface DBMarketingResource {
  id: string;
  name: string;
  description: string | null;
  return_type: string;
  fields: ResourceField[];
  publish_channels: string[] | null;
  auto_publish_enabled: boolean | null;
}

const ResourceN8nGenerator: React.FC = () => {
  const [resources, setResources] = useState<MarketingResource[]>([]);
  const [selectedResourceId, setSelectedResourceId] = useState<string>('');
  const [generatedJson, setGeneratedJson] = useState<string>('');
  const [envVariables, setEnvVariables] = useState<EnvVariable[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isEnvCopied, setIsEnvCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResources();
  }, []);

  const loadResources = async () => {
    setLoading(true);
    try {
      const estabelecimentoId = localStorage.getItem('estabelecimentoId');
      if (!estabelecimentoId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('marketing_resources')
        .select('id, name, description, return_type, fields, publish_channels, auto_publish_enabled')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('name');

      if (error) throw error;

      const mapped = (data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description || undefined,
        returnType: item.return_type as any,
        fields: (item.fields || []) as ResourceField[],
        publishChannels: (item.publish_channels || []) as PublishChannel[],
        autoPublishEnabled: item.auto_publish_enabled || false,
        createdAt: '',
        updatedAt: '',
      }));

      setResources(mapped);
    } catch (err) {
      console.error('Error loading resources:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedResource = resources.find(r => r.id === selectedResourceId);

  const buildResourceContext = (resource: MarketingResource): string => {
    const fieldsInfo = resource.fields.map(f => 
      `- ${f.label} (${FIELD_TYPE_LABELS[f.type]}): ${f.required ? 'Obrigatório' : 'Opcional'}${f.placeholder ? ` - "${f.placeholder}"` : ''}`
    ).join('\n');

    const channelsInfo = (resource.publishChannels || []).map(ch => 
      CHANNEL_CONFIG[ch]?.label || ch
    ).join(', ');

    return `
RECURSO DE MARKETING: "${resource.name}"
${resource.description ? `Descrição: ${resource.description}` : ''}

TIPO DE RETORNO: ${RETURN_TYPE_LABELS[resource.returnType]}
- O workflow deve gerar conteúdo do tipo: ${resource.returnType}

CAMPOS DE ENTRADA (o usuário preencherá estes dados):
${fieldsInfo}

${channelsInfo ? `CANAIS DE PUBLICAÇÃO: ${channelsInfo}` : 'SEM CANAIS DE PUBLICAÇÃO CONFIGURADOS'}
${resource.autoPublishEnabled ? '- Publicação automática ATIVADA: o workflow deve publicar automaticamente nos canais acima após gerar o conteúdo' : '- Publicação automática DESATIVADA: gerar apenas o conteúdo sem publicar'}
`;
  };

  const generateWorkflow = async () => {
    if (!selectedResource) {
      toast.error('Selecione um recurso primeiro');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedJson('');
    setEnvVariables([]);

    try {
      const resourceContext = buildResourceContext(selectedResource);
      
      const systemPrompt = `Você é um especialista em n8n workflow automation. Sua tarefa é gerar workflows n8n válidos em formato JSON baseados em Recursos de Marketing de IA.

CONTEXTO DO RECURSO:
${resourceContext}

REGRAS IMPORTANTES:
1. Gere APENAS o JSON válido do workflow, sem explicações antes ou depois
2. O JSON deve seguir a estrutura exata do n8n v1.0+
3. Use nodes oficiais do n8n
4. Inclua todas as conexões necessárias entre nodes

ESTRUTURA DO WORKFLOW:
1. TRIGGER: Webhook que receberá os dados dos campos de entrada
2. PROCESSAMENTO: 
   - Para retorno "image": usar node de IA para gerar imagem (ex: OpenAI DALL-E, Stability AI)
   - Para retorno "video": usar APIs de geração de vídeo
   - Para retorno "audio": usar APIs de TTS/geração de áudio
   - Para retorno "text": usar OpenAI/outro LLM para gerar texto
3. PUBLICAÇÃO (se canais configurados):
   - WhatsApp: usar node HTTP Request para API do WhatsApp Business
   - Instagram: usar node HTTP Request para Instagram Graph API
   - Facebook: usar node HTTP Request para Facebook Graph API
   - Telegram: usar node Telegram
   - Email: usar node Email/SMTP

REGRA CRÍTICA - VARIÁVEIS DE AMBIENTE:
- NUNCA use credenciais hardcoded
- Use expressões n8n: ={{$env.NOME_VARIAVEL}}

Variáveis comuns por serviço:
- OpenAI: ={{$env.OPENAI_API_KEY}}
- WhatsApp: ={{$env.WHATSAPP_TOKEN}}, ={{$env.WHATSAPP_PHONE_ID}}
- Instagram: ={{$env.INSTAGRAM_ACCESS_TOKEN}}, ={{$env.INSTAGRAM_ACCOUNT_ID}}
- Facebook: ={{$env.FACEBOOK_ACCESS_TOKEN}}, ={{$env.FACEBOOK_PAGE_ID}}
- Telegram: ={{$env.TELEGRAM_BOT_TOKEN}}, ={{$env.TELEGRAM_CHAT_ID}}
- Email SMTP: ={{$env.SMTP_HOST}}, ={{$env.SMTP_USER}}, ={{$env.SMTP_PASSWORD}}

ESTRUTURA DO JSON:
{
  "name": "Nome do Workflow",
  "nodes": [...],
  "connections": {...},
  "active": false,
  "settings": { "executionOrder": "v1" },
  "versionId": "1",
  "id": "1"
}

Após o JSON, adicione uma seção separada por "---ENV_VARS---" listando todas as variáveis de ambiente necessárias no formato:
NOME_VARIAVEL|Descrição|Exemplo de valor`;

      const response = await supabase.functions.invoke('chat', {
        body: {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Gere o workflow n8n completo para o recurso "${selectedResource.name}" que foi descrito acima.` }
          ]
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao gerar workflow');
      }

      const reader = response.data?.body?.getReader?.();
      
      if (reader) {
        const decoder = new TextDecoder();
        let fullContent = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ') && line.trim() !== 'data: [DONE]') {
              try {
                const json = JSON.parse(line.slice(6));
                const content = json.choices?.[0]?.delta?.content;
                if (content) {
                  fullContent += content;
                }
              } catch {
                // Skip invalid JSON lines
              }
            }
          }
        }

        parseGeneratedContent(fullContent);
      } else {
        const data = response.data;
        if (typeof data === 'string') {
          parseGeneratedContent(data);
        }
      }
    } catch (err) {
      console.error('Error generating workflow:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao gerar workflow';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const parseGeneratedContent = (content: string) => {
    const parts = content.split('---ENV_VARS---');
    const jsonPart = parts[0];
    const envPart = parts[1] || '';

    const jsonMatch = jsonPart.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const jsonStr = jsonMatch[0];
      JSON.parse(jsonStr); // Validate
      setGeneratedJson(jsonStr);

      const envVarsFromJson = extractEnvVarsFromJson(jsonStr);
      
      const explicitEnvVars: EnvVariable[] = [];
      if (envPart.trim()) {
        const lines = envPart.trim().split('\n');
        for (const line of lines) {
          const [name, description, example] = line.split('|').map(s => s.trim());
          if (name && !name.startsWith('#')) {
            explicitEnvVars.push({ name, description: description || '', example: example || '' });
          }
        }
      }

      const allEnvVars = [...envVarsFromJson];
      for (const ev of explicitEnvVars) {
        if (!allEnvVars.find(v => v.name === ev.name)) {
          allEnvVars.push(ev);
        }
      }

      setEnvVariables(allEnvVars);
      toast.success('Workflow gerado com sucesso!');
    } else {
      throw new Error('Não foi possível extrair o JSON do workflow');
    }
  };

  const extractEnvVarsFromJson = (jsonStr: string): EnvVariable[] => {
    const envVars: EnvVariable[] = [];
    const regex = /\{\{\$env\.([A-Z_]+)\}\}/g;
    let match;
    const seen = new Set<string>();

    while ((match = regex.exec(jsonStr)) !== null) {
      const varName = match[1];
      if (!seen.has(varName)) {
        seen.add(varName);
        envVars.push({
          name: varName,
          description: getEnvVarDescription(varName),
          example: getEnvVarExample(varName)
        });
      }
    }

    return envVars;
  };

  const getEnvVarDescription = (name: string): string => {
    const descriptions: Record<string, string> = {
      'OPENAI_API_KEY': 'Chave de API da OpenAI',
      'WHATSAPP_TOKEN': 'Token de acesso do WhatsApp Business API',
      'WHATSAPP_PHONE_ID': 'ID do número de telefone WhatsApp',
      'INSTAGRAM_ACCESS_TOKEN': 'Token de acesso da Instagram Graph API',
      'INSTAGRAM_ACCOUNT_ID': 'ID da conta do Instagram Business',
      'FACEBOOK_ACCESS_TOKEN': 'Token de acesso da Facebook Graph API',
      'FACEBOOK_PAGE_ID': 'ID da página do Facebook',
      'TELEGRAM_BOT_TOKEN': 'Token do bot do Telegram',
      'TELEGRAM_CHAT_ID': 'ID do chat/grupo do Telegram',
      'SMTP_HOST': 'Servidor SMTP',
      'SMTP_USER': 'Usuário SMTP',
      'SMTP_PASSWORD': 'Senha SMTP',
      'SMTP_PORT': 'Porta SMTP',
    };
    return descriptions[name] || `Valor para ${name}`;
  };

  const getEnvVarExample = (name: string): string => {
    const examples: Record<string, string> = {
      'OPENAI_API_KEY': 'sk-xxxxxxxxxxxxxxxx',
      'WHATSAPP_TOKEN': 'EAAxxxxxxxxxxxxxxxx',
      'WHATSAPP_PHONE_ID': '123456789012345',
      'INSTAGRAM_ACCESS_TOKEN': 'IGQxxxxxxxxxxx',
      'INSTAGRAM_ACCOUNT_ID': '17841400000000000',
      'FACEBOOK_ACCESS_TOKEN': 'EAAxxxxxxxxxxxxxxxx',
      'FACEBOOK_PAGE_ID': '123456789012345',
      'TELEGRAM_BOT_TOKEN': '123456789:ABCdefGHIjklMNOpqrsTUVwxyz',
      'TELEGRAM_CHAT_ID': '-1001234567890',
      'SMTP_HOST': 'smtp.gmail.com',
      'SMTP_USER': 'email@gmail.com',
      'SMTP_PASSWORD': '********',
      'SMTP_PORT': '587',
    };
    return examples[name] || 'seu_valor_aqui';
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedJson);
      setIsCopied(true);
      toast.success('JSON copiado para a área de transferência');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      toast.error('Erro ao copiar');
    }
  };

  const copyEnvTemplate = async () => {
    const template = envVariables.map(v => `${v.name}=${v.example}`).join('\n');
    try {
      await navigator.clipboard.writeText(template);
      setIsEnvCopied(true);
      toast.success('Template de variáveis copiado!');
      setTimeout(() => setIsEnvCopied(false), 2000);
    } catch (error) {
      toast.error('Erro ao copiar');
    }
  };

  const downloadJson = () => {
    const blob = new Blob([generatedJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `n8n-${selectedResource?.name?.toLowerCase().replace(/\s+/g, '-') || 'workflow'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Arquivo baixado');
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(generatedJson);
      setGeneratedJson(JSON.stringify(parsed, null, 2));
    } catch {
      toast.error('JSON inválido');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Workflow className="h-5 w-5 text-primary" />
          Gerador de Workflows n8n
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Selecione um Recurso de IA e gere automaticamente o workflow n8n com base nas suas configurações
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-yellow-500" />
            Selecione o Recurso
          </CardTitle>
          <CardDescription>
            O workflow será gerado baseado nos campos, tipo de retorno e canais de publicação configurados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {resources.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Nenhum recurso de IA encontrado. Crie um recurso primeiro na aba "Recursos de IA".
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Select value={selectedResourceId} onValueChange={setSelectedResourceId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um recurso..." />
                </SelectTrigger>
                <SelectContent>
                  {resources.map((resource) => (
                    <SelectItem key={resource.id} value={resource.id}>
                      <div className="flex items-center gap-2">
                        <span>{resource.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {RETURN_TYPE_LABELS[resource.returnType]}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedResource && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4 space-y-3">
                    <div>
                      <span className="text-xs text-muted-foreground">Campos de entrada:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedResource.fields.map((field) => (
                          <Badge key={field.id} variant="secondary" className="text-xs">
                            {field.label}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-xs text-muted-foreground">Tipo de retorno:</span>
                      <Badge className="ml-2 text-xs">
                        {RETURN_TYPE_LABELS[selectedResource.returnType]}
                      </Badge>
                    </div>

                    {selectedResource.publishChannels && selectedResource.publishChannels.length > 0 && (
                      <div>
                        <span className="text-xs text-muted-foreground">Canais de publicação:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedResource.publishChannels.map((channel) => (
                            <Badge 
                              key={channel} 
                              variant="outline" 
                              className={`text-xs ${CHANNEL_CONFIG[channel]?.color} text-white`}
                            >
                              {CHANNEL_CONFIG[channel]?.label || channel}
                            </Badge>
                          ))}
                        </div>
                        {selectedResource.autoPublishEnabled && (
                          <p className="text-xs text-green-600 mt-1">✓ Publicação automática ativada</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Button 
                onClick={generateWorkflow} 
                disabled={isGenerating || !selectedResourceId}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gerando workflow...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Gerar Workflow
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {generatedJson && (
        <Tabs defaultValue="workflow" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="workflow" className="flex items-center gap-2">
              <FileCode className="h-4 w-4" />
              Workflow JSON
            </TabsTrigger>
            <TabsTrigger value="env" className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              Variáveis Railway
              {envVariables.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {envVariables.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workflow">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">JSON do Workflow</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={formatJson}>
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Formatar
                    </Button>
                    <Button variant="outline" size="sm" onClick={downloadJson}>
                      <Download className="h-4 w-4 mr-1" />
                      Baixar
                    </Button>
                    <Button variant="default" size="sm" onClick={copyToClipboard}>
                      {isCopied ? (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1" />
                          Copiar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  Importe no n8n via Menu → Import from File/URL
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] rounded-md border bg-muted/50 p-4">
                  <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                    {generatedJson}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="env">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Variáveis de Ambiente</CardTitle>
                    <CardDescription>
                      Configure estas variáveis no Railway para o n8n funcionar
                    </CardDescription>
                  </div>
                  <Button variant="default" size="sm" onClick={copyEnvTemplate}>
                    {isEnvCopied ? (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-1" />
                        Copiar Template
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {envVariables.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma variável de ambiente necessária
                  </p>
                ) : (
                  <div className="space-y-3">
                    {envVariables.map((env, idx) => (
                      <div key={idx} className="p-3 rounded-lg border bg-muted/30">
                        <div className="flex items-center justify-between">
                          <code className="text-sm font-mono font-semibold text-primary">
                            {env.name}
                          </code>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {env.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Exemplo: <code className="bg-background px-1 rounded">{env.example}</code>
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default ResourceN8nGenerator;
