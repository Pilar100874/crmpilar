// APK faz polling desta função para pegar SMS pendentes
// Autenticação: header "X-Device-Token" com o token do dispositivo
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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: device } = await supabase
      .from('sms_devices')
      .select('*')
      .eq('token', token)
      .eq('ativo', true)
      .maybeSingle();

    if (!device) {
      return new Response(JSON.stringify({ error: 'Dispositivo inválido ou inativo' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let body: any = {};
    try { body = await req.json(); } catch {}
    const bateria = typeof body?.bateria === 'number' ? body.bateria : null;
    const sinal = typeof body?.sinal === 'string' ? body.sinal : null;
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
    const limit = Math.min(Math.max(Number(body?.limit) || 5, 1), 20);

    await supabase.from('sms_devices').update({
      ultimo_ping: new Date().toISOString(),
      ultimo_ip: ip,
      bateria,
      sinal,
    }).eq('id', device.id);

    // Busca pendentes do mesmo estabelecimento
    const query = supabase
      .from('sms_queue')
      .select('id, telefone, mensagem, tentativas, max_tentativas')
      .eq('status', 'pendente')
      .order('created_at', { ascending: true })
      .limit(limit);

    // filtra por estabelecimento (aceita null para não-multitenant)
    if (device.estabelecimento_id) {
      query.or(`estabelecimento_id.eq.${device.estabelecimento_id},estabelecimento_id.is.null`);
    }

    const { data: pendentes } = await query;

    const claimed: any[] = [];
    for (const p of pendentes || []) {
      if ((p.tentativas || 0) >= (p.max_tentativas || 1)) continue;
      // Claim atômico: só marca se ainda estiver pendente
      const { data: upd } = await supabase
        .from('sms_queue')
        .update({
          status: 'enviando',
          device_id: device.id,
          claimed_at: new Date().toISOString(),
          tentativas: (p.tentativas || 0) + 1,
        })
        .eq('id', p.id)
        .eq('status', 'pendente')
        .lt('tentativas', p.max_tentativas || 1)
        .select('id')
        .maybeSingle();
      if (upd) claimed.push(p);
    }

    return new Response(JSON.stringify({
      device: { id: device.id, nome: device.nome },
      messages: claimed.map((p) => ({
        id: p.id,
        telefone: p.telefone,
        mensagem: p.mensagem,
      })),
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
