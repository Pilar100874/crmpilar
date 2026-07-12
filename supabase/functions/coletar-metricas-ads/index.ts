// Coleta métricas reais das APIs Meta Ads, Google Ads e TikTok Ads,
// persiste em `ad_insights` e loga em `ads_logs_coleta`.
// Plataformas sem credencial configurada são puladas com log de aviso.

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

interface Body { estabelecimento_id: string }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { estabelecimento_id } = (await req.json()) as Body;
    if (!estabelecimento_id) {
      return json({ error: 'estabelecimento_id obrigatório' }, 400);
    }

    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Busca plataformas p/ resolver nomes
    const { data: platforms } = await supa.from('ad_platforms').select('id, nome');
    const platById = new Map((platforms || []).map((p: any) => [p.id, String(p.nome).toLowerCase()]));

    // Contas ativas do estabelecimento
    const { data: contas, error: contasErr } = await supa
      .from('ad_accounts')
      .select('id, estabelecimento_id, plataforma_id, nome_conta, credenciais_json, status')
      .eq('estabelecimento_id', estabelecimento_id)
      .neq('status', 'inativo');

    if (contasErr) return json({ error: contasErr.message }, 500);

    const resultados: any[] = [];
    for (const conta of contas || []) {
      const plataforma = platById.get(conta.plataforma_id) || '';
      let cred = (conta.credenciais_json || {}) as any;
      try {
        // Refresh token se vencido
        cred = await refreshIfNeeded(supa, conta, plataforma, cred);
        let insights: any[] = [];
        if (plataforma.includes('meta') || plataforma.includes('facebook')) {
          insights = await coletarMeta(cred);
        } else if (plataforma.includes('google')) {
          insights = await coletarGoogle(cred);
        } else if (plataforma.includes('tiktok')) {
          insights = await coletarTiktok(cred);
        } else {
          await logColeta(supa, estabelecimento_id, conta.plataforma_id, 'ignorada', `Plataforma "${plataforma}" sem coletor`, {});
          continue;
        }

        // Persiste
        const rows = insights.map((i) => ({
          estabelecimento_id,
          conta_id: conta.id,
          plataforma_id: conta.plataforma_id,
          campanha: i.campanha ?? null,
          conjunto: i.conjunto ?? null,
          anuncio: i.anuncio ?? null,
          data: i.data ?? new Date().toISOString().slice(0, 10),
          gastos: i.gastos ?? 0,
          cliques: i.cliques ?? 0,
          impressoes: i.impressoes ?? 0,
          conversoes: i.conversoes ?? 0,
          receita: i.receita ?? 0,
          roas: i.roas ?? null,
          cpc: i.cpc ?? null,
          cpm: i.cpm ?? null,
          ctr: i.ctr ?? null,
          dados_brutos_json: i.raw ?? null,
        }));
        if (rows.length) await supa.from('ad_insights').insert(rows);
        await logColeta(supa, estabelecimento_id, conta.plataforma_id, 'sucesso', `${rows.length} insight(s) coletados`, { conta_id: conta.id });
        resultados.push({ conta_id: conta.id, plataforma, ok: true, inserted: rows.length });
      } catch (e: any) {
        await logColeta(supa, estabelecimento_id, conta.plataforma_id, 'erro', String(e?.message || e), { conta_id: conta.id });
        resultados.push({ conta_id: conta.id, plataforma, ok: false, erro: String(e?.message || e) });
      }
    }
    return json({ ok: true, resultados });
  } catch (e: any) {
    return json({ error: e?.message || String(e) }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

async function logColeta(supa: any, estab: string, plat_id: string | null, tipo: string, mensagem: string, detalhes: any) {
  await supa.from('ads_logs_coleta').insert({
    estabelecimento_id: estab, plataforma_id: plat_id, tipo, mensagem, detalhes,
  });
}

// -------- Meta Ads --------
async function coletarMeta(cred: any): Promise<any[]> {
  const accessToken = cred?.access_token;
  const accountId = cred?.account_id || cred?.ad_account_id;
  if (!accessToken || !accountId) throw new Error('Meta: access_token/account_id ausentes em credenciais_json');
  const url = `https://graph.facebook.com/v19.0/act_${accountId}/insights` +
    `?level=campaign&date_preset=today` +
    `&fields=campaign_name,spend,clicks,impressions,cpc,cpm,ctr,actions,action_values` +
    `&access_token=${encodeURIComponent(accessToken)}`;
  const r = await fetch(url);
  const body = await r.json();
  if (!r.ok) throw new Error(`Meta ${r.status}: ${JSON.stringify(body)}`);
  const items = (body?.data || []) as any[];
  return items.map((it) => {
    const conv = (it.actions || []).find((a: any) => /purchase|complete_registration|lead/.test(a.action_type))?.value;
    const rev = (it.action_values || []).find((a: any) => /purchase/.test(a.action_type))?.value;
    const gastos = Number(it.spend || 0);
    const receita = Number(rev || 0);
    return {
      campanha: it.campaign_name,
      data: new Date().toISOString().slice(0, 10),
      gastos, cliques: Number(it.clicks || 0), impressoes: Number(it.impressions || 0),
      conversoes: Number(conv || 0), receita,
      cpc: it.cpc ? Number(it.cpc) : null,
      cpm: it.cpm ? Number(it.cpm) : null,
      ctr: it.ctr ? Number(it.ctr) : null,
      roas: gastos > 0 ? receita / gastos : null,
      raw: it,
    };
  });
}

// -------- Google Ads --------
async function coletarGoogle(cred: any): Promise<any[]> {
  const developerToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');
  const accessToken = cred?.access_token;
  const customerId = String(cred?.customer_id || '').replace(/-/g, '');
  const loginCustomerId = cred?.login_customer_id ? String(cred.login_customer_id).replace(/-/g, '') : undefined;
  if (!developerToken) throw new Error('Google Ads: GOOGLE_ADS_DEVELOPER_TOKEN não configurado');
  if (!accessToken || !customerId) throw new Error('Google Ads: access_token/customer_id ausentes em credenciais_json');

  const query = `SELECT campaign.name, metrics.cost_micros, metrics.clicks, metrics.impressions,
    metrics.conversions, metrics.conversions_value, metrics.average_cpc, metrics.average_cpm, metrics.ctr
    FROM campaign WHERE segments.date DURING TODAY`;
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'developer-token': developerToken,
    'Content-Type': 'application/json',
  };
  if (loginCustomerId) headers['login-customer-id'] = loginCustomerId;

  const r = await fetch(`https://googleads.googleapis.com/v18/customers/${customerId}/googleAds:search`, {
    method: 'POST', headers, body: JSON.stringify({ query }),
  });
  const body = await r.json();
  if (!r.ok) throw new Error(`Google Ads ${r.status}: ${JSON.stringify(body)}`);
  const items = (body?.results || []) as any[];
  return items.map((it) => {
    const gastos = Number(it.metrics?.costMicros || 0) / 1_000_000;
    const receita = Number(it.metrics?.conversionsValue || 0);
    return {
      campanha: it.campaign?.name,
      data: new Date().toISOString().slice(0, 10),
      gastos, cliques: Number(it.metrics?.clicks || 0), impressoes: Number(it.metrics?.impressions || 0),
      conversoes: Number(it.metrics?.conversions || 0), receita,
      cpc: it.metrics?.averageCpc ? Number(it.metrics.averageCpc) / 1_000_000 : null,
      cpm: it.metrics?.averageCpm ? Number(it.metrics.averageCpm) / 1_000_000 : null,
      ctr: it.metrics?.ctr ? Number(it.metrics.ctr) : null,
      roas: gastos > 0 ? receita / gastos : null,
      raw: it,
    };
  });
}

// -------- TikTok Ads --------
async function coletarTiktok(cred: any): Promise<any[]> {
  const accessToken = cred?.access_token;
  const advertiserId = cred?.advertiser_id;
  if (!accessToken || !advertiserId) throw new Error('TikTok: access_token/advertiser_id ausentes em credenciais_json');
  const today = new Date().toISOString().slice(0, 10);
  const url = `https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/` +
    `?advertiser_id=${advertiserId}` +
    `&report_type=BASIC&data_level=AUCTION_CAMPAIGN&dimensions=[%22campaign_id%22]` +
    `&metrics=[%22spend%22,%22clicks%22,%22impressions%22,%22conversion%22,%22conversion_value%22,%22cpc%22,%22cpm%22,%22ctr%22,%22campaign_name%22]` +
    `&start_date=${today}&end_date=${today}`;
  const r = await fetch(url, { headers: { 'Access-Token': accessToken } });
  const body = await r.json();
  if (!r.ok || body?.code !== 0) throw new Error(`TikTok ${r.status}: ${JSON.stringify(body)}`);
  const items = (body?.data?.list || []) as any[];
  return items.map((it) => {
    const m = it.metrics || {};
    const gastos = Number(m.spend || 0);
    const receita = Number(m.conversion_value || 0);
    return {
      campanha: m.campaign_name,
      data: today,
      gastos, cliques: Number(m.clicks || 0), impressoes: Number(m.impressions || 0),
      conversoes: Number(m.conversion || 0), receita,
      cpc: m.cpc ? Number(m.cpc) : null,
      cpm: m.cpm ? Number(m.cpm) : null,
      ctr: m.ctr ? Number(m.ctr) : null,
      roas: gastos > 0 ? receita / gastos : null,
      raw: it,
    };
  });
}
