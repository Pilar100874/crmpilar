import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PosicaoPayload {
  veiculoId: string;
  lat: number;
  lng: number;
  velocidade?: number;
  direcao?: number;
  dataHora?: string;
}

// Traccar Client App format (background geolocation plugin)
interface TraccarClientPayload {
  location?: {
    timestamp?: string;
    coords?: {
      latitude?: number;
      longitude?: number;
      speed?: number;
      heading?: number;
      accuracy?: number;
    };
    is_moving?: boolean;
  };
  device_id?: string;
}

// Parse OsmAnd/Traccar format from query string
function parseOsmAndFormat(url: URL): PosicaoPayload | null {
  const id = url.searchParams.get('id');
  const lat = url.searchParams.get('lat');
  const lon = url.searchParams.get('lon') || url.searchParams.get('lng');
  const speed = url.searchParams.get('speed');
  const bearing = url.searchParams.get('bearing') || url.searchParams.get('hdop');
  const timestamp = url.searchParams.get('timestamp');
  
  if (!id || !lat || !lon) {
    return null;
  }
  
  return {
    veiculoId: id,
    lat: parseFloat(lat),
    lng: parseFloat(lon),
    velocidade: speed ? parseFloat(speed) * 3.6 : 0, // Convert m/s to km/h
    direcao: bearing ? parseFloat(bearing) : undefined,
    dataHora: timestamp ? new Date(parseInt(timestamp) * 1000).toISOString() : new Date().toISOString()
  };
}

async function findVeiculoId(supabase: any, deviceId: string): Promise<string | null> {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  // If it's a UUID, try direct lookup
  if (uuidRegex.test(deviceId)) {
    const { data: veiculo } = await supabase
      .from('veiculos')
      .select('id')
      .eq('id', deviceId)
      .eq('ativo', true)
      .single();
    
    if (veiculo) return veiculo.id;
  }
  
  // Try by traccar_device_id
  const { data: veiculoByDevice } = await supabase
    .from('veiculos')
    .select('id')
    .eq('traccar_device_id', deviceId)
    .eq('ativo', true)
    .single();
  
  if (veiculoByDevice) return veiculoByDevice.id;
  
  // Try by placa (uppercase)
  const { data: veiculoByPlaca } = await supabase
    .from('veiculos')
    .select('id')
    .eq('placa', deviceId.toUpperCase())
    .eq('ativo', true)
    .single();
  
  if (veiculoByPlaca) return veiculoByPlaca.id;
  
  return null;
}

async function savePosition(supabase: any, payload: PosicaoPayload) {
  // Validate coordinates range
  if (payload.lat < -90 || payload.lat > 90 || payload.lng < -180 || payload.lng > 180) {
    return { error: 'Invalid coordinates', status: 400 };
  }

  // Find vehicle by device ID, placa, or UUID
  const veiculoId = await findVeiculoId(supabase, payload.veiculoId);
  
  if (!veiculoId) {
    console.error('Vehicle not found for identifier:', payload.veiculoId);
    return { error: 'Vehicle not found', status: 404 };
  }

  // Insert position
  const { data: posicao, error: posicaoError } = await supabase
    .from('veiculo_posicoes')
    .insert({
      veiculo_id: veiculoId,
      lat: payload.lat,
      lng: payload.lng,
      velocidade: payload.velocidade || 0,
      direcao: payload.direcao,
      data_hora: payload.dataHora || new Date().toISOString()
    })
    .select()
    .single();

  if (posicaoError) {
    console.error('Error inserting position:', posicaoError);
    return { error: 'Failed to save position', status: 500 };
  }

  console.log('Position saved successfully:', posicao.id, 'for vehicle:', veiculoId);
  return { data: posicao, status: 200 };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const url = new URL(req.url);

    // Handle GET request (OsmAnd/Traccar format)
    if (req.method === 'GET') {
      const payload = parseOsmAndFormat(url);
      
      if (!payload) {
        console.log('Invalid OsmAnd format, params:', Object.fromEntries(url.searchParams));
        return new Response(
          JSON.stringify({ 
            status: 'error', 
            message: 'Missing required params: id, lat, lon' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      console.log('Received OsmAnd/Traccar position:', payload);
      
      const result = await savePosition(supabase, payload);
      
      if (result.error) {
        return new Response(
          JSON.stringify({ status: 'error', message: result.error }),
          { status: result.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          status: 'ok',
          posicaoId: result.data.id,
          timestamp: result.data.data_hora
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle POST request (JSON format)
    if (req.method === 'POST') {
      const rawPayload = await req.json();
      
      console.log('Received JSON position data:', rawPayload);

      let payload: PosicaoPayload;

      // Check if it's Traccar Client App format (background geolocation plugin)
      if (rawPayload.location && rawPayload.device_id) {
        const traccarPayload = rawPayload as TraccarClientPayload;
        const coords = traccarPayload.location?.coords;
        
        if (!coords?.latitude || !coords?.longitude) {
          return new Response(
            JSON.stringify({ 
              status: 'error', 
              message: 'Invalid Traccar Client format: missing coordinates' 
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        
        // Convert Traccar Client format to standard format
        // Speed from Traccar is in m/s, convert to km/h (if positive)
        const speedMs = coords.speed && coords.speed > 0 ? coords.speed : 0;
        const speedKmh = speedMs * 3.6;
        
        payload = {
          veiculoId: traccarPayload.device_id!,
          lat: coords.latitude,
          lng: coords.longitude,
          velocidade: speedKmh,
          direcao: coords.heading && coords.heading > 0 ? coords.heading : undefined,
          dataHora: traccarPayload.location?.timestamp || new Date().toISOString()
        };
        
        console.log('Converted Traccar Client payload:', payload);
      } else {
        // Standard format
        payload = rawPayload as PosicaoPayload;
      }

      // Validate required fields
      if (!payload.veiculoId || typeof payload.lat !== 'number' || typeof payload.lng !== 'number') {
        return new Response(
          JSON.stringify({ 
            status: 'error', 
            message: 'Missing required fields: veiculoId, lat, lng' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const result = await savePosition(supabase, payload);
      
      if (result.error) {
        return new Response(
          JSON.stringify({ status: 'error', message: result.error }),
          { status: result.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          status: 'ok',
          posicaoId: result.data.id,
          timestamp: result.data.data_hora
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ status: 'error', message: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error processing request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ status: 'error', message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});