import React, { useState, useEffect } from 'react';
import { ArrowLeft, Settings, Copy, Check, Key, Eye, EyeOff, Send, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { LogisticaGruposCRUD } from '@/components/logistica/LogisticaGruposCRUD';



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
  const [copied, setCopied] = useState<'key' | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [apiKey, setApiKey] = useState('');

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

  const copyToClipboard = async (text: string, type: 'key') => {
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

          <TestePostFakeCard />
          {/* Dispositivos de Rastreamento agora vive dentro de Logística → Veículo / Pessoa */}
        </div>
      </div>
    </div>
  );
};

export default LogisticaConfig;

// ============================================================
// Card de teste: envia um POST fake para a edge rastreamento-posicao
// ============================================================
const TestePostFakeCard: React.FC = () => {
  const [veiculos, setVeiculos] = useState<Array<{ id: string; placa: string; traccar_device_id: string | null }>>([]);
  const [veiculoId, setVeiculoId] = useState('');
  const [lat, setLat] = useState('-23.55052');
  const [lng, setLng] = useState('-46.633308');
  const [velocidade, setVelocidade] = useState('40');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('veiculos')
        .select('id, placa, traccar_device_id')
        .eq('ativo', true)
        .order('placa');
      if (data) setVeiculos(data as any);
    })();
  }, []);

  const enviar = async () => {
    if (!veiculoId) {
      toast.error('Selecione um veículo');
      return;
    }
    setEnviando(true);
    setResultado(null);
    try {
      const supaUrl = (import.meta as any).env.VITE_SUPABASE_URL;
      const anon = (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const url = `${supaUrl}/functions/v1/rastreamento-posicao`;
      const body = {
        veiculoId,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        velocidade: parseFloat(velocidade) || 0,
        direcao: 0,
        dataHora: new Date().toISOString(),
      };
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anon,
          Authorization: `Bearer ${anon}`,
        },
        body: JSON.stringify(body),
      });
      const text = await resp.text();
      const ok = resp.ok;
      setResultado({ ok, msg: `HTTP ${resp.status} — ${text}` });
      if (ok) toast.success('Posição fake enviada com sucesso');
      else toast.error('Falha ao enviar posição fake');
    } catch (e: any) {
      setResultado({ ok: false, msg: e?.message || String(e) });
      toast.error('Erro de rede');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Send className="h-5 w-5" />
          Teste — Envio de posição fake
        </CardTitle>
        <CardDescription>
          Simula um rastreador enviando uma posição para a edge <code>rastreamento-posicao</code>.
          Útil para validar se o veículo aparece no monitoramento.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Veículo</Label>
          <select
            value={veiculoId}
            onChange={(e) => setVeiculoId(e.target.value)}
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Selecione…</option>
            {veiculos.map((v) => (
              <option key={v.id} value={v.id}>
                {v.placa} {v.traccar_device_id ? `(IMEI ${v.traccar_device_id})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-2">
            <Label>Latitude</Label>
            <Input value={lat} onChange={(e) => setLat(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Longitude</Label>
            <Input value={lng} onChange={(e) => setLng(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Velocidade (km/h)</Label>
            <Input value={velocidade} onChange={(e) => setVelocidade(e.target.value)} />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={enviar} disabled={enviando || !veiculoId} className="flex-1">
            <Send className="h-4 w-4 mr-2" />
            {enviando ? 'Enviando…' : 'Enviar posição fake'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              // São Paulo aleatório dentro de ~5km
              const baseLat = -23.55052;
              const baseLng = -46.633308;
              setLat((baseLat + (Math.random() - 0.5) * 0.05).toFixed(6));
              setLng((baseLng + (Math.random() - 0.5) * 0.05).toFixed(6));
            }}
          >
            <MapPin className="h-4 w-4 mr-2" />
            Aleatório
          </Button>
        </div>

        {resultado && (
          <div
            className={cn(
              'text-xs font-mono p-3 rounded-md border break-all',
              resultado.ok
                ? 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400'
                : 'bg-destructive/10 border-destructive/30 text-destructive'
            )}
          >
            {resultado.msg}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

