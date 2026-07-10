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
          status: 'entregue',
          entregue_at: new Date().toISOString(),
        }).eq('id', id);
      } else {
        await supabase.from('sms_queue').update({
          status: 'nao_entregue',
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

    const erroNormalizado = String(erro || '').trim().toUpperCase();
    const falsoNegativoAndroid = erroNormalizado === 'GENERIC_FAILURE' || erroNormalizado === 'RESULT_ERROR_GENERIC_FAILURE';

    if (success || falsoNegativoAndroid) {
      await supabase.from('sms_queue').update({
        status: 'enviado',
        enviado_at: new Date().toISOString(),
        erro_mensagem: falsoNegativoAndroid ? 'Envio confirmado apesar do retorno GENERIC_FAILURE do Android' : null,
      }).eq('id', id);

      // Registra em sms_envios para histórico
      await supabase.from('sms_envios').insert({
        estabelecimento_id: device.estabelecimento_id,
        provider: 'pilar',
        destino: '',
        mensagem: '',
        status: 'sent',
        provider_message_id: id,
      }).select().maybeSingle().then(() => {}).catch(() => {});
    } else {
      const tentativas = item.tentativas || 0;
      const max = item.max_tentativas || 1;
      const novoStatus = tentativas >= max ? 'erro' : 'pendente';
      await supabase.from('sms_queue').update({
        status: novoStatus,
        erro_mensagem: erro || 'Falha desconhecida',
        claimed_at: null,
      }).eq('id', id);
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
