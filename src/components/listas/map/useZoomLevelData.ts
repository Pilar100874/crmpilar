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

  // Busca dados municipais quando necessário
  const fetchMunicipalData = useCallback(async (bounds?: { north: number; south: number; east: number; west: number }) => {
    setLoading(true);
    try {
      // Busca dados de renda
      let rendaQuery = supabase
        .from('municipios_renda')
        .select('municipio, uf, renda_media, idh, populacao');

      const { data: rendaData } = await rendaQuery.limit(500);

      // Busca coordenadas
      let coordQuery = supabase
        .from('municipios_coordenadas')
        .select('nome, uf, latitude, longitude');

      const { data: coordData } = await coordQuery.limit(500);

      // Busca contagem de empresas por município
      const { data: empresasData } = await supabase
        .from('empresas_cnae_municipios')
        .select('municipio, uf, quantidade')
        .limit(1000);

      // Combina os dados
      const coordMap = new Map<string, { lat: number; lng: number }>();
      coordData?.forEach(c => {
        coordMap.set(`${c.nome.toUpperCase()}-${c.uf}`, { lat: c.latitude, lng: c.longitude });
      });

      const empresasMap = new Map<string, number>();
      empresasData?.forEach(e => {
        const key = `${e.municipio.toUpperCase()}-${e.uf}`;
        empresasMap.set(key, (empresasMap.get(key) || 0) + e.quantidade);
      });

      const combined: MunicipalData[] = (rendaData || []).map(r => {
        const key = `${r.municipio.toUpperCase()}-${r.uf}`;
        const coord = coordMap.get(key);
        return {
          municipio: r.municipio,
          uf: r.uf,
          latitude: coord?.lat || 0,
          longitude: coord?.lng || 0,
          populacao: r.populacao || undefined,
          renda_media: r.renda_media ? Number(r.renda_media) : undefined,
          idh: r.idh ? Number(r.idh) : undefined,
          empresas_count: empresasMap.get(key)
        };
      }).filter(m => m.latitude !== 0);

      setMunicipalData(combined);
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
