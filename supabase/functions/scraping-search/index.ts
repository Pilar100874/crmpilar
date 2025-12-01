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

// Garante que o link seja uma URL absoluta
function ensureAbsoluteUrl(link: string, baseUrl: string): string {
  if (!link) return '';
  
  // Já é URL absoluta
  if (link.startsWith('http://') || link.startsWith('https://')) {
    return link;
  }
  
  // Remove baseUrl duplicado se houver
  const cleanBase = baseUrl.replace(/\/$/, '');
  
  // Link relativo começando com /
  if (link.startsWith('/')) {
    return `${cleanBase}${link}`;
  }
  
  // Link relativo sem /
  return `${cleanBase}/${link}`;
}

// Busca produtos via API VTEX
async function searchVtexProducts(baseUrl: string, query: string, limite: number): Promise<any[]> {
  const endpoints = [
    // VTEX Intelligent Search API
    `${baseUrl}/api/io/_v/api/intelligent-search/product_search/?query=${encodeURIComponent(query)}&count=${limite}`,
    // VTEX Legacy Search API
    `${baseUrl}/api/catalog_system/pub/products/search/${encodeURIComponent(query)}?_from=0&_to=${limite - 1}`,
    // Alternative search endpoint
    `${baseUrl}/buscapagina?ft=${encodeURIComponent(query)}&PS=${limite}&sl=1&cc=1&sm=0&PageNumber=1`,
  ];

  for (const endpoint of endpoints) {
    try {
      console.log('[VTEX Search] Tentando endpoint:', endpoint);
      
      const response = await fetch(endpoint, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/html, */*',
          'Accept-Language': 'pt-BR,pt;q=0.9',
        },
      });

      if (!response.ok) {
        console.log(`[VTEX Search] Endpoint ${endpoint} retornou ${response.status}`);
        continue;
      }

      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        const data = await response.json();
        
        // Handle intelligent search response
        if (data.products && Array.isArray(data.products)) {
          console.log(`[VTEX Search] Encontrados ${data.products.length} produtos via intelligent search`);
          
          // Log primeiro produto para debug da estrutura
          if (data.products[0]) {
            console.log('[VTEX Search] Estrutura do primeiro produto:', JSON.stringify({
              priceRange: data.products[0].priceRange,
              price: data.products[0].price,
              listPrice: data.products[0].listPrice,
              items: data.products[0].items?.[0]?.sellers?.[0]?.commertialOffer
            }));
          }
          
          return data.products.map((p: any) => {
            // Extrair preço de venda (atual)
            const sellingPrice = p.priceRange?.sellingPrice?.lowPrice || 
                                p.priceRange?.sellingPrice?.highPrice ||
                                p.items?.[0]?.sellers?.[0]?.commertialOffer?.Price ||
                                p.items?.[0]?.sellers?.[0]?.commertialOffer?.spotPrice ||
                                p.price || 0;
            
            // Extrair preço de lista (original/sem desconto)
            const listPrice = p.priceRange?.listPrice?.lowPrice || 
                             p.priceRange?.listPrice?.highPrice ||
                             p.items?.[0]?.sellers?.[0]?.commertialOffer?.ListPrice ||
                             p.listPrice || null;
            
            return {
              nome: p.productName || p.name,
              preco_numerico: sellingPrice,
              preco_original: listPrice && listPrice > sellingPrice ? listPrice : null,
              link: ensureAbsoluteUrl(p.link || `/${p.linkText || p.slug}/p`, baseUrl),
              imagem: p.items?.[0]?.images?.[0]?.imageUrl || p.image || '',
            };
          });
        }
        
        // Handle legacy catalog API response (array)
        if (Array.isArray(data) && data.length > 0) {
          console.log(`[VTEX Search] Encontrados ${data.length} produtos via catalog API`);
          
          // Log primeiro produto para debug
          if (data[0]) {
            console.log('[VTEX Search] Estrutura catalog API:', JSON.stringify({
              commertialOffer: data[0].items?.[0]?.sellers?.[0]?.commertialOffer
            }));
          }
          
          return data.map((p: any) => {
            const offer = p.items?.[0]?.sellers?.[0]?.commertialOffer || {};
            const sellingPrice = offer.Price || offer.spotPrice ||
                                p.priceRange?.sellingPrice?.lowPrice || 0;
            const listPrice = offer.ListPrice ||
                             p.priceRange?.listPrice?.lowPrice || null;
            return {
              nome: p.productName || p.nameComplete || p.name,
              preco_numerico: sellingPrice,
              preco_original: listPrice && listPrice > sellingPrice ? listPrice : null,
              link: ensureAbsoluteUrl(p.link || p.detailUrl || '', baseUrl),
              imagem: p.items?.[0]?.images?.[0]?.imageUrl || '',
            };
          });
        }
      } else if (contentType.includes('text/html')) {
        // Parse HTML response from buscapagina
        const html = await response.text();
        if (html.includes('productName') || html.includes('product-item')) {
          console.log('[VTEX Search] Recebeu HTML com produtos, tentando extrair');
          // Return HTML for AI parsing
          return [{ _vtexHtml: html }];
        }
      }
    } catch (err) {
      console.log(`[VTEX Search] Erro no endpoint: ${err}`);
    }
  }

  return [];
}

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
    const baseUrl = getBaseUrl(urlFinal);
    
    console.log('[Scraping Search] Buscando:', urlFinal);
    console.log('[Scraping Search] Base URL:', baseUrl);

    // Fazer fetch da página inicial
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

    let results: any[] = [];

    // Detectar se é VTEX e tentar API direta
    if (isVtexStore(urlFinal, html)) {
      console.log('[Scraping Search] Site VTEX detectado, tentando API direta');
      
      const vtexProducts = await searchVtexProducts(baseUrl, query, limite);
      
      if (vtexProducts.length > 0 && !vtexProducts[0]._vtexHtml) {
        console.log(`[Scraping Search] VTEX API retornou ${vtexProducts.length} produtos`);
        results = vtexProducts.filter(p => p.nome && p.preco_numerico > 0);
        
        if (results.length > 0) {
          return new Response(
            JSON.stringify({
              success: true,
              results: results.slice(0, limite),
              total: results.length,
              url_buscada: urlFinal,
              metodo: 'vtex_api',
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Fallback: usar IA para extrair produtos do HTML
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

    // Melhorar o prompt para sites com dados JSON embutidos
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

IMPORTANTE - VERIFIQUE NESTA ORDEM:
1. Primeiro procure por dados JSON embutidos no HTML (em tags <script type="application/ld+json">, __STATE__, __NEXT_DATA__, window.__PRELOADED_STATE__, ou variáveis JavaScript)
2. Se não encontrar JSON, procure por elementos HTML com dados de produtos
3. Sites VTEX geralmente têm dados em __STATE__ ou em atributos data-*

REGRAS DE EXTRAÇÃO:
1. Extraia APENAS produtos reais (não ícones, banners, logos, botões)
2. A imagem deve ser a FOTO DO PRODUTO (URL com "product", "item", dimensões como -292-, -500-)
3. NÃO extraia imagens de: ícones SVG, logos, bandeiras, selos, imagens de frete
4. Converta preços para número (R$ 1.299,00 -> 1299.00, R$ 12,94 -> 12.94)
5. Extraia no máximo ${limite} produtos
6. IMPORTANTE: Se houver preço original/de lista (riscado) E preço promocional, extraia AMBOS

RETORNE APENAS JSON VÁLIDO, sem markdown:
{
  "products": [
    {
      "nome": "nome completo do produto",
      "preco_numerico": 999.99,
      "preco_original": 1199.99,
      "link": "url da página do produto",
      "imagem": "url da FOTO do produto"
    }
  ]
}

NOTA: preco_original é o preço DE (riscado/antes do desconto). Se não houver desconto, deixe null.`
          },
          {
            role: 'user',
            content: `Seletores CSS sugeridos:
- Container: ${seletores?.container_produto || 'detectar automaticamente'}
- Nome: ${seletores?.nome || 'detectar automaticamente'}
- Preço: ${seletores?.preco || 'detectar automaticamente'}
- Link: ${seletores?.link || 'detectar automaticamente'}
- Imagem: ${seletores?.imagem || 'detectar automaticamente'}
- Regex preço: ${regex_preco || 'R\\$\\s*([\\d.,]+)'}

Termo buscado: "${query}"

DICA: Se o HTML não tiver produtos visíveis, procure por:
- <script type="application/ld+json"> com schema de produtos
- Variáveis JavaScript como __STATE__, __NEXT_DATA__, __PRELOADED_STATE__
- Atributos data-product, data-sku, data-price em elementos

HTML (primeiros 80KB):
${html.substring(0, 80000)}`
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

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.products && Array.isArray(parsed.products)) {
          results = parsed.products.map((p: any) => {
            const preco = typeof p.preco_numerico === 'number' 
              ? p.preco_numerico 
              : parseFloat(String(p.preco_numerico || p.price || 0).replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
            const precoOriginal = p.preco_original 
              ? (typeof p.preco_original === 'number' 
                ? p.preco_original 
                : parseFloat(String(p.preco_original).replace(/[^\d.,]/g, '').replace(',', '.')) || null)
              : null;
            return {
              nome: p.nome || p.title || p.name,
              preco_numerico: preco,
              preco_original: precoOriginal && precoOriginal > preco ? precoOriginal : null,
              link: ensureAbsoluteUrl(p.link || p.url || '', baseUrl),
              imagem: p.imagem || p.image,
            };
          });
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
        metodo: 'ai_extraction',
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
