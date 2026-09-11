// Envia Web Push Notifications via VAPID.
// Aceita: { subscription_ids?: string[], usuario_ids?: string[], contato_ids?: string[],
//           destinatario_tipo: 'usuario'|'contato'|'todos_usuarios'|'todos_contatos'|'endpoint',
//           titulo, corpo, url?, icone?, image?, tag?, workflow_id?, workflow_tipo?, origem? }

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
import { getAuthContext, unauthorized, forbidden } from '../_shared/auth.ts';

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
      workflow_id, workflow_tipo, origem, estabelecimento_id, idempotency_key,
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

    const auth = await getAuthContext(req);
    if (!auth) return unauthorized(corsHeaders);

    const targetType = String(destinatario_tipo || '');
    const explicitIds = (Array.isArray(subscription_ids) && subscription_ids.length > 0)
      || (Array.isArray(usuario_ids) && usuario_ids.length > 0)
      || (Array.isArray(contato_ids) && contato_ids.length > 0);
    const broadcast = targetType === 'todos_usuarios' || targetType === 'todos_contatos';
    if (!explicitIds && !broadcast) {
      return new Response(JSON.stringify({ error: 'Destinatário explícito é obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (broadcast && !auth.isServiceRole && !auth.isSystemAdmin && !auth.isAdmin && !auth.isManager) {
      return forbidden(corsHeaders, 'Seu papel não permite envio coletivo');
    }

    const tenantId = auth.isServiceRole ? String(estabelecimento_id || '') : auth.estabelecimentoId;
    if (!tenantId && !auth.isSystemAdmin) return forbidden(corsHeaders, 'Estabelecimento não identificado');
    if (idempotency_key) {
      const { data: previous } = await supabase
        .from('push_notifications_log')
        .select('id, total_enviado, total_falhou, status')
        .eq('idempotency_key', String(idempotency_key))
        .eq('estabelecimento_id', tenantId)
        .maybeSingle();
      if (previous) {
        return new Response(JSON.stringify({ ok: true, duplicado: true, enviados: previous.total_enviado, falhou: previous.total_falhou, log_id: previous.id }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const allowedUsuarioIds = new Set<string>();
    const allowedContatoIds = new Set<string>();
    if (tenantId) {
      const [{ data: tenantUsers }, { data: tenantContacts }] = await Promise.all([
        supabase.from('usuarios').select('id').eq('estabelecimento_id', tenantId),
        supabase.from('customers').select('id').eq('estabelecimento_id', tenantId),
      ]);
      for (const item of tenantUsers ?? []) allowedUsuarioIds.add(item.id);
      for (const item of tenantContacts ?? []) allowedContatoIds.add(item.id);
    }
    const requestedUsers = (usuario_ids ?? []).map(String);
    const requestedContacts = (contato_ids ?? []).map(String);
    if (!auth.isSystemAdmin && (
      requestedUsers.some((id: string) => !allowedUsuarioIds.has(id))
      || requestedContacts.some((id: string) => !allowedContatoIds.has(id))
    )) return forbidden(corsHeaders, 'Destinatário não pertence ao seu estabelecimento');

    // Resolve dispositivos
    let query = supabase.from('push_subscriptions').select('*').eq('ativo', true).limit(500);
    if (subscription_ids?.length) query = query.in('id', subscription_ids);
    else if (destinatario_tipo === 'todos_usuarios') query = query.in('usuario_id', [...allowedUsuarioIds]);
    else if (destinatario_tipo === 'todos_contatos') query = query.in('contato_id', [...allowedContatoIds]);
    else if (usuario_ids?.length) query = query.in('usuario_id', requestedUsers);
    else if (contato_ids?.length) query = query.in('contato_id', requestedContacts);

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
      estabelecimento_id: tenantId || null,
      requested_by: auth.isServiceRole ? null : auth.userId,
      idempotency_key: idempotency_key ? String(idempotency_key) : null,
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
