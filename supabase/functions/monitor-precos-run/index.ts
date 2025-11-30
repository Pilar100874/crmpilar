import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * REGRA IMPORTANTE:
 * - A MAIOR PARTE DAS PESQUISAS DE PREÇO DEVE SER FEITA USANDO O **NOME DO PRODUTO**.
 * - EAN/SKU só devem ser usados como apoio para:
 *   - filtrar resultados
 *   - validar se o produto encontrado confere com o meu
 */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Buscar todos os mapeamentos ativos com produtos e fontes
    const { data: mapeamentos, error: mapError } = await supabase
      .from('produtos_fontes_precos')
      .select(`
        *,
        produto:produtos(id, nome, sku, ean, estabelecimento_id),
        fonte:fontes_pesquisa_precos(id, nome_fonte, tipo, config_json, estabelecimento_id)
      `)
      .eq('ativo', true);

    if (mapError) throw mapError;

    let produtosProcessados = 0;
    let fontesProcessadas = new Set();
    let registrosInseridos = 0;

    for (const mapeamento of mapeamentos || []) {
      const produto = mapeamento.produto;
      const fonte = mapeamento.fonte;

      if (!produto || !fonte || !fonte.ativo) continue;

      produtosProcessados++;
      fontesProcessadas.add(fonte.id);

      try {
        let resultado = null;

        // Termo de busca: prioriza o configurado, senão usa nome do produto
        const termoBusca = mapeamento.termo_busca || produto.nome;
        const termoAlternativo = mapeamento.termo_busca_alternativo;

        switch (fonte.tipo) {
          case 'api':
            resultado = await buscarPrecoPorAPI(fonte, produto, mapeamento, termoBusca);
            break;
          case 'scraping':
            resultado = await buscarPrecoPorScraping(fonte, produto, mapeamento, termoBusca);
            break;
          case 'arquivo_importado':
            resultado = await buscarPrecoPorArquivoImportado(supabase, fonte, produto, mapeamento, termoBusca);
            break;
        }

        if (resultado) {
          // Inserir no histórico
          const { error: insertError } = await supabase
            .from('historico_precos_concorrentes')
            .insert({
              estabelecimento_id: produto.estabelecimento_id,
              produto_id: produto.id,
              fonte_id: fonte.id,
              nome_anuncio: resultado.nome_anuncio,
              preco_encontrado: resultado.preco_encontrado,
              url_anuncio: resultado.url_anuncio,
              detalhes_json: resultado.detalhes
            });

          if (!insertError) {
            registrosInseridos++;
          }

          // Log de sucesso
          await supabase.from('logs_monitor_preco').insert({
            estabelecimento_id: produto.estabelecimento_id,
            fonte_id: fonte.id,
            tipo: 'info',
            mensagem: `Preço encontrado para "${produto.nome}": R$ ${resultado.preco_encontrado}`,
            detalhes: { termo_busca: termoBusca, resultado }
          });
        }
      } catch (error) {
        // Log de erro
        const err = error as Error;
        await supabase.from('logs_monitor_preco').insert({
          estabelecimento_id: produto.estabelecimento_id,
          fonte_id: fonte.id,
          tipo: 'erro',
          mensagem: `Erro ao buscar preço para "${produto.nome}": ${err.message}`,
          detalhes: { erro: err.message }
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        produtos_processados: produtosProcessados,
        fontes_processadas: fontesProcessadas.size,
        registros_inseridos: registrosInseridos
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const error = err as Error;
    console.error("[Monitor Preços] Erro:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Busca preço via API
 * TODO: Implementar integrações específicas (Mercado Livre, Amazon, etc.)
 * 
 * O termo de busca principal é o NOME DO PRODUTO.
 * EAN/SKU são usados apenas para validação/refinamento.
 */
async function buscarPrecoPorAPI(
  fonte: any, 
  produto: any, 
  mapeamento: any, 
  termoBusca: string
): Promise<{ nome_anuncio: string; preco_encontrado: number; url_anuncio: string; detalhes: any } | null> {
  const config = fonte.config_json || {};
  
  // TODO: Implementar chamadas reais de API aqui
  // Exemplo de estrutura:
  // const baseUrl = config.base_url;
  // const searchEndpoint = config.search_endpoint;
  // const accessToken = config.access_token;
  
  // Para APIs que suportam filtro por EAN/SKU, usar como refinamento:
  // const ean = produto.ean;
  // const sku = produto.sku;
  // const usarEan = mapeamento.chave_correspondencia === 'usar_ean';
  // const usarSku = mapeamento.chave_correspondencia === 'usar_sku';

  console.log(`[API] Buscando "${termoBusca}" em ${fonte.nome_fonte}`);
  
  // Retorna null por enquanto (placeholder)
  // Quando implementado, retornar:
  // return {
  //   nome_anuncio: "Nome do anúncio encontrado",
  //   preco_encontrado: 99.90,
  //   url_anuncio: "https://...",
  //   detalhes: { ... }
  // };
  
  return null;
}

/**
 * Busca preço via Scraping
 * IMPORTANTE: Usar apenas em sites com permissão e respeitando termos de uso
 * 
 * O termo de busca principal é o NOME DO PRODUTO.
 */
async function buscarPrecoPorScraping(
  fonte: any, 
  produto: any, 
  mapeamento: any, 
  termoBusca: string
): Promise<{ nome_anuncio: string; preco_encontrado: number; url_anuncio: string; detalhes: any } | null> {
  const config = fonte.config_json || {};
  
  // Se tem URL direta configurada, usar ela
  let urlBusca = mapeamento.url_direta;
  
  if (!urlBusca && config.url_busca) {
    // Substituir {TERMO} pelo nome do produto
    urlBusca = config.url_busca.replace('{TERMO}', encodeURIComponent(termoBusca));
  }
  
  if (!urlBusca) {
    console.log(`[Scraping] URL não configurada para ${fonte.nome_fonte}`);
    return null;
  }

  console.log(`[Scraping] Buscando em: ${urlBusca}`);
  
  // TODO: Implementar scraping real aqui
  // Usar config.seletor_preco, config.seletor_nome, config.seletor_link
  // Respeitar config.timeout_ms
  
  // const response = await fetch(urlBusca, { 
  //   headers: { 'User-Agent': '...' },
  //   signal: AbortSignal.timeout(config.timeout_ms || 5000)
  // });
  // const html = await response.text();
  // Parsear HTML e extrair dados usando os seletores
  
  return null;
}

/**
 * Busca preço em arquivo importado
 * 
 * O termo de busca principal é o NOME DO PRODUTO.
 * EAN/SKU são usados para validação adicional.
 */
async function buscarPrecoPorArquivoImportado(
  supabase: any,
  fonte: any, 
  produto: any, 
  mapeamento: any, 
  termoBusca: string
): Promise<{ nome_anuncio: string; preco_encontrado: number; url_anuncio: string; detalhes: any } | null> {
  // Buscar o arquivo mais recente desta fonte
  const { data: arquivos } = await supabase
    .from('arquivos_precos_importados')
    .select('id')
    .eq('fonte_id', fonte.id)
    .order('data_importacao', { ascending: false })
    .limit(1);

  if (!arquivos || arquivos.length === 0) {
    console.log(`[Arquivo] Nenhum arquivo encontrado para fonte ${fonte.nome_fonte}`);
    return null;
  }

  const arquivoId = arquivos[0].id;

  // Buscar linhas que correspondam ao produto
  // Priorizar busca por nome (similaridade)
  const { data: linhas } = await supabase
    .from('linhas_arquivo_precos')
    .select('*')
    .eq('arquivo_id', arquivoId);

  if (!linhas || linhas.length === 0) {
    return null;
  }

  // Encontrar a melhor correspondência por nome
  const termoNormalizado = termoBusca.toLowerCase().trim();
  let melhorMatch = null;
  let melhorScore = 0;

  for (const linha of linhas) {
    const nomeArquivo = (linha.nome_produto || '').toLowerCase().trim();
    
    // Calcular score de similaridade simples
    let score = 0;
    
    // Correspondência exata
    if (nomeArquivo === termoNormalizado) {
      score = 100;
    }
    // Contém o termo
    else if (nomeArquivo.includes(termoNormalizado) || termoNormalizado.includes(nomeArquivo)) {
      score = 70;
    }
    // Palavras em comum
    else {
      const palavrasTermo = termoNormalizado.split(/\s+/);
      const palavrasArquivo = nomeArquivo.split(/\s+/);
      const comuns = palavrasTermo.filter((p: string) => palavrasArquivo.some((pa: string) => pa.includes(p) || p.includes(pa)));
      score = (comuns.length / Math.max(palavrasTermo.length, 1)) * 50;
    }

    // Bonus se EAN/SKU batem (validação)
    if (mapeamento.chave_correspondencia === 'usar_ean' && produto.ean && linha.ean === produto.ean) {
      score += 30;
    }
    if (mapeamento.chave_correspondencia === 'usar_sku' && produto.sku && linha.sku === produto.sku) {
      score += 30;
    }

    if (score > melhorScore && linha.preco) {
      melhorScore = score;
      melhorMatch = linha;
    }
  }

  // Aceitar apenas se score > 50
  if (melhorMatch && melhorScore > 50) {
    return {
      nome_anuncio: melhorMatch.nome_produto,
      preco_encontrado: Number(melhorMatch.preco),
      url_anuncio: '',
      detalhes: {
        arquivo_id: arquivoId,
        score: melhorScore,
        ean_match: melhorMatch.ean === produto.ean,
        sku_match: melhorMatch.sku === produto.sku,
        raw: melhorMatch.raw_json
      }
    };
  }

  return null;
}
