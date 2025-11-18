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

    // Determinar protocolo baseado no IP (HTTP para IPs locais, HTTPS para outros)
    const isLocalIp = ucmConfig.ucm_host.startsWith('192.168.') || 
                      ucmConfig.ucm_host.startsWith('10.') || 
                      ucmConfig.ucm_host.startsWith('172.');
    const protocol = isLocalIp ? 'http' : 'https';
    
    // Usar o formato correto da API do UCM
    const ucmApiUrl = `${protocol}://${ucmConfig.ucm_host}/api?action=dial&number=${number}${extension ? `&extension=${extension}` : ''}`;
    
    console.log('Calling UCM API:', ucmApiUrl);
    
    const ucmResponse = await fetch(ucmApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${ucmConfig.ucm_user}:${ucmConfig.ucm_password}`)}`,
        'Content-Type': 'application/json',
      },
    });

    if (!ucmResponse.ok) {
      const errorText = await ucmResponse.text();
      console.error('UCM API error:', errorText);
      throw new Error(`UCM API error: ${ucmResponse.status} - ${errorText}`);
    }

    let ucmData;
    try {
      ucmData = await ucmResponse.json();
      console.log('UCM Response:', ucmData);
    } catch (e) {
      // Se não retornar JSON, considerar sucesso
      console.log('UCM call initiated (no JSON response)');
      ucmData = { success: true };
    }

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
