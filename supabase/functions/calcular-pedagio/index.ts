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

interface TollGuruResult {
  ida: number;
  volta: number;
  distanciaIdaKm: number;
  distanciaVoltaKm: number;
  tempoIdaMin: number;
  tempoVoltaMin: number;
  error: string | null;
}

async function calculateTollGuru(
  apiKey: string,
  configuracoes: any,
  origemCoords: Coords,
  destinoCoords: Coords
): Promise<TollGuruResult> {
  try {
    console.log('TollGuru: Calculando ida...');
    
    // Use origin-destination-pair endpoint
    const idaResponse = await fetch('https://apis.tollguru.com/toll/v2/origin-destination-pair', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        from: { lat: origemCoords.lat, lng: origemCoords.lng },
        to: { lat: destinoCoords.lat, lng: destinoCoords.lng },
        vehicleType: configuracoes?.vehicle_type || '2AxlesTruck',
        departure_time: new Date().toISOString()
      })
    });

    if (!idaResponse.ok) {
      const errorData = await idaResponse.json().catch(() => ({}));
      console.error('TollGuru ida error:', JSON.stringify(errorData));
      return { 
        ida: 0, volta: 0, 
        distanciaIdaKm: 0, distanciaVoltaKm: 0,
        tempoIdaMin: 0, tempoVoltaMin: 0,
        error: `Erro TollGuru: ${errorData.message || errorData.error || idaResponse.statusText}` 
      };
    }

    const idaData = await idaResponse.json();
    console.log('TollGuru ida response:', JSON.stringify(idaData, null, 2));
    
    // Extract toll, distance and duration from response
    const idaRoute = idaData?.routes?.[0] || idaData?.summary?.route || idaData;
    const idaToll = idaRoute?.costs?.tag || idaRoute?.costs?.cash || idaRoute?.costs?.minimumTollCost || 0;
    const idaDistanceMeters = idaRoute?.distance?.value || idaRoute?.summary?.distance?.value || idaRoute?.distance || 0;
    const idaDurationSeconds = idaRoute?.duration?.value || idaRoute?.summary?.duration?.value || idaRoute?.duration || 0;
    
    const distanciaIdaKm = idaDistanceMeters / 1000;
    const tempoIdaMin = idaDurationSeconds / 60;

    console.log('TollGuru ida parsed:', { idaToll, distanciaIdaKm, tempoIdaMin });

    // Calculate return trip
    console.log('TollGuru: Calculando volta...');
    const voltaResponse = await fetch('https://apis.tollguru.com/toll/v2/origin-destination-pair', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        from: { lat: destinoCoords.lat, lng: destinoCoords.lng },
        to: { lat: origemCoords.lat, lng: origemCoords.lng },
        vehicleType: configuracoes?.vehicle_type || '2AxlesTruck',
        departure_time: new Date().toISOString()
      })
    });

    let voltaToll = idaToll;
    let distanciaVoltaKm = distanciaIdaKm;
    let tempoVoltaMin = tempoIdaMin;

    if (voltaResponse.ok) {
      const voltaData = await voltaResponse.json();
      console.log('TollGuru volta response:', JSON.stringify(voltaData, null, 2));
      
      const voltaRoute = voltaData?.routes?.[0] || voltaData?.summary?.route || voltaData;
      voltaToll = voltaRoute?.costs?.tag || voltaRoute?.costs?.cash || voltaRoute?.costs?.minimumTollCost || idaToll;
      const voltaDistanceMeters = voltaRoute?.distance?.value || voltaRoute?.summary?.distance?.value || voltaRoute?.distance || idaDistanceMeters;
      const voltaDurationSeconds = voltaRoute?.duration?.value || voltaRoute?.summary?.duration?.value || voltaRoute?.duration || idaDurationSeconds;
      
      distanciaVoltaKm = voltaDistanceMeters / 1000;
      tempoVoltaMin = voltaDurationSeconds / 60;
      
      console.log('TollGuru volta parsed:', { voltaToll, distanciaVoltaKm, tempoVoltaMin });
    } else {
      console.error('TollGuru volta error, usando valores da ida');
    }

    return { 
      ida: idaToll, 
      volta: voltaToll, 
      distanciaIdaKm,
      distanciaVoltaKm,
      tempoIdaMin,
      tempoVoltaMin,
      error: null 
    };
  } catch (error: any) {
    console.error('Erro TollGuru:', error);
    return { 
      ida: 0, volta: 0, 
      distanciaIdaKm: 0, distanciaVoltaKm: 0,
      tempoIdaMin: 0, tempoVoltaMin: 0,
      error: error.message 
    };
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

    if (provider !== 'tollguru') {
      return new Response(
        JSON.stringify({ error: 'Apenas o provedor TollGuru é suportado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await calculateTollGuru(api_key, configuracoes, origemCoords, destinoCoords);
    return new Response(
      JSON.stringify({
        ida: result.ida,
        volta: result.volta,
        total: result.ida + result.volta,
        distanciaIdaKm: result.distanciaIdaKm,
        distanciaVoltaKm: result.distanciaVoltaKm,
        distanciaTotalKm: result.distanciaIdaKm + result.distanciaVoltaKm,
        tempoIdaMin: result.tempoIdaMin,
        tempoVoltaMin: result.tempoVoltaMin,
        tempoTotalMin: result.tempoIdaMin + result.tempoVoltaMin,
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
