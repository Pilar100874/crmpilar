import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Eye, EyeOff, Save, Key, AlertTriangle, ExternalLink, CheckCircle, Phone, Globe, Star, Image, DollarSign, Mail, MessageCircle, Zap, Server } from 'lucide-react';
import { ConfigB2B } from './types';

interface CamposPlaceDetails {
  contact: boolean;
  atmosphere: boolean;
}

interface ExtrairContatosWebsite {
  enabled: boolean;
  method: 'basic' | 'firecrawl';
}

interface ProspeccaoConfigViewProps {
  config: ConfigB2B | null;
  saveConfig: (config: Partial<ConfigB2B>) => Promise<void>;
}

const ProspeccaoConfigView: React.FC<ProspeccaoConfigViewProps> = ({
  config,
  saveConfig
}) => {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [limiteResultados, setLimiteResultados] = useState(50);
  const [limiteCustoMensal, setLimiteCustoMensal] = useState<number | ''>('');
  const [custoPorChamada, setCustoPorChamada] = useState(0.032);
  const [camposPlaceDetails, setCamposPlaceDetails] = useState<CamposPlaceDetails>({
    contact: false,
    atmosphere: false
  });
  const [extrairContatosWebsite, setExtrairContatosWebsite] = useState<ExtrairContatosWebsite>({
    enabled: false,
    method: 'basic'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) {
      const cfg = config as any;
      setApiKey(cfg.google_places_api_key || '');
      setLimiteResultados(cfg.limite_resultados_por_busca || 50);
      setLimiteCustoMensal(cfg.limite_custo_mensal || '');
      setCustoPorChamada(cfg.custo_por_chamada || 0.032);
      if (cfg.campos_place_details) {
        setCamposPlaceDetails(cfg.campos_place_details);
      }
      if (cfg.extrair_contatos_website) {
        setExtrairContatosWebsite(cfg.extrair_contatos_website);
      }
    }
  }, [config]);

  // Calcular custo estimado por empresa
  const calcularCustoPorEmpresa = () => {
    let custo = 0; // Nearby Search é por requisição, não por empresa
    if (camposPlaceDetails.contact) custo += 0.003;
    if (camposPlaceDetails.atmosphere) custo += 0.005;
    if (extrairContatosWebsite.enabled && extrairContatosWebsite.method === 'firecrawl') {
      custo += 0.001; // Firecrawl cost estimate
    }
    return custo;
  };

  const handleSave = async () => {
    setSaving(true);
    await saveConfig({
      google_places_api_key: apiKey || null,
      limite_resultados_por_busca: limiteResultados,
      limite_custo_mensal: limiteCustoMensal ? Number(limiteCustoMensal) : null,
      custo_por_chamada: custoPorChamada,
      campos_place_details: camposPlaceDetails,
      extrair_contatos_website: extrairContatosWebsite
    } as any);
    setSaving(false);
  };

  const hasApiKey = !!(config as any)?.google_places_api_key;
  const custoPorEmpresa = calcularCustoPorEmpresa();
  const custoEstimado50Empresas = (0.032 + (50 * custoPorEmpresa)).toFixed(2);

  return (
    <div className="space-y-6">
      {/* API Key Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Google Places API Key
          </CardTitle>
          <CardDescription>
            Configure sua chave de API do Google Places para buscar empresas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasApiKey && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Você precisa configurar uma API Key do Google Places para usar esta funcionalidade.
              </AlertDescription>
            </Alert>
          )}

          {hasApiKey && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700 dark:text-green-300">
                API Key configurada! Você pode realizar buscas de empresas.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIza..."
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
            <p className="font-medium">Como obter sua API Key:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Acesse o Google Cloud Console</li>
              <li>Crie um projeto ou selecione um existente</li>
              <li>Ative a API "Places API"</li>
              <li>Vá em "Credenciais" e crie uma API Key</li>
              <li>Configure restrições de uso (recomendado)</li>
            </ol>
            <a
              href="https://console.cloud.google.com/apis/library/places-backend.googleapis.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline mt-2"
            >
              Acessar Google Cloud Console
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Campos do Place Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Dados a Capturar (Place Details)
          </CardTitle>
          <CardDescription>
            Selecione quais informações adicionais deseja capturar. Cada categoria tem um custo por empresa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Dados básicos - sempre incluídos */}
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">📍 Dados Básicos (Nearby Search)</span>
              <Badge variant="secondary">Incluído</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Nome, endereço, coordenadas, rating, categorias, status
            </p>
            <div className="text-xs text-muted-foreground">
              Custo: $0.032 por requisição (retorna até 20 empresas)
            </div>
          </div>

          {/* Contact Fields */}
          <div className={`p-4 border rounded-lg transition-colors ${camposPlaceDetails.contact ? 'border-primary bg-primary/5' : ''}`}>
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={camposPlaceDetails.contact}
                onCheckedChange={(checked) => 
                  setCamposPlaceDetails(prev => ({ ...prev, contact: !!checked }))
                }
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4 text-blue-500" />
                    <Globe className="h-4 w-4 text-blue-500" />
                    Contato (Contact Fields)
                  </span>
                  <Badge variant="outline" className="text-blue-600 border-blue-300">
                    +$0.003/empresa
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Telefone, Website, Horário de funcionamento
                </p>
              </div>
            </label>
          </div>

          {/* Atmosphere Fields */}
          <div className={`p-4 border rounded-lg transition-colors ${camposPlaceDetails.atmosphere ? 'border-primary bg-primary/5' : ''}`}>
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={camposPlaceDetails.atmosphere}
                onCheckedChange={(checked) => 
                  setCamposPlaceDetails(prev => ({ ...prev, atmosphere: !!checked }))
                }
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-500" />
                    <Image className="h-4 w-4 text-amber-500" />
                    Atmosfera (Atmosphere Fields)
                  </span>
                  <Badge variant="outline" className="text-amber-600 border-amber-300">
                    +$0.005/empresa
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Reviews detalhados, Fotos, URL do Google Maps
                </p>
              </div>
            </label>
          </div>

          {/* Resumo de custos */}
          <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium">💰 Estimativa de Custo</span>
              <Badge className="bg-primary">
                ${custoPorEmpresa.toFixed(3)}/empresa
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Busca (1 requisição):</span>
                <span className="float-right font-medium">$0.032</span>
              </div>
              <div>
                <span className="text-muted-foreground">50 empresas com detalhes:</span>
                <span className="float-right font-medium">${custoEstimado50Empresas}</span>
              </div>
            </div>
            {!camposPlaceDetails.contact && !camposPlaceDetails.atmosphere && (
              <p className="text-xs text-muted-foreground mt-2">
                ℹ️ Sem campos adicionais selecionados, apenas dados básicos serão capturados (mais econômico)
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Extração de Email/WhatsApp do Website */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Extração de Email/WhatsApp
          </CardTitle>
          <CardDescription>
            Extrair email e WhatsApp do website das empresas encontradas (requer Contact Fields ativado)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toggle principal */}
          <div className={`p-4 border rounded-lg transition-colors ${extrairContatosWebsite.enabled ? 'border-primary bg-primary/5' : ''}`}>
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={extrairContatosWebsite.enabled}
                onCheckedChange={(checked) => 
                  setExtrairContatosWebsite(prev => ({ ...prev, enabled: !!checked }))
                }
                disabled={!camposPlaceDetails.contact}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4 text-green-500" />
                    <MessageCircle className="h-4 w-4 text-green-500" />
                    Extrair Email e WhatsApp do Website
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Faz scraping do website da empresa para encontrar email e WhatsApp
                </p>
                {!camposPlaceDetails.contact && (
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠️ Ative "Contato (Contact Fields)" para usar esta opção
                  </p>
                )}
              </div>
            </label>
          </div>

          {/* Opções de método */}
          {extrairContatosWebsite.enabled && (
            <div className="ml-6 space-y-3">
              <Label className="text-sm font-medium">Método de extração:</Label>
              <RadioGroup
                value={extrairContatosWebsite.method}
                onValueChange={(value: 'basic' | 'firecrawl') => 
                  setExtrairContatosWebsite(prev => ({ ...prev, method: value }))
                }
                className="space-y-3"
              >
                {/* Opção Básica */}
                <div className={`p-3 border rounded-lg transition-colors ${extrairContatosWebsite.method === 'basic' ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}`}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <RadioGroupItem value="basic" className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium flex items-center gap-2">
                          <Server className="h-4 w-4" />
                          Scraping Básico
                        </span>
                        <Badge variant="secondary" className="text-green-600">
                          Grátis
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Usa fetch + regex para extrair contatos. Funciona bem para sites simples.
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">Rápido</Badge>
                        <Badge variant="outline" className="text-xs">Sem custo</Badge>
                        <Badge variant="outline" className="text-xs text-amber-600">Menos preciso</Badge>
                      </div>
                    </div>
                  </label>
                </div>

                {/* Opção Firecrawl */}
                <div className={`p-3 border rounded-lg transition-colors ${extrairContatosWebsite.method === 'firecrawl' ? 'border-purple-500 bg-purple-50 dark:bg-purple-950' : ''}`}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <RadioGroupItem value="firecrawl" className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium flex items-center gap-2">
                          <Zap className="h-4 w-4 text-purple-500" />
                          Firecrawl (API)
                        </span>
                        <Badge variant="outline" className="text-purple-600 border-purple-300">
                          ~$0.001/empresa
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        API profissional de scraping. Lida com JavaScript, anti-bot e sites complexos.
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline" className="text-xs text-purple-600">Mais preciso</Badge>
                        <Badge variant="outline" className="text-xs">JavaScript</Badge>
                        <Badge variant="outline" className="text-xs">Requer API Key</Badge>
                      </div>
                    </div>
                  </label>
                </div>
              </RadioGroup>

              {extrairContatosWebsite.method === 'firecrawl' && (
                <Alert className="border-purple-200 bg-purple-50 dark:bg-purple-950">
                  <Zap className="h-4 w-4 text-purple-600" />
                  <AlertDescription className="text-purple-700 dark:text-purple-300">
                    Para usar Firecrawl, conecte o conector nas configurações do projeto.
                    <a
                      href="https://firecrawl.dev"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-1 underline inline-flex items-center gap-1"
                    >
                      Saiba mais <ExternalLink className="h-3 w-3" />
                    </a>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Limites */}
      <Card>
        <CardHeader>
          <CardTitle>Limites e Controle</CardTitle>
          <CardDescription>
            Configure os limites de busca e controle de gastos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="limiteResultados">Limite de resultados por busca</Label>
              <Input
                id="limiteResultados"
                type="number"
                min={1}
                max={100}
                value={limiteResultados}
                onChange={(e) => setLimiteResultados(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Máximo de empresas retornadas em cada busca
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="limiteCusto">Limite de custo mensal (USD)</Label>
              <Input
                id="limiteCusto"
                type="number"
                min={0}
                step={0.01}
                value={limiteCustoMensal}
                onChange={(e) => setLimiteCustoMensal(e.target.value ? Number(e.target.value) : '')}
                placeholder="Ex: 50.00"
              />
              <p className="text-xs text-muted-foreground">
                Buscas serão bloqueadas ao atingir este limite
              </p>
            </div>
          </div>

          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700 dark:text-blue-300">
              <strong>Economia automática:</strong> Empresas já cadastradas na base são ignoradas 
              automaticamente, evitando gastos com duplicatas.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Salvar */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </div>
  );
};

export default ProspeccaoConfigView;