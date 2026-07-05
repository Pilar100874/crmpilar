// Envia Web Push Notifications via VAPID.
// Aceita: { subscription_ids?: string[], usuario_ids?: string[], contato_ids?: string[],
//           destinatario_tipo: 'usuario'|'contato'|'todos_usuarios'|'todos_contatos'|'endpoint',
//           titulo, corpo, url?, icone?, image?, tag?, workflow_id?, workflow_tipo?, origem? }

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:contato@pilar.com.br';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      subscription_ids, usuario_ids, contato_ids, destinatario_tipo,
      titulo, corpo, url, icone, image, tag,
      workflow_id, workflow_tipo, origem,
    } = body || {};

    if (!titulo) {
      return new Response(JSON.stringify({ error: 'titulo é obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Resolve dispositivos
    let query = supabase.from('push_subscriptions').select('*').eq('ativo', true);
    if (subscription_ids?.length) query = query.in('id', subscription_ids);
    else if (destinatario_tipo === 'todos_usuarios') query = query.not('usuario_id', 'is', null);
    else if (destinatario_tipo === 'todos_contatos') query = query.not('contato_id', 'is', null);
    else if (usuario_ids?.length) query = query.in('usuario_id', usuario_ids);
    else if (contato_ids?.length) query = query.in('contato_id', contato_ids);

    const { data: subs, error: subErr } = await query;
    if (subErr) throw subErr;

    const payload = JSON.stringify({
      title: titulo, body: corpo || '', url: url || '/',
      icon: icone, image, tag: tag || 'pilar-' + Date.now(),
    });

    let enviados = 0;
    let falhou = 0;
    const detalhes: any[] = [];

    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } } as any,
          payload,
        );
        enviados++;
        await supabase.from('push_subscriptions')
          .update({ ultimo_uso: new Date().toISOString() }).eq('id', s.id);
      } catch (err: any) {
        falhou++;
        const status = err?.statusCode;
        if (status === 404 || status === 410) {
          await supabase.from('push_subscriptions').update({ ativo: false }).eq('id', s.id);
        }
        detalhes.push({ id: s.id, status, msg: String(err?.body || err?.message || err) });
      }
    }

    const { data: logRow } = await supabase.from('push_notifications_log').insert({
      destinatario_tipo: destinatario_tipo || 'manual',
      titulo, corpo, url, icone,
      origem: origem || 'api',
      workflow_id, workflow_tipo,
      status: falhou === 0 ? 'ok' : (enviados > 0 ? 'parcial' : 'falhou'),
      total_enviado: enviados,
      total_falhou: falhou,
      payload: { subs_count: subs?.length ?? 0, detalhes: detalhes.slice(0, 20) },
    }).select().single();

    return new Response(JSON.stringify({
      ok: true, enviados, falhou, total: subs?.length ?? 0, log_id: logRow?.id,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('[push-send] erro', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
