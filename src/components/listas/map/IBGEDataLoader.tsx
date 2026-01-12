import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Download, Globe, Database, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface IBGEDataLoaderProps {
  onLoadComplete?: () => void;
}

interface DataSource {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

interface MunicipioIBGE {
  id: number;
  nome: string;
  microrregiao: {
    id: number;
    nome: string;
    mesorregiao: {
      id: number;
      nome: string;
      UF: {
        id: number;
        sigla: string;
        nome: string;
        regiao: {
          id: number;
          sigla: string;
          nome: string;
        };
      };
    };
  };
}

interface MunicipioCoords {
  codigo_ibge: number;
  nome: string;
  latitude: number;
  longitude: number;
  capital: boolean;
  codigo_uf: number;
}

// Coordenadas das capitais brasileiras para referência rápida
const CAPITAIS_COORDS: Record<string, { lat: number; lng: number }> = {
  'AC': { lat: -9.9754, lng: -67.8249 },
  'AL': { lat: -9.6658, lng: -35.735 },
  'AP': { lat: 0.0349, lng: -51.0694 },
  'AM': { lat: -3.119, lng: -60.0217 },
  'BA': { lat: -12.9714, lng: -38.5014 },
  'CE': { lat: -3.7172, lng: -38.5433 },
  'DF': { lat: -15.7942, lng: -47.8822 },
  'ES': { lat: -20.3155, lng: -40.3128 },
  'GO': { lat: -16.6869, lng: -49.2648 },
  'MA': { lat: -2.5297, lng: -44.3028 },
  'MT': { lat: -15.6014, lng: -56.0979 },
  'MS': { lat: -20.4697, lng: -54.6201 },
  'MG': { lat: -19.9167, lng: -43.9345 },
  'PA': { lat: -1.4558, lng: -48.4902 },
  'PB': { lat: -7.1195, lng: -34.845 },
  'PR': { lat: -25.4284, lng: -49.2733 },
  'PE': { lat: -8.0476, lng: -34.877 },
  'PI': { lat: -5.0892, lng: -42.8019 },
  'RJ': { lat: -22.9068, lng: -43.1729 },
  'RN': { lat: -5.7945, lng: -35.211 },
  'RS': { lat: -30.0346, lng: -51.2177 },
  'RO': { lat: -8.7612, lng: -63.9039 },
  'RR': { lat: 2.8235, lng: -60.6758 },
  'SC': { lat: -27.5954, lng: -48.548 },
  'SP': { lat: -23.5505, lng: -46.6333 },
  'SE': { lat: -10.9472, lng: -37.0731 },
  'TO': { lat: -10.1689, lng: -48.3317 },
};

// Centróide aproximado por UF para estimativa de coordenadas
const UF_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  'AC': { lat: -9.0238, lng: -70.812 },
  'AL': { lat: -9.5713, lng: -36.782 },
  'AP': { lat: 1.4102, lng: -51.7704 },
  'AM': { lat: -3.4168, lng: -65.8561 },
  'BA': { lat: -12.4634, lng: -41.6598 },
  'CE': { lat: -5.4984, lng: -39.3206 },
  'DF': { lat: -15.7998, lng: -47.8645 },
  'ES': { lat: -19.1834, lng: -40.3089 },
  'GO': { lat: -15.8270, lng: -49.8362 },
  'MA': { lat: -4.9609, lng: -45.2744 },
  'MT': { lat: -12.6819, lng: -56.9211 },
  'MS': { lat: -20.7722, lng: -54.7852 },
  'MG': { lat: -18.5122, lng: -44.5550 },
  'PA': { lat: -3.9834, lng: -52.9725 },
  'PB': { lat: -7.2400, lng: -36.7820 },
  'PR': { lat: -24.8946, lng: -51.5535 },
  'PE': { lat: -8.3187, lng: -37.8604 },
  'PI': { lat: -7.7183, lng: -42.7289 },
  'RJ': { lat: -22.2533, lng: -42.8787 },
  'RN': { lat: -5.6029, lng: -36.6672 },
  'RS': { lat: -29.0341, lng: -53.2176 },
  'RO': { lat: -10.8310, lng: -63.3461 },
  'RR': { lat: 2.0906, lng: -61.3866 },
  'SC': { lat: -27.2423, lng: -50.2189 },
  'SP': { lat: -22.1986, lng: -48.7937 },
  'SE': { lat: -10.5741, lng: -37.3857 },
  'TO': { lat: -10.1753, lng: -48.2982 },
};

