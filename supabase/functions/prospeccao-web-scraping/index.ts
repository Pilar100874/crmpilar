import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Diretórios públicos para buscar empresas
const DIRETORIOS = {
  telelistas: {
    name: 'TeleListas',
    searchUrl: (termo: string, cidade: string, uf: string) => 
      `https://www.telelistas.net/busca/${uf.toLowerCase()}/${cidade.toLowerCase().replace(/\s+/g, '-')}/${encodeURIComponent(termo)}`,
  },
  guiamais: {
    name: 'Guia Mais',
    searchUrl: (termo: string, cidade: string, uf: string) =>
      `https://www.guiamais.com.br/busca/${cidade.toLowerCase().replace(/\s+/g, '-')}-${uf.toLowerCase()}/${encodeURIComponent(termo)}`,
  },
  apontador: {
    name: 'Apontador',
    searchUrl: (termo: string, cidade: string, uf: string) =>
      `https://www.apontador.com.br/local/${uf.toLowerCase()}/${cidade.toLowerCase().replace(/\s+/g, '_')}/busca/${encodeURIComponent(termo)}`,
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { termo, cidade, uf, firecrawl_api_key, limit = 20 } = await req.json();

    if (!termo || !cidade || !uf) {
      return new Response(
        JSON.stringify({ error: 'Termo de busca, cidade e UF são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!firecrawl_api_key) {
      return new Response(
        JSON.stringify({ error: 'API Key do Firecrawl é obrigatória. Configure nas opções de Web Scraping.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Web Scraping] Buscando "${termo}" em ${cidade}/${uf}`);

    const results: any[] = [];
    const errors: string[] = [];

    // Tentar cada diretório
    for (const [key, diretorio] of Object.entries(DIRETORIOS)) {
      try {
        const searchUrl = diretorio.searchUrl(termo, cidade, uf);
        console.log(`[Web Scraping] Scraping ${diretorio.name}: ${searchUrl}`);

        // Usar Firecrawl para fazer scraping
        const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawl_api_key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: searchUrl,
            formats: ['markdown', 'html'],
            onlyMainContent: true,
            timeout: 30000,
          }),
        });

        console.log(`[Web Scraping] Status Firecrawl (${diretorio.name}): ${response.status}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[Web Scraping] Erro ${diretorio.name}:`, errorText);
          
          // Verificar se é erro de API key
          if (response.status === 401 || response.status === 403) {
            return new Response(
              JSON.stringify({ 
                error: 'API Key do Firecrawl inválida ou expirada. Verifique a chave nas configurações.',
                success: false 
              }),
              { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          errors.push(`${diretorio.name}: ${response.status}`);
          continue;
        }

        const data = await response.json();
        
        if (!data.success || !data.data) {
          console.log(`[Web Scraping] ${diretorio.name} sem dados`);
          continue;
        }

        const contentLength = (data.data.markdown?.length || 0) + (data.data.html?.length || 0);
        console.log(`[Web Scraping] ${diretorio.name} conteúdo: ${contentLength} chars`);

        if (contentLength < 200) {
          console.log(`[Web Scraping] ${diretorio.name} conteúdo muito curto`);
          continue;
        }

        // Usar IA para extrair empresas
        const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
        
        if (!LOVABLE_API_KEY) {
          console.error('[Web Scraping] LOVABLE_API_KEY não configurada');
          continue;
        }

        console.log(`[Web Scraping] Extraindo empresas de ${diretorio.name} com IA...`);

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
                content: `Você é um extrator de dados de empresas de diretórios online brasileiros.
Analise o conteúdo e extraia TODAS as empresas listadas.

REGRAS:
1. Extraia nome, telefone, endereço, bairro, cidade, e qualquer outro dado disponível
2. Telefones devem estar no formato original (com DDD)
3. Se não encontrar algum dado, deixe como null
4. Máximo de 20 empresas

RETORNE APENAS JSON VÁLIDO, sem markdown ou explicações:
{
  "empresas": [
    {
      "nome": "Nome da Empresa",
      "telefone": "(11) 1234-5678",
      "celular": "(11) 91234-5678",
      "endereco": "Rua Exemplo, 123",
      "bairro": "Centro",
      "cidade": "São Paulo",
      "uf": "SP",
      "cep": "01234-567",
      "email": "contato@empresa.com",
      "website": "www.empresa.com",
      "categoria": "Restaurante",
      "descricao": "Descrição breve se disponível"
    }
  ]
}`
              },
              {
                role: 'user',
                content: `Diretório: ${diretorio.name}
Busca: "${termo}" em ${cidade}/${uf}

Extraia as empresas deste conteúdo:

${data.data.markdown?.substring(0, 30000) || data.data.html?.substring(0, 30000) || ''}`
              }
            ],
          }),
        });

        console.log(`[Web Scraping] Status IA: ${aiResponse.status}`);

        if (!aiResponse.ok) {
          const aiError = await aiResponse.text();
          console.error('[Web Scraping] Erro IA:', aiError);
          continue;
        }

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content || '';
        console.log(`[Web Scraping] Resposta IA (${content.length} chars)`);

        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            console.log(`[Web Scraping] Empresas extraídas de ${diretorio.name}: ${parsed.empresas?.length || 0}`);

            if (parsed.empresas && Array.isArray(parsed.empresas)) {
              parsed.empresas.forEach((e: any) => {
                // Verificar se já existe nos resultados (evitar duplicatas)
                const exists = results.some(r => 
                  r.nome?.toLowerCase() === e.nome?.toLowerCase() ||
                  (r.telefone && r.telefone === e.telefone)
                );

                if (!exists && e.nome) {
                  results.push({
                    nome: e.nome,
                    telefone: e.telefone || null,
                    celular: e.celular || null,
                    endereco: e.endereco || null,
                    bairro: e.bairro || null,
                    cidade: e.cidade || cidade,
                    uf: e.uf || uf,
                    cep: e.cep || null,
                    email: e.email || null,
                    website: e.website || null,
                    categoria: e.categoria || termo,
                    descricao: e.descricao || null,
                    fonte: diretorio.name,
                  });
                }
              });
            }
          }
        } catch (parseErr) {
          console.error(`[Web Scraping] Erro ao parsear ${diretorio.name}:`, parseErr);
        }

        // Se já temos resultados suficientes, parar
        if (results.length >= limit) {
          break;
        }

      } catch (dirError) {
        console.error(`[Web Scraping] Erro ${key}:`, dirError);
        errors.push(`${DIRETORIOS[key as keyof typeof DIRETORIOS].name}: ${dirError instanceof Error ? dirError.message : 'Erro'}`);
      }
    }

    const limitedResults = results.slice(0, limit);
    console.log(`[Web Scraping] Total encontrado: ${results.length}, Retornando: ${limitedResults.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        empresas: limitedResults,
        total: limitedResults.length,
        fontes_consultadas: Object.values(DIRETORIOS).map(d => d.name),
        erros: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Web Scraping] Erro geral:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro ao buscar empresas',
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
