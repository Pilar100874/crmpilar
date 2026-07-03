import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function normalizePhone(raw: string): string {
  // Digits only, keep leading +
  const trimmed = (raw || '').trim();
  const plus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  return plus ? `+${digits}` : digits;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { estabelecimento_id, destino, mensagem, test } = await req.json();
    if (!estabelecimento_id || !destino || !mensagem) {
      return new Response(JSON.stringify({ error: 'estabelecimento_id, destino e mensagem são obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: cfg, error: cfgErr } = await supabase
      .from('sms_config')
      .select('*')
      .eq('estabelecimento_id', estabelecimento_id)
      .maybeSingle();

    if (cfgErr) throw cfgErr;
    if (!cfg) return new Response(JSON.stringify({ error: 'SMS não configurado para este estabelecimento' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    if (!cfg.ativo) return new Response(JSON.stringify({ error: 'Envio de SMS desativado' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

    const to = normalizePhone(destino);
    let providerMessageId: string | null = null;
    let responseRaw: any = null;
    let status = 'sent';
    let erro: string | null = null;

    try {
      if (cfg.provider === 'twilio') {
        if (!cfg.twilio_account_sid || !cfg.twilio_auth_token || !cfg.twilio_from) {
          throw new Error('Credenciais do Twilio incompletas');
        }
        const body = new URLSearchParams({ To: to, From: cfg.twilio_from, Body: mensagem });
        const auth = btoa(`${cfg.twilio_account_sid}:${cfg.twilio_auth_token}`);
        const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${cfg.twilio_account_sid}/Messages.json`, {
          method: 'POST',
          headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
        });
        responseRaw = await r.json();
        if (!r.ok) throw new Error(responseRaw?.message || `Twilio HTTP ${r.status}`);
        providerMessageId = responseRaw?.sid ?? null;
      } else if (cfg.provider === 'gatewayapi') {
        if (!cfg.gatewayapi_token) throw new Error('Token da GatewayAPI ausente');
        const sender = cfg.sender || 'SMS';
        const recipientDigits = to.replace(/\D/g, '');
        const r = await fetch('https://gatewayapi.com/rest/mtsms', {
          method: 'POST',
          headers: {
            'Authorization': `Token ${cfg.gatewayapi_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sender,
            message: mensagem,
            recipients: [{ msisdn: Number(recipientDigits) }],
          }),
        });
        responseRaw = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(responseRaw?.message || `GatewayAPI HTTP ${r.status}`);
        providerMessageId = String(responseRaw?.ids?.[0] ?? '');
      } else if (cfg.provider === 'zenvia') {
        if (!cfg.zenvia_api_token || !cfg.zenvia_from) throw new Error('Credenciais Zenvia incompletas');
        const r = await fetch('https://api.zenvia.com/v2/channels/sms/messages', {
          method: 'POST',
          headers: {
            'X-API-TOKEN': cfg.zenvia_api_token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: cfg.zenvia_from,
            to: to.replace(/\D/g, ''),
            contents: [{ type: 'text', text: mensagem }],
          }),
        });
        responseRaw = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(responseRaw?.message || responseRaw?.title || `Zenvia HTTP ${r.status}`);
        providerMessageId = responseRaw?.id ?? null;
      } else {
        throw new Error(`Provedor desconhecido: ${cfg.provider}`);
      }
    } catch (e) {
      status = 'failed';
      erro = e instanceof Error ? e.message : String(e);
    }

    if (!test) {
      await supabase.from('sms_envios').insert({
        estabelecimento_id,
        provider: cfg.provider,
        destino: to,
        mensagem,
        status,
        provider_message_id: providerMessageId,
        erro,
        response_raw: responseRaw,
      });
    }

    return new Response(JSON.stringify({ success: status === 'sent', status, provider: cfg.provider, provider_message_id: providerMessageId, erro, response: responseRaw }), {
      status: status === 'sent' ? 200 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