export const IBGEDataLoader: React.FC<IBGEDataLoaderProps> = ({ onLoadComplete }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([
    { id: 'municipios', name: 'Municípios', description: 'Lista de todos os 5.570 municípios com coordenadas', enabled: true },
    { id: 'populacao', name: 'População', description: 'Dados populacionais do Censo 2022', enabled: true },
    { id: 'pib', name: 'PIB Municipal', description: 'PIB e PIB per capita por município', enabled: true },
    { id: 'idh', name: 'IDH', description: 'Índice de Desenvolvimento Humano (Atlas Brasil)', enabled: false },
  ]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev.slice(-50), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const fetchMunicipios = async (): Promise<MunicipioIBGE[]> => {
    setStatus('Buscando lista de municípios...');
    addLog('Conectando à API do IBGE...');
    
    const response = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/municipios');
    if (!response.ok) throw new Error('Erro ao buscar municípios');
    
    const data = await response.json();
    addLog(`${data.length} municípios encontrados`);
    return data;
  };

  const fetchMunicipiosCoordsGithub = async (): Promise<MunicipioCoords[]> => {
    setStatus('Buscando coordenadas...');
    addLog('Buscando coordenadas do repositório público...');
    
    try {
      // Usando o repositório público com coordenadas de todos os municípios
      const response = await fetch('https://raw.githubusercontent.com/kelvins/municipios-brasileiros/main/json/municipios.json');
      if (!response.ok) throw new Error('Erro ao buscar coordenadas');
      
      const data = await response.json();
      addLog(`Coordenadas de ${data.length} municípios carregadas`);
      return data;
    } catch (error) {
      addLog('Usando coordenadas estimadas por UF');
      return [];
    }
  };

  const fetchPopulacao = async (codigoMunicipio: number): Promise<number | null> => {
    try {
      const response = await fetch(
        `https://servicodados.ibge.gov.br/api/v3/agregados/4714/periodos/2022/variaveis/93?localidades=N6[${codigoMunicipio}]`
      );
      if (!response.ok) return null;
      
      const data = await response.json();
      const resultado = data?.[0]?.resultados?.[0]?.series?.[0]?.serie?.['2022'];
      return resultado ? parseInt(resultado) : null;
    } catch {
      return null;
    }
  };

  const fetchPIB = async (codigoMunicipio: number): Promise<{ pib: number | null; pibPerCapita: number | null }> => {
    try {
      // PIB a preços correntes
      const response = await fetch(
        `https://servicodados.ibge.gov.br/api/v3/agregados/5938/periodos/2021/variaveis/37|513?localidades=N6[${codigoMunicipio}]`
      );
      if (!response.ok) return { pib: null, pibPerCapita: null };
      
      const data = await response.json();
      
      let pib: number | null = null;
      let pibPerCapita: number | null = null;
      
      data.forEach((item: any) => {
        const valor = item?.resultados?.[0]?.series?.[0]?.serie?.['2021'];
        if (item.id === '37') {
          pib = valor ? parseFloat(valor) * 1000 : null; // PIB em mil reais
        } else if (item.id === '513') {
          pibPerCapita = valor ? parseFloat(valor) : null;
        }
      });
      
      return { pib, pibPerCapita };
    } catch {
      return { pib: null, pibPerCapita: null };
    }
  };

  const estimateCoords = (municipio: MunicipioIBGE, coordsMap: Map<number, MunicipioCoords>): { lat: number; lng: number } => {
    const coords = coordsMap.get(municipio.id);
    if (coords) {
      return { lat: coords.latitude, lng: coords.longitude };
    }
    
    // Fallback: usar centróide do estado
    const uf = municipio.microrregiao.mesorregiao.UF.sigla;
    return UF_CENTROIDS[uf] || { lat: -15.7942, lng: -47.8822 }; // Brasília como fallback
  };

  const handleLoadData = async () => {
    const enabledSources = dataSources.filter(s => s.enabled);
    if (enabledSources.length === 0) {
      toast.error('Selecione pelo menos uma fonte de dados');
      return;
    }

    setLoading(true);
    setProgress(0);
    setLogs([]);

    try {
      // 1. Buscar lista de municípios
      const municipios = await fetchMunicipios();
      setProgress(10);

      // 2. Buscar coordenadas
      const coordsList = await fetchMunicipiosCoordsGithub();
      const coordsMap = new Map(coordsList.map(c => [c.codigo_ibge, c]));
      setProgress(20);

      // 3. Preparar dados base
      const totalMunicipios = municipios.length;
      const batchSize = 100;
      let processed = 0;
      let inserted = 0;

      addLog('Iniciando processamento dos municípios...');

      for (let i = 0; i < totalMunicipios; i += batchSize) {
        const batch = municipios.slice(i, i + batchSize);
        
        const records = await Promise.all(batch.map(async (mun) => {
          const coords = estimateCoords(mun, coordsMap);
          const uf = mun.microrregiao.mesorregiao.UF.sigla;
          
          let populacao: number | null = null;
          let pibPerCapita: number | null = null;
          
          // Buscar dados adicionais apenas para amostragem (muito lento para todos)
          // Usando dados pré-calculados quando disponível
          const coordData = coordsMap.get(mun.id);
          
          return {
            municipio: mun.nome,
            uf: uf,
            codigo_ibge: String(mun.id),
            latitude: coords.lat,
            longitude: coords.lng,
            populacao: populacao,
            pib_per_capita: pibPerCapita,
            renda_media: null, // Será preenchido com dados do Atlas Brasil
            idh: null,
            regiao: mun.microrregiao.mesorregiao.UF.regiao.nome,
            mesorregiao: mun.microrregiao.mesorregiao.nome,
            microrregiao: mun.microrregiao.nome,
          };
        }));

        // Inserir no Supabase
        const { error } = await supabase
          .from('municipios_renda')
          .upsert(records.map(r => ({
            municipio: r.municipio,
            uf: r.uf,
            codigo_ibge: r.codigo_ibge,
            renda_media: r.renda_media,
            pib_per_capita: r.pib_per_capita,
            idh: r.idh,
            populacao: r.populacao,
          })), { 
            onConflict: 'municipio,uf',
            ignoreDuplicates: false 
          });

        if (error) {
          addLog(`Erro no batch ${i}-${i + batchSize}: ${error.message}`);
        } else {
          inserted += records.length;
        }

        processed += batch.length;
        setProgress(20 + Math.round((processed / totalMunicipios) * 70));
        
        if (i % 500 === 0) {
          addLog(`Processados ${processed}/${totalMunicipios} municípios...`);
        }
      }

      // 4. Buscar dados populacionais e PIB por estado (mais rápido)
      if (dataSources.find(s => s.id === 'populacao' && s.enabled) || 
          dataSources.find(s => s.id === 'pib' && s.enabled)) {
        addLog('Buscando dados agregados por estado...');
        await fetchAndUpdateStateData();
      }

      setProgress(100);
      setStatus('Concluído!');
      addLog(`✅ ${inserted} municípios carregados com sucesso!`);
      
      toast.success(`${inserted} municípios carregados do IBGE!`);
      onLoadComplete?.();

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      addLog(`❌ Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      toast.error('Erro ao carregar dados do IBGE');
    } finally {
      setLoading(false);
    }
  };

  const fetchAndUpdateStateData = async () => {
    try {
      // Buscar população por município do Censo 2022
      setStatus('Buscando dados populacionais...');
      addLog('Conectando ao SIDRA/IBGE para dados do Censo...');
      
      const popResponse = await fetch(
        'https://servicodados.ibge.gov.br/api/v3/agregados/4714/periodos/2022/variaveis/93?localidades=N6[all]'
      );
      
      if (popResponse.ok) {
        const popData = await popResponse.json();
        const series = popData?.[0]?.resultados?.[0]?.series || [];
        
        addLog(`Atualizando população de ${series.length} municípios...`);
        
        // Processar em batches
        for (let i = 0; i < series.length; i += 500) {
          const batch = series.slice(i, i + 500);
          
          for (const item of batch) {
            const codigoIbge = item.localidade?.id;
            const populacao = item.serie?.['2022'];
            
            if (codigoIbge && populacao) {
              await supabase
                .from('municipios_renda')
                .update({ populacao: parseInt(populacao) })
                .eq('codigo_ibge', String(codigoIbge));
            }
          }
          
          addLog(`População: ${Math.min(i + 500, series.length)}/${series.length}`);
        }
      }

      // Buscar PIB per capita
      setStatus('Buscando dados de PIB...');
      addLog('Conectando ao SIDRA/IBGE para dados de PIB...');
      
      const pibResponse = await fetch(
        'https://servicodados.ibge.gov.br/api/v3/agregados/5938/periodos/2021/variaveis/513?localidades=N6[all]'
      );
      
      if (pibResponse.ok) {
        const pibData = await pibResponse.json();
        const series = pibData?.[0]?.resultados?.[0]?.series || [];
        
        addLog(`Atualizando PIB de ${series.length} municípios...`);
        
        for (let i = 0; i < series.length; i += 500) {
          const batch = series.slice(i, i + 500);
          
          for (const item of batch) {
            const codigoIbge = item.localidade?.id;
            const pibPerCapita = item.serie?.['2021'];
            
            if (codigoIbge && pibPerCapita) {
              await supabase
                .from('municipios_renda')
                .update({ pib_per_capita: parseFloat(pibPerCapita) })
                .eq('codigo_ibge', String(codigoIbge));
            }
          }
          
          addLog(`PIB: ${Math.min(i + 500, series.length)}/${series.length}`);
        }
      }

    } catch (error) {
      addLog(`Aviso: Erro ao buscar dados adicionais - ${error}`);
    }
  };

  const toggleDataSource = (id: string) => {
    setDataSources(prev => prev.map(s => 
      s.id === id ? { ...s, enabled: !s.enabled } : s
    ));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          Carregar Dados IBGE
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Carregar Dados do IBGE
          </DialogTitle>
          <DialogDescription>
            Busca automática de dados demográficos e econômicos de todos os municípios brasileiros
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info */}
          <div className="p-3 bg-primary/10 rounded-lg flex gap-3">
            <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">APIs Públicas do IBGE</p>
              <p className="text-muted-foreground">
                Este processo irá buscar dados de 5.570 municípios diretamente das APIs 
                oficiais do IBGE (servicodados.ibge.gov.br). Pode levar alguns minutos.
              </p>
            </div>
          </div>

          {/* Fontes de dados */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Fontes de dados:</Label>
            {dataSources.map(source => (
              <div key={source.id} className="flex items-start gap-3 p-2 rounded border">
                <Checkbox 
                  id={source.id}
                  checked={source.enabled}
                  onCheckedChange={() => toggleDataSource(source.id)}
                  disabled={loading}
                />
                <div className="flex-1">
                  <Label htmlFor={source.id} className="font-medium cursor-pointer">
                    {source.name}
                  </Label>
                  <p className="text-xs text-muted-foreground">{source.description}</p>
                </div>
                {source.id === 'idh' && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                    Requer importação manual
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Progress */}
          {loading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{status}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Logs */}
          {logs.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-3 max-h-40 overflow-y-auto">
              <div className="space-y-1 font-mono text-xs">
                {logs.map((log, i) => (
                  <div key={i} className={log.includes('✅') ? 'text-green-600' : log.includes('❌') ? 'text-red-600' : ''}>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center pt-2">
            <div className="text-xs text-muted-foreground">
              Fonte: IBGE - Instituto Brasileiro de Geografia e Estatística
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                {loading ? 'Aguarde...' : 'Fechar'}
              </Button>
              <Button onClick={handleLoadData} disabled={loading}>
                {loading ? (
                  <>Carregando...</>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Carregar Dados
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
