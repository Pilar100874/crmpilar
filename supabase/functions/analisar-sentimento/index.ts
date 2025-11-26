import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SentimentRequest {
  messageId: string;
  conversationId: string;
  messageText: string;
  estabelecimentoId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    const { messageId, conversationId, messageText, estabelecimentoId }: SentimentRequest = await req.json();

    console.log(`🔍 Analisando sentimento da mensagem ${messageId}`);

    // Buscar configuração de sentiment analysis
    const { data: config } = await supabase
      .from('sentiment_config')
      .select('*')
      .eq('estabelecimento_id', estabelecimentoId)
      .eq('ativo', true)
      .single();

    if (!config) {
      console.log('⚠️ Análise de sentimento não configurada para este estabelecimento');
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Análise de sentimento não configurada' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Chamar Lovable AI para análise de sentimento
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Você é um analista de sentimentos. Analise a mensagem e retorne APENAS um JSON com esta estrutura exata:
{
  "sentimento": "positivo" | "neutro" | "negativo",
  "score": 0.0 a 1.0,
  "confidence": 0.0 a 1.0,
  "emocoes": ["alegria", "tristeza", "raiva", "medo", "surpresa", "desgosto"],
  "topicos_chave": ["lista", "de", "topicos"],
  "urgencia": "baixa" | "media" | "alta"
}

Regras:
- sentimento: positivo (>0.7), neutro (0.3-0.7), negativo (<0.3)
- score: probabilidade de ser positivo (0=muito negativo, 1=muito positivo)
- confidence: quão confiante está da análise (0-1)
- emocoes: até 3 emoções detectadas
- topicos_chave: até 5 tópicos principais
- urgencia: baseada no tom e conteúdo`
          },
          {
            role: 'user',
            content: `Analise esta mensagem de cliente: "${messageText}"`
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('❌ Erro na API Lovable AI:', aiResponse.status, errorText);
      throw new Error(`Erro na análise de sentimento: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const analysis = JSON.parse(aiData.choices[0].message.content);

    console.log(`📊 Análise completa:`, analysis);

    // Salvar análise no banco
    const { error: insertError } = await supabase
      .from('sentiment_analysis')
      .insert({
        message_id: messageId,
        conversation_id: conversationId,
        estabelecimento_id: estabelecimentoId,
        sentimento: analysis.sentimento,
        score: analysis.score,
        confidence: analysis.confidence,
        emocoes_detectadas: analysis.emocoes || [],
        topicos_chave: analysis.topicos_chave || [],
        urgencia: analysis.urgencia || 'media',
      });

    if (insertError) {
      console.error('❌ Erro ao salvar análise:', insertError);
      throw insertError;
    }

    // Atualizar resumo da conversa
    await atualizarResumoConversa(supabase, conversationId, estabelecimentoId);

    // Verificar se precisa gerar alerta
    if (analysis.sentimento === 'negativo' && analysis.score < config.threshold_negativo) {
      await verificarAlerta(supabase, conversationId, estabelecimentoId, analysis, config);
    }

    // Log usage
    const duracao = Date.now() - startTime;
    await supabase.from('ia_usage_log').insert({
      estabelecimento_id: estabelecimentoId,
      contexto: 'sentiment',
      provider: 'lovable',
      model: 'google/gemini-2.5-flash',
      prompt_tokens: aiData.usage?.prompt_tokens || 0,
      completion_tokens: aiData.usage?.completion_tokens || 0,
      total_tokens: aiData.usage?.total_tokens || 0,
      custo_estimado: 0,
      duracao_ms: duracao,
      sucesso: true,
      metadata: { 
        message_id: messageId, 
        conversation_id: conversationId,
        sentimento: analysis.sentimento,
        score: analysis.score 
      }
    });

    return new Response(JSON.stringify({
      success: true,
      analysis,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('❌ Erro ao analisar sentimento:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function atualizarResumoConversa(
  supabase: any,
  conversationId: string,
  estabelecimentoId: string
) {
  // Buscar todas as análises desta conversa
  const { data: analyses } = await supabase
    .from('sentiment_analysis')
    .select('sentimento, score')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false });

  if (!analyses || analyses.length === 0) return;

  // Calcular métricas agregadas
  const totalAnalyses = analyses.length;
  const positivos = analyses.filter((a: any) => a.sentimento === 'positivo').length;
  const neutros = analyses.filter((a: any) => a.sentimento === 'neutro').length;
  const negativos = analyses.filter((a: any) => a.sentimento === 'negativo').length;
  const scoreGeral = analyses.reduce((sum: number, a: any) => sum + a.score, 0) / totalAnalyses;

  // Determinar sentimento predominante
  let sentimentoPredominante = 'neutro';
  if (positivos > neutros && positivos > negativos) sentimentoPredominante = 'positivo';
  if (negativos > neutros && negativos > positivos) sentimentoPredominante = 'negativo';

  // Últimas 5 mensagens para tendência
  const ultimas5 = analyses.slice(0, 5);
  const scoreTendencia = ultimas5.reduce((sum: number, a: any) => sum + a.score, 0) / ultimas5.length;
  let tendencia = 'estavel';
  if (scoreTendencia > scoreGeral + 0.1) tendencia = 'melhorando';
  if (scoreTendencia < scoreGeral - 0.1) tendencia = 'piorando';

  // Upsert resumo
  await supabase
    .from('sentiment_conversation_summary')
    .upsert({
      conversation_id: conversationId,
      estabelecimento_id: estabelecimentoId,
      sentimento_predominante: sentimentoPredominante,
      score_geral: Math.round(scoreGeral * 100) / 100,
      total_mensagens_analisadas: totalAnalyses,
      mensagens_positivas: positivos,
      mensagens_neutras: neutros,
      mensagens_negativas: negativos,
      tendencia,
      ultima_analise_at: new Date().toISOString(),
    }, {
      onConflict: 'conversation_id,estabelecimento_id',
    });

  console.log(`📈 Resumo atualizado: ${sentimentoPredominante} (${scoreGeral.toFixed(2)})`);
}

async function verificarAlerta(
  supabase: any,
  conversationId: string,
  estabelecimentoId: string,
  analysis: any,
  config: any
) {
  // Contar mensagens negativas consecutivas
  const { data: recentAnalyses } = await supabase
    .from('sentiment_analysis')
    .select('sentimento, score')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(config.mensagens_consecutivas_alerta || 2);

  if (!recentAnalyses) return;

  const todasNegativas = recentAnalyses.every((a: any) => a.sentimento === 'negativo');

  if (todasNegativas && recentAnalyses.length >= (config.mensagens_consecutivas_alerta || 2)) {
    console.log('🚨 Gerando alerta de sentimento negativo');

    // Verificar se já existe alerta ativo
    const { data: alertaExistente } = await supabase
      .from('sentiment_alerts')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('resolvido', false)
      .single();

    if (alertaExistente) {
      console.log('ℹ️ Alerta já existe para esta conversa');
      return;
    }

    // Criar alerta
    const { data: conversation } = await supabase
      .from('conversations')
      .select('atendente_atual_id, fila_id')
      .eq('id', conversationId)
      .single();

    await supabase
      .from('sentiment_alerts')
      .insert({
        conversation_id: conversationId,
        estabelecimento_id: estabelecimentoId,
        atendente_id: conversation?.atendente_atual_id,
        fila_id: conversation?.fila_id,
        sentimento: analysis.sentimento,
        score: analysis.score,
        mensagens_consecutivas: recentAnalyses.length,
        acao_sugerida: config.escalar_automaticamente ? 'escalacao' : 'supervisao',
      });

    // Enviar notificação
    await supabase.functions.invoke('enviar-notificacao', {
      body: {
        usuarioId: conversation?.atendente_atual_id,
        estabelecimentoId,
        tipo: 'sentimento_negativo',
        titulo: '🚨 Cliente Insatisfeito Detectado',
        mensagem: `Cliente demonstra insatisfação. Score: ${(analysis.score * 100).toFixed(0)}%`,
        chatId: conversationId,
      },
    });

    // Escalar se configurado
    if (config.escalar_automaticamente && config.fila_escalacao_id) {
      await supabase
        .from('conversations')
        .update({
          fila_id: config.fila_escalacao_id,
          chat_status: 'em_fila',
          atendente_atual_id: null,
        })
        .eq('id', conversationId);

      console.log(`🔼 Conversa escalada para fila ${config.fila_escalacao_id}`);
    }
  }
}
