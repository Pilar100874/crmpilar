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

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[Firecrawl Search] Erro no site ${site}:`, errorText);
          continue;
        }

        const data = await response.json();
        
        if (data.success && data.data) {
          // Usar IA para extrair produtos do conteúdo
          const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
          
          if (LOVABLE_API_KEY) {
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
                    content: `Você é um extrator de dados de produtos. Extraia os produtos do conteúdo fornecido.

RETORNE APENAS JSON VÁLIDO, sem markdown:
{
  "products": [
    {
      "title": "nome do produto",
      "price": 999.99,
      "url": "link do produto",
      "image": "url da imagem",
      "seller": "nome do vendedor"
    }
  ]
}

Extraia no máximo 10 produtos. Converta preços para número (ex: R$ 1.299,00 -> 1299.00).`
                  },
                  {
                    role: 'user',
                    content: `Site: ${site}\nBusca: ${query}\n\nConteúdo:\n${data.data.markdown?.substring(0, 30000) || data.data.html?.substring(0, 30000) || ''}`
                  }
                ],
              }),
            });

            if (aiResponse.ok) {
              const aiData = await aiResponse.json();
              const content = aiData.choices?.[0]?.message?.content || '';
              
              try {
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  const parsed = JSON.parse(jsonMatch[0]);
                  if (parsed.products && Array.isArray(parsed.products)) {
                    parsed.products.forEach((p: any) => {
                      results.push({
                        title: p.title,
                        price: typeof p.price === 'number' ? p.price : parseFloat(String(p.price).replace(/[^\d.,]/g, '').replace(',', '.')) || 0,
                        url: p.url,
                        image: p.image,
                        seller: p.seller || site,
                        site: site,
                      });
                    });
                  }
                }
              } catch (parseErr) {
                console.error('[Firecrawl Search] Erro ao parsear resposta IA:', parseErr);
              }
            }
          }
        }
      } catch (siteError) {
        console.error(`[Firecrawl Search] Erro no site ${site}:`, siteError);
      }
    }

    // Ordenar por preço e limitar
    results.sort((a, b) => (a.price || 999999) - (b.price || 999999));
    const limitedResults = results.filter(r => r.price > 0).slice(0, limit);

    console.log(`[Firecrawl Search] Retornando ${limitedResults.length} resultados`);

    return new Response(
      JSON.stringify({
        success: true,
        results: limitedResults,
        total: limitedResults.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Firecrawl Search] Erro:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro ao buscar com Firecrawl',
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
