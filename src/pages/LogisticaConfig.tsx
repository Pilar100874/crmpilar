import React, { useState, useEffect } from 'react';
import { ArrowLeft, Settings, Copy, Check, RefreshCw, Link2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

const LogisticaConfig: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<{ id: string; token_rastreamento: string } | null>(null);
  const [copied, setCopied] = useState<'token' | 'url' | null>(null);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ioxugupvxlcdweldocmq.supabase.co';
  const trackingUrl = `${supabaseUrl}/functions/v1/rastreamento-posicao`;

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const estabelecimentoId = localStorage.getItem('estabelecimento_id');
      if (!estabelecimentoId) {
        toast.error('Estabelecimento não encontrado');
        return;
      }

      const { data, error } = await supabase
        .from('logistica_config')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfig(data);
      } else {
        // Create config if it doesn't exist
        const { data: newConfig, error: createError } = await supabase
          .from('logistica_config')
          .insert({ estabelecimento_id: estabelecimentoId })
          .select()
          .single();

        if (createError) throw createError;
        setConfig(newConfig);
      }
    } catch (error) {
      console.error('Error loading config:', error);
      toast.error('Erro ao carregar configuração');
    } finally {
      setLoading(false);
    }
  };

  const regenerateToken = async () => {
    if (!config) return;
    
    setSaving(true);
    try {
      const estabelecimentoId = localStorage.getItem('estabelecimento_id');
      
      // Generate new token
      const newToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const { error } = await supabase
        .from('logistica_config')
        .update({ token_rastreamento: newToken })
        .eq('estabelecimento_id', estabelecimentoId);

      if (error) throw error;

      setConfig({ ...config, token_rastreamento: newToken });
      toast.success('Token regenerado com sucesso');
    } catch (error) {
      console.error('Error regenerating token:', error);
      toast.error('Erro ao regenerar token');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'token' | 'url') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      toast.success('Copiado para a área de transferência');
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      toast.error('Erro ao copiar');
    }
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-muted-foreground">Carregando configuração...</div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-background flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/logistica')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuração de Rastreamento
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure a integração com aplicativos de rastreamento
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Token Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Token de Autenticação</CardTitle>
              <CardDescription>
                Use este token para autenticar as requisições dos rastreadores
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Token</Label>
                <div className="flex gap-2">
                  <Input
                    value={config?.token_rastreamento || ''}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => config && copyToClipboard(config.token_rastreamento, 'token')}
                  >
                    {copied === 'token' ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={regenerateToken}
                    disabled={saving}
                  >
                    <RefreshCw className={`h-4 w-4 ${saving ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Clique no ícone de atualização para gerar um novo token. Atenção: isso invalidará o token anterior.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* URL Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                URL do Endpoint
              </CardTitle>
              <CardDescription>
                Configure esta URL no seu aplicativo de rastreamento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>URL para Rastreadores</Label>
                <div className="flex gap-2">
                  <Input
                    value={trackingUrl}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(trackingUrl, 'url')}
                  >
                    {copied === 'url' ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>Configuração do Traccar Client</Label>
                <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                  <p className="font-medium">No aplicativo Traccar Client:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Abra as Configurações</li>
                    <li>Em "URL do Servidor", cole: <code className="bg-background px-1 rounded">{trackingUrl}</code></li>
                    <li>Em "Identificador do Dispositivo", adicione o token: <code className="bg-background px-1 rounded">{config?.token_rastreamento?.substring(0, 8)}...</code></li>
                    <li>Ative o rastreamento</li>
                  </ol>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>Formato da Requisição (Avançado)</Label>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Para integração personalizada, envie um POST com o seguinte formato:
                  </p>
                  <pre className="bg-background p-3 rounded text-xs overflow-x-auto">
{`POST ${trackingUrl}
Content-Type: application/json

{
  "veiculoId": "uuid-do-veiculo",
  "lat": -23.5505,
  "lng": -46.6333,
  "velocidade": 60,
  "direcao": 180,
  "token": "${config?.token_rastreamento?.substring(0, 8)}..."
}`}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LogisticaConfig;