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
    const { query, url_busca, seletores, regex_preco, limite = 20 } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query é obrigatória' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!url_busca) {
      return new Response(
        JSON.stringify({ error: 'URL de busca é obrigatória' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Substituir {TERMO} pela query (case insensitive)
    const urlFinal = url_busca.replace(/\{TERMO\}/gi, encodeURIComponent(query));
    
    console.log('[Scraping Search] Buscando:', urlFinal);

    // Fazer fetch da página
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
          error: `Erro ao acessar página: ${response.status} ${response.statusText}`,
          success: false 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await response.text();
    console.log('[Scraping Search] HTML recebido, tamanho:', html.length);

    // Usar IA para extrair produtos baseado nos seletores
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ 
          error: 'Configuração de IA não disponível',
          success: false 
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
            content: `Você é um extrator de dados de produtos de e-commerce. Extraia produtos do HTML fornecido.

REGRAS IMPORTANTES:
1. Extraia APENAS produtos reais da página (não ícones, banners, logos, botões)
2. A imagem deve ser a FOTO DO PRODUTO (geralmente em tags <img> dentro do card do produto, com atributos como "src", "data-src", ou "srcset")
3. NÃO extraia imagens de: ícones SVG, logos da loja, bandeiras de cartão, selos de segurança, imagens de frete/entrega
4. A imagem do produto geralmente tem URLs com palavras como "product", "item", "foto", ou dimensões como "-292-", "-500-", etc.
5. Converta preços para número (R$ 1.299,00 -> 1299.00)
6. Extraia no máximo ${limite} produtos

RETORNE APENAS JSON VÁLIDO, sem markdown ou código:
{
  "products": [
    {
      "nome": "nome completo do produto",
      "preco_numerico": 999.99,
      "link": "url da página do produto",
      "imagem": "url da FOTO do produto (não ícone/logo)"
    }
  ]
}`
          },
          {
            role: 'user',
            content: `Seletores CSS sugeridos:
- Container do produto: ${seletores?.container_produto || 'não informado'}
- Nome do produto: ${seletores?.nome || 'não informado'}
- Preço: ${seletores?.preco || 'não informado'}
- Link do produto: ${seletores?.link || 'não informado'}
- Imagem do produto: ${seletores?.imagem || 'img dentro do container do produto'}
- Regex preço: ${regex_preco || 'R\\$\\s*([\\d.,]+)'}

Termo buscado: "${query}"

IMPORTANTE sobre IMAGENS:
- A imagem DEVE ser a foto principal do produto (geralmente dentro de um <img> no card do produto)
- A URL da imagem deve conter dimensões ou IDs (ex: /156942-292-292/, /500x500/)
- NÃO pegue: logos, ícones SVG, imagens de frete, selos, bandeiras
- Se não conseguir identificar a imagem correta do produto, retorne string vazia para o campo imagem

HTML (primeiros 60KB):
${html.substring(0, 60000)}`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[Scraping Search] Erro IA:', errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'Limite de requisições atingido. Aguarde alguns segundos.',
            success: false 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Erro na análise de IA',
          success: false 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';
    
    console.log('[Scraping Search] Resposta IA:', content.substring(0, 500));

    let results: any[] = [];
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.products && Array.isArray(parsed.products)) {
          results = parsed.products.map((p: any) => ({
            nome: p.nome || p.title || p.name,
            preco_numerico: typeof p.preco_numerico === 'number' 
              ? p.preco_numerico 
              : parseFloat(String(p.preco_numerico || p.price || 0).replace(/[^\d.,]/g, '').replace(',', '.')) || 0,
            link: p.link || p.url,
            imagem: p.imagem || p.image,
          }));
        }
      }
    } catch (parseErr) {
      console.error('[Scraping Search] Erro ao parsear:', parseErr);
    }

    // Filtrar resultados válidos
    results = results.filter(r => r.nome && r.preco_numerico > 0);

    console.log(`[Scraping Search] Retornando ${results.length} resultados`);

    return new Response(
      JSON.stringify({
        success: true,
        results: results.slice(0, limite),
        total: results.length,
        url_buscada: urlFinal,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Scraping Search] Erro:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro ao fazer scraping',
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
