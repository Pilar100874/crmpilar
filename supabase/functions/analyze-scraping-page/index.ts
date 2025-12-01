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

// Detecta a plataforma de e-commerce
function detectPlatform(url: string, html: string): string {
  if (isVtexStore(url, html)) return 'vtex';
  if (html.includes('Shopify') || html.includes('cdn.shopify.com')) return 'shopify';
  if (html.includes('woocommerce') || html.includes('wp-content')) return 'woocommerce';
  if (html.includes('magento') || html.includes('Magento_')) return 'magento';
  if (html.includes('tray.com.br') || html.includes('Tray')) return 'tray';
  if (html.includes('nuvemshop') || html.includes('Nuvemshop')) return 'nuvemshop';
  if (html.includes('loja integrada') || html.includes('lojaintegrada')) return 'loja_integrada';
  return 'unknown';
}

// Gera URL de busca baseado na plataforma
function generateSearchUrlPattern(url: string, platform: string): string {
  const baseUrl = new URL(url).origin;
  
  switch (platform) {
    case 'vtex':
      return `${baseUrl}/{TERMO}?_q={TERMO}&map=ft`;
    case 'shopify':
      return `${baseUrl}/search?q={TERMO}`;
    case 'woocommerce':
      return `${baseUrl}/?s={TERMO}&post_type=product`;
    case 'magento':
      return `${baseUrl}/catalogsearch/result/?q={TERMO}`;
    default:
      // Try to detect from current URL
      if (url.includes('?')) {
        return url.replace(/q=[^&]+/, 'q={TERMO}')
                  .replace(/search=[^&]+/, 'search={TERMO}')
                  .replace(/_q=[^&]+/, '_q={TERMO}')
                  .replace(/ft=[^&]+/, 'ft={TERMO}');
      }
      return `${baseUrl}/busca?q={TERMO}`;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL é obrigatória' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching URL:', url);

    // Fetch the page HTML
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    if (!response.ok) {
      throw new Error(`Erro ao acessar página: ${response.status}`);
    }

    const html = await response.text();
    console.log('HTML fetched, size:', html.length);
    
    // Detect platform
    const platform = detectPlatform(url, html);
    console.log('Platform detected:', platform);
    
    // If it's a VTEX store, return optimized config
    if (platform === 'vtex') {
      const baseUrl = new URL(url).origin;
      return new Response(
        JSON.stringify({
          success: true,
          config: {
            container_produto: '.vtex-search-result-3-x-galleryItem, .vtex-product-summary-2-x-container, [class*="productCard"], [class*="product-card"]',
            nome: '.vtex-product-summary-2-x-productBrand, .vtex-product-summary-2-x-productNameContainer, [class*="productName"], [class*="product-name"]',
            preco: '.vtex-product-price-1-x-sellingPrice, .vtex-product-price-1-x-currencyContainer, [class*="sellingPrice"], [class*="selling-price"]',
            link: 'a@href',
            regex_preco: 'R\\$\\s*([\\d.,]+)',
            url_busca_pattern: generateSearchUrlPattern(url, platform),
            confianca: 'alta',
            plataforma: 'vtex',
            nota: 'Site VTEX detectado. O sistema usará automaticamente a API do VTEX para buscar produtos com maior precisão.',
          },
          url_analisada: url,
          plataforma_detectada: platform,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // For other platforms, use AI analysis
    const htmlSample = html.substring(0, 50000);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      throw new Error('Configuração de IA não disponível');
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
            content: `Você é um especialista em web scraping. Analise o HTML fornecido de uma página de busca de e-commerce e identifique os seletores CSS para extrair informações de produtos.

IMPORTANTE: Retorne APENAS um JSON válido, sem markdown, sem explicações, sem código de blocos. Apenas o JSON puro.

O JSON deve ter esta estrutura exata:
{
  "container_produto": "seletor CSS do container de cada produto",
  "nome": "seletor CSS do nome/título do produto (relativo ao container)",
  "preco": "seletor CSS do preço do produto (relativo ao container)",
  "link": "seletor CSS ou atributo do link do produto (use formato seletor@atributo se precisar extrair atributo, ex: a@href)",
  "regex_preco": "regex para extrair valor numérico do preço, geralmente R\\$\\s*([\\d.,]+)",
  "url_busca_pattern": "padrão da URL de busca com {TERMO} no lugar do termo de busca",
  "confianca": "alta/media/baixa - nível de confiança na detecção"
}

Dicas:
- Procure por classes que contenham palavras como: product, item, card, resultado, listing
- Para preços, procure classes com: price, preco, valor, money
- Para nomes, procure: title, name, nome, description
- Links geralmente estão em tags <a> dentro do container do produto
- Se não encontrar um seletor claro, use o mais genérico possível`
          },
          {
            role: 'user',
            content: `Analise este HTML e identifique os seletores CSS para scraping de produtos. URL original: ${url}\n\nHTML:\n${htmlSample}`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error('Erro na análise de IA');
    }

    const aiResult = await aiResponse.json();
    const aiContent = aiResult.choices?.[0]?.message?.content || '';
    
    console.log('AI response:', aiContent);

    // Parse the AI response
    let config;
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        config = JSON.parse(jsonMatch[0]);
        config.plataforma = platform;
      } else {
        throw new Error('JSON não encontrado na resposta');
      }
    } catch (parseError) {
      console.error('Parse error:', parseError);
      // Return a default structure if parsing fails
      config = {
        container_produto: '',
        nome: '',
        preco: '',
        link: 'a@href',
        regex_preco: 'R\\$\\s*([\\d.,]+)',
        url_busca_pattern: generateSearchUrlPattern(url, platform),
        confianca: 'baixa',
        plataforma: platform,
        erro: 'Não foi possível detectar automaticamente. Configure manualmente.'
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        config,
        url_analisada: url,
        plataforma_detectada: platform,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao analisar página';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
