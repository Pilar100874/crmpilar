import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TollRequest {
  provider: string;
  api_key: string;
  configuracoes: any;
  origem_cep: string;
  destino_cep: string;
}

interface Coords {
  lat: number;
  lng: number;
}

async function getCoordsFromCep(cep: string): Promise<Coords | null> {
  try {
    // Get address from ViaCEP
    const viaCepResponse = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!viaCepResponse.ok) return null;
    
    const viaCepData = await viaCepResponse.json();
    if (viaCepData.erro) return null;

    const address = `${viaCepData.logradouro}, ${viaCepData.bairro}, ${viaCepData.localidade}, ${viaCepData.uf}, Brasil`;
    
    // Get coordinates from Nominatim
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

async function calculateTollGuru(
  apiKey: string,
  configuracoes: any,
  origemCoords: Coords,
  destinoCoords: Coords
): Promise<{ ida: number; volta: number; error: string | null }> {
  try {
    // Use origin-destination-pair endpoint (works with basic API keys)
    const idaResponse = await fetch('https://apis.tollguru.com/toll/v2/origin-destination-pair', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        from: { lat: origemCoords.lat, lng: origemCoords.lng },
        to: { lat: destinoCoords.lat, lng: destinoCoords.lng },
        vehicleType: configuracoes?.vehicle_type || '2AxlesAuto',
        departure_time: new Date().toISOString()
      })
    });

    if (!idaResponse.ok) {
      const errorData = await idaResponse.json().catch(() => ({}));
      console.error('TollGuru ida error:', errorData);
      return { ida: 0, volta: 0, error: `Erro TollGuru: ${errorData.message || errorData.error || idaResponse.statusText}` };
    }

    const idaData = await idaResponse.json();
    console.log('TollGuru ida response:', JSON.stringify(idaData, null, 2));
    
    // Extract toll from response - structure may vary
    const idaToll = idaData?.routes?.[0]?.costs?.tag || 
                    idaData?.routes?.[0]?.costs?.cash ||
                    idaData?.summary?.route?.costs?.tag ||
                    idaData?.summary?.route?.costs?.cash ||
                    idaData?.costs?.tag ||
                    idaData?.costs?.cash || 0;

    // Calculate return trip
    const voltaResponse = await fetch('https://apis.tollguru.com/toll/v2/origin-destination-pair', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        from: { lat: destinoCoords.lat, lng: destinoCoords.lng },
        to: { lat: origemCoords.lat, lng: origemCoords.lng },
        vehicleType: configuracoes?.vehicle_type || '2AxlesAuto',
        departure_time: new Date().toISOString()
      })
    });

    if (!voltaResponse.ok) {
      console.error('TollGuru volta error');
      return { ida: idaToll, volta: idaToll, error: null };
    }

    const voltaData = await voltaResponse.json();
    console.log('TollGuru volta response:', JSON.stringify(voltaData, null, 2));
    
    const voltaToll = voltaData?.routes?.[0]?.costs?.tag || 
                      voltaData?.routes?.[0]?.costs?.cash ||
                      voltaData?.summary?.route?.costs?.tag ||
                      voltaData?.summary?.route?.costs?.cash ||
                      voltaData?.costs?.tag ||
                      voltaData?.costs?.cash || 0;

    return { ida: idaToll, volta: voltaToll, error: null };
  } catch (error: any) {
    console.error('Erro TollGuru:', error);
    return { ida: 0, volta: 0, error: error.message };
  }
}

async function calculatePedagioBR(
  apiKey: string,
  configuracoes: any,
  origemCep: string,
  destinoCep: string
): Promise<{ ida: number; volta: number; error: string | null }> {
  try {
    const response = await fetch(`https://api.calcularpedagio.com.br/v1/pedagio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        origem: origemCep,
        destino: destinoCep,
        eixos: configuracoes?.eixos || 2
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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { provider, api_key, configuracoes, origem_cep, destino_cep }: TollRequest = await req.json();

    console.log('Calculating toll:', { provider, origem_cep, destino_cep });

    if (!origem_cep || !destino_cep) {
      return new Response(
        JSON.stringify({ error: 'CEPs de origem e destino são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get coordinates for both CEPs
    const origemCoords = await getCoordsFromCep(origem_cep);
    const destinoCoords = await getCoordsFromCep(destino_cep);

    if (!origemCoords) {
      return new Response(
        JSON.stringify({ error: 'Não foi possível obter coordenadas do CEP de origem' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!destinoCoords) {
      return new Response(
        JSON.stringify({ error: 'Não foi possível obter coordenadas do CEP de destino' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Coords:', { origemCoords, destinoCoords });

    let result: { ida: number; volta: number; error: string | null };

    if (provider === 'tollguru') {
      result = await calculateTollGuru(api_key, configuracoes, origemCoords, destinoCoords);
    } else if (provider === 'calcularpedagio') {
      result = await calculatePedagioBR(api_key, configuracoes, origem_cep, destino_cep);
    } else {
      return new Response(
        JSON.stringify({ error: 'Provedor de API não suportado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        ida: result.ida,
        volta: result.volta,
        total: result.ida + result.volta,
        error: result.error,
        origem_coords: origemCoords,
        destino_coords: destinoCoords
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
