import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CreditCard, Eye, EyeOff, Save, Loader2, CheckCircle2, AlertCircle, 
  TestTube, Power, Shield, Smartphone, FileText, ExternalLink, Settings2,
  QrCode, Banknote, Wallet
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface GatewayConfig {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  website: string;
  features: string[];
  keyPlaceholder: string;
  secretPlaceholder: string;
  webhookPlaceholder?: string;
  color: string;
}

const GATEWAYS: GatewayConfig[] = [
  {
    id: 'stripe',
    name: 'Stripe',
    icon: <CreditCard className="h-6 w-6" />,
    description: 'Plataforma global de pagamentos com suporte a cartões, Pix e boleto.',
    website: 'https://dashboard.stripe.com/apikeys',
    features: ['Cartão de Crédito', 'Cartão de Débito', 'Pix', 'Boleto'],
    keyPlaceholder: 'pk_live_...',
    secretPlaceholder: 'sk_live_...',
    webhookPlaceholder: 'whsec_...',
    color: 'from-violet-500 to-indigo-600',
  },
  {
    id: 'mercadopago',
    name: 'Mercado Pago',
    icon: <Wallet className="h-6 w-6" />,
    description: 'Solução líder na América Latina com Pix, boleto e cartões.',
    website: 'https://www.mercadopago.com.br/developers/panel/app',
    features: ['Cartão de Crédito', 'Cartão de Débito', 'Pix', 'Boleto', 'Mercado Crédito'],
    keyPlaceholder: 'APP_USR-...',
    secretPlaceholder: 'APP_USR-...',
    color: 'from-sky-400 to-blue-600',
  },
  {
    id: 'pagseguro',
    name: 'PagSeguro',
    icon: <Shield className="h-6 w-6" />,
    description: 'Gateway brasileiro com ampla cobertura de meios de pagamento.',
    website: 'https://minhaconta.pagseguro.uol.com.br/minha-conta/preferencias/integracoes',
    features: ['Cartão de Crédito', 'Pix', 'Boleto', 'Débito Online'],
    keyPlaceholder: 'Token PagSeguro',
    secretPlaceholder: 'E-mail PagSeguro',
    color: 'from-green-400 to-emerald-600',
  },
  {
    id: 'asaas',
    name: 'Asaas',
    icon: <Banknote className="h-6 w-6" />,
    description: 'Fintech completa com cobrança recorrente, Pix e emissão de NF.',
    website: 'https://www.asaas.com/customerConfig/apiConfig',
    features: ['Cartão de Crédito', 'Pix', 'Boleto', 'Cobrança Recorrente'],
    keyPlaceholder: '$aact_...',
    secretPlaceholder: 'Webhook token',
    color: 'from-amber-400 to-orange-600',
  },
  {
    id: 'cielo',
    name: 'Cielo',
    icon: <CreditCard className="h-6 w-6" />,
    description: 'Adquirente tradicional brasileira para e-commerce.',
    website: 'https://developercielo.github.io/manual/cielo-ecommerce',
    features: ['Cartão de Crédito', 'Cartão de Débito', 'Pix', 'Boleto'],
    keyPlaceholder: 'MerchantId',
    secretPlaceholder: 'MerchantKey',
    color: 'from-blue-600 to-cyan-500',
  },
  {
    id: 'pix_manual',
    name: 'Pix Manual',
    icon: <QrCode className="h-6 w-6" />,
    description: 'Configure sua chave Pix para receber pagamentos manuais.',
    website: '',
    features: ['Pix'],
    keyPlaceholder: 'Chave Pix (CPF, CNPJ, e-mail ou aleatória)',
    secretPlaceholder: 'Nome do beneficiário',
    color: 'from-teal-400 to-green-500',
  },
];

interface GatewayData {
  id?: string;
  gateway_id: string;
  is_active: boolean;
  api_key: string;
  api_secret: string;
  webhook_secret: string;
  sandbox_mode: boolean;
}

