import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url_busca, termo_teste, seletores, regex_preco } = await req.json();

    if (!url_busca || !termo_teste) {
      return new Response(
        JSON.stringify({ error: 'URL de busca e termo de teste são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Replace {TERMO} with the test term
    const urlFinal = url_busca.replace('{TERMO}', encodeURIComponent(termo_teste));
    
    console.log('Testing scraping config with URL:', urlFinal);

    // Fetch the page
    const response = await fetch(urlFinal, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Erro ao acessar página: ${response.status} ${response.statusText}`,
          etapa: 'fetch'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await response.text();
    console.log('HTML fetched, size:', html.length);

    // Use AI to extract products based on the selectors
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Configuração de IA não disponível',
          etapa: 'ai'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
            content: `Você é um especialista em web scraping. Analise o HTML fornecido e extraia os produtos usando os seletores CSS indicados.

IMPORTANTE: Retorne APENAS um JSON válido, sem markdown, sem explicações.

O JSON deve ter esta estrutura:
{
  "sucesso": true/false,
  "produtos_encontrados": número de produtos encontrados,
  "produtos": [
    {
      "nome": "nome do produto extraído",
      "preco": "preço extraído (texto original)",
      "preco_numerico": número (preço convertido),
      "link": "URL do produto"
    }
  ],
  "erros": {
    "container": "erro se não encontrou container ou null",
    "nome": "erro se não encontrou nome ou null",
    "preco": "erro se não encontrou preço ou null",
    "link": "erro se não encontrou link ou null"
  },
  "sugestoes": ["lista de sugestões de melhoria se houver problemas"]
}`
          },
          {
            role: 'user',
            content: `Extraia os produtos deste HTML usando os seguintes seletores CSS:
- Container do produto: ${seletores?.container_produto || 'não informado'}
- Nome: ${seletores?.nome || 'não informado'}
- Preço: ${seletores?.preco || 'não informado'}
- Link: ${seletores?.link || 'não informado'}
- Regex para preço: ${regex_preco || 'R\\$\\s*([\\d.,]+)'}

Extraia no máximo 5 produtos para teste.

HTML (primeiros 40KB):
${html.substring(0, 40000)}`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      
      // Check for rate limiting
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Limite de requisições atingido. Aguarde alguns segundos.',
            etapa: 'ai'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro na análise de IA',
          etapa: 'ai'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResult = await aiResponse.json();
    const aiContent = aiResult.choices?.[0]?.message?.content || '';
    
    console.log('AI response:', aiContent);

    // Parse the AI response
    let resultado;
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        resultado = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('JSON não encontrado na resposta');
      }
    } catch (parseError) {
      console.error('Parse error:', parseError);
      resultado = {
        sucesso: false,
        produtos_encontrados: 0,
        produtos: [],
        erros: {
          container: 'Não foi possível processar a resposta da IA',
          nome: null,
          preco: null,
          link: null
        },
        sugestoes: ['Tente ajustar os seletores CSS ou use a detecção automática']
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        url_testada: urlFinal,
        html_size: html.length,
        resultado
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao testar configuração';
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        etapa: 'geral'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
