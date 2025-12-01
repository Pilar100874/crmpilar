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
    const { query, api_key, sites, limit = 20 } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query é obrigatória' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!api_key) {
      return new Response(
        JSON.stringify({ error: 'API Key do Firecrawl é obrigatória' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Firecrawl Search] Buscando:', query);
    console.log('[Firecrawl Search] Sites:', sites);

    // Construir URLs de busca para cada site
    const sitesArray = Array.isArray(sites) ? sites : [sites || 'mercadolivre.com.br'];
    const results: any[] = [];

    for (const site of sitesArray.slice(0, 3)) { // Limitar a 3 sites
      try {
        // Usar o Firecrawl para fazer scraping do site de busca
        let searchUrl = '';
        
        if (site.includes('mercadolivre')) {
          searchUrl = `https://lista.mercadolivre.com.br/${encodeURIComponent(query)}`;
        } else if (site.includes('amazon')) {
          searchUrl = `https://www.amazon.com.br/s?k=${encodeURIComponent(query)}`;
        } else if (site.includes('magazineluiza') || site.includes('magalu')) {
          searchUrl = `https://www.magazineluiza.com.br/busca/${encodeURIComponent(query)}/`;
        } else {
          searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}+site:${site}`;
        }

        console.log(`[Firecrawl Search] Scraping ${site}: ${searchUrl}`);

        const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${api_key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: searchUrl,
            formats: ['markdown', 'html'],
            onlyMainContent: true,
            timeout: 30000,
          }),
        });

        console.log(`[Firecrawl Search] Status Firecrawl: ${response.status}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[Firecrawl Search] Erro API Firecrawl (${response.status}):`, errorText);
          continue;
        }

        const data = await response.json();
        console.log(`[Firecrawl Search] Firecrawl success: ${data.success}`);
        
        if (data.success && data.data) {
          const contentLength = (data.data.markdown?.length || 0) + (data.data.html?.length || 0);
          console.log(`[Firecrawl Search] Conteúdo recebido: ${contentLength} chars`);
          
          if (contentLength < 100) {
            console.log('[Firecrawl Search] Conteúdo muito curto, pulando...');
            continue;
          }

          // Usar IA para extrair produtos do conteúdo
          const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
          
          if (!LOVABLE_API_KEY) {
            console.error('[Firecrawl Search] LOVABLE_API_KEY não configurada');
            continue;
          }

          console.log('[Firecrawl Search] Chamando IA para extrair produtos...');

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
                  content: `Você é um extrator de dados de produtos de e-commerce. Analise o conteúdo HTML/Markdown e extraia os produtos listados.

REGRAS:
1. Extraia TODOS os produtos que encontrar (máximo 15)
2. O preço deve ser um NÚMERO (ex: R$ 1.299,00 -> 1299.00)
3. Se não encontrar preço, use 0
4. Links devem ser URLs completas quando possível

RETORNE APENAS JSON VÁLIDO, sem markdown ou explicações:
{
  "products": [
    {
      "title": "nome completo do produto",
      "price": 999.99,
      "url": "link do produto (completo ou relativo)",
      "image": "url da imagem",
      "seller": "vendedor ou loja"
    }
  ]
}`
                },
                {
                  role: 'user',
                  content: `Site: ${site}\nBusca: "${query}"\n\nExtraia os produtos deste conteúdo:\n\n${data.data.markdown?.substring(0, 25000) || data.data.html?.substring(0, 25000) || ''}`
                }
              ],
            }),
          });

          console.log(`[Firecrawl Search] Status IA: ${aiResponse.status}`);

          if (!aiResponse.ok) {
            const aiError = await aiResponse.text();
            console.error('[Firecrawl Search] Erro IA:', aiError);
            continue;
          }

          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || '';
          console.log(`[Firecrawl Search] Resposta IA (${content.length} chars):`, content.substring(0, 200));
          
          try {
            // Tentar extrair JSON da resposta
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              console.log(`[Firecrawl Search] Produtos extraídos: ${parsed.products?.length || 0}`);
              
              if (parsed.products && Array.isArray(parsed.products)) {
                parsed.products.forEach((p: any) => {
                  // Construir URL completa se necessário
                  let productUrl = p.url || '';
                  if (productUrl && !productUrl.startsWith('http')) {
                    if (site.includes('mercadolivre')) {
                      productUrl = `https://www.mercadolivre.com.br${productUrl.startsWith('/') ? '' : '/'}${productUrl}`;
                    }
                  }

                  results.push({
                    title: p.title || 'Produto sem nome',
                    price: typeof p.price === 'number' ? p.price : parseFloat(String(p.price || '0').replace(/[^\d.,]/g, '').replace(',', '.')) || 0,
                    url: productUrl,
                    image: p.image || '',
                    seller: p.seller || site,
                    site: site,
                  });
                });
              }
            } else {
              console.error('[Firecrawl Search] JSON não encontrado na resposta da IA');
            }
          } catch (parseErr) {
            console.error('[Firecrawl Search] Erro ao parsear resposta IA:', parseErr);
          }
        } else {
          console.log('[Firecrawl Search] Firecrawl não retornou dados válidos');
        }
      } catch (siteError) {
        console.error(`[Firecrawl Search] Erro no site ${site}:`, siteError);
      }
    }

    // Ordenar por preço e limitar
    results.sort((a, b) => (a.price || 999999) - (b.price || 999999));
    const limitedResults = results.filter(r => r.price > 0).slice(0, limit);

    console.log(`[Firecrawl Search] Total encontrado: ${results.length}, Retornando: ${limitedResults.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        results: limitedResults,
        total: limitedResults.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Firecrawl Search] Erro geral:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro ao buscar com Firecrawl',
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
