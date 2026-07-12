// Executa as automações Ads de um estabelecimento:
// - opcionalmente aciona coleta de métricas antes
// - agrega métricas recentes de `ad_insights`
// - percorre cada `ads_automacoes.flow_data` avaliando triggers/conditions
// - executa ações (pause/resume, webhook, e-mail, whatsapp, sms, push, aviso, msg interna)
// - loga tudo em `ads_logs_coleta`

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

interface Body { estabelecimento_id: string; dry_run?: boolean; coletar_antes?: boolean }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { estabelecimento_id, dry_run = false, coletar_antes = true } = (await req.json()) as Body;
    if (!estabelecimento_id) return json({ error: 'estabelecimento_id obrigatório' }, 400);

    const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // 1) Coleta métricas frescas (best-effort)
    if (coletar_antes) {
      try {
        await supa.functions.invoke('coletar-metricas-ads', { body: { estabelecimento_id } });
      } catch (e) { console.warn('[ads-exec] coleta falhou (continua):', e); }
    }

    // 2) Métricas agregadas (últimos 1 dia por campanha)
    const { data: insights } = await supa
      .from('ad_insights')
      .select('*')
      .eq('estabelecimento_id', estabelecimento_id)
      .gte('data', new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 10));

    const metricsList = (insights || []).map((i: any) => ({
      roas: Number(i.roas || 0), spend: Number(i.gastos || 0), cpc: Number(i.cpc || 0),
      ctr: Number(i.ctr || 0), conversions: Number(i.conversoes || 0), impressions: Number(i.impressoes || 0),
      campaign_id: i.conta_id, campaign_name: i.campanha,
      platform: i.plataforma_id, hour: new Date().getUTCHours(), day_of_week: new Date().getUTCDay(),
    }));

    // 3) Automações ativas
    const { data: automacoes, error: autoErr } = await supa
      .from('ads_automacoes')
      .select('*')
      .eq('estabelecimento_id', estabelecimento_id)
      .eq('ativo', true);
    if (autoErr) return json({ error: autoErr.message }, 500);

    const execResultados: any[] = [];
    for (const a of automacoes || []) {
      for (const m of metricsList.length ? metricsList : [{} as any]) {
        const r = await executarAutomacao(supa, a, m, dry_run, estabelecimento_id);
        execResultados.push(r);
      }
    }

    await supa.from('ads_logs_coleta').insert({
      estabelecimento_id, plataforma_id: null, tipo: dry_run ? 'dry_run' : 'execucao',
      mensagem: `${execResultados.length} execução(ões) processadas`,
      detalhes: { total_acoes: execResultados.reduce((s, x) => s + (x.acoes?.length || 0), 0) } as any,
    });

    return json({ ok: true, executadas: execResultados.length, resultados: execResultados });
  } catch (e: any) {
    return json({ error: e?.message || String(e) }, 500);
  }
});

function json(b: any, s = 200) { return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }

const cmp = (v: number, op: string, t: number) => {
  switch (op) { case '>': return v > t; case '>=': return v >= t; case '<': return v < t; case '<=': return v <= t; case '==': case '=': return v === t; case '!=': return v !== t; default: return false; }
};
function evalTrigger(type: string, cfg: any, m: any): boolean {
  const op = cfg.operator || cfg.op || '>=';
  const val = Number(cfg.value ?? cfg.threshold ?? 0);
  switch (type) {
    case 'trigger_roas': return cmp(m.roas || 0, op, val);
    case 'trigger_spend': return cmp(m.spend || 0, op, val);
    case 'trigger_cpc': return cmp(m.cpc || 0, op, val);
    case 'trigger_ctr': return cmp(m.ctr || 0, op, val);
    case 'trigger_conversions': return cmp(m.conversions || 0, op, val);
    case 'trigger_impressions': return cmp(m.impressions || 0, op, val);
    case 'trigger_schedule': return true;
    default: return true;
  }
}
function evalCondition(type: string, cfg: any, m: any): boolean {
  switch (type) {
    case 'condition_platform': return !cfg.platform || cfg.platform === m.platform;
    case 'condition_campaign': return !cfg.campaign_id || cfg.campaign_id === m.campaign_id;
    case 'condition_time': { if (m.hour == null) return true; return m.hour >= Number(cfg.from ?? 0) && m.hour <= Number(cfg.to ?? 23); }
    case 'condition_metric': { const v = Number(m[cfg.metric] || 0); return cmp(v, cfg.operator || '>=', Number(cfg.value ?? 0)); }
    default: return true;
  }
}

async function executarAutomacao(supa: any, automacao: any, m: any, dryRun: boolean, estab: string) {
  const flow = automacao.flow_data || {};
  const nodes = flow.nodes || []; const edges = flow.edges || [];
  const byId = new Map<string, any>(nodes.map((n: any) => [n.id, n]));
  const outgoing = (id: string) => edges.filter((e: any) => e.source === id).map((e: any) => byId.get(e.target)).filter(Boolean);

  const visited = new Set<string>(); const stack: any[] = [];
  for (const n of nodes) {
    const t = n.data?.type as string;
    if (t?.startsWith('trigger_') && evalTrigger(t, n.data?.config || {}, m)) stack.push(n);
  }

  const acoes: any[] = [];
  while (stack.length) {
    const node = stack.pop(); if (!node || visited.has(node.id)) continue;
    visited.add(node.id);
    const type = node.data?.type as string; const cfg = node.data?.config || {};
    if (type?.startsWith('condition_')) { if (!evalCondition(type, cfg, m)) continue; }
    else if (type?.startsWith('action_') || type === 'disparar_push' || type === 'enviar_sms') {
      try {
        const r = dryRun ? { ok: true, dry_run: true } : await executarAcao(supa, type, cfg, { automacao, metrics: m, estab });
        acoes.push({ tipo: type, ok: !!r.ok, detalhes: r });
      } catch (e: any) { acoes.push({ tipo: type, ok: false, erro: e?.message || String(e) }); }
    }
    for (const nx of outgoing(node.id)) stack.push(nx);
  }
  return { automacao_id: automacao.id, automacao_nome: automacao.nome, acoes };
}

