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
    
    if (!credenciais?.access_token || !credenciais?.user_id) {
      throw new Error('Credenciais incompletas. Configure Access Token e User ID.');
    }

    let accessToken = credenciais.access_token;
    const userId = credenciais.user_id;

    // Refresh token if needed
    if (credenciais.refresh_token && credenciais.client_id && credenciais.client_secret) {
      const tokenResponse = await fetch('https://api.mercadolibre.com/oauth/token', {
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
      if (tokenData.access_token) {
        accessToken = tokenData.access_token;
        // Update stored credentials
        await supabase
          .from('ad_accounts')
          .update({
            credenciais_json: {
              ...credenciais,
              access_token: tokenData.access_token,
              refresh_token: tokenData.refresh_token || credenciais.refresh_token,
            },
          })
          .eq('id', contaId);
      }
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (dateRange || 30));

    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    // Mercado Ads API - Get campaigns performance
    const campaignsUrl = `https://api.mercadolibre.com/advertising/advertisers/${userId}/campaigns?status=active`;
    
    const campaignsResponse = await fetch(campaignsUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    const campaignsData = await campaignsResponse.json();

    if (campaignsData.error) {
      await supabase.from('ads_logs_coleta').insert({
        estabelecimento_id: estabelecimentoId,
        plataforma_id: conta.plataforma_id,
        tipo: 'error',
        mensagem: `Erro na API Mercado Ads: ${campaignsData.message || campaignsData.error}`,
        detalhes: campaignsData,
      });
      throw new Error(campaignsData.message || campaignsData.error);
    }

    let insertedCount = 0;

    // Get metrics for each campaign
    for (const campaign of (campaignsData.results || [])) {
      const metricsUrl = `https://api.mercadolibre.com/advertising/advertisers/${userId}/campaigns/${campaign.id}/metrics?date_from=${formatDate(startDate)}&date_to=${formatDate(endDate)}`;
      
      const metricsResponse = await fetch(metricsUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      const metricsData = await metricsResponse.json();

      if (metricsData.results) {
        for (const day of metricsData.results) {
          const gastos = parseFloat(day.cost) || 0;
          const cliques = parseInt(day.clicks) || 0;
          const impressoes = parseInt(day.prints) || 0;
          const conversoes = parseInt(day.units_sold) || 0;
          const receita = parseFloat(day.amount_sold) || 0;

          const insight = {
            estabelecimento_id: estabelecimentoId,
            plataforma_id: conta.plataforma_id,
            conta_id: contaId,
            campanha: campaign.name || campaign.id,
            conjunto: null,
            anuncio: null,
            data: day.date,
            gastos,
            cliques,
            impressoes,
            conversoes,
            receita,
            roas: gastos > 0 ? receita / gastos : 0,
            cpc: cliques > 0 ? gastos / cliques : 0,
            cpm: impressoes > 0 ? (gastos / impressoes) * 1000 : 0,
            ctr: impressoes > 0 ? cliques / impressoes : 0,
            dados_brutos_json: { campaign, metrics: day },
          };

          const { error: insertError } = await supabase
            .from('ad_insights')
            .upsert(insight, { onConflict: 'id' });

          if (!insertError) insertedCount++;

          // Save attributed sales
          if (conversoes > 0) {
            await supabase.from('vendas_atribuidas').insert({
              estabelecimento_id: estabelecimentoId,
              plataforma_id: conta.plataforma_id,
              campanha: campaign.name || campaign.id,
              anuncio: null,
              valor_venda: receita,
              data_venda: day.date,
              origem: 'mercadolivre_ads',
            });
          }
        }
      }
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
      mensagem: `Sincronização Mercado Livre Ads concluída. ${insertedCount} registros processados.`,
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
