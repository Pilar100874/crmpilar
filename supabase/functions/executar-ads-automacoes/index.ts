// Executa as automações Ads de um estabelecimento:
// - opcionalmente aciona coleta de métricas antes
// - agrega métricas recentes de `ad_insights`
// - percorre cada `ads_automacoes.flow_data` avaliando triggers/conditions
// - executa ações reais na Meta / Google Ads / TikTok Ads (pause/resume/archive/budget/bid)
// - executa ações de notificação (webhook, e-mail, whatsapp, sms, push, aviso, msg interna)
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

    if (coletar_antes) {
      try { await supa.functions.invoke('coletar-metricas-ads', { body: { estabelecimento_id } }); }
      catch (e) { console.warn('[ads-exec] coleta falhou (continua):', e); }
    }

    const { data: insights } = await supa
      .from('ad_insights')
      .select('*')
      .eq('estabelecimento_id', estabelecimento_id)
      .gte('data', new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 10));

    const { data: platforms } = await supa.from('ad_platforms').select('id, nome');
    const platById = new Map((platforms || []).map((p: any) => [p.id, String(p.nome).toLowerCase()]));

    const metricsList = (insights || []).map((i: any) => ({
      roas: Number(i.roas || 0), spend: Number(i.gastos || 0), cpc: Number(i.cpc || 0),
      ctr: Number(i.ctr || 0), conversions: Number(i.conversoes || 0), impressions: Number(i.impressoes || 0),
      campaign_id: i.dados_brutos_json?.campaign_id || i.dados_brutos_json?.campaign?.id || i.dados_brutos_json?.id || null,
      campaign_name: i.campanha, conta_id: i.conta_id,
      platform: platById.get(i.plataforma_id) || '', platform_id: i.plataforma_id,
      hour: new Date().getUTCHours(), day_of_week: new Date().getUTCDay(),
    }));

    const { data: automacoes, error: autoErr } = await supa
      .from('ads_automacoes').select('*')
      .eq('estabelecimento_id', estabelecimento_id).eq('ativo', true);
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
  const op = cfg.operator || cfg.op || '>='; const val = Number(cfg.value ?? cfg.threshold ?? 0);
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
    // ===== Ações que exigem chamada real na plataforma (Meta / Google / TikTok) =====
    case 'action_pause':
    case 'action_resume':
    case 'action_activate':
    case 'action_archive':
    case 'action_budget_increase':
    case 'action_budget_decrease':
    case 'action_bid_adjust':
      return await executarAcaoPlataforma(supa, type, cfg, ctx);

    case 'action_duplicate':
    case 'action_schedule_change':
    case 'action_create_report':
    case 'action_bid_device':
      await supa.from('ads_logs_coleta').insert({
        estabelecimento_id: ctx.estab, plataforma_id: null, tipo: 'acao_pendente',
        mensagem: `Ação ${type} ainda não implementada nativamente`,
        detalhes: { cfg, metrics: ctx.metrics, automacao_id: ctx.automacao.id },
      });
      return { ok: true, pendente_integracao_externa: true };
    default:
      return { ok: false, motivo: `Tipo não implementado: ${type}` };
  }
}

// ============================================================
// Conectores de escrita (pause/resume/archive/budget/bid)
// ============================================================
async function executarAcaoPlataforma(supa: any, type: string, cfg: any, ctx: any) {
  const m = ctx.metrics || {};
  const contaId = cfg.conta_id || m.conta_id;
  const campaignId = cfg.campaign_id || m.campaign_id;
  if (!contaId) return { ok: false, erro: 'sem conta_id (defina cfg.conta_id ou colete métricas antes)' };
  if (!campaignId) return { ok: false, erro: 'sem campaign_id (defina cfg.campaign_id)' };

  const { data: conta, error } = await supa.from('ad_accounts').select('*').eq('id', contaId).single();
  if (error || !conta) return { ok: false, erro: `conta não encontrada: ${error?.message}` };
  const cred = (conta.credenciais_json || {}) as any;
  const platformName = String(m.platform || '').toLowerCase();
  const { data: plat } = platformName ? { data: null as any } : await supa.from('ad_platforms').select('nome').eq('id', conta.plataforma_id).single();
  const plataforma = platformName || String(plat?.nome || '').toLowerCase();

  const { data: apps } = await supa.from('ads_platform_apps').select('*').eq('estabelecimento_id', ctx.estab).maybeSingle();

  try {
    let result: any;
    if (plataforma.includes('meta') || plataforma.includes('facebook')) {
      result = await execMeta(type, cfg, cred, campaignId);
    } else if (plataforma.includes('google')) {
      result = await execGoogle(type, cfg, cred, campaignId, apps);
    } else if (plataforma.includes('tiktok')) {
      result = await execTiktok(type, cfg, cred, campaignId);
    } else {
      result = { ok: false, erro: `plataforma "${plataforma}" sem conector de escrita` };
    }
    await supa.from('ads_logs_coleta').insert({
      estabelecimento_id: ctx.estab, plataforma_id: conta.plataforma_id,
      tipo: result.ok ? 'acao_executada' : 'acao_erro',
      mensagem: `${type} @ ${plataforma} campanha=${campaignId}: ${result.ok ? 'ok' : result.erro}`,
      detalhes: { type, cfg, campaign_id: campaignId, conta_id: contaId, resultado: result },
    });
    return result;
  } catch (e: any) {
    await supa.from('ads_logs_coleta').insert({
      estabelecimento_id: ctx.estab, plataforma_id: conta.plataforma_id,
      tipo: 'acao_erro', mensagem: `${type} @ ${plataforma}: ${e?.message}`,
      detalhes: { type, cfg, campaign_id: campaignId, conta_id: contaId, stack: String(e) },
    });
    return { ok: false, erro: e?.message || String(e) };
  }
}

