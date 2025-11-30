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
    
    if (!credenciais?.access_token || !credenciais?.ad_account_id) {
      throw new Error('Credenciais incompletas. Configure Access Token e Ad Account ID.');
    }

    const accessToken = credenciais.access_token;
    const adAccountId = credenciais.ad_account_id;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (dateRange || 30));

    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    // Meta Marketing API - Get insights
    const fields = 'campaign_name,adset_name,ad_name,spend,clicks,impressions,actions,conversions,cpc,cpm,ctr';
    const timeRange = JSON.stringify({
      since: formatDate(startDate),
      until: formatDate(endDate),
    });

    const apiUrl = `https://graph.facebook.com/v18.0/${adAccountId}/insights?fields=${fields}&time_range=${encodeURIComponent(timeRange)}&level=ad&time_increment=1&access_token=${accessToken}`;

    const apiResponse = await fetch(apiUrl);
    const apiData = await apiResponse.json();

    if (apiData.error) {
      await supabase.from('ads_logs_coleta').insert({
        estabelecimento_id: estabelecimentoId,
        plataforma_id: conta.plataforma_id,
        tipo: 'error',
        mensagem: `Erro na API Meta Ads: ${apiData.error.message}`,
        detalhes: apiData.error,
      });
      throw new Error(apiData.error.message);
    }

    // Process and save insights
    const results = apiData.data || [];
    let insertedCount = 0;

    for (const row of results) {
      const gastos = parseFloat(row.spend) || 0;
      const cliques = parseInt(row.clicks) || 0;
      const impressoes = parseInt(row.impressions) || 0;
      
      // Extract conversions from actions array
      let conversoes = 0;
      let receita = 0;
      if (row.actions) {
        const purchaseAction = row.actions.find((a: any) => a.action_type === 'purchase');
        if (purchaseAction) {
          conversoes = parseInt(purchaseAction.value) || 0;
        }
      }

      const insight = {
        estabelecimento_id: estabelecimentoId,
        plataforma_id: conta.plataforma_id,
        conta_id: contaId,
        campanha: row.campaign_name || 'N/A',
        conjunto: row.adset_name || null,
        anuncio: row.ad_name || null,
        data: row.date_start,
        gastos,
        cliques,
        impressoes,
        conversoes,
        receita,
        roas: gastos > 0 ? receita / gastos : 0,
        cpc: parseFloat(row.cpc) || (cliques > 0 ? gastos / cliques : 0),
        cpm: parseFloat(row.cpm) || (impressoes > 0 ? (gastos / impressoes) * 1000 : 0),
        ctr: parseFloat(row.ctr) || (impressoes > 0 ? cliques / impressoes : 0),
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
      mensagem: `Sincronização Meta Ads concluída. ${insertedCount} registros processados.`,
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
