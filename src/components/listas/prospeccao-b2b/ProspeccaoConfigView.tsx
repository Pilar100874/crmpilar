import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Save, Key, AlertTriangle, ExternalLink, CheckCircle } from 'lucide-react';
import { ConfigB2B } from './types';

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
  const [custoPorRequisicao, setCustoPorRequisicao] = useState(0.017);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setApiKey(config.google_places_api_key || '');
      setLimiteResultados(config.limite_resultados_busca || 50);
      setLimiteCustoMensal(config.limite_custo_mensal || '');
      setCustoPorRequisicao(config.custo_por_requisicao || 0.017);
    }
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    await saveConfig({
      google_places_api_key: apiKey || null,
      limite_resultados_busca: limiteResultados,
      limite_custo_mensal: limiteCustoMensal ? Number(limiteCustoMensal) : null,
      custo_por_requisicao: custoPorRequisicao
    });
    setSaving(false);
  };

  const hasApiKey = !!config?.google_places_api_key;

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

      {/* Limites */}
      <Card>
        <CardHeader>
          <CardTitle>Limites e Custos</CardTitle>
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
                Deixe vazio para não limitar
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custoRequisicao">Custo por requisição (USD)</Label>
              <Input
                id="custoRequisicao"
                type="number"
                min={0}
                step={0.001}
                value={custoPorRequisicao}
                onChange={(e) => setCustoPorRequisicao(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Custo médio da API (padrão: $0.017)
              </p>
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg text-sm">
            <p className="font-medium mb-2">Estimativa de custos:</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Nearby Search: ~$0.032 por requisição</li>
              <li>• Place Details: ~$0.017 por requisição</li>
              <li>• Uma busca típica usa 1 Nearby Search + N Details</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Salvar */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </div>
  );
};

export default ProspeccaoConfigView;
