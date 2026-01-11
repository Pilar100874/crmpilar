import { useCallback } from 'react';

interface GeocodingResult {
  latitude: number;
  longitude: number;
}

export function useGeocodingService() {
  const geocodeAddress = useCallback(async (
    endereco: string,
    cidade?: string,
    estado?: string,
    cep?: string
  ): Promise<GeocodingResult | null> => {
    try {
      // Montar endereço completo para geocodificação
      const parts = [endereco, cidade, estado, cep].filter(Boolean);
      const fullAddress = parts.join(', ') + ', Brasil';
      
      if (!fullAddress || fullAddress.trim() === ', Brasil') {
        return null;
      }

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'CRMApp/1.0'
          }
        }
      );

      if (!response.ok) {
        console.error('Erro na geocodificação:', response.status);
        return null;
      }

      const data = await response.json();
      
      if (data && data.length > 0) {
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon)
        };
      }

      // Tentar apenas com cidade e estado se endereço completo falhar
      if (cidade && estado) {
        const fallbackAddress = `${cidade}, ${estado}, Brasil`;
        const fallbackResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fallbackAddress)}&limit=1`,
          {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'CRMApp/1.0'
            }
          }
        );

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          if (fallbackData && fallbackData.length > 0) {
            return {
              latitude: parseFloat(fallbackData[0].lat),
              longitude: parseFloat(fallbackData[0].lon)
            };
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Erro ao geocodificar endereço:', error);
      return null;
    }
  }, []);

  return { geocodeAddress };
}

// Função utilitária para geocodificar e salvar coordenadas de uma empresa
export async function geocodeAndSaveEmpresa(
  supabase: any,
  empresaId: string,
  endereco?: string,
  cidade?: string,
  estado?: string,
  cep?: string
): Promise<GeocodingResult | null> {
  try {
    const parts = [endereco, cidade, estado, cep].filter(Boolean);
    const fullAddress = parts.join(', ') + ', Brasil';
    
    if (!fullAddress || fullAddress.trim() === ', Brasil') {
      return null;
    }

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CRMApp/1.0'
        }
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    let result: GeocodingResult | null = null;
    
    if (data && data.length > 0) {
      result = {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon)
      };
    } else if (cidade && estado) {
      // Fallback: tentar apenas cidade/estado
      const fallbackAddress = `${cidade}, ${estado}, Brasil`;
      const fallbackResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fallbackAddress)}&limit=1`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'CRMApp/1.0'
          }
        }
      );

      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        if (fallbackData && fallbackData.length > 0) {
          result = {
            latitude: parseFloat(fallbackData[0].lat),
            longitude: parseFloat(fallbackData[0].lon)
          };
        }
      }
    }

    // Salvar coordenadas no banco
    if (result) {
      await supabase
        .from('empresas')
        .update({
          latitude: result.latitude,
          longitude: result.longitude
        })
        .eq('id', empresaId);
    }

    return result;
  } catch (error) {
    console.error('Erro ao geocodificar empresa:', error);
    return null;
  }
}
