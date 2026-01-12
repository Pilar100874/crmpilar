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
  latitude: number | null;
  longitude: number | null;
  regiao?: string | null;
  mesorregiao?: string | null;
  microrregiao?: string | null;
}

export const useMunicipiosRenda = () => {
  const [municipiosRenda, setMunicipiosRenda] = useState<MunicipioRenda[]>([]);
  const [loading, setLoading] = useState(false);

  // Busca dados de renda dos municípios diretamente com coordenadas
  const fetchMunicipiosRenda = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('municipios_renda')
        .select('*')
        .order('pib_per_capita', { ascending: false, nullsFirst: false });

      if (error) throw error;

      // Filtra apenas municípios com coordenadas válidas
      const withCoords = (data || []).filter(m => 
        m.latitude !== null && m.longitude !== null
      );

      setMunicipiosRenda(withCoords);
    } catch (error) {
      console.error('Erro ao buscar dados de renda:', error);
    }
    setLoading(false);
  }, []);

  // Agrupa por UF para visão macro
  const rendaPorUF = useCallback(() => {
    const byUF = new Map<string, { 
      uf: string; 
      renda_media: number; 
      total_populacao: number;
      municipios: number;
      soma_renda: number;
      pib_medio: number;
      soma_pib: number;
    }>();
    
    municipiosRenda.forEach(m => {
      const existing = byUF.get(m.uf);
      const pop = m.populacao || 1;
      const renda = m.renda_media || 0;
      const pib = m.pib_per_capita || 0;
      
      if (existing) {
        existing.soma_renda += renda * pop;
        existing.soma_pib += pib * pop;
        existing.total_populacao += pop;
        existing.municipios++;
      } else {
        byUF.set(m.uf, { 
          uf: m.uf, 
          renda_media: renda,
          pib_medio: pib,
          total_populacao: pop,
          municipios: 1,
          soma_renda: renda * pop,
          soma_pib: pib * pop
        });
      }
    });
    
    // Calcula média ponderada por população
    return Array.from(byUF.values()).map(uf => ({
      ...uf,
      renda_media: uf.total_populacao > 0 ? uf.soma_renda / uf.total_populacao : 0,
      pib_medio: uf.total_populacao > 0 ? uf.soma_pib / uf.total_populacao : 0
    }));
  }, [municipiosRenda]);

  useEffect(() => {
    fetchMunicipiosRenda();
  }, [fetchMunicipiosRenda]);

  return {
    municipiosRenda,
    rendaPorUF: rendaPorUF(),
    loading,
    refetch: fetchMunicipiosRenda
  };
};
