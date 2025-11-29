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

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === 'POST') {
      const payload: PosicaoPayload = await req.json();
      
      console.log('Received position data:', payload);

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

      // Validate coordinates range
      if (payload.lat < -90 || payload.lat > 90 || payload.lng < -180 || payload.lng > 180) {
        return new Response(
          JSON.stringify({ 
            status: 'error', 
            message: 'Invalid coordinates' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Check if vehicle exists
      const { data: veiculo, error: veiculoError } = await supabase
        .from('veiculos')
        .select('id, ativo')
        .eq('id', payload.veiculoId)
        .single();

      if (veiculoError || !veiculo) {
        console.error('Vehicle not found:', payload.veiculoId);
        return new Response(
          JSON.stringify({ 
            status: 'error', 
            message: 'Vehicle not found' 
          }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Insert position
      const { data: posicao, error: posicaoError } = await supabase
        .from('veiculo_posicoes')
        .insert({
          veiculo_id: payload.veiculoId,
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
        return new Response(
          JSON.stringify({ 
            status: 'error', 
            message: 'Failed to save position' 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log('Position saved successfully:', posicao.id);

      return new Response(
        JSON.stringify({ 
          status: 'ok',
          posicaoId: posicao.id,
          timestamp: posicao.data_hora
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ status: 'error', message: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    console.error('Error processing request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ 
        status: 'error', 
        message: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});