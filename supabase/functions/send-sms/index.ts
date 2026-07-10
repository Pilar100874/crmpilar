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
    const { estabelecimento_id, destino, mensagem, test, max_tentativas } = await req.json();
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
      } else if (cfg.provider === 'smsgate') {
        // sms-gate.app (Android open-source) — HTTP Basic Auth
        if (!cfg.smsgate_username || !cfg.smsgate_password) throw new Error('Credenciais SMS Gateway (Android) incompletas');
        const base = (cfg.smsgate_base_url || 'https://api.sms-gate.app/3rd/v1').replace(/\/+$/, '');
        const auth = btoa(`${cfg.smsgate_username}:${cfg.smsgate_password}`);
        const r = await fetch(`${base}/message`, {
          method: 'POST',
          headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: mensagem, phoneNumbers: [to] }),
        });
        responseRaw = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(responseRaw?.message || `SMS Gateway HTTP ${r.status}`);
        providerMessageId = responseRaw?.id ?? null;
      } else if (cfg.provider === 'smsgatewayme') {
        // smsgateway.me — REST API v4
        if (!cfg.smsgatewayme_email || !cfg.smsgatewayme_password || !cfg.smsgatewayme_device_id) {
          throw new Error('Credenciais SMSGateway.me incompletas');
        }
        // Login p/ obter token
        const loginR = await fetch('https://smsgateway.me/api/v4/user/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cfg.smsgatewayme_email, password: cfg.smsgatewayme_password }),
        });
        const loginJson = await loginR.json().catch(() => ({}));
        if (!loginR.ok || !loginJson?.token) throw new Error(loginJson?.message || `SMSGateway.me login HTTP ${loginR.status}`);
        const token = loginJson.token;
        const r = await fetch('https://smsgateway.me/api/v4/message/send', {
          method: 'POST',
          headers: { 'Authorization': token, 'Content-Type': 'application/json' },
          body: JSON.stringify([{ phone_number: to, message: mensagem, device_id: Number(cfg.smsgatewayme_device_id) || cfg.smsgatewayme_device_id }]),
        });
        responseRaw = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(responseRaw?.message || `SMSGateway.me HTTP ${r.status}`);
        providerMessageId = String(responseRaw?.[0]?.id ?? '');
      } else if (cfg.provider === 'pilar') {
        // Pilar SMS — modo FILA (sem Cloudflare/IP público)
        // O CRM apenas enfileira o SMS. O APK faz polling e envia via SMS nativo do celular.
        const { data: enq, error: enqErr } = await supabase
          .from('sms_queue')
          .insert({
            estabelecimento_id,
            telefone: to,
            mensagem,
            status: 'pendente',
            max_tentativas: Math.min(Math.max(Number(max_tentativas) || 3, 1), 3),
          })
          .select('id')
          .single();
        if (enqErr) throw new Error(`Falha ao enfileirar SMS: ${enqErr.message}`);
        providerMessageId = enq?.id ?? null;
        responseRaw = { queued: true, id: providerMessageId };

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
