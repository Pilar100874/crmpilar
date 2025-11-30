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

    const { estabelecimentoId, month, year } = await req.json();

    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    // Get insights for the month
    const { data: insights, error: insightsError } = await supabase
      .from('ad_insights')
      .select('*, plataforma:ad_platforms(*)')
      .eq('estabelecimento_id', estabelecimentoId)
      .gte('data', formatDate(startDate))
      .lte('data', formatDate(endDate));

    if (insightsError) {
      throw new Error('Erro ao buscar dados: ' + insightsError.message);
    }

    // Calculate totals
    const totals = {
      gastos: 0,
      receita: 0,
      cliques: 0,
      impressoes: 0,
      conversoes: 0,
    };

    const byPlatform: Record<string, typeof totals> = {};
    const byCampaign: Record<string, typeof totals & { plataforma: string }> = {};

    for (const insight of (insights || [])) {
      totals.gastos += insight.gastos || 0;
      totals.receita += insight.receita || 0;
      totals.cliques += insight.cliques || 0;
      totals.impressoes += insight.impressoes || 0;
      totals.conversoes += insight.conversoes || 0;

      const platformName = insight.plataforma?.nome_display || 'Desconhecido';
      if (!byPlatform[platformName]) {
        byPlatform[platformName] = { gastos: 0, receita: 0, cliques: 0, impressoes: 0, conversoes: 0 };
      }
      byPlatform[platformName].gastos += insight.gastos || 0;
      byPlatform[platformName].receita += insight.receita || 0;
      byPlatform[platformName].cliques += insight.cliques || 0;
      byPlatform[platformName].impressoes += insight.impressoes || 0;
      byPlatform[platformName].conversoes += insight.conversoes || 0;

      const campaignKey = `${platformName}_${insight.campanha}`;
      if (!byCampaign[campaignKey]) {
        byCampaign[campaignKey] = { 
          gastos: 0, receita: 0, cliques: 0, impressoes: 0, conversoes: 0,
          plataforma: platformName 
        };
      }
      byCampaign[campaignKey].gastos += insight.gastos || 0;
      byCampaign[campaignKey].receita += insight.receita || 0;
      byCampaign[campaignKey].cliques += insight.cliques || 0;
      byCampaign[campaignKey].impressoes += insight.impressoes || 0;
      byCampaign[campaignKey].conversoes += insight.conversoes || 0;
    }

    // Calculate ROI and ROAS
    const roi = totals.gastos > 0 ? ((totals.receita - totals.gastos) / totals.gastos) * 100 : 0;
    const roas = totals.gastos > 0 ? totals.receita / totals.gastos : 0;

    // Get top campaigns by ROAS
    const topCampaigns = Object.entries(byCampaign)
      .map(([name, data]) => ({
        nome: name.split('_').slice(1).join('_'),
        plataforma: data.plataforma,
        gastos: data.gastos,
        receita: data.receita,
        roas: data.gastos > 0 ? data.receita / data.gastos : 0,
      }))
      .sort((a, b) => b.roas - a.roas)
      .slice(0, 10);

    // Generate report data
    const reportData = {
      periodo: {
        mes: month,
        ano: year,
        inicio: formatDate(startDate),
        fim: formatDate(endDate),
      },
      resumo: {
        gastos_totais: totals.gastos,
        receita_total: totals.receita,
        roi_percentual: roi,
        roas: roas,
        cliques_totais: totals.cliques,
        impressoes_totais: totals.impressoes,
        conversoes_totais: totals.conversoes,
        cpc_medio: totals.cliques > 0 ? totals.gastos / totals.cliques : 0,
        cpm_medio: totals.impressoes > 0 ? (totals.gastos / totals.impressoes) * 1000 : 0,
        ctr_medio: totals.impressoes > 0 ? (totals.cliques / totals.impressoes) * 100 : 0,
      },
      por_plataforma: Object.entries(byPlatform).map(([nome, dados]) => ({
        nome,
        ...dados,
        roas: dados.gastos > 0 ? dados.receita / dados.gastos : 0,
        roi: dados.gastos > 0 ? ((dados.receita - dados.gastos) / dados.gastos) * 100 : 0,
      })),
      top_campanhas: topCampaigns,
      gerado_em: new Date().toISOString(),
    };

    // Log report generation
    await supabase.from('ads_logs_coleta').insert({
      estabelecimento_id: estabelecimentoId,
      tipo: 'info',
      mensagem: `Relatório mensal gerado para ${month}/${year}`,
      detalhes: { periodo: reportData.periodo },
    });

    return new Response(
      JSON.stringify({ success: true, report: reportData }),
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
