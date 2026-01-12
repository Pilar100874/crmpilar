import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DADOS_DEMOGRAFICOS_UF } from './MapLayerTypes';

export type ZoomLevel = 'country' | 'region' | 'state' | 'municipal' | 'local';

interface MunicipalData {
  municipio: string;
  uf: string;
  latitude: number;
  longitude: number;
  populacao?: number;
  renda_media?: number;
  idh?: number;
  empresas_count?: number;
}

interface RegionData {
  regiao: string;
  ufs: string[];
  populacao: number;
  renda_media: number;
  lat: number;
  lng: number;
}

// Regiões do Brasil
const REGIOES: RegionData[] = [
  { regiao: 'Norte', ufs: ['RO', 'AC', 'AM', 'RR', 'PA', 'AP', 'TO'], populacao: 18801282, renda_media: 1341, lat: -3.5, lng: -60 },
  { regiao: 'Nordeste', ufs: ['MA', 'PI', 'CE', 'RN', 'PB', 'PE', 'AL', 'SE', 'BA'], populacao: 57244485, renda_media: 1097, lat: -9, lng: -38 },
  { regiao: 'Sudeste', ufs: ['MG', 'ES', 'RJ', 'SP'], populacao: 88825643, renda_media: 2199, lat: -22, lng: -45 },
  { regiao: 'Sul', ufs: ['PR', 'SC', 'RS'], populacao: 31310809, renda_media: 2185, lat: -27, lng: -50 },
  { regiao: 'Centro-Oeste', ufs: ['MS', 'MT', 'GO', 'DF'], populacao: 17238818, renda_media: 2253, lat: -15.5, lng: -52 }
];

export const useZoomLevelData = (zoomLevel: number) => {
  const [currentLevel, setCurrentLevel] = useState<ZoomLevel>('country');
  const [municipalData, setMunicipalData] = useState<MunicipalData[]>([]);
  const [loading, setLoading] = useState(false);

  // Determina o nível de detalhe baseado no zoom
  const getZoomLevel = useCallback((zoom: number): ZoomLevel => {
    if (zoom <= 4) return 'country';
    if (zoom <= 5) return 'region';
    if (zoom <= 7) return 'state';
    if (zoom <= 10) return 'municipal';
    return 'local';
  }, []);

  // Busca dados municipais diretamente de municipios_renda (já tem coordenadas)
  const fetchMunicipalData = useCallback(async () => {
    setLoading(true);
    try {
      // Busca todos os municípios em lotes para evitar limite de 1000
      const allRendaData: any[] = [];
      const batchSize = 1000;
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('municipios_renda')
          .select('municipio, uf, latitude, longitude, populacao, pib_per_capita, idh, renda_media')
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .order('populacao', { ascending: false, nullsFirst: false })
          .range(offset, offset + batchSize - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allRendaData.push(...data);
          offset += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      // Busca contagem de empresas por município (também em lotes)
      const allEmpresasData: any[] = [];
      offset = 0;
      hasMore = true;

      while (hasMore) {
        const { data } = await supabase
          .from('empresas_cnae_municipios')
          .select('municipio, uf, quantidade')
          .range(offset, offset + batchSize - 1);

        if (data && data.length > 0) {
          allEmpresasData.push(...data);
          offset += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      const empresasMap = new Map<string, number>();
      allEmpresasData.forEach(e => {
        const key = `${e.municipio.toUpperCase()}-${e.uf}`;
        empresasMap.set(key, (empresasMap.get(key) || 0) + e.quantidade);
      });

      const combined: MunicipalData[] = allRendaData.map(r => {
        const key = `${r.municipio.toUpperCase()}-${r.uf}`;
        return {
          municipio: r.municipio,
          uf: r.uf,
          latitude: r.latitude!,
          longitude: r.longitude!,
          populacao: r.populacao || undefined,
          renda_media: r.renda_media ? Number(r.renda_media) : (r.pib_per_capita ? Number(r.pib_per_capita) : undefined),
          idh: r.idh ? Number(r.idh) : undefined,
          empresas_count: empresasMap.get(key)
        };
      });

      setMunicipalData(combined);
      console.log(`✅ Carregados ${combined.length} municípios com dados demográficos`);
    } catch (error) {
      console.error('Erro ao buscar dados municipais:', error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const newLevel = getZoomLevel(zoomLevel);
    setCurrentLevel(newLevel);

    if (newLevel === 'municipal' || newLevel === 'local') {
      fetchMunicipalData();
    }
  }, [zoomLevel, getZoomLevel, fetchMunicipalData]);

  // Dados por UF (sempre disponíveis do DADOS_DEMOGRAFICOS_UF)
  const stateData = Object.entries(DADOS_DEMOGRAFICOS_UF).map(([uf, data]) => ({
    uf,
    ...data
  }));

  // Dados regionais (agregados)
  const regionData = REGIOES;

  return {
    currentLevel,
    stateData,
    regionData,
    municipalData,
    loading
  };
};
