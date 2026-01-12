import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface IsochroneData {
  id?: string;
  nome: string;
  latitude: number;
  longitude: number;
  tempo_minutos: number;
  modo_transporte: string;
  geometria_geojson?: any;
}

// OpenRouteService API (gratuito, até 40 req/min)
const ORS_API_URL = 'https://api.openrouteservice.org/v2/isochrones';

export const useIsochrone = () => {
  const [isocronas, setIsocronas] = useState<IsochroneData[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);

  // Busca isócronas salvas do banco
  const fetchSavedIsochrones = useCallback(async () => {
    const { data, error } = await supabase
      .from('isocronas')
      .select('*')
      .order('created_at', { ascending: false });

    if (data && !error) {
      setIsocronas(data.map(iso => ({
        id: iso.id,
        nome: iso.nome,
        latitude: Number(iso.latitude),
        longitude: Number(iso.longitude),
        tempo_minutos: iso.tempo_minutos,
        modo_transporte: iso.modo_transporte,
        geometria_geojson: iso.geometria_geojson
      })));
    }
  }, []);

  // Gera isócrona via OpenRouteService API
  const generateIsochrone = useCallback(async (
    lat: number,
    lng: number,
    tempoMinutos: number = 15,
    modo: string = 'driving-car',
    nome: string = 'Nova Isócrona'
  ): Promise<any | null> => {
    if (!apiKey) {
      toast.error('Configure a API Key do OpenRouteService para usar isócronas');
      return null;
    }

    setLoading(true);
    try {
      const response = await fetch(ORS_API_URL + '/' + modo, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': apiKey
        },
        body: JSON.stringify({
          locations: [[lng, lat]],
          range: [tempoMinutos * 60], // Converte para segundos
          range_type: 'time'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro na API: ${errorText}`);
      }

      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const geojson = data.features[0];
        
        // Salva no banco
        const { error } = await supabase.from('isocronas').insert({
          nome,
          latitude: lat,
          longitude: lng,
          tempo_minutos: tempoMinutos,
          modo_transporte: modo,
          geometria_geojson: geojson,
          estabelecimento_id: 'default' // TODO: pegar do contexto
        });

        if (!error) {
          toast.success(`Isócrona de ${tempoMinutos} min criada!`);
          await fetchSavedIsochrones();
        }

        return geojson;
      }
      
      return null;
    } catch (error: any) {
      console.error('Erro gerando isócrona:', error);
      toast.error(error.message || 'Erro ao gerar isócrona');
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiKey, fetchSavedIsochrones]);

  // Remove isócrona
  const deleteIsochrone = useCallback(async (id: string) => {
    const { error } = await supabase.from('isocronas').delete().eq('id', id);
    if (!error) {
      setIsocronas(prev => prev.filter(iso => iso.id !== id));
      toast.success('Isócrona removida');
    }
  }, []);

  return {
    isocronas,
    loading,
    apiKey,
    setApiKey,
    fetchSavedIsochrones,
    generateIsochrone,
    deleteIsochrone
  };
};
