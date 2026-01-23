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
    const { opportunity_id } = await req.json();
    
    if (!opportunity_id) {
      throw new Error('opportunity_id é obrigatório');
    }

    console.log(`🤖 Gerando resumo IA para oportunidade: ${opportunity_id}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar oportunidade
    const { data: opportunity, error: fetchError } = await supabase
      .from('licitacoes_opportunities')
      .select('*')
      .eq('id', opportunity_id)
      .single();

    if (fetchError || !opportunity) {
      throw new Error('Oportunidade não encontrada');
    }

    if (!lovableApiKey) {
      console.log('⚠️ LOVABLE_API_KEY não configurada');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'API de IA não configurada' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Gerar resumo com IA
    const prompt = `Analise esta licitação pública e forneça um resumo executivo conciso para um vendedor de papéis e descartáveis.

DADOS DA LICITAÇÃO:
- Órgão: ${opportunity.orgao_nome || 'Não informado'}
- UF/Município: ${opportunity.uf || ''} / ${opportunity.municipio || ''}
- Modalidade: ${opportunity.modalidade || 'Não informada'}
- Valor Estimado: R$ ${opportunity.valor_estimado?.toLocaleString('pt-BR') || 'Não informado'}
- Prazo: ${opportunity.data_abertura ? new Date(opportunity.data_abertura).toLocaleDateString('pt-BR') : 'Não informado'}
- Objeto: ${opportunity.objeto || 'Não informado'}
- Keywords detectadas: ${(opportunity.keywords_matched || []).join(', ')}

RESPONDA EM NO MÁXIMO 150 PALAVRAS:
1. O que estão comprando (tipos de produtos)
2. Quantidade estimada (se mencionada)
3. Prazo de entrega/abertura
4. Vale a pena participar? (sim/não/talvez com justificativa curta)`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Você é um assistente especializado em análise de licitações para empresas do setor de papéis e descartáveis. Seja direto e objetivo.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 500
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Erro na API de IA:', aiResponse.status, errorText);
      throw new Error(`Erro na API de IA: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const summary = aiData.choices?.[0]?.message?.content || 'Não foi possível gerar resumo';

    // Atualizar oportunidade com resumo
    const { error: updateError } = await supabase
      .from('licitacoes_opportunities')
      .update({ summary_ai: summary })
      .eq('id', opportunity_id);

    if (updateError) {
      console.error('Erro ao atualizar resumo:', updateError);
      throw updateError;
    }

    console.log(`✅ Resumo gerado com sucesso`);

    return new Response(JSON.stringify({
      success: true,
      summary
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Erro ao gerar resumo:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
