import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MunicipioRenda {
  id: string;
  municipio: string;
  uf: string;
  codigo_ibge: string | null;
  renda_media: number | null;
  renda_mediana: number | null;
  pib_per_capita: number | null;
  idh: number | null;
  populacao: number | null;
  latitude?: number;
  longitude?: number;
}

interface MunicipioCoord {
  nome: string;
  uf: string;
  latitude: number;
  longitude: number;
}

export const useMunicipiosRenda = () => {
  const [municipiosRenda, setMunicipiosRenda] = useState<MunicipioRenda[]>([]);
  const [loading, setLoading] = useState(false);
  const [coordenadas, setCoordenadas] = useState<Map<string, MunicipioCoord>>(new Map());

  // Busca coordenadas dos municípios
  const fetchCoordenadas = useCallback(async () => {
    const { data } = await supabase
      .from('municipios_coordenadas')
      .select('nome, uf, latitude, longitude');
    
    if (data) {
      const map = new Map<string, MunicipioCoord>();
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
      setCoordenadas(map);
    }
  }, []);

  // Busca dados de renda dos municípios
  const fetchMunicipiosRenda = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('municipios_renda')
        .select('*')
        .order('renda_media', { ascending: false });

      if (error) throw error;

      // Enriquece com coordenadas
      const enriched = (data || []).map(m => {
        const key = `${m.municipio.toUpperCase()}-${m.uf}`;
        const coord = coordenadas.get(key);
        return {
          ...m,
          latitude: coord?.latitude,
          longitude: coord?.longitude
        };
      });

      setMunicipiosRenda(enriched);
    } catch (error) {
      console.error('Erro ao buscar dados de renda:', error);
    }
    setLoading(false);
  }, [coordenadas]);

  // Agrupa por UF para visão macro
  const rendaPorUF = useCallback(() => {
    const byUF = new Map<string, { 
      uf: string; 
      renda_media: number; 
      total_populacao: number;
      municipios: number;
      soma_renda: number;
    }>();
    
    municipiosRenda.forEach(m => {
      if (!m.renda_media) return;
      
      const existing = byUF.get(m.uf);
      if (existing) {
        existing.soma_renda += m.renda_media * (m.populacao || 1);
        existing.total_populacao += m.populacao || 1;
        existing.municipios++;
      } else {
        byUF.set(m.uf, { 
          uf: m.uf, 
          renda_media: m.renda_media,
          total_populacao: m.populacao || 1,
          municipios: 1,
          soma_renda: m.renda_media * (m.populacao || 1)
        });
      }
    });
    
    // Calcula média ponderada por população
    return Array.from(byUF.values()).map(uf => ({
      ...uf,
      renda_media: uf.soma_renda / uf.total_populacao
    }));
  }, [municipiosRenda]);

  useEffect(() => {
    fetchCoordenadas();
  }, [fetchCoordenadas]);

  useEffect(() => {
    if (coordenadas.size > 0) {
      fetchMunicipiosRenda();
    }
  }, [coordenadas, fetchMunicipiosRenda]);

  return {
    municipiosRenda,
    rendaPorUF: rendaPorUF(),
    loading,
    refetch: fetchMunicipiosRenda
  };
};