function interp(s: any, ctx: any) {
  return String(s ?? '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, p) => {
    const parts = p.split('.'); let v: any = ctx;
    for (const x of parts) v = v?.[x];
    return v == null ? '' : String(v);
  });
}

async function executarAcao(supa: any, type: string, cfg: any, ctx: any): Promise<any> {
  const vars = { metrics: ctx.metrics, automacao: { id: ctx.automacao.id, nome: ctx.automacao.nome } };
  switch (type) {
    case 'action_notify':
    case 'action_slack':
    case 'action_aviso_sistema': {
      const { error } = await supa.from('avisos_sistema').insert({
        estabelecimento_id: ctx.estab,
        titulo: interp(cfg.titulo || `[Ads] ${ctx.automacao.nome}`, vars),
        mensagem: interp(cfg.mensagem || cfg.message || '', vars),
        tipo: cfg.tipo || 'info',
        destinatarios_tipo: cfg.destinatarios_tipo || 'todos',
        ativo: true,
      });
      return { ok: !error, erro: error?.message };
    }
    case 'action_mensagem_interna': {
      const { data: conv, error: cErr } = await supa.from('chat_interno_conversas')
        .insert({ estabelecimento_id: ctx.estab, tipo: 'workflow', titulo: interp(cfg.titulo || 'Ads', vars) })
        .select('id').single();
      if (cErr) return { ok: false, erro: cErr.message };
      const { error: mErr } = await supa.from('chat_interno_mensagens').insert({
        conversa_id: conv.id, conteudo: interp(cfg.mensagem || '', vars), tipo: 'sistema',
        metadata: { workflow_tipo: 'ads', origem: 'ads_automacao' },
      });
      return { ok: !mErr, erro: mErr?.message };
    }
    case 'action_email': {
      const { data, error } = await supa.functions.invoke('send-email', {
        body: {
          to: interp(cfg.to ?? cfg.email_destino, vars),
          subject: interp(cfg.subject ?? cfg.assunto_email, vars),
          html: interp(cfg.body ?? cfg.corpo_email, vars),
          text: interp(cfg.body ?? cfg.corpo_email, vars),
        },
      });
      return { ok: !error, erro: error?.message, data };
    }
    case 'action_webhook': {
      const { data, error } = await supa.functions.invoke('execute-dynamic-query', {
        body: {
          url: interp(cfg.url, vars),
          method: (cfg.method || 'POST').toUpperCase(),
          headers: cfg.headers || { 'Content-Type': 'application/json' },
          body: interp(cfg.body || '', vars) || JSON.stringify(vars),
        },
      });
      return { ok: !error, erro: error?.message, data };
    }
    case 'enviar_sms': {
      const numbers: string[] = (Array.isArray(cfg.phoneNumbers) ? cfg.phoneNumbers : [cfg.phoneNumber || '']).filter(Boolean);
      const msg = interp(cfg.message || '', vars);
      const results: any[] = [];
      for (const destino of numbers) {
        const { data, error } = await supa.functions.invoke('send-sms', {
          body: { estabelecimento_id: ctx.estab, destino: String(destino).replace(/\D/g, ''), mensagem: msg },
        });
        results.push({ destino, ok: !error && (data as any)?.success, erro: error?.message || (data as any)?.erro });
      }
      return { ok: results.every((r) => r.ok), results };
    }
    case 'disparar_push': {
      const { data, error } = await supa.functions.invoke('send-push-notification', {
        body: { estabelecimento_id: ctx.estab, titulo: interp(cfg.titulo, vars), corpo: interp(cfg.corpo, vars), url: cfg.url, destinatario_tipo: cfg.destinatario_tipo, usuario_ids: cfg.usuario_ids, contato_ids: cfg.contato_ids },
      });
      return { ok: !error, erro: error?.message, data };
    }
    case 'action_pause':
    case 'action_resume':
    case 'action_activate':
    case 'action_archive':
    case 'action_budget_increase':
    case 'action_budget_decrease':
    case 'action_bid_adjust':
    case 'action_duplicate':
    case 'action_schedule_change':
    case 'action_create_report':
    case 'action_bid_device':
      // Integração com Meta/Google/TikTok ficará em iteração futura.
      // Loga a intenção pra visualizar em ads_logs_coleta.
      await supa.from('ads_logs_coleta').insert({
        estabelecimento_id: ctx.estab, plataforma_id: null,
        tipo: 'acao_pendente',
        mensagem: `Ação ${type} agendada (aguarda integração externa)`,
        detalhes: { cfg, metrics: ctx.metrics, automacao_id: ctx.automacao.id },
      });
      return { ok: true, pendente_integracao_externa: true };
    default:
      return { ok: false, motivo: `Tipo não implementado: ${type}` };
  }
}
