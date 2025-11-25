import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    const { conversationId, lastUserMessage, estabelecimentoId } = await req.json();

    console.log(`📚 Buscando artigos KB relevantes para conversa ${conversationId}`);

    // Buscar artigos da base de conhecimento
    const { data: artigos, error: artigosError } = await supabase
      .from('kb_artigos')
      .select(`
        id,
        titulo,
        conteudo,
        categoria_id
      `)
      .eq('estabelecimento_id', estabelecimentoId)
      .eq('status', 'publicado')
      .limit(20);

    if (artigosError) throw artigosError;

    if (!artigos || artigos.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        articles: [],
        message: 'Nenhum artigo disponível na base de conhecimento'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Construir contexto dos artigos
    const artigosContext = artigos.map((a: any) => 
      `ID: ${a.id}\nTítulo: ${a.titulo}\nResumo: ${a.conteudo.substring(0, 200)}...`
    ).join('\n\n---\n\n');

    // Chamar Lovable AI para identificar artigos relevantes
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
            content: `Você é um sistema que identifica artigos relevantes da base de conhecimento.

Base de conhecimento disponível:
${artigosContext}

Analise a mensagem do cliente e retorne APENAS um JSON com os IDs dos 3 artigos mais relevantes, ordenados por relevância:

{
  "article_ids": ["id1", "id2", "id3"],
  "reasoning": "breve explicação de por que cada artigo é relevante"
}

Se nenhum artigo for relevante, retorne array vazio.`
          },
          {
            role: 'user',
            content: `Mensagem do cliente: "${lastUserMessage}"`
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`Erro na API: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const result = JSON.parse(aiData.choices[0].message.content);

    // Buscar detalhes dos artigos sugeridos
    const suggestedArticles = artigos.filter(a => 
      result.article_ids.includes(a.id)
    );

    console.log(`✅ ${suggestedArticles.length} artigos sugeridos`);

    return new Response(JSON.stringify({
      success: true,
      articles: suggestedArticles,
      reasoning: result.reasoning,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('❌ Erro ao sugerir artigos KB:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