// -------- Meta Ads ----------
async function execMeta(type: string, cfg: any, cred: any, campaignId: string) {
  const token = cred?.access_token;
  if (!token) throw new Error('Meta: access_token ausente');
  const base = `https://graph.facebook.com/v19.0/${campaignId}`;
  let params: Record<string, string> = { access_token: token };
  if (type === 'action_pause') params.status = 'PAUSED';
  else if (type === 'action_resume' || type === 'action_activate') params.status = 'ACTIVE';
  else if (type === 'action_archive') params.status = 'ARCHIVED';
  else if (type === 'action_budget_increase' || type === 'action_budget_decrease') {
    // budget em CENTAVOS. Aceita cfg.new_budget ou cfg.adjust_percent.
    let novoOrcamento: number | null = cfg.new_budget ? Number(cfg.new_budget) * 100 : null;
    if (!novoOrcamento && cfg.adjust_percent) {
      const cur = await fetch(`${base}?fields=daily_budget&access_token=${token}`).then((r) => r.json());
      const atual = Number(cur.daily_budget || 0);
      const pct = Number(cfg.adjust_percent) / 100;
      novoOrcamento = Math.round(atual * (type === 'action_budget_increase' ? 1 + pct : 1 - pct));
    }
    if (!novoOrcamento) throw new Error('Meta budget: informe new_budget ou adjust_percent');
    params.daily_budget = String(novoOrcamento);
  } else if (type === 'action_bid_adjust') {
    if (!cfg.new_bid) throw new Error('Meta bid: informe new_bid');
    params.bid_amount = String(Math.round(Number(cfg.new_bid) * 100));
  }
  const r = await fetch(base, { method: 'POST', body: new URLSearchParams(params) });
  const body = await r.json();
  if (!r.ok || body.error) throw new Error(`Meta ${r.status}: ${JSON.stringify(body)}`);
  return { ok: true, response: body };
}

