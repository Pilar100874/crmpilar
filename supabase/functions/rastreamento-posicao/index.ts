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

async function savePosition(supabase: any, payload: PosicaoPayload) {
  // Validate coordinates range
  if (payload.lat < -90 || payload.lat > 90 || payload.lng < -180 || payload.lng > 180) {
    return { error: 'Invalid coordinates', status: 400 };
  }

  // Try to find vehicle by ID (UUID) or by placa
  let veiculoId = payload.veiculoId;
  
  // Check if it's a UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(veiculoId)) {
    // Not a UUID, try to find by placa
    const { data: veiculoByPlaca, error: placaError } = await supabase
      .from('veiculos')
      .select('id, ativo')
      .eq('placa', veiculoId.toUpperCase())
      .eq('ativo', true)
      .single();
    
    if (placaError || !veiculoByPlaca) {
      console.error('Vehicle not found by placa:', veiculoId);
      return { error: 'Vehicle not found', status: 404 };
    }
    
    veiculoId = veiculoByPlaca.id;
  } else {
    // It's a UUID, verify it exists
    const { data: veiculo, error: veiculoError } = await supabase
      .from('veiculos')
      .select('id, ativo')
      .eq('id', veiculoId)
      .single();

    if (veiculoError || !veiculo) {
      console.error('Vehicle not found:', veiculoId);
      return { error: 'Vehicle not found', status: 404 };
    }
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

  console.log('Position saved successfully:', posicao.id);
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
      const payload: PosicaoPayload = await req.json();
      
      console.log('Received JSON position data:', payload);

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