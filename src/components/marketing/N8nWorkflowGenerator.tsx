import React, { useState, useEffect } from 'react';
import { Workflow, Wand2, Copy, Check, Loader2, Sparkles, RefreshCw, Download, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SavedCredential {
  integration_name: string;
  display_name: string;
  is_active: boolean;
}

const N8nWorkflowGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [generatedJson, setGeneratedJson] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [availableCredentials, setAvailableCredentials] = useState<SavedCredential[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCredentials();
  }, []);

  const fetchCredentials = async () => {
    try {
      // Fetch integration credentials
      const { data: integrationCreds } = await supabase
        .from('integration_credentials')
        .select('integration_name, display_name, is_active')
        .eq('is_active', true);

      // Fetch AI API keys
      const { data: aiKeys } = await supabase
        .from('ai_api_keys')
        .select('provider, provider_display_name, is_active')
        .eq('is_active', true);

      const allCreds: SavedCredential[] = [
        ...(integrationCreds || []).map(c => ({
          integration_name: c.integration_name,
          display_name: c.display_name,
          is_active: c.is_active ?? true
        })),
        ...(aiKeys || []).map(k => ({
          integration_name: k.provider,
          display_name: k.provider_display_name,
          is_active: k.is_active ?? true
        }))
      ];

      setAvailableCredentials(allCreds);
    } catch (error) {
      console.error('Error fetching credentials:', error);
    }
  };

  const generateWorkflow = async () => {
    if (!prompt.trim()) {
      toast.error('Descreva o workflow que deseja criar');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedJson('');

    try {
      const credentialsList = availableCredentials.map(c => c.display_name).join(', ');
      
      const systemPrompt = `Você é um especialista em n8n workflow automation. Sua tarefa é gerar workflows n8n válidos em formato JSON que podem ser importados diretamente no n8n.

REGRAS IMPORTANTES:
1. Gere APENAS o JSON válido do workflow, sem explicações antes ou depois
2. O JSON deve seguir a estrutura exata do n8n v1.0+
3. Use nodes oficiais do n8n
4. Inclua todas as conexões necessárias entre nodes
5. Configure os parâmetros dos nodes de forma realista
6. Use credenciais placeholder no formato {{$credentials.nome_da_credencial}}

Credenciais disponíveis do usuário: ${credentialsList || 'Nenhuma configurada'}

ESTRUTURA BASE DO WORKFLOW:
{
  "name": "Nome do Workflow",
  "nodes": [...],
  "connections": {...},
  "active": false,
  "settings": {
    "executionOrder": "v1"
  },
  "versionId": "1",
  "id": "1"
}

EXEMPLO DE NODE:
{
  "parameters": {},
  "id": "uuid-here",
  "name": "Node Name",
  "type": "n8n-nodes-base.webhook",
  "typeVersion": 1.1,
  "position": [250, 300]
}`;

      const response = await supabase.functions.invoke('chat', {
        body: {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Crie um workflow n8n para: ${prompt}` }
          ]
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao gerar workflow');
      }

      // Handle streaming response
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

        // Extract JSON from the response
        const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonStr = jsonMatch[0];
          // Validate JSON
          JSON.parse(jsonStr);
          setGeneratedJson(jsonStr);
          toast.success('Workflow gerado com sucesso!');
        } else {
          throw new Error('Não foi possível extrair o JSON do workflow');
        }
      } else {
        // Non-streaming response
        const data = response.data;
        if (typeof data === 'string') {
          const jsonMatch = data.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            JSON.parse(jsonMatch[0]);
            setGeneratedJson(jsonMatch[0]);
            toast.success('Workflow gerado com sucesso!');
          }
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

  const downloadJson = () => {
    const blob = new Blob([generatedJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'n8n-workflow.json';
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

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Workflow className="h-5 w-5 text-primary" />
          Gerador de Workflows n8n
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Descreva o que precisa automatizar e receba um JSON pronto para importar no n8n
        </p>
      </div>

      {/* Available Credentials */}
      {availableCredentials.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Credenciais Disponíveis</CardTitle>
            <CardDescription className="text-xs">
              Estas credenciais serão consideradas na geração do workflow
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {availableCredentials.map((cred, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {cred.display_name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-yellow-500" />
            Descreva seu Workflow
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prompt">O que você quer automatizar?</Label>
            <Textarea
              id="prompt"
              placeholder="Ex: Quando receber um email no Gmail com 'Pedido' no assunto, extrair os dados e salvar em uma planilha do Google Sheets, depois enviar uma mensagem no WhatsApp confirmando o recebimento."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Seja específico sobre triggers, ações, condições e integrações que deseja usar
            </p>
          </div>

          <Button 
            onClick={generateWorkflow} 
            disabled={isGenerating || !prompt.trim()}
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
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Output Section */}
      {generatedJson && (
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
              Copie este JSON e importe no n8n via Menu → Import from File/URL
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
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Como usar no n8n</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li>Copie o JSON gerado acima</li>
            <li>Abra o n8n e vá em <strong>Menu → Import from File/URL</strong></li>
            <li>Cole o JSON e clique em Import</li>
            <li>Configure as credenciais nos nodes que precisam de autenticação</li>
            <li>Teste o workflow e ative quando estiver pronto</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};

export default N8nWorkflowGenerator;
