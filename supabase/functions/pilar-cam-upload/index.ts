// Pilar Cam / Hub — upload de snapshot ou clipe (câmera de evento)
// Body: { origem: 'camera'|'motion'|'evento', camera_id?, referencia_id?, foto_base64, meta? }
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-device-token',
};

function decodeB64(b64: string): Uint8Array {
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
    if (!token) return new Response(JSON.stringify({ error: 'X-Device-Token ausente' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: device } = await supabase.from('sms_devices').select('*').eq('token', token).eq('ativo', true).maybeSingle();
    if (!device) return new Response(JSON.stringify({ error: 'Dispositivo inválido' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const body = await req.json().catch(() => ({}));
    const { origem = 'camera', camera_id, referencia_id, foto_base64, meta } = body || {};
    if (!foto_base64) return new Response(JSON.stringify({ error: 'foto_base64 obrigatório' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const bytes = decodeB64(foto_base64);
    const path = `${device.estabelecimento_id}/${origem}/${Date.now()}_${crypto.randomUUID()}.jpg`;
    const { error: upErr } = await supabase.storage.from('pilar-hub-snapshots').upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
    if (upErr) throw upErr;

    const { data: signed } = await supabase.storage.from('pilar-hub-snapshots').createSignedUrl(path, 60 * 60 * 24 * 30);

    await supabase.from('pilar_hub_snapshots').insert({
      estabelecimento_id: device.estabelecimento_id,
      device_id: device.id,
      origem,
      referencia_id: referencia_id || null,
      storage_path: path,
      url_publica: signed?.signedUrl || null,
      meta: { ...(meta || {}), camera_id },
    } as any);

    return new Response(JSON.stringify({ ok: true, url: signed?.signedUrl, path }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