// -------- Google Ads ----------
async function execGoogle(type: string, cfg: any, cred: any, campaignId: string, apps?: any) {
  const developerToken = apps?.google_ads_developer_token || Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');
  if (!developerToken) throw new Error('Google Ads Developer Token não configurado (cadastre em Ads > Credenciais de Plataforma)');
  const accessToken = cred?.access_token;
  const customerId = String(cred?.customer_id || '').replace(/-/g, '');
  const loginCustomerId = cred?.login_customer_id ? String(cred.login_customer_id).replace(/-/g, '') : undefined;
  if (!accessToken || !customerId) throw new Error('Google Ads: access_token/customer_id ausentes');
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'developer-token': developerToken,
    'Content-Type': 'application/json',
  };
  if (loginCustomerId) headers['login-customer-id'] = loginCustomerId;
  const resourceName = `customers/${customerId}/campaigns/${campaignId}`;

  const op: any = { update: { resourceName }, updateMask: '' };
  const fields: string[] = [];
  if (type === 'action_pause') { op.update.status = 'PAUSED'; fields.push('status'); }
  else if (type === 'action_resume' || type === 'action_activate') { op.update.status = 'ENABLED'; fields.push('status'); }
  else if (type === 'action_archive') { op.update.status = 'REMOVED'; fields.push('status'); }
  else if (type === 'action_budget_increase' || type === 'action_budget_decrease') {
    // Google Ads: orçamento é recurso separado (campaign_budget). Precisamos update no budget resource.
    // Aqui atualizamos via CampaignBudget se cfg.budget_resource_name fornecido, senão usamos amount_micros direto.
    if (!cfg.new_budget && !cfg.budget_resource_name) throw new Error('Google budget: informe new_budget e opcionalmente budget_resource_name');
    const amountMicros = String(Math.round(Number(cfg.new_budget) * 1_000_000));
    const budgetRn = cfg.budget_resource_name; // ex: customers/123/campaignBudgets/456
    if (budgetRn) {
      const budgetOp = { update: { resourceName: budgetRn, amountMicros }, updateMask: 'amount_micros' };
      const r = await fetch(`https://googleads.googleapis.com/v18/customers/${customerId}/campaignBudgets:mutate`, {
        method: 'POST', headers, body: JSON.stringify({ operations: [budgetOp] }),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(`Google Ads budget ${r.status}: ${JSON.stringify(b)}`);
      return { ok: true, response: b };
    }
    throw new Error('Google budget: forneça cfg.budget_resource_name da campanha');
  } else if (type === 'action_bid_adjust') {
    if (!cfg.new_bid) throw new Error('Google bid: informe new_bid');
    op.update.targetCpaMicros = String(Math.round(Number(cfg.new_bid) * 1_000_000));
    fields.push('target_cpa_micros');
  }
  op.updateMask = fields.join(',');
  const r = await fetch(`https://googleads.googleapis.com/v18/customers/${customerId}/campaigns:mutate`, {
    method: 'POST', headers, body: JSON.stringify({ operations: [op] }),
  });
  const body = await r.json();
  if (!r.ok) throw new Error(`Google Ads ${r.status}: ${JSON.stringify(body)}`);
  return { ok: true, response: body };
}

// -------- TikTok Ads ----------
async function execTiktok(type: string, cfg: any, cred: any, campaignId: string) {
  const token = cred?.access_token;
  const advertiserId = cred?.advertiser_id;
  if (!token || !advertiserId) throw new Error('TikTok: access_token/advertiser_id ausentes');
  const headers: Record<string, string> = { 'Access-Token': token, 'Content-Type': 'application/json' };

  if (type === 'action_pause' || type === 'action_resume' || type === 'action_activate' || type === 'action_archive') {
    const opTypeMap: Record<string, string> = {
      action_pause: 'DISABLE', action_resume: 'ENABLE', action_activate: 'ENABLE', action_archive: 'DELETE',
    };
    const r = await fetch('https://business-api.tiktok.com/open_api/v1.3/campaign/status/update/', {
      method: 'POST', headers, body: JSON.stringify({ advertiser_id: advertiserId, campaign_ids: [campaignId], operation_status: opTypeMap[type] }),
    });
    const b = await r.json();
    if (!r.ok || b.code !== 0) throw new Error(`TikTok ${r.status}: ${JSON.stringify(b)}`);
    return { ok: true, response: b };
  }
  if (type === 'action_budget_increase' || type === 'action_budget_decrease') {
    if (!cfg.new_budget) throw new Error('TikTok budget: informe new_budget');
    const r = await fetch('https://business-api.tiktok.com/open_api/v1.3/campaign/update/', {
      method: 'POST', headers, body: JSON.stringify({ advertiser_id: advertiserId, campaign_id: campaignId, budget: Number(cfg.new_budget), budget_mode: cfg.budget_mode || 'BUDGET_MODE_DAY' }),
    });
    const b = await r.json();
    if (!r.ok || b.code !== 0) throw new Error(`TikTok budget ${r.status}: ${JSON.stringify(b)}`);
    return { ok: true, response: b };
  }
  if (type === 'action_bid_adjust') {
    if (!cfg.new_bid) throw new Error('TikTok bid: informe new_bid (ajuste no adgroup_id via cfg.adgroup_id)');
    if (!cfg.adgroup_id) throw new Error('TikTok bid: informe cfg.adgroup_id');
    const r = await fetch('https://business-api.tiktok.com/open_api/v1.3/adgroup/update/', {
      method: 'POST', headers, body: JSON.stringify({ advertiser_id: advertiserId, adgroup_id: cfg.adgroup_id, bid_price: Number(cfg.new_bid) }),
    });
    const b = await r.json();
    if (!r.ok || b.code !== 0) throw new Error(`TikTok bid ${r.status}: ${JSON.stringify(b)}`);
    return { ok: true, response: b };
  }
  throw new Error(`TikTok: tipo ${type} não suportado`);
}
