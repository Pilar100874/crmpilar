// Pilar Hub — dispositivo envia batida de ponto (opcionalmente com foto base64)
// Grava em ponto_registros + faz upload da foto no bucket pilar-hub-snapshots
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-device-token',
};

function decodeBase64(b64: string): Uint8Array {
  const clean = b64.replace(/^data:image\/\w+;base64,/, '');
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
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

    if (!device.modulo_ponto_ativo) {
      return new Response(JSON.stringify({ error: 'Módulo Ponto desativado para este dispositivo' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const {
      pin,
      funcionario_id,
      tipo_batida = 'entrada',
      lat,
      lng,
      timestamp_local,
      foto_base64,
    } = body || {};

    if (!pin && !funcionario_id) {
      return new Response(JSON.stringify({ error: 'Informe pin ou funcionario_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Resolve funcionário pelo PIN (se veio) ou pelo ID
    let funcId = funcionario_id as string | null;
    if (!funcId && pin) {
      const { data: func } = await supabase
        .from('ponto_funcionarios')
        .select('id')
        .eq('pin', String(pin))
        .maybeSingle();
      funcId = func?.id || null;
      if (!funcId) {
        return new Response(JSON.stringify({ error: 'PIN não reconhecido' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Grava batida
    const { data: registro, error: regErr } = await supabase
      .from('ponto_registros')
      .insert({
        funcionario_id: funcId,
        tipo_batida,
        data_hora_batida: timestamp_local || new Date().toISOString(),
        latitude: typeof lat === 'number' ? lat : null,
        longitude: typeof lng === 'number' ? lng : null,
        metodo_coleta: 'pilar_hub',
        dispositivo_id: device.id,
        estabelecimento_id: device.estabelecimento_id,
      } as any)
      .select('id')
      .maybeSingle();

    if (regErr) {
      return new Response(JSON.stringify({ error: regErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let snapshotUrl: string | null = null;

    // Upload da foto (opcional)
    if (foto_base64 && registro?.id) {
      try {
        const bytes = decodeBase64(foto_base64);
        const path = `${device.estabelecimento_id}/ponto/${registro.id}.jpg`;
        const { error: upErr } = await supabase.storage
          .from('pilar-hub-snapshots')
          .upload(path, bytes, { contentType: 'image/jpeg', upsert: true });
        if (!upErr) {
          const { data: signed } = await supabase.storage
            .from('pilar-hub-snapshots')
            .createSignedUrl(path, 60 * 60 * 24 * 30); // 30 dias
          snapshotUrl = signed?.signedUrl || null;

          await supabase.from('pilar_hub_snapshots').insert({
            estabelecimento_id: device.estabelecimento_id,
            device_id: device.id,
            origem: 'ponto',
            referencia_id: registro.id,
            storage_path: path,
            url_publica: snapshotUrl,
            meta: { funcionario_id: funcId, tipo_batida, lat, lng },
          } as any);
        }
      } catch (e) {
        console.error('foto upload err', e);
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      registro_id: registro?.id,
      snapshot_url: snapshotUrl,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
