import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CnaeHeatmapData {
  cnae: string;
  cnae_descricao: string | null;
  uf: string;
  municipio: string;
  quantidade: number;
  latitude?: number;
  longitude?: number;
}

interface MunicipioCoordenadas {
  nome: string;
  uf: string;
  latitude: number;
  longitude: number;
}

// Coordenadas das principais capitais brasileiras como fallback
const CAPITAIS_COORDENADAS: Record<string, { lat: number; lng: number }> = {
  'SP': { lat: -23.5505, lng: -46.6333 },
  'RJ': { lat: -22.9068, lng: -43.1729 },
  'MG': { lat: -19.9167, lng: -43.9345 },
  'BA': { lat: -12.9714, lng: -38.5014 },
  'PR': { lat: -25.4284, lng: -49.2733 },
  'RS': { lat: -30.0346, lng: -51.2177 },
  'PE': { lat: -8.0476, lng: -34.877 },
  'CE': { lat: -3.7172, lng: -38.5433 },
  'PA': { lat: -1.4558, lng: -48.4902 },
  'SC': { lat: -27.5954, lng: -48.548 },
  'MA': { lat: -2.5307, lng: -44.3068 },
  'GO': { lat: -16.6869, lng: -49.2648 },
  'AM': { lat: -3.119, lng: -60.0217 },
  'ES': { lat: -20.3155, lng: -40.3128 },
  'PB': { lat: -7.1195, lng: -34.845 },
  'RN': { lat: -5.7945, lng: -35.211 },
  'MT': { lat: -15.601, lng: -56.0974 },
  'AL': { lat: -9.6658, lng: -35.735 },
  'PI': { lat: -5.0892, lng: -42.8019 },
  'DF': { lat: -15.7801, lng: -47.9292 },
  'MS': { lat: -20.4697, lng: -54.6201 },
  'SE': { lat: -10.9472, lng: -37.0731 },
  'RO': { lat: -8.7619, lng: -63.9039 },
  'TO': { lat: -10.1689, lng: -48.3317 },
  'AC': { lat: -9.9754, lng: -67.8249 },
  'AP': { lat: 0.035, lng: -51.0694 },
  'RR': { lat: 2.8235, lng: -60.6758 }
};

export const useCnaeHeatmap = (selectedCnaes: string[]) => {
  const [heatmapData, setHeatmapData] = useState<CnaeHeatmapData[]>([]);
  const [loading, setLoading] = useState(false);
  const [municipiosCoordenadas, setMunicipiosCoordenadas] = useState<Map<string, MunicipioCoordenadas>>(new Map());

  // Busca coordenadas dos municípios
  const fetchMunicipiosCoordenadas = useCallback(async () => {
    const { data } = await supabase
      .from('municipios_coordenadas')
      .select('nome, uf, latitude, longitude');
    
    if (data) {
      const map = new Map<string, MunicipioCoordenadas>();
      data.forEach(m => {
        if (m.latitude && m.longitude) {
          map.set(`${m.nome.toUpperCase()}-${m.uf}`, {
            nome: m.nome,
            uf: m.uf,
            latitude: m.latitude,
            longitude: m.longitude
          });
        }
      });
      setMunicipiosCoordenadas(map);
    }
  }, []);

  // Busca dados do heatmap baseado nos CNAEs selecionados
  const fetchHeatmapData = useCallback(async () => {
    if (selectedCnaes.length === 0) {
      setHeatmapData([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('empresas_cnae_municipios')
        .select('cnae, cnae_descricao, uf, municipio, quantidade')
        .in('cnae', selectedCnaes);

      if (error) throw error;

      // Agrupa por município e soma quantidades
      const aggregated = new Map<string, CnaeHeatmapData>();
      
      (data || []).forEach(row => {
        const key = `${row.municipio.toUpperCase()}-${row.uf}`;
        const existing = aggregated.get(key);
        
        // Busca coordenadas
        const coords = municipiosCoordenadas.get(key);
        const capitalCoords = CAPITAIS_COORDENADAS[row.uf];
        
        if (existing) {
          existing.quantidade += row.quantidade;
        } else {
          aggregated.set(key, {
            ...row,
            latitude: coords?.latitude || capitalCoords?.lat,
            longitude: coords?.longitude || capitalCoords?.lng
          });
        }
      });

      setHeatmapData(Array.from(aggregated.values()));
    } catch (error) {
      console.error('Erro ao buscar dados do heatmap:', error);
    }
    setLoading(false);
  }, [selectedCnaes, municipiosCoordenadas]);

  // Geocodifica municípios que não têm coordenadas (via Nominatim)
  const geocodeMunicipios = useCallback(async (municipios: { nome: string; uf: string }[]) => {
    const toGeocode = municipios.filter(m => !municipiosCoordenadas.has(`${m.nome.toUpperCase()}-${m.uf}`));
    
    for (const mun of toGeocode.slice(0, 10)) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(`${mun.nome}, ${mun.uf}, Brasil`)}&limit=1`
        );
        const data = await response.json();
        
        if (data?.[0]) {
          const { lat, lon } = data[0];
          
          // Salva no banco
          await supabase.from('municipios_coordenadas').upsert({
            nome: mun.nome,
            uf: mun.uf,
            latitude: parseFloat(lat),
            longitude: parseFloat(lon)
          }, { onConflict: 'nome,uf' });
        }
        
        // Rate limit
        await new Promise(r => setTimeout(r, 1100));
      } catch (error) {
        console.error('Erro geocodificando:', error);
      }
    }
    
    // Atualiza cache
    await fetchMunicipiosCoordenadas();
  }, [municipiosCoordenadas, fetchMunicipiosCoordenadas]);

  // Agrupa por UF para visão macro
  const heatmapByUF = useCallback(() => {
    const byUF = new Map<string, { uf: string; quantidade: number; municipios: number }>();
    
    heatmapData.forEach(row => {
      const existing = byUF.get(row.uf);
      if (existing) {
        existing.quantidade += row.quantidade;
        existing.municipios++;
      } else {
        byUF.set(row.uf, { uf: row.uf, quantidade: row.quantidade, municipios: 1 });
      }
    });
    
    return Array.from(byUF.values());
  }, [heatmapData]);

  useEffect(() => {
    fetchMunicipiosCoordenadas();
  }, [fetchMunicipiosCoordenadas]);

  useEffect(() => {
    fetchHeatmapData();
  }, [fetchHeatmapData]);

  return {
    heatmapData,
    heatmapByUF: heatmapByUF(),
    loading,
    refetch: fetchHeatmapData,
    geocodeMunicipios
  };
};
