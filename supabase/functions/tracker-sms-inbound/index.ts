// Recebe SMS de entrada capturados pelo app Pilar SMS e tenta correlacionar
// com um veículo (pelo telefone remetente). Autentica com X-Device-Token.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-device-token',
};

function digits(s: string): string {
  return (s || '').replace(/\D/g, '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const token = req.headers.get('x-device-token') || '';
    if (!token) {
      return new Response(JSON.stringify({ error: 'X-Device-Token ausente' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { from, message, at } = await req.json();
    if (!from || !message) {
      return new Response(JSON.stringify({ error: 'from e message são obrigatórios' }), {
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

    // Match por telefone_sms do veículo (match por sufixo de dígitos, mínimo 8)
    const fromDigits = digits(from);
    const suffix = fromDigits.slice(-10) || fromDigits;
    let veiculoId: string | null = null;
    let matchedProviderMsgId: string | null = null;
    let logAtualizado = false;

    if (device.estabelecimento_id && suffix.length >= 8) {
      const { data: veics } = await supabase
        .from('veiculos')
        .select('id, telefone_sms, tracker_config_log')
        .eq('estabelecimento_id', device.estabelecimento_id)
        .not('telefone_sms', 'is', null);

      const match = (veics || []).find((v: any) => {
        const d = digits(v.telefone_sms || '');
        return d && (d.endsWith(suffix) || suffix.endsWith(d.slice(-10)));
      });
      if (match) {
        veiculoId = match.id;
        // Anexa resposta no último item de log sem device_reply
        const log = Array.isArray(match.tracker_config_log) ? [...match.tracker_config_log] : [];
        const idx = [...log].reverse().findIndex((l: any) => l && l.ok && !l.device_reply);
        if (idx >= 0) {
          const realIdx = log.length - 1 - idx;
          log[realIdx] = {
            ...log[realIdx],
            device_reply: String(message),
            device_reply_at: new Date(at || Date.now()).toISOString(),
          };
          matchedProviderMsgId = log[realIdx].provider_message_id || null;
          await supabase
            .from('veiculos')
            .update({ tracker_config_log: log as any })
            .eq('id', match.id);
          logAtualizado = true;
        }
      }
    }

    await supabase.from('tracker_sms_replies').insert({
      estabelecimento_id: device.estabelecimento_id,
      veiculo_id: veiculoId,
      device_id: device.id,
      telefone_remetente: from,
      mensagem: message,
      recebido_em: at ? new Date(at).toISOString() : new Date().toISOString(),
      matched_log_provider_message_id: matchedProviderMsgId,
    });

    return new Response(JSON.stringify({ ok: true, matched_veiculo_id: veiculoId, log_updated: logAtualizado }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
