// APK confirma envio/erro de SMS
// Autenticação: header "X-Device-Token"
// Body: { id: uuid, success: boolean, erro?: string }
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-device-token',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const token = req.headers.get('x-device-token') || '';
    if (!token) {
      return new Response(JSON.stringify({ error: 'X-Device-Token ausente' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = await req.json();
    const {
      id,
      success,
      erro,
      delivered,
      status: statusIn,
      telefone,
      mensagem,
      tamanho,
      android_result_code,
      android_error_code,
      android_error_description,
      subscription_id,
      parts,
      attempts,
      timestamp,
    } = payload;
    if (!id || (typeof success !== 'boolean' && typeof delivered !== 'boolean')) {
      return new Response(JSON.stringify({ error: 'id + (success ou delivered) são obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: device } = await supabase
      .from('sms_devices')
      .select('id, estabelecimento_id')
      .eq('token', token)
      .eq('ativo', true)
      .maybeSingle();
    if (!device) {
      return new Response(JSON.stringify({ error: 'Dispositivo inválido' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ack de entrega (delivery report da operadora) — chega depois do ack de envio.
    if (typeof delivered === 'boolean') {
      if (delivered) {
        await supabase.from('sms_queue').update({
          entregue_at: new Date().toISOString(),
        }).eq('id', id);
      } else {
        await supabase.from('sms_queue').update({
          status: 'erro',
          erro_mensagem: erro || 'Operadora não confirmou entrega',
        }).eq('id', id);
      }
      return new Response(JSON.stringify({ ok: true, delivery: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Busca a mensagem atual para decidir se retorna à fila
    const { data: item } = await supabase
      .from('sms_queue')
      .select('id, tentativas, max_tentativas')
      .eq('id', id)
      .maybeSingle();
    if (!item) {
      return new Response(JSON.stringify({ error: 'Mensagem não encontrada' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const responseRaw = {
      android_result_code,
      android_error_code,
      android_error_description,
      subscription_id,
      parts,
      attempts,
      timestamp,
    };

    if (success) {
      await supabase.from('sms_queue').update({
        status: 'enviado',
        enviado_at: new Date().toISOString(),
        erro_mensagem: null,
      }).eq('id', id);

      // Registra em sms_envios para histórico
      await supabase.from('sms_envios').insert({
        estabelecimento_id: device.estabelecimento_id,
        provider: 'pilar',
        destino: telefone || '',
        mensagem: mensagem || '',
        status: 'sent',
        provider_message_id: id,
        response_raw: responseRaw,
      }).select().maybeSingle().then(() => {}).catch(() => {});
    } else {
      const tentativas = item.tentativas || 0;
      const max = item.max_tentativas || 1;
      const novoStatus = tentativas >= max ? 'erro' : 'pendente';
      await supabase.from('sms_queue').update({
        status: novoStatus,
        erro_mensagem: android_error_description
          ? `${android_error_code || 'ERRO'}: ${android_error_description}`
          : (erro || 'Falha desconhecida'),
        claimed_at: null,
      }).eq('id', id);

      await supabase.from('sms_envios').insert({
        estabelecimento_id: device.estabelecimento_id,
        provider: 'pilar',
        destino: telefone || '',
        mensagem: mensagem || '',
        status: 'failed',
        provider_message_id: id,
        erro: android_error_description
          ? `${android_error_code || 'ERRO'}: ${android_error_description}`
          : (erro || 'Falha desconhecida'),
        response_raw: responseRaw,
      }).select().maybeSingle().then(() => {}).catch(() => {});
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
