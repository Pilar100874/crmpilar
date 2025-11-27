import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PedagioResult {
  ida: number;
  volta: number;
  total: number;
  loading: boolean;
  error: string | null;
  origemCep: string | null;
  destinoCep: string | null;
}

interface PedagioConfig {
  id: string;
  provider: string;
  api_key: string;
  ativo: boolean;
  configuracoes: any;
}

export const usePedagioCalculation = (
  estabelecimentoId: string,
  empresaId: string | null
) => {
  const [result, setResult] = useState<PedagioResult>({
    ida: 0,
    volta: 0,
    total: 0,
    loading: false,
    error: null,
    origemCep: null,
    destinoCep: null
  });

  useEffect(() => {
    const calculatePedagio = async () => {
      if (!empresaId || !estabelecimentoId) {
        setResult(prev => ({ ...prev, ida: 0, volta: 0, total: 0, origemCep: null, destinoCep: null }));
        return;
      }

      setResult(prev => ({ ...prev, loading: true, error: null }));

      try {
        // 1. Get current authenticated user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setResult(prev => ({ 
            ...prev, 
            loading: false, 
            error: 'Usuário não autenticado' 
          }));
          return;
        }

        // 2. Get user's unit (unidade) from usuarios table
        const { data: usuario, error: usuarioError } = await supabase
          .from('usuarios')
          .select('unidade_id')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        if (usuarioError || !usuario?.unidade_id) {
          setResult(prev => ({ 
            ...prev, 
            loading: false, 
            error: 'Usuário sem unidade cadastrada' 
          }));
          return;
        }

        // 3. Get unit's CEP (origin)
        const { data: unidade, error: unidadeError } = await supabase
          .from('unidades')
          .select('cep')
          .eq('id', usuario.unidade_id)
          .maybeSingle();

        if (unidadeError || !unidade?.cep) {
          setResult(prev => ({ 
            ...prev, 
            loading: false, 
            error: 'Unidade sem CEP cadastrado' 
          }));
          return;
        }

        const origemCep = unidade.cep.replace(/\D/g, '');

        // 4. Get empresa's CEP (destination)
        const { data: empresa, error: empresaError } = await supabase
          .from('empresas')
          .select('cep')
          .eq('id', empresaId)
          .maybeSingle();

        if (empresaError || !empresa?.cep) {
          setResult(prev => ({ 
            ...prev, 
            loading: false, 
            error: 'Cliente sem CEP cadastrado',
            origemCep 
          }));
          return;
        }

        const destinoCep = empresa.cep.replace(/\D/g, '');

        // 5. Get toll API configuration
        const { data: pedagioConfig, error: configError } = await supabase
          .from('pedagio_api_config')
          .select('*')
          .eq('estabelecimento_id', estabelecimentoId)
          .eq('ativo', true)
          .maybeSingle();

        if (configError || !pedagioConfig) {
          setResult(prev => ({ 
            ...prev, 
            loading: false, 
            error: 'API de pedágio não configurada',
            origemCep,
            destinoCep 
          }));
          return;
        }

        // 6. Calculate toll using the configured API
        const tollResult = await calculateTollFromAPI(
          pedagioConfig as PedagioConfig,
          origemCep,
          destinoCep
        );

        setResult({
          ida: tollResult.ida,
          volta: tollResult.volta,
          total: tollResult.ida + tollResult.volta,
          loading: false,
          error: tollResult.error,
          origemCep,
          destinoCep
        });

      } catch (error: any) {
        console.error('Erro ao calcular pedágio:', error);
        setResult(prev => ({ 
          ...prev, 
          loading: false, 
          error: 'Erro ao calcular pedágio' 
        }));
      }
    };

    calculatePedagio();
  }, [estabelecimentoId, empresaId]);

  return result;
};

async function calculateTollFromAPI(
  config: PedagioConfig,
  origemCep: string,
  destinoCep: string
): Promise<{ ida: number; volta: number; error: string | null }> {
  try {
    if (config.provider === 'tollguru') {
      return await calculateTollGuru(config, origemCep, destinoCep);
    } else if (config.provider === 'calcularpedagio') {
      return await calculatePedagioBR(config, origemCep, destinoCep);
    }
    
    return { ida: 0, volta: 0, error: 'Provedor de API não suportado' };
  } catch (error: any) {
    console.error('Erro na API de pedágio:', error);
    return { ida: 0, volta: 0, error: error.message || 'Erro na API de pedágio' };
  }
}

