import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, EyeOff, Save, Key, AlertTriangle, ExternalLink, CheckCircle, Phone, Globe, Star, Image, DollarSign, Mail, MessageCircle, Zap, Server, Database, Search, MapPin } from 'lucide-react';
import { ConfigB2B } from './types';

interface CamposPlaceDetails {
  contact: boolean;
  atmosphere: boolean;
}

interface ExtrairContatosWebsite {
  enabled: boolean;
  method: 'basic' | 'firecrawl';
}

type FonteDados = 'google_places' | 'dados_abertos' | 'web_scraping';

const UFS_BRASIL = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

interface ProspeccaoConfigViewProps {
  config: ConfigB2B | null;
  saveConfig: (config: Partial<ConfigB2B>) => Promise<void>;
}

const ProspeccaoConfigView: React.FC<ProspeccaoConfigViewProps> = ({
  config,
  saveConfig
}) => {
  const [fonteDados, setFonteDados] = useState<FonteDados>('google_places');
  const [apiKey, setApiKey] = useState('');
  const [firecrawlApiKey, setFirecrawlApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showFirecrawlKey, setShowFirecrawlKey] = useState(false);
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

  // Campos específicos de Web Scraping
  const [wsTermoBusca, setWsTermoBusca] = useState('');
  const [wsCidade, setWsCidade] = useState('');
  const [wsUf, setWsUf] = useState('');

  useEffect(() => {
    if (config) {
      const cfg = config as any;
      setFonteDados(cfg.fonte_dados || 'google_places');
      setApiKey(cfg.google_places_api_key || '');
      setFirecrawlApiKey(cfg.firecrawl_api_key || '');
      setLimiteResultados(cfg.limite_resultados_por_busca || 50);
      setLimiteCustoMensal(cfg.limite_custo_mensal || '');
      setCustoPorChamada(cfg.custo_por_chamada || 0.032);
      // Campos de Web Scraping
      setWsTermoBusca(cfg.ws_termo_busca || '');
      setWsCidade(cfg.ws_cidade || '');
      setWsUf(cfg.ws_uf || '');
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
    if (fonteDados !== 'google_places') return 0; // Fontes gratuitas
    let custo = 0;
    if (camposPlaceDetails.contact) custo += 0.003;
    if (camposPlaceDetails.atmosphere) custo += 0.005;
    if (extrairContatosWebsite.enabled && extrairContatosWebsite.method === 'firecrawl') {
      custo += 0.001;
    }
    return custo;
  };

  const handleSave = async () => {
    setSaving(true);
    await saveConfig({
      fonte_dados: fonteDados,
      google_places_api_key: apiKey || null,
      firecrawl_api_key: firecrawlApiKey || null,
      limite_resultados_por_busca: limiteResultados,
      limite_custo_mensal: limiteCustoMensal ? Number(limiteCustoMensal) : null,
      custo_por_chamada: custoPorChamada,
      campos_place_details: camposPlaceDetails,
      extrair_contatos_website: extrairContatosWebsite,
      // Campos de Web Scraping
      ws_termo_busca: wsTermoBusca || null,
      ws_cidade: wsCidade || null,
      ws_uf: wsUf || null
    } as any);
    setSaving(false);
  };

  const hasApiKey = !!(config as any)?.google_places_api_key;
  const hasFirecrawlKey = !!(config as any)?.firecrawl_api_key;
  const custoPorEmpresa = calcularCustoPorEmpresa();
  const custoEstimado50Empresas = fonteDados === 'google_places' 
    ? (0.032 + (50 * custoPorEmpresa)).toFixed(2) 
    : '0.00';

  // Verificar se os parâmetros de busca do Web Scraping estão completos
  const wsSearchConfigComplete = wsTermoBusca.trim() && wsCidade.trim() && wsUf;

  return (
    <div className="space-y-6">
      {/* Fonte de Dados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Fonte de Dados
          </CardTitle>
          <CardDescription>
            Escolha de onde buscar as empresas. Fontes gratuitas têm dados limitados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={fonteDados}
            onValueChange={(value: FonteDados) => setFonteDados(value)}
            className="space-y-3"
          >
            {/* Google Places - Pago */}
            <div className={`p-4 border rounded-lg transition-colors ${fonteDados === 'google_places' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : ''}`}>
              <label className="flex items-start gap-3 cursor-pointer">
                <RadioGroupItem value="google_places" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-blue-500" />
                      Google Places API
                    </span>
                    <Badge variant="outline" className="text-blue-600 border-blue-300">
                      ~$0.032/20 empresas
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Dados precisos e atualizados do Google. Inclui telefone, website, avaliações.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">⭐ Alta qualidade</Badge>
                    <Badge variant="secondary" className="text-xs">📍 Geolocalização</Badge>
                    <Badge variant="secondary" className="text-xs">📞 Contatos</Badge>
                  </div>
                </div>
              </label>
            </div>

            {/* Dados Abertos (CNPJ/Receita) - Grátis */}
            <div className={`p-4 border rounded-lg transition-colors ${fonteDados === 'dados_abertos' ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}`}>
              <label className="flex items-start gap-3 cursor-pointer">
                <RadioGroupItem value="dados_abertos" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium flex items-center gap-2">
                      <Database className="h-4 w-4 text-green-600" />
                      Dados Abertos (CNPJ/Receita Federal)
                    </span>
                    <Badge variant="secondary" className="text-green-600">
                      Grátis
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Base de dados do governo com CNPJs ativos. Dados cadastrais oficiais.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="outline" className="text-xs text-green-600">💰 Sem custo</Badge>
                    <Badge variant="outline" className="text-xs">📋 CNPJ/Razão Social</Badge>
                    <Badge variant="outline" className="text-xs text-amber-600">⚠️ Sem telefone</Badge>
                  </div>
                </div>
              </label>
            </div>

            {/* Web Scraping de Diretórios - Grátis */}
            <div className={`p-4 border rounded-lg transition-colors ${fonteDados === 'web_scraping' ? 'border-purple-500 bg-purple-50 dark:bg-purple-950' : ''}`}>
              <label className="flex items-start gap-3 cursor-pointer">
                <RadioGroupItem value="web_scraping" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium flex items-center gap-2">
                      <Search className="h-4 w-4 text-purple-600" />
                      Web Scraping de Diretórios
                    </span>
                    <Badge variant="secondary" className="text-green-600">
                      Grátis
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Extração de dados de diretórios públicos como TeleListas, Guia Mais, etc.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="outline" className="text-xs text-green-600">💰 Sem custo</Badge>
                    <Badge variant="outline" className="text-xs">📞 Pode ter telefone</Badge>
                    <Badge variant="outline" className="text-xs text-amber-600">⚠️ Dados variáveis</Badge>
                  </div>
                </div>
              </label>
            </div>
          </RadioGroup>

          {/* Alertas por fonte */}
          {fonteDados === 'dados_abertos' && (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
              <Database className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700 dark:text-green-300">
                <strong>Dados Abertos:</strong> Usa a base de CNPJs da Receita Federal. 
                Retorna razão social, endereço, CNAE e situação cadastral. 
                Não inclui telefone ou website por padrão.
              </AlertDescription>
            </Alert>
          )}

          {fonteDados === 'web_scraping' && (
            <Alert className="border-purple-200 bg-purple-50 dark:bg-purple-950">
              <Search className="h-4 w-4 text-purple-600" />
              <AlertDescription className="text-purple-700 dark:text-purple-300">
                <strong>Web Scraping:</strong> Extrai dados de diretórios públicos (TeleListas, Guia Mais, etc). 
                Requer API Key do Firecrawl. A qualidade dos dados varia por região e segmento.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Firecrawl API Key - Apenas para Web Scraping */}
      {fonteDados === 'web_scraping' && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Firecrawl API Key
          </CardTitle>
          <CardDescription>
            Configure sua chave de API do Firecrawl para fazer Web Scraping
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasFirecrawlKey && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Você precisa configurar uma API Key do Firecrawl para usar o Web Scraping.
              </AlertDescription>
            </Alert>
          )}

          {hasFirecrawlKey && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700 dark:text-green-300">
                API Key do Firecrawl configurada! Você pode realizar buscas.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="firecrawlApiKey">API Key do Firecrawl</Label>
            <div className="relative">
              <Input
                id="firecrawlApiKey"
                type={showFirecrawlKey ? 'text' : 'password'}
                value={firecrawlApiKey}
                onChange={(e) => setFirecrawlApiKey(e.target.value)}
                placeholder="fc-..."
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowFirecrawlKey(!showFirecrawlKey)}
              >
                {showFirecrawlKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
            <p className="font-medium">Como obter sua API Key:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Acesse o site do Firecrawl</li>
              <li>Crie uma conta gratuita</li>
              <li>Copie sua API Key do dashboard</li>
            </ol>
            <a
              href="https://firecrawl.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline mt-2"
            >
              Acessar Firecrawl
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950">
            <DollarSign className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700 dark:text-blue-300">
              <strong>Custo:</strong> Firecrawl oferece 500 créditos grátis por mês. 
              Cada busca usa aproximadamente 3-5 créditos (1 por diretório consultado).
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
      )}

      {/* Parâmetros de Busca - Apenas para Web Scraping */}
      {fonteDados === 'web_scraping' && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Parâmetros de Busca
          </CardTitle>
          <CardDescription>
            Configure o que você deseja buscar nos diretórios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wsTermoBusca">Termo de busca *</Label>
            <Input
              id="wsTermoBusca"
              value={wsTermoBusca}
              onChange={(e) => setWsTermoBusca(e.target.value)}
              placeholder="Ex: Restaurantes, Oficinas mecânicas, Clínicas..."
            />
            <p className="text-xs text-muted-foreground">
              Tipo de negócio ou categoria que deseja buscar
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="wsCidade">Cidade *</Label>
              <Input
                id="wsCidade"
                value={wsCidade}
                onChange={(e) => setWsCidade(e.target.value)}
                placeholder="Ex: São Paulo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wsUf">UF *</Label>
              <Select value={wsUf} onValueChange={setWsUf}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o estado" />
                </SelectTrigger>
                <SelectContent>
                  {UFS_BRASIL.map(u => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status dos parâmetros */}
          {wsTermoBusca && wsCidade && wsUf ? (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700 dark:text-green-300">
                Parâmetros configurados! Salve e avance para a etapa de busca.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Preencha todos os campos para configurar a busca.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      )}

      {/* API Key Configuration - Apenas para Google Places */}
      {fonteDados === 'google_places' && (
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
      )}

      {/* Campos do Place Details - Apenas para Google Places */}
      {fonteDados === 'google_places' && (
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
      )}

      {/* Extração de Email/WhatsApp do Website - Apenas para Google Places */}
      {fonteDados === 'google_places' && (
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
      )}

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