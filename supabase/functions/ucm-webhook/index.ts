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

    const webhookData = await req.json();
    console.log('UCM Webhook received:', webhookData);

    // TODO: Adapt these field names according to actual UCM webhook payload
    const {
      event_type,
      call_id,
      from_number,
      to_number,
      extension,
      status,
      estabelecimento_id, // This should be passed by UCM or mapped from extension
      recording_url,
    } = webhookData;

    if (!call_id) {
      throw new Error('Missing call_id in webhook payload');
    }

    // Try to find existing call
    const { data: existingCall } = await supabase
      .from('calls')
      .select('*')
      .eq('call_id', call_id)
      .maybeSingle();

    if (existingCall) {
      // Update existing call
      const updateData: any = {
        status: mapUcmStatus(status || event_type),
        metadata: {
          ...existingCall.metadata,
          last_event: event_type,
          webhook_data: webhookData,
        },
      };

      if (event_type === 'answered' || status === 'answered') {
        updateData.horario_atendimento = new Date().toISOString();
      }

      if (event_type === 'finished' || status === 'finished') {
        updateData.horario_fim = new Date().toISOString();
        if (existingCall.horario_atendimento) {
          const duracao = Math.floor(
            (new Date().getTime() - new Date(existingCall.horario_atendimento).getTime()) / 1000
          );
          updateData.duracao_segundos = duracao;
        }
      }

      if (recording_url) {
        updateData.recording_url = recording_url;
      }

      await supabase
        .from('calls')
        .update(updateData)
        .eq('id', existingCall.id);

      console.log('Call updated:', existingCall.id);
    } else {
      // Create new call (incoming call)
      if (!estabelecimento_id) {
        console.warn('No estabelecimento_id provided, cannot create call record');
        return new Response(
          JSON.stringify({ 
            success: true, 
            warning: 'No estabelecimento_id provided',
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }

      const { data: newCall, error: insertError } = await supabase
        .from('calls')
        .insert({
          estabelecimento_id,
          call_id,
          numero_origem: from_number,
          numero_destino: to_number,
          ramal: extension,
          status: mapUcmStatus(status || event_type),
          direcao: 'inbound',
          metadata: {
            event_type,
            webhook_data: webhookData,
          },
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating call:', insertError);
        throw insertError;
      }

      console.log('New call created:', newCall.id);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in ucm-webhook:', error);
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

function mapUcmStatus(ucmStatus: string): string {
  const statusMap: Record<string, string> = {
    'incoming_call': 'ringing',
    'ringing': 'ringing',
    'answered': 'answered',
    'connected': 'answered',
    'finished': 'finished',
    'hangup': 'finished',
    'busy': 'busy',
    'failed': 'failed',
    'recording_ready': 'finished',
  };

  return statusMap[ucmStatus?.toLowerCase()] || 'unknown';
}
