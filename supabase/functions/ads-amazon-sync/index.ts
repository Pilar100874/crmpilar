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
    
    if (!credenciais?.client_id || !credenciais?.client_secret || !credenciais?.refresh_token || !credenciais?.profile_id) {
      throw new Error('Credenciais incompletas. Configure Client ID, Client Secret, Refresh Token e Profile ID.');
    }

    // Get access token from refresh token
    const tokenResponse = await fetch('https://api.amazon.com/auth/o2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: credenciais.client_id,
        client_secret: credenciais.client_secret,
        refresh_token: credenciais.refresh_token,
      }),
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      throw new Error('Erro ao obter access token: ' + JSON.stringify(tokenData));
    }

    const accessToken = tokenData.access_token;
    const profileId = credenciais.profile_id;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (dateRange || 30));

    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    // Amazon Advertising API - Request report
    const reportRequest = {
      reportDate: formatDate(endDate),
      metrics: 'campaignName,impressions,clicks,cost,attributedSales14d,attributedConversions14d',
    };

    // Create report
    const createReportResponse = await fetch(
      `https://advertising-api.amazon.com/v2/sp/campaigns/report`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Amazon-Advertising-API-ClientId': credenciais.client_id,
          'Amazon-Advertising-API-Scope': profileId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportRequest),
      }
    );

    const reportData = await createReportResponse.json();

    if (reportData.code && reportData.code !== 'SUCCESS') {
      await supabase.from('ads_logs_coleta').insert({
        estabelecimento_id: estabelecimentoId,
        plataforma_id: conta.plataforma_id,
        tipo: 'error',
        mensagem: `Erro na API Amazon Ads: ${reportData.details || reportData.code}`,
        detalhes: reportData,
      });
      throw new Error(reportData.details || reportData.code);
    }

    // For simplicity, we'll process direct campaign data
    // In production, you'd poll for report completion and download
    const campaignsResponse = await fetch(
      `https://advertising-api.amazon.com/v2/sp/campaigns`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Amazon-Advertising-API-ClientId': credenciais.client_id,
          'Amazon-Advertising-API-Scope': profileId,
        },
      }
    );

    const campaigns = await campaignsResponse.json();
    let insertedCount = 0;

    // Process campaigns (simplified - in production use reports)
    for (const campaign of (campaigns || [])) {
      // Get campaign performance
      const perfResponse = await fetch(
        `https://advertising-api.amazon.com/v2/sp/campaigns/${campaign.campaignId}/report?startDate=${formatDate(startDate)}&endDate=${formatDate(endDate)}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Amazon-Advertising-API-ClientId': credenciais.client_id,
            'Amazon-Advertising-API-Scope': profileId,
          },
        }
      );

      const perfData = await perfResponse.json();

      const gastos = parseFloat(perfData.cost) || 0;
      const cliques = parseInt(perfData.clicks) || 0;
      const impressoes = parseInt(perfData.impressions) || 0;
      const conversoes = parseInt(perfData.attributedConversions14d) || 0;
      const receita = parseFloat(perfData.attributedSales14d) || 0;

      const insight = {
        estabelecimento_id: estabelecimentoId,
        plataforma_id: conta.plataforma_id,
        conta_id: contaId,
        campanha: campaign.name || campaign.campaignId,
        conjunto: null,
        anuncio: null,
        data: formatDate(endDate),
        gastos,
        cliques,
        impressoes,
        conversoes,
        receita,
        roas: gastos > 0 ? receita / gastos : 0,
        cpc: cliques > 0 ? gastos / cliques : 0,
        cpm: impressoes > 0 ? (gastos / impressoes) * 1000 : 0,
        ctr: impressoes > 0 ? cliques / impressoes : 0,
        dados_brutos_json: { campaign, performance: perfData },
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
      mensagem: `Sincronização Amazon Ads concluída. ${insertedCount} registros processados.`,
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
