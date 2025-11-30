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
    const { 
      query, 
      limit = 20, 
      site_id = 'MLB',
      client_id,
      client_secret,
      access_token 
    } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[ML Search] Buscando: "${query}" (limit: ${limit}, site: ${site_id})`);
    console.log(`[ML Search] OAuth configurado: ${client_id ? 'Sim' : 'Não'}`);

    let authToken = access_token;

    // Se tem client_id/secret mas não tem access_token, tentar obter um
    if (client_id && client_secret && !access_token) {
      console.log('[ML Search] Tentando obter access_token via OAuth...');
      
      try {
        const tokenResponse = await fetch('https://api.mercadolibre.com/oauth/token', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: client_id,
            client_secret: client_secret,
          }),
        });

        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          authToken = tokenData.access_token;
          console.log('[ML Search] Access token obtido com sucesso');
        } else {
          const errorText = await tokenResponse.text();
          console.error('[ML Search] Erro ao obter token:', errorText);
        }
      } catch (tokenError) {
        console.error('[ML Search] Erro na requisição de token:', tokenError);
      }
    }

    // Fazer a busca com ou sem autenticação
    const searchUrl = `https://api.mercadolibre.com/sites/${site_id}/search?q=${encodeURIComponent(query)}&limit=${limit}`;
    
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
      console.log('[ML Search] Usando autenticação OAuth');
    }

    const response = await fetch(searchUrl, {
      method: 'GET',
      headers,
    });

    console.log(`[ML Search] Status da resposta: ${response.status}`);

    if (response.ok) {
      const data = await response.json();
      console.log(`[ML Search] Sucesso! ${data.results?.length || 0} resultados`);
      
      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Se falhou, verificar se é 403 e sugerir configurar OAuth
    const errorText = await response.text();
    console.error(`[ML Search] Erro na API: ${response.status} - ${errorText}`);

    if (response.status === 403 && !authToken) {
      return new Response(
        JSON.stringify({
          site_id: site_id,
          query: query,
          paging: { total: 0, offset: 0, limit: limit },
          results: [],
          _requires_auth: true,
          _message: "A API do Mercado Livre requer autenticação OAuth. Configure suas credenciais (Client ID e Client Secret) na fonte de pesquisa."
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        error: `API Error: ${response.status}`, 
        details: errorText,
        _requires_auth: response.status === 403
      }),
      { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
