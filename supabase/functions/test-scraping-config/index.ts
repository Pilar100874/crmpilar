import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Detecta se é um site VTEX baseado na URL ou HTML
function isVtexStore(url: string, html: string): boolean {
  const vtexPatterns = [
    'vtex.com',
    'vtexassets.com',
    'vteximg.com',
    'vtexcommercestable',
    'vtex-',
    'class="vtex',
    'data-vtex',
  ];
  return vtexPatterns.some(p => url.includes(p) || html.includes(p));
}

// Extrai o domínio base da URL
function getBaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return '';
  }
}

// Busca produtos via API VTEX
async function searchVtexProducts(baseUrl: string, query: string, limite: number = 5): Promise<any[]> {
  const endpoints = [
    // VTEX Intelligent Search API
    `${baseUrl}/api/io/_v/api/intelligent-search/product_search/?query=${encodeURIComponent(query)}&count=${limite}`,
    // VTEX Legacy Search API
    `${baseUrl}/api/catalog_system/pub/products/search/${encodeURIComponent(query)}?_from=0&_to=${limite - 1}`,
  ];

  for (const endpoint of endpoints) {
    try {
      console.log('[VTEX Test] Tentando endpoint:', endpoint);
      
      const response = await fetch(endpoint, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'pt-BR,pt;q=0.9',
        },
      });

      if (!response.ok) {
        console.log(`[VTEX Test] Endpoint retornou ${response.status}`);
        continue;
      }

      const data = await response.json();
      
      // Handle intelligent search response
      if (data.products && Array.isArray(data.products)) {
        console.log(`[VTEX Test] Encontrados ${data.products.length} produtos via intelligent search`);
        return data.products.map((p: any) => ({
          nome: p.productName || p.name,
          preco: `R$ ${(p.priceRange?.sellingPrice?.lowPrice || p.items?.[0]?.sellers?.[0]?.commertialOffer?.Price || 0).toFixed(2).replace('.', ',')}`,
          preco_numerico: p.priceRange?.sellingPrice?.lowPrice || 
                         p.items?.[0]?.sellers?.[0]?.commertialOffer?.Price || 0,
          link: p.link || `${baseUrl}/${p.linkText || p.slug}/p`,
        }));
      }
      
      // Handle legacy catalog API response (array)
      if (Array.isArray(data) && data.length > 0) {
        console.log(`[VTEX Test] Encontrados ${data.length} produtos via catalog API`);
        return data.map((p: any) => ({
          nome: p.productName || p.nameComplete || p.name,
          preco: `R$ ${(p.items?.[0]?.sellers?.[0]?.commertialOffer?.Price || 0).toFixed(2).replace('.', ',')}`,
          preco_numerico: p.items?.[0]?.sellers?.[0]?.commertialOffer?.Price || 0,
          link: p.link || `${baseUrl}${p.detailUrl || ''}`,
        }));
      }
    } catch (err) {
      console.log(`[VTEX Test] Erro no endpoint: ${err}`);
    }
  }

  return [];
}

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
    const urlFinal = url_busca.replace(/\{TERMO\}/gi, encodeURIComponent(termo_teste));
    const baseUrl = getBaseUrl(urlFinal);
    
    console.log('Testing scraping config with URL:', urlFinal);
    console.log('Base URL:', baseUrl);

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

    // Detectar se é VTEX e tentar API direta primeiro
    if (isVtexStore(urlFinal, html)) {
      console.log('[Test] Site VTEX detectado, tentando API direta');
      
      const vtexProducts = await searchVtexProducts(baseUrl, termo_teste, 5);
      
      if (vtexProducts.length > 0) {
        console.log(`[Test] VTEX API retornou ${vtexProducts.length} produtos`);
        
        return new Response(
          JSON.stringify({
            success: true,
            url_testada: urlFinal,
            html_size: html.length,
            metodo: 'vtex_api',
            resultado: {
              sucesso: true,
              produtos_encontrados: vtexProducts.length,
              produtos: vtexProducts,
              erros: { container: null, nome: null, preco: null, link: null },
              sugestoes: ['Site VTEX detectado - usando API direta para melhor precisão']
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fallback: Use AI to extract products based on the selectors
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
            content: `Você é um especialista em web scraping. Analise o HTML fornecido e extraia os produtos.

IMPORTANTE - VERIFIQUE NESTA ORDEM:
1. Primeiro procure por dados JSON embutidos no HTML (em tags <script type="application/ld+json">, __STATE__, __NEXT_DATA__, window.__PRELOADED_STATE__)
2. Se não encontrar JSON, procure por elementos HTML com dados de produtos
3. Sites VTEX geralmente têm dados em __STATE__ ou em atributos data-*

IMPORTANTE: Retorne APENAS um JSON válido, sem markdown, sem explicações.

O JSON deve ter esta estrutura:
{
  "sucesso": true/false,
  "produtos_encontrados": número de produtos encontrados,
  "produtos": [
    {
      "nome": "nome do produto extraído",
      "preco": "preço extraído (texto original)",
      "preco_numerico": número (preço convertido, ex: 12.94 para R$ 12,94),
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
- Container do produto: ${seletores?.container_produto || 'detectar automaticamente'}
- Nome: ${seletores?.nome || 'detectar automaticamente'}
- Preço: ${seletores?.preco || 'detectar automaticamente'}
- Link: ${seletores?.link || 'detectar automaticamente'}
- Regex para preço: ${regex_preco || 'R\\$\\s*([\\d.,]+)'}

Termo buscado: "${termo_teste}"

DICA: Se o HTML não tiver produtos visíveis, procure por:
- <script type="application/ld+json"> com schema de produtos
- Variáveis JavaScript como __STATE__, __NEXT_DATA__, __PRELOADED_STATE__
- Atributos data-product, data-sku, data-price em elementos

Extraia no máximo 5 produtos para teste.

HTML (primeiros 60KB):
${html.substring(0, 60000)}`
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
        sugestoes: ['Este site pode carregar produtos via JavaScript. Tente usar Firecrawl para sites com conteúdo dinâmico.']
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        url_testada: urlFinal,
        html_size: html.length,
        metodo: 'ai_extraction',
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
