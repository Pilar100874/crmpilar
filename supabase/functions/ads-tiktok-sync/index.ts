import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { contaId, estabelecimentoId, dateRange } = await req.json();

    // Get account credentials
    const { data: conta, error: contaError } = await supabase
      .from('ad_accounts')
      .select('*')
      .eq('id', contaId)
      .single();

    if (contaError || !conta) {
      throw new Error('Conta não encontrada');
    }

    const credenciais = conta.credenciais_json as any;
    
    if (!credenciais?.access_token || !credenciais?.advertiser_id) {
      throw new Error('Credenciais incompletas. Configure Access Token e Advertiser ID.');
    }

    const accessToken = credenciais.access_token;
    const advertiserId = credenciais.advertiser_id;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (dateRange || 30));

    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    // TikTok Marketing API - Get reports
    const apiUrl = 'https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/';
    
    const requestBody = {
      advertiser_id: advertiserId,
      report_type: 'BASIC',
      dimensions: ['campaign_id', 'adgroup_id', 'ad_id', 'stat_time_day'],
      metrics: ['spend', 'impressions', 'clicks', 'conversion', 'total_complete_payment_rate', 'complete_payment'],
      data_level: 'AUCTION_AD',
      start_date: formatDate(startDate),
      end_date: formatDate(endDate),
      page_size: 1000,
    };

    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const apiData = await apiResponse.json();

    if (apiData.code !== 0) {
      await supabase.from('ads_logs_coleta').insert({
        estabelecimento_id: estabelecimentoId,
        plataforma_id: conta.plataforma_id,
        tipo: 'error',
        mensagem: `Erro na API TikTok Ads: ${apiData.message}`,
        detalhes: apiData,
      });
      throw new Error(apiData.message);
    }

    // Process and save insights
    const results = apiData.data?.list || [];
    let insertedCount = 0;

    for (const row of results) {
      const metrics = row.metrics || {};
      const dimensions = row.dimensions || {};

      const gastos = parseFloat(metrics.spend) || 0;
      const cliques = parseInt(metrics.clicks) || 0;
      const impressoes = parseInt(metrics.impressions) || 0;
      const conversoes = parseInt(metrics.conversion) || 0;
      const receita = parseFloat(metrics.complete_payment) || 0;

      const insight = {
        estabelecimento_id: estabelecimentoId,
        plataforma_id: conta.plataforma_id,
        conta_id: contaId,
        campanha: dimensions.campaign_id || 'N/A',
        conjunto: dimensions.adgroup_id || null,
        anuncio: dimensions.ad_id || null,
        data: dimensions.stat_time_day,
        gastos,
        cliques,
        impressoes,
        conversoes,
        receita,
        roas: gastos > 0 ? receita / gastos : 0,
        cpc: cliques > 0 ? gastos / cliques : 0,
        cpm: impressoes > 0 ? (gastos / impressoes) * 1000 : 0,
        ctr: impressoes > 0 ? cliques / impressoes : 0,
        dados_brutos_json: row,
      };

      const { error: insertError } = await supabase
        .from('ad_insights')
        .upsert(insight, { onConflict: 'id' });

      if (!insertError) insertedCount++;
    }

    // Update last sync time
    await supabase
      .from('ad_accounts')
      .update({ ultimo_sync: new Date().toISOString() })
      .eq('id', contaId);

    // Log success
    await supabase.from('ads_logs_coleta').insert({
      estabelecimento_id: estabelecimentoId,
      plataforma_id: conta.plataforma_id,
      tipo: 'success',
      mensagem: `Sincronização TikTok Ads concluída. ${insertedCount} registros processados.`,
    });

    return new Response(
      JSON.stringify({ success: true, count: insertedCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
