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

async function fetchWithRetry(url: string, options?: RequestInit, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      console.log(`Tentativa ${i + 1} falhou para ${url}:`, error);
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
    }
  }
  throw new Error('Max retries reached');
}

async function getCoordsFromCep(cep: string): Promise<Coords | null> {
  try {
    // Clean CEP
    const cleanCep = cep.replace(/\D/g, '');
    console.log(`Buscando coordenadas para CEP: ${cleanCep}`);
    
    // Get address from ViaCEP with retry
    const viaCepResponse = await fetchWithRetry(`https://viacep.com.br/ws/${cleanCep}/json/`);
    if (!viaCepResponse.ok) {
      console.error('ViaCEP response not ok:', viaCepResponse.status);
      return null;
    }
    
    const viaCepData = await viaCepResponse.json();
    if (viaCepData.erro) {
      console.error('ViaCEP retornou erro para CEP:', cleanCep);
      return null;
    }

    console.log('ViaCEP data:', viaCepData);

    // Try with city and state first (more reliable)
    const searchAddress = `${viaCepData.localidade}, ${viaCepData.uf}, Brasil`;
    console.log('Buscando coordenadas para:', searchAddress);
    
    // Get coordinates from Nominatim with retry
    const nominatimResponse = await fetchWithRetry(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}&limit=1`,
      {
        headers: {
          'User-Agent': 'OrcamentoApp/1.0'
        }
      }
    );
    
    if (!nominatimResponse.ok) {
      console.error('Nominatim response not ok:', nominatimResponse.status);
      return null;
    }
    
    const nominatimData = await nominatimResponse.json();
    console.log('Nominatim data:', nominatimData);
    
    if (nominatimData.length === 0) {
      console.error('Nominatim não encontrou coordenadas para:', searchAddress);
      return null;
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
  origemCoords: Coords,
  destinoCoords: Coords
): Promise<{ ida: number; volta: number; error: string | null }> {
  try {
    // API calcularpedagio.com.br uses coordinates
    // Documentation: https://www.calcularpedagio.com.br/documentacao
    // Clean API key - remove "Bearer " prefix if present
    const cleanApiKey = apiKey.replace(/^Bearer\s+/i, '');
    
    console.log('Calling calcularpedagio API with Authorization Bearer');
    
    const idaResponse = await fetch('https://www.calcularpedagio.com.br/api/coordenadas/v3', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cleanApiKey}`
      },
      body: JSON.stringify({
        pontos: [
          [origemCoords.lat, origemCoords.lng],
          [destinoCoords.lat, destinoCoords.lng]
        ]
      })
    });

    if (!idaResponse.ok) {
      const errorData = await idaResponse.json().catch(() => ({}));
      console.error('CalcularPedagio ida error:', JSON.stringify(errorData));
      return { ida: 0, volta: 0, error: `Erro API: ${errorData.error || errorData.message || idaResponse.statusText}` };
    }

    const idaData = await idaResponse.json();
    console.log('CalcularPedagio ida response:', JSON.stringify(idaData, null, 2));

    if (idaData.status !== 'OK') {
      return { ida: 0, volta: 0, error: `Erro API: ${idaData.message || idaData.status}` };
    }

    // Sum all tolls in the route
    const idaToll = idaData?.dados?.pedagiosRota?.reduce((sum: number, toll: any) => {
      return sum + (toll?.tarifas?.tarifa2Eixos || toll?.tarifas?.tarifaBasica || 0);
    }, 0) || 0;

    // Calculate return trip
    const voltaResponse = await fetch('https://www.calcularpedagio.com.br/api/coordenadas/v3', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cleanApiKey}`
      },
      body: JSON.stringify({
        pontos: [
          [destinoCoords.lat, destinoCoords.lng],
          [origemCoords.lat, origemCoords.lng]
        ]
      })
    });

    let voltaToll = idaToll; // Default to same as ida if volta fails
    if (voltaResponse.ok) {
      const voltaData = await voltaResponse.json();
      console.log('CalcularPedagio volta response:', JSON.stringify(voltaData, null, 2));
      
      if (voltaData.status === 'OK') {
        voltaToll = voltaData?.dados?.pedagiosRota?.reduce((sum: number, toll: any) => {
          return sum + (toll?.tarifas?.tarifa2Eixos || toll?.tarifas?.tarifaBasica || 0);
        }, 0) || 0;
      }
    }

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
    } else if (provider === 'calcularpedagio' || provider === 'calcular_pedagio') {
      result = await calculatePedagioBR(api_key, configuracoes, origemCoords, destinoCoords);
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
