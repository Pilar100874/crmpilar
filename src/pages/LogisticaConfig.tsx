import React, { useState, useEffect } from 'react';
import { ArrowLeft, Settings, Copy, Check, Key, Eye, EyeOff, Link2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


interface LogisticaConfigData {
  id: string;
  token_rastreamento: string;
  heigit_api_key: string | null;
  estabelecimento_id: string;
}

interface LogisticaConfigProps {
  embedded?: boolean;
}

const LogisticaConfig: React.FC<LogisticaConfigProps> = ({ embedded = false }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<LogisticaConfigData | null>(null);
  const [copied, setCopied] = useState<'key' | 'url' | 'token' | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [apiKey, setApiKey] = useState('');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ioxugupvxlcdweldocmq.supabase.co';
  const trackingUrl = `${supabaseUrl}/functions/v1/rastreamento-posicao`;

  useEffect(() => {
    loadConfig();
  }, []);

  const getEstabelecimentoId = async (): Promise<string | null> => {
    // First try localStorage
    const storedId = localStorage.getItem('estabelecimento_id');
    if (storedId) return storedId;

    // For admins, try to get the first estabelecimento
    const { data } = await supabase
      .from('estabelecimentos')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (data?.id) {
      localStorage.setItem('estabelecimento_id', data.id);
      return data.id;
    }

    return null;
  };

  const loadConfig = async () => {
    setLoading(true);
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) {
        toast.error('Estabelecimento não encontrado');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('logistica_config')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfig(data as LogisticaConfigData);
        setApiKey((data as LogisticaConfigData).heigit_api_key || '');
      } else {
        // Create config if it doesn't exist
        const { data: newConfig, error: createError } = await supabase
          .from('logistica_config')
          .insert({ estabelecimento_id: estabelecimentoId })
          .select()
          .single();

        if (createError) throw createError;
        setConfig(newConfig as LogisticaConfigData);
        setApiKey('');
      }
    } catch (error) {
      console.error('Error loading config:', error);
      toast.error('Erro ao carregar configuração');
    } finally {
      setLoading(false);
    }
  };

  const saveApiKey = async () => {
    if (!config) return;
    
    setSaving(true);
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) {
        toast.error('Estabelecimento não encontrado');
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from('logistica_config')
        .update({ heigit_api_key: apiKey } as any)
        .eq('estabelecimento_id', estabelecimentoId);

      if (error) throw error;

      setConfig({ ...config, heigit_api_key: apiKey });
      toast.success('Chave da API salva com sucesso');
    } catch (error) {
      console.error('Error saving API key:', error);
      toast.error('Erro ao salvar chave da API');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'key' | 'url' | 'token') => {
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
      <div className={cn("flex items-center justify-center", embedded ? "h-64" : "h-[calc(100vh-64px)]")}>
        <div className="text-muted-foreground">Carregando configuração...</div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", embedded ? "h-full" : "h-[calc(100vh-64px)]")}>
      {/* Header */}
      {!embedded && (
        <div className="p-4 border-b bg-background flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/logistica')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuração de Logística
            </h1>
            <p className="text-sm text-muted-foreground">
              Configure as integrações e APIs do módulo de logística
            </p>
          </div>
        </div>
      )}

      {/* Content */}
      <div className={cn("flex-1 overflow-auto", embedded ? "p-0" : "p-6")}>
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Heigit API Key Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Key className="h-5 w-5" />
                Chave da API Heigit (OpenRouteService)
              </CardTitle>
              <CardDescription>
                Insira sua chave de API do Heigit/OpenRouteService para utilizar os serviços de roteirização
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>API Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Insira sua chave da API Heigit"
                      className="font-mono text-sm pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowKey(!showKey)}
                    >
                      {showKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => apiKey && copyToClipboard(apiKey, 'key')}
                    disabled={!apiKey}
                  >
                    {copied === 'key' ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Obtenha sua chave gratuita em{' '}
                  <a 
                    href="https://openrouteservice.org/dev/#/signup" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    openrouteservice.org
                  </a>
                </p>
              </div>

              <Button 
                onClick={saveApiKey} 
                disabled={saving || !apiKey}
                className="w-full"
              >
                {saving ? 'Salvando...' : 'Salvar Chave da API'}
              </Button>
            </CardContent>
          </Card>

          {/* Tracking URL Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                URL de Rastreamento
              </CardTitle>
              <CardDescription>
                Configure esta URL no seu aplicativo de rastreamento (Traccar Client, OsmAnd, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>URL do Endpoint</Label>
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
                    <li>Em "Identificador do Dispositivo", use o ID cadastrado no veículo (traccar_device_id)</li>
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
  "direcao": 180
}`}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dispositivos de Rastreamento agora vive dentro de Logística → Veículo / Pessoa */}
        </div>
      </div>
    </div>
  );
};

export default LogisticaConfig;
