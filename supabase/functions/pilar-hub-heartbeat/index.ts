// Pilar Hub — heartbeat do dispositivo: atualiza bateria/sinal/versão e devolve config atualizada
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
      .maybeSingle();

    if (!device) {
      return new Response(JSON.stringify({ error: 'Dispositivo inválido' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let body: any = {};
    try { body = await req.json(); } catch {}
    const bateria = typeof body?.bateria === 'number' ? body.bateria : null;
    const sinal = typeof body?.sinal === 'string' ? body.sinal : null;
    const versao = typeof body?.versao_app === 'string' ? body.versao_app : null;
    const tipo = typeof body?.tipo === 'string' ? body.tipo : null;
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;

    const update: Record<string, unknown> = {
      ultimo_ping: new Date().toISOString(),
      ultimo_heartbeat: new Date().toISOString(),
      ultimo_ip: ip,
    };
    if (bateria !== null) update.bateria = bateria;
    if (sinal !== null) update.sinal = sinal;
    if (versao) update.versao_app = versao;
    if (tipo && ['android', 'windows'].includes(tipo)) update.tipo_dispositivo = tipo;

    await supabase.from('sms_devices').update(update).eq('id', device.id);

    return new Response(JSON.stringify({
      ok: true,
      ativo: device.ativo,
      modules: {
        sms: device.modulo_sms_ativo,
        ponto: device.modulo_ponto_ativo,
        camera: device.modulo_camera_ativo,
      },
      ponto_config: device.ponto_config || {},
      camera_config: device.camera_config || {},
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
