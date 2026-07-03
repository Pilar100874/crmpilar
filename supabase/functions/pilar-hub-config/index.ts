// Pilar Hub — o dispositivo (celular ou PC) chama esta função para baixar sua configuração
// Autenticação: header "X-Device-Token"
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
      .select('id, nome, ativo, tipo_dispositivo, versao_app, estabelecimento_id, modulo_sms_ativo, modulo_ponto_ativo, modulo_camera_ativo, ponto_config, camera_config')
      .eq('token', token)
      .maybeSingle();

    if (!device) {
      return new Response(JSON.stringify({ error: 'Dispositivo inválido' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!device.ativo) {
      return new Response(JSON.stringify({
        device: { id: device.id, nome: device.nome, ativo: false },
        modules: { sms: false, ponto: false, camera: false },
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Câmeras vinculadas (só faz sentido pro Pilar Cam Windows)
    let cameras: any[] = [];
    if (device.tipo_dispositivo === 'windows' && device.modulo_camera_ativo) {
      const { data } = await supabase
        .from('pilar_cam_cameras')
        .select('id, nome, rtsp_url, usuario, senha, ativo, ordem')
        .eq('device_id', device.id)
        .eq('ativo', true)
        .order('ordem', { ascending: true });
      cameras = data || [];
    }

    return new Response(JSON.stringify({
      device: {
        id: device.id,
        nome: device.nome,
        tipo: device.tipo_dispositivo,
        estabelecimento_id: device.estabelecimento_id,
        ativo: true,
      },
      modules: {
        sms: device.modulo_sms_ativo,
        ponto: device.modulo_ponto_ativo,
        camera: device.modulo_camera_ativo,
      },
      ponto_config: device.ponto_config || {},
      camera_config: device.camera_config || {},
      cameras,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
