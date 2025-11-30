import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, limit = 20, site_id = 'MLB' } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[ML Search] Buscando: "${query}" (limit: ${limit}, site: ${site_id})`);

    // Tentar múltiplos endpoints/abordagens
    const endpoints = [
      `https://api.mercadolibre.com/sites/${site_id}/search?q=${encodeURIComponent(query)}&limit=${limit}`,
    ];

    let lastError = null;
    
    for (const url of endpoints) {
      try {
        console.log(`[ML Search] Tentando: ${url}`);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': '*/*',
          }
        });

        console.log(`[ML Search] Status: ${response.status}`);

        if (response.ok) {
          const data = await response.json();
          console.log(`[ML Search] Sucesso! ${data.results?.length || 0} resultados`);
          
          return new Response(
            JSON.stringify(data),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        lastError = `Status ${response.status}`;
      } catch (e) {
        lastError = e instanceof Error ? e.message : 'Unknown error';
        console.error(`[ML Search] Erro no endpoint: ${lastError}`);
      }
    }

    // Se todos falharam, retornar dados simulados para teste
    console.log(`[ML Search] Todos endpoints falharam, retornando dados de demonstração`);
    
    // Dados de demonstração para teste da interface
    const mockData = {
      site_id: site_id,
      query: query,
      paging: { total: 0, offset: 0, limit: limit },
      results: [],
      _demo: true,
      _message: "API do Mercado Livre temporariamente indisponível. Configure suas credenciais OAuth para acesso completo."
    };

    return new Response(
      JSON.stringify(mockData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ML Search] Erro:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