async function calculateTollGuru(
  config: PedagioConfig,
  origemCep: string,
  destinoCep: string
): Promise<{ ida: number; volta: number; error: string | null }> {
  try {
    // Get coordinates from CEP using ViaCEP + Nominatim
    const origemCoords = await getCoordsFromCep(origemCep);
    const destinoCoords = await getCoordsFromCep(destinoCep);

    if (!origemCoords || !destinoCoords) {
      return { ida: 0, volta: 0, error: 'Não foi possível obter coordenadas' };
    }

    // TollGuru API call for outbound trip
    const idaResponse = await fetch('https://apis.tollguru.com/toll/v2/complete-polyline-from-mapping-service', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.api_key
      },
      body: JSON.stringify({
        source: 'here',
        from: { lat: origemCoords.lat, lng: origemCoords.lng },
        to: { lat: destinoCoords.lat, lng: destinoCoords.lng },
        vehicle: {
          type: config.configuracoes?.vehicleType || '2AxlesAuto'
        }
      })
    });

    if (!idaResponse.ok) {
      const errorData = await idaResponse.json().catch(() => ({}));
      return { ida: 0, volta: 0, error: `Erro TollGuru: ${errorData.message || idaResponse.statusText}` };
    }

    const idaData = await idaResponse.json();
    const idaToll = idaData?.route?.costs?.tag || idaData?.route?.costs?.cash || 0;

    // TollGuru API call for return trip
    const voltaResponse = await fetch('https://apis.tollguru.com/toll/v2/complete-polyline-from-mapping-service', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.api_key
      },
      body: JSON.stringify({
        source: 'here',
        from: { lat: destinoCoords.lat, lng: destinoCoords.lng },
        to: { lat: origemCoords.lat, lng: origemCoords.lng },
        vehicle: {
          type: config.configuracoes?.vehicleType || '2AxlesAuto'
        }
      })
    });

    if (!voltaResponse.ok) {
      return { ida: idaToll, volta: idaToll, error: null }; // Use same value for return if API fails
    }

    const voltaData = await voltaResponse.json();
    const voltaToll = voltaData?.route?.costs?.tag || voltaData?.route?.costs?.cash || 0;

    return { ida: idaToll, volta: voltaToll, error: null };
  } catch (error: any) {
    console.error('Erro TollGuru:', error);
    return { ida: 0, volta: 0, error: error.message };
  }
}

async function calculatePedagioBR(
  config: PedagioConfig,
  origemCep: string,
  destinoCep: string
): Promise<{ ida: number; volta: number; error: string | null }> {
  try {
    // calcularpedagio.com.br API
    const response = await fetch(`https://api.calcularpedagio.com.br/v1/pedagio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.api_key}`
      },
      body: JSON.stringify({
        origem: origemCep,
        destino: destinoCep,
        eixos: config.configuracoes?.eixos || 2
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { ida: 0, volta: 0, error: `Erro API: ${errorData.message || response.statusText}` };
    }

    const data = await response.json();
    const idaToll = data?.valor_pedagio || data?.ida || 0;
    const voltaToll = data?.valor_pedagio || data?.volta || idaToll;

    return { ida: idaToll, volta: voltaToll, error: null };
  } catch (error: any) {
    console.error('Erro calcularpedagio:', error);
    return { ida: 0, volta: 0, error: error.message };
  }
}

async function getCoordsFromCep(cep: string): Promise<{ lat: number; lng: number } | null> {
  try {
    // First get address from ViaCEP
    const viaCepResponse = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!viaCepResponse.ok) return null;
    
    const viaCepData = await viaCepResponse.json();
    if (viaCepData.erro) return null;

    const address = `${viaCepData.logradouro}, ${viaCepData.bairro}, ${viaCepData.localidade}, ${viaCepData.uf}, Brasil`;
    
    // Then get coordinates from Nominatim
    const nominatimResponse = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      {
        headers: {
          'User-Agent': 'OrcamentoApp/1.0'
        }
      }
    );
    
    if (!nominatimResponse.ok) return null;
    
    const nominatimData = await nominatimResponse.json();
    if (nominatimData.length === 0) {
      // Try with just city and state
      const fallbackAddress = `${viaCepData.localidade}, ${viaCepData.uf}, Brasil`;
      const fallbackResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fallbackAddress)}&limit=1`,
        {
          headers: {
            'User-Agent': 'OrcamentoApp/1.0'
          }
        }
      );
      
      if (!fallbackResponse.ok) return null;
      
      const fallbackData = await fallbackResponse.json();
      if (fallbackData.length === 0) return null;
      
      return {
        lat: parseFloat(fallbackData[0].lat),
        lng: parseFloat(fallbackData[0].lon)
      };
    }
    
    return {
      lat: parseFloat(nominatimData[0].lat),
      lng: parseFloat(nominatimData[0].lon)
    };
  } catch (error) {
    console.error('Erro ao obter coordenadas:', error);
    return null;
  }
}