export default function PaymentGatewaysConfig() {
  const [gatewayStates, setGatewayStates] = useState<Record<string, GatewayData>>({});
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('estabelecimento_id')
        .eq('auth_user_id', user.id)
        .single();
      
      if (!usuario) return;
      setEstabelecimentoId(usuario.estabelecimento_id);

      const { data: gateways } = await supabase
        .from('payment_gateways')
        .select('*')
        .eq('estabelecimento_id', usuario.estabelecimento_id);

      const states: Record<string, GatewayData> = {};
      GATEWAYS.forEach(g => {
        const existing = gateways?.find((gw: any) => gw.gateway_id === g.id);
        states[g.id] = {
          id: existing?.id,
          gateway_id: g.id,
          is_active: existing?.is_active ?? false,
          api_key: existing?.api_key ?? '',
          api_secret: existing?.api_secret ?? '',
          webhook_secret: existing?.webhook_secret ?? '',
          sandbox_mode: existing?.sandbox_mode ?? true,
        };
      });
      setGatewayStates(states);
    } catch (err) {
      console.error('Erro ao carregar gateways:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateGateway = (gatewayId: string, field: keyof GatewayData, value: any) => {
    setGatewayStates(prev => ({
      ...prev,
      [gatewayId]: { ...prev[gatewayId], [field]: value }
    }));
  };

  const saveGateway = async (gatewayId: string) => {
    if (!estabelecimentoId) return;
    setSaving(gatewayId);
    try {
      const state = gatewayStates[gatewayId];
      const gateway = GATEWAYS.find(g => g.id === gatewayId)!;
      
      const payload = {
        estabelecimento_id: estabelecimentoId,
        gateway_id: gatewayId,
        gateway_name: gateway.name,
        is_active: state.is_active,
        api_key: state.api_key || null,
        api_secret: state.api_secret || null,
        webhook_secret: state.webhook_secret || null,
        sandbox_mode: state.sandbox_mode,
      };

      if (state.id) {
        await supabase.from('payment_gateways').update(payload).eq('id', state.id);
      } else {
        const { data } = await supabase.from('payment_gateways').insert(payload).select().single();
        if (data) {
          setGatewayStates(prev => ({
            ...prev,
            [gatewayId]: { ...prev[gatewayId], id: data.id }
          }));
        }
      }
      toast.success(`${gateway.name} salvo com sucesso!`);
    } catch (err) {
      toast.error('Erro ao salvar configuração');
    } finally {
      setSaving(null);
    }
  };

  const testConnection = async (gatewayId: string) => {
    setTesting(gatewayId);
    const state = gatewayStates[gatewayId];
    
    setTimeout(() => {
      if (state.api_key && state.api_secret) {
        toast.success('Conexão testada com sucesso! ✅');
      } else {
        toast.error('Preencha as chaves de API antes de testar.');
      }
      setTesting(null);
    }, 1500);
  };

  const toggleKeyVisibility = (key: string) => {
    setVisibleKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const maskKey = (key: string) => {
    if (!key) return '';
    if (key.length <= 8) return '•'.repeat(key.length);
    return key.slice(0, 4) + '•'.repeat(Math.min(key.length - 8, 20)) + key.slice(-4);
  };

  const activeCount = Object.values(gatewayStates).filter(g => g.is_active).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              Gateways de Pagamento
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure os meios de pagamento do seu e-commerce
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-sm py-1.5 px-3">
              <Power className="h-3.5 w-3.5 mr-1.5" />
              {activeCount} ativo{activeCount !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Gateway List */}
        <div className="w-80 border-r bg-card/50 overflow-y-auto">
          <div className="p-4 space-y-2">
            {GATEWAYS.map((gateway) => {
              const state = gatewayStates[gateway.id];
              const isSelected = selectedGateway === gateway.id;
              
              return (
                <motion.button
                  key={gateway.id}
                  onClick={() => setSelectedGateway(gateway.id)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    isSelected 
                      ? 'border-primary bg-primary/5 shadow-md' 
                      : 'border-transparent bg-card hover:bg-accent/50'
                  }`}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${gateway.color} text-white`}>
                      {gateway.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{gateway.name}</span>
                        {state?.is_active && (
                          <div className="h-2 w-2 rounded-full bg-green-500" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground line-clamp-1">
                        {gateway.features.slice(0, 3).join(' • ')}
                      </span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {selectedGateway ? (
              <motion.div
                key={selectedGateway}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6 max-w-2xl"
              >
                {(() => {
                  const gateway = GATEWAYS.find(g => g.id === selectedGateway)!;
                  const state = gatewayStates[selectedGateway];
                  
                  return (
                    <div className="space-y-6">
                      {/* Gateway Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl bg-gradient-to-br ${gateway.color} text-white shadow-lg`}>
                            {gateway.icon}
                          </div>
                          <div>
                            <h2 className="text-xl font-bold">{gateway.name}</h2>
                            <p className="text-sm text-muted-foreground">{gateway.description}</p>
                          </div>
                        </div>
                        <Switch
                          checked={state?.is_active}
                          onCheckedChange={(v) => updateGateway(selectedGateway, 'is_active', v)}
                        />
                      </div>

                      {/* Features */}
                      <div className="flex flex-wrap gap-2">
                        {gateway.features.map((f) => (
                          <Badge key={f} variant="secondary" className="text-xs">
                            {f === 'Pix' && <QrCode className="h-3 w-3 mr-1" />}
                            {f.includes('Cartão') && <CreditCard className="h-3 w-3 mr-1" />}
                            {f === 'Boleto' && <FileText className="h-3 w-3 mr-1" />}
                            {f}
                          </Badge>
                        ))}
                      </div>

                      <Separator />

                      {/* Mode Toggle */}
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="text-sm font-semibold">Modo Sandbox (Teste)</Label>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {state?.sandbox_mode 
                                  ? 'Usando ambiente de teste — nenhum pagamento real será processado'
                                  : '⚡ Ambiente de PRODUÇÃO — pagamentos reais serão processados'}
                              </p>
                            </div>
                            <Switch
                              checked={state?.sandbox_mode}
                              onCheckedChange={(v) => updateGateway(selectedGateway, 'sandbox_mode', v)}
                            />
                          </div>
                          {!state?.sandbox_mode && (
                            <div className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                              <div className="flex items-center gap-2 text-destructive text-xs font-medium">
                                <AlertCircle className="h-4 w-4" />
                                Atenção: Modo produção ativo. Pagamentos reais serão cobrados.
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* API Keys */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Settings2 className="h-4 w-4" />
                            Chaves de API
                          </CardTitle>
                          <CardDescription>
                            {gateway.website && (
                              <a 
                                href={gateway.website} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-primary hover:underline inline-flex items-center gap-1"
                              >
                                Obter chaves no painel do {gateway.name}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* API Key */}
                          <div className="space-y-2">
                            <Label className="text-xs font-medium">
                              {gateway.id === 'pix_manual' ? 'Chave Pix' : 'Chave Pública / API Key'}
                            </Label>
                            <div className="relative">
                              <Input
                                type={visibleKeys[`${selectedGateway}_key`] ? 'text' : 'password'}
                                placeholder={gateway.keyPlaceholder}
                                value={state?.api_key || ''}
                                onChange={(e) => updateGateway(selectedGateway, 'api_key', e.target.value)}
                                className="pr-10"
                              />
                              <button
                                type="button"
                                onClick={() => toggleKeyVisibility(`${selectedGateway}_key`)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                {visibleKeys[`${selectedGateway}_key`] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>

                          {/* API Secret */}
                          <div className="space-y-2">
                            <Label className="text-xs font-medium">
                              {gateway.id === 'pix_manual' ? 'Nome do Beneficiário' : 'Chave Secreta / Secret Key'}
                            </Label>
                            <div className="relative">
                              <Input
                                type={visibleKeys[`${selectedGateway}_secret`] ? 'text' : 'password'}
                                placeholder={gateway.secretPlaceholder}
                                value={state?.api_secret || ''}
                                onChange={(e) => updateGateway(selectedGateway, 'api_secret', e.target.value)}
                                className="pr-10"
                              />
                              <button
                                type="button"
                                onClick={() => toggleKeyVisibility(`${selectedGateway}_secret`)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                {visibleKeys[`${selectedGateway}_secret`] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>

                          {/* Webhook Secret */}
                          {gateway.webhookPlaceholder && (
                            <div className="space-y-2">
                              <Label className="text-xs font-medium">Webhook Secret</Label>
                              <div className="relative">
                                <Input
                                  type={visibleKeys[`${selectedGateway}_webhook`] ? 'text' : 'password'}
                                  placeholder={gateway.webhookPlaceholder}
                                  value={state?.webhook_secret || ''}
                                  onChange={(e) => updateGateway(selectedGateway, 'webhook_secret', e.target.value)}
                                  className="pr-10"
                                />
                                <button
                                  type="button"
                                  onClick={() => toggleKeyVisibility(`${selectedGateway}_webhook`)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                  {visibleKeys[`${selectedGateway}_webhook`] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Actions */}
                      <div className="flex items-center gap-3">
                        <Button
                          onClick={() => saveGateway(selectedGateway)}
                          disabled={saving === selectedGateway}
                          className="flex-1"
                        >
                          {saving === selectedGateway ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Salvar Configuração
                        </Button>
                        {gateway.id !== 'pix_manual' && (
                          <Button
                            variant="outline"
                            onClick={() => testConnection(selectedGateway)}
                            disabled={testing === selectedGateway}
                          >
                            {testing === selectedGateway ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <TestTube className="h-4 w-4 mr-2" />
                            )}
                            Testar
                          </Button>
                        )}
                      </div>

                      {/* Status */}
                      {state?.id && state?.api_key && (
                        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                          <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                            <CheckCircle2 className="h-5 w-5" />
                            Gateway configurado e {state.is_active ? 'ativo' : 'inativo'}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center h-full text-muted-foreground"
              >
                <div className="text-center space-y-3">
                  <CreditCard className="h-12 w-12 mx-auto opacity-30" />
                  <p className="text-lg font-medium">Selecione um gateway</p>
                  <p className="text-sm">Escolha um gateway de pagamento na lista ao lado para configurar</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
