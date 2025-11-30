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
    
    if (!credenciais?.client_id || !credenciais?.client_secret || !credenciais?.refresh_token || !credenciais?.developer_token) {
      throw new Error('Credenciais incompletas. Configure Client ID, Client Secret, Developer Token e Refresh Token.');
    }

    // Get access token from refresh token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: credenciais.client_id,
        client_secret: credenciais.client_secret,
        refresh_token: credenciais.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      throw new Error('Erro ao obter access token: ' + JSON.stringify(tokenData));
    }

    const accessToken = tokenData.access_token;
    const customerId = credenciais.customer_id?.replace(/-/g, '');

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (dateRange || 30));

    const formatDate = (d: Date) => d.toISOString().split('T')[0].replace(/-/g, '');

    // Google Ads API Query (GAQL)
    const query = `
      SELECT
        campaign.name,
        ad_group.name,
        ad_group_ad.ad.name,
        segments.date,
        metrics.cost_micros,
        metrics.clicks,
        metrics.impressions,
        metrics.conversions,
        metrics.conversions_value
      FROM ad_group_ad
      WHERE segments.date BETWEEN '${startDate.toISOString().split('T')[0]}' AND '${endDate.toISOString().split('T')[0]}'
    `;

    const apiResponse = await fetch(
      `https://googleads.googleapis.com/v15/customers/${customerId}/googleAds:search`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': credenciais.developer_token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      }
    );

    const apiData = await apiResponse.json();

    if (apiData.error) {
      // Log error
      await supabase.from('ads_logs_coleta').insert({
        estabelecimento_id: estabelecimentoId,
        plataforma_id: conta.plataforma_id,
        tipo: 'error',
        mensagem: `Erro na API Google Ads: ${apiData.error.message}`,
        detalhes: apiData.error,
      });
      throw new Error(apiData.error.message);
    }

    // Process and save insights
    const results = apiData.results || [];
    let insertedCount = 0;

    for (const row of results) {
      const gastos = (row.metrics?.costMicros || 0) / 1000000;
      const cliques = row.metrics?.clicks || 0;
      const impressoes = row.metrics?.impressions || 0;
      const conversoes = row.metrics?.conversions || 0;
      const receita = row.metrics?.conversionsValue || 0;

      const insight = {
        estabelecimento_id: estabelecimentoId,
        plataforma_id: conta.plataforma_id,
        conta_id: contaId,
        campanha: row.campaign?.name || 'N/A',
        conjunto: row.adGroup?.name || null,
        anuncio: row.adGroupAd?.ad?.name || null,
        data: row.segments?.date,
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
      mensagem: `Sincronização Google Ads concluída. ${insertedCount} registros processados.`,
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
