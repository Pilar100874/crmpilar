const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    const { text, targetLanguage, estabelecimentoId } = await req.json();

    console.log(`🌍 Traduzindo texto para ${targetLanguage}`);

    const languageNames: Record<string, string> = {
      'en': 'inglês',
      'es': 'espanhol',
      'fr': 'francês',
      'de': 'alemão',
      'it': 'italiano',
      'pt': 'português',
      'zh': 'chinês',
      'ja': 'japonês',
      'ko': 'coreano',
    };

    // Chamar Lovable AI
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
            content: `Você é um tradutor profissional. Traduza o texto mantendo o tom e contexto de atendimento ao cliente. Retorne APENAS a tradução, sem explicações adicionais.`
          },
          {
            role: 'user',
            content: `Traduza este texto para ${languageNames[targetLanguage] || targetLanguage}:

"${text}"`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Limite de requisições excedido. Tente novamente em alguns instantes." 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ 
          error: "Créditos insuficientes. Adicione créditos em Settings → Workspace → Usage." 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`Erro na API: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const translation = aiData.choices[0].message.content;
    const duracao = Date.now() - startTime;

    console.log(`✅ Tradução concluída`);

    // Log usage to Supabase
    if (estabelecimentoId) {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      await supabase.from('ia_usage_log').insert({
        estabelecimento_id: estabelecimentoId,
        contexto: 'translate',
        provider: 'lovable',
        model: 'google/gemini-2.5-flash',
        prompt_tokens: aiData.usage?.prompt_tokens || 0,
        completion_tokens: aiData.usage?.completion_tokens || 0,
        total_tokens: aiData.usage?.total_tokens || 0,
        custo_estimado: 0,
        duracao_ms: duracao,
        sucesso: true,
        metadata: { target_language: targetLanguage }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      translation,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('❌ Erro ao traduzir:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
