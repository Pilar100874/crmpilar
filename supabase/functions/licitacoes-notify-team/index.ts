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
    const { estabelecimento_id } = await req.json();
    
    if (!estabelecimento_id) {
      throw new Error('estabelecimento_id é obrigatório');
    }

    console.log(`📧 Verificando alertas para estabelecimento: ${estabelecimento_id}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar configuração
    const { data: config } = await supabase
      .from('licitacoes_config')
      .select('*')
      .eq('estabelecimento_id', estabelecimento_id)
      .maybeSingle();

    if (!config || !config.ativo) {
      console.log('⚠️ Bot desativado ou não configurado');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Bot desativado' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const scoreMinimo = config.score_minimo_alerta || 10;
    const emailsNotificacao = config.emails_notificacao || [];

    if (emailsNotificacao.length === 0) {
      console.log('⚠️ Nenhum email de notificação configurado');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Nenhum email configurado' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Buscar oportunidades com score alto que ainda não foram notificadas
    const { data: opportunities, error: fetchError } = await supabase
      .from('licitacoes_opportunities')
      .select(`
        *,
        alerts:licitacoes_alerts(id)
      `)
      .eq('estabelecimento_id', estabelecimento_id)
      .gte('score', scoreMinimo)
      .eq('status', 'novo')
      .eq('descartado', false)
      .order('score', { ascending: false })
      .limit(10);

    if (fetchError) {
      throw fetchError;
    }

    // Filtrar apenas oportunidades sem alerta
    const newOpportunities = (opportunities || []).filter(op => !op.alerts || op.alerts.length === 0);

    if (newOpportunities.length === 0) {
      console.log('✅ Nenhuma nova oportunidade para notificar');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Nenhuma nova oportunidade',
        count: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📨 ${newOpportunities.length} oportunidades para notificar`);

    // Criar resumo para email
    let emailBody = `🎯 NOVAS OPORTUNIDADES DE LICITAÇÃO\n\n`;
    emailBody += `Encontramos ${newOpportunities.length} nova(s) oportunidade(s) com score alto:\n\n`;

    for (const op of newOpportunities) {
      emailBody += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      emailBody += `📊 Score: ${op.score} pontos\n`;
      emailBody += `🏢 Órgão: ${op.orgao_nome || 'N/I'}\n`;
      emailBody += `📍 Local: ${op.municipio || ''} - ${op.uf || ''}\n`;
      emailBody += `💰 Valor: R$ ${op.valor_estimado?.toLocaleString('pt-BR') || 'N/I'}\n`;
      emailBody += `📋 Objeto: ${(op.objeto || '').substring(0, 200)}...\n`;
      emailBody += `🔑 Keywords: ${(op.keywords_matched || []).join(', ')}\n`;
      if (op.data_abertura) {
        emailBody += `📅 Abertura: ${new Date(op.data_abertura).toLocaleDateString('pt-BR')}\n`;
      }
      if (op.url_detalhe) {
        emailBody += `🔗 Link: ${op.url_detalhe}\n`;
      }
      emailBody += `\n`;

      // Registrar alerta
      await supabase.from('licitacoes_alerts').insert({
        estabelecimento_id,
        opportunity_id: op.id,
        channel: 'email',
        status: 'sent',
        recipients: emailsNotificacao
      });
    }

    emailBody += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    emailBody += `\nAcesse o painel para ver mais detalhes e atribuir vendedores.`;

    // Enviar email (se tiver função de email configurada)
    try {
      await supabase.functions.invoke('enviar-email', {
        body: {
          to: emailsNotificacao,
          subject: `🎯 ${newOpportunities.length} Nova(s) Licitação(ões) Detectada(s) - Score Alto`,
          text: emailBody,
          estabelecimento_id
        }
      });
      console.log('✅ Email enviado com sucesso');
    } catch (emailErr) {
      console.log('⚠️ Não foi possível enviar email:', emailErr instanceof Error ? emailErr.message : 'Erro');
    }

    return new Response(JSON.stringify({
      success: true,
      notified: newOpportunities.length,
      opportunities: newOpportunities.map(o => ({ id: o.id, score: o.score, orgao: o.orgao_nome }))
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Erro ao notificar:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
