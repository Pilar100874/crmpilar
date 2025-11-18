import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { callId, estabelecimento_id } = await req.json();

    if (!callId || !estabelecimento_id) {
      throw new Error('Missing required fields: callId, estabelecimento_id');
    }

    // Get call info
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('*')
      .eq('id', callId)
      .eq('estabelecimento_id', estabelecimento_id)
      .single();

    if (callError || !call) {
      throw new Error('Call not found');
    }

    // Get UCM config
    const { data: ucmConfig, error: configError } = await supabase
      .from('ucm_config')
      .select('*')
      .eq('estabelecimento_id', estabelecimento_id)
      .eq('enabled', true)
      .single();

    if (configError || !ucmConfig) {
      throw new Error('UCM not configured or disabled');
    }

    console.log('Hanging up call:', call.call_id);

    // TODO: Implement actual UCM API call here
    // Example endpoint: https://${ucmConfig.ucm_host}/api/v1/hangup
    const ucmApiUrl = `https://${ucmConfig.ucm_host}/api/v1/hangup`;
    
    const ucmResponse = await fetch(ucmApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${ucmConfig.ucm_user}:${ucmConfig.ucm_password}`)}`,
      },
      body: JSON.stringify({
        call_id: call.call_id,
      }),
    });

    if (!ucmResponse.ok) {
      throw new Error(`UCM API error: ${ucmResponse.status}`);
    }

    // Update call record
    const now = new Date().toISOString();
    const duracao = call.horario_atendimento 
      ? Math.floor((new Date(now).getTime() - new Date(call.horario_atendimento).getTime()) / 1000)
      : 0;

    const { error: updateError } = await supabase
      .from('calls')
      .update({
        status: 'finished',
        horario_fim: now,
        duracao_segundos: duracao,
      })
      .eq('id', callId);

    if (updateError) {
      console.error('Error updating call:', updateError);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Call ended successfully' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in ucm-hangup:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
