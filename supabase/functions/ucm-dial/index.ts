import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const { number, extension, estabelecimento_id } = await req.json();

    if (!number || !estabelecimento_id) {
      throw new Error('Missing required fields: number, estabelecimento_id');
    }

    // Get UCM config
    const { data: ucmConfig, error: configError } = await supabase
      .from('ucm_config')
      .select('*')
      .eq('estabelecimento_id', estabelecimento_id)
      .eq('enabled', true)
      .single();

    if (configError || !ucmConfig) {
      throw new Error('UCM not configured or disabled for this establishment');
    }

    console.log('Dialing number:', number, 'from extension:', extension);
    console.log('UCM Host:', ucmConfig.ucm_host);

    // TODO: Implement actual UCM API call here
    // Example endpoint: https://${ucmConfig.ucm_host}/api/v1/dial
    // You need to replace this with the actual UCM API endpoint from the UCM6XXX HTTPS API Guide
    
    const ucmApiUrl = `https://${ucmConfig.ucm_host}/api/v1/dial`;
    
    const ucmResponse = await fetch(ucmApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add UCM authentication headers here based on UCM API documentation
        'Authorization': `Basic ${btoa(`${ucmConfig.ucm_user}:${ucmConfig.ucm_password}`)}`,
      },
      body: JSON.stringify({
        destination: number,
        extension: extension || '1000', // Default extension if not provided
        // Add other UCM-specific parameters according to the API documentation
      }),
    });

    if (!ucmResponse.ok) {
      throw new Error(`UCM API error: ${ucmResponse.status} ${ucmResponse.statusText}`);
    }

    const ucmData = await ucmResponse.json();
    console.log('UCM Response:', ucmData);

    // Create call record
    const { data: call, error: callError } = await supabase
      .from('calls')
      .insert({
        estabelecimento_id,
        call_id: ucmData.call_id || `call_${Date.now()}`,
        numero_destino: number,
        ramal: extension,
        status: 'dialing',
        direcao: 'outbound',
        metadata: { ucm_response: ucmData },
      })
      .select()
      .single();

    if (callError) {
      console.error('Error creating call record:', callError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        call: call,
        message: 'Call initiated successfully',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in ucm-dial:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: 'Configure the UCM API endpoint in this function according to UCM6XXX HTTPS API Guide',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
