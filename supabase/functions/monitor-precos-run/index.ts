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
        produto:produtos(id, nome, codigo, ean_13, estabelecimento_id, preco_venda),
        fonte:fontes_pesquisa_precos(id, nome_fonte, tipo, config_json, estabelecimento_id, ativo)
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
            resultado = await buscarPrecoPorAPI(fonte, produto, mapeamento, termoBusca, termoAlternativo);
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
 * Suporta: Mercado Livre (MLB), Amazon (futuro), Magalu (futuro)
 * 
 * O termo de busca principal é o NOME DO PRODUTO.
 * EAN/SKU são usados apenas para validação/refinamento.
 */
async function buscarPrecoPorAPI(
  fonte: any, 
  produto: any, 
  mapeamento: any, 
  termoBusca: string,
  termoAlternativo?: string
): Promise<{ nome_anuncio: string; preco_encontrado: number; url_anuncio: string; detalhes: any } | null> {
  const config = fonte.config_json || {};
  const tipoApi = config.tipo_api || 'mercado_livre';

  console.log(`[API] Iniciando busca via ${tipoApi} para: "${termoBusca}"`);

  if (tipoApi === 'mercado_livre') {
    return buscarPrecoMercadoLivre(fonte, produto, mapeamento, termoBusca, termoAlternativo, config);
  }

  // TODO: Implementar outras APIs
  // if (tipoApi === 'amazon') { return buscarPrecoAmazon(fonte, produto, mapeamento, termoBusca, config); }
  // if (tipoApi === 'magalu') { return buscarPrecoMagalu(fonte, produto, mapeamento, termoBusca, config); }

  console.log(`[API] Tipo de API não suportado: ${tipoApi}`);
  return null;
}

/**
 * Busca preço no Mercado Livre usando o NOME DO PRODUTO como base.
 * Utiliza a API pública de buscas:
 *   GET https://api.mercadolibre.com/sites/{site_id}/search?q={termo}&limit={limite}
 */
async function buscarPrecoMercadoLivre(
  fonte: any,
  produto: any,
  mapeamento: any,
  termoBusca: string,
  termoAlternativo: string | undefined,
  config: any
): Promise<{ nome_anuncio: string; preco_encontrado: number; url_anuncio: string; detalhes: any } | null> {
  const siteId = config.site_id || 'MLB'; // Brasil
  const limite = config.limite_resultados || 10;

  if (!termoBusca) {
    console.log(`[ML] Produto ${produto.id} sem termo de busca/nome`);
    return null;
  }

  // 1) Monta URL da busca
  const query = encodeURIComponent(termoBusca);
  const url = `https://api.mercadolibre.com/sites/${siteId}/search?q=${query}&limit=${limite}`;

  console.log(`[ML] Buscando: "${termoBusca}" (produto_id: ${produto.id})`);
  console.log(`[ML] URL: ${url}`);

  try {
    // 2) Faz a requisição
    const resp = await fetch(url);
    
    if (!resp.ok) {
      const body = await resp.text();
      console.error(`[ML] Erro HTTP: ${resp.status}`, body);
      throw new Error(`Erro na API Mercado Livre: ${resp.status}`);
    }

    const json = await resp.json();
    const resultados = json.results || [];

    console.log(`[ML] Encontrados ${resultados.length} resultados`);

    if (!resultados.length) {
      // Se não encontrou, tenta com termo alternativo
      if (termoAlternativo) {
        console.log(`[ML] Tentando termo alternativo: "${termoAlternativo}"`);
        const queryAlt = encodeURIComponent(termoAlternativo);
        const urlAlt = `https://api.mercadolibre.com/sites/${siteId}/search?q=${queryAlt}&limit=${limite}`;
        
        const respAlt = await fetch(urlAlt);
        if (respAlt.ok) {
          const jsonAlt = await respAlt.json();
          const resultadosAlt = jsonAlt.results || [];
          if (resultadosAlt.length > 0) {
            return processarResultadosMercadoLivre(produto, mapeamento, resultadosAlt, termoAlternativo);
          }
        }
      }
      
      console.log(`[ML] Nenhum resultado para "${termoBusca}"`);
      return null;
    }

    return processarResultadosMercadoLivre(produto, mapeamento, resultados, termoBusca);

  } catch (e) {
    console.error(`[ML] Erro ao buscar produto ${produto.id}:`, e);
    throw e;
  }
}

/**
 * Processa os resultados do Mercado Livre e retorna o melhor resultado
 */
function processarResultadosMercadoLivre(
  produto: any,
  mapeamento: any,
  resultados: any[],
  termoBuscaUsado: string
): { nome_anuncio: string; preco_encontrado: number; url_anuncio: string; detalhes: any } | null {
  
  let resultadosFiltrados = [...resultados];
  
  // Filtra por EAN se disponível e configurado (como validação)
  if (produto.ean_13 && mapeamento?.chave_correspondencia === 'usar_ean') {
    const comEan = resultados.filter(r => {
      const attrs = r.attributes || [];
      const gtinAttr = attrs.find((a: any) => 
        a.id === 'GTIN' || a.id === 'EAN' || a.id === 'GTIN_EAN'
      );
      return gtinAttr && gtinAttr.value_name === produto.ean_13;
    });
    
    if (comEan.length > 0) {
      resultadosFiltrados = comEan;
      console.log(`[ML] Encontrado ${comEan.length} resultado(s) com EAN correspondente`);
    }
  }

  // Ordena por preço (menor primeiro) e pega o melhor
  resultadosFiltrados.sort((a, b) => (a.price || 0) - (b.price || 0));
  const r = resultadosFiltrados[0];

  const nomeAnuncio = r.title;
  const precoEncontrado = Number(r.price || 0);
  const urlAnuncio = r.permalink;

  console.log(`[ML] Melhor resultado: "${nomeAnuncio}" - R$ ${precoEncontrado}`);

  return {
    nome_anuncio: nomeAnuncio,
    preco_encontrado: precoEncontrado,
    url_anuncio: urlAnuncio,
    detalhes: {
      termo_busca_usado: termoBuscaUsado,
      total_resultados: resultados.length,
      total_filtrados: resultadosFiltrados.length,
      item_id: r.id,
      seller_id: r.seller?.id,
      seller_nickname: r.seller?.nickname,
      condition: r.condition,
      listing_type_id: r.listing_type_id,
      shipping_free: r.shipping?.free_shipping,
      available_quantity: r.available_quantity,
      sold_quantity: r.sold_quantity,
      catalog_product_id: r.catalog_product_id,
      attributes: r.attributes,
      original_price: r.original_price,
      thumbnail: r.thumbnail,
    }
  };
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
  
  try {
    const response = await fetch(urlBusca, { 
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
    });

    if (!response.ok) {
      console.log(`[Scraping] Erro HTTP: ${response.status}`);
      return null;
    }

    const html = await response.text();

    // Extrai preço usando regex configurado
    const regexPreco = config.regex_preco || 'R\\$\\s*([\\d.,]+)';
    const matchPreco = html.match(new RegExp(regexPreco));
    
    if (!matchPreco || !matchPreco[1]) {
      console.log(`[Scraping] Preço não encontrado na página`);
      return null;
    }

    const precoStr = matchPreco[1].replace(/\./g, '').replace(',', '.');
    const precoEncontrado = parseFloat(precoStr);
    
    if (isNaN(precoEncontrado)) {
      console.log(`[Scraping] Preço inválido: ${matchPreco[1]}`);
      return null;
    }

    // Extrai título se configurado
    let nomeAnuncio = 'Produto encontrado';
    if (config.regex_titulo) {
      const matchTitulo = html.match(new RegExp(config.regex_titulo));
      if (matchTitulo && matchTitulo[1]) {
        nomeAnuncio = matchTitulo[1].trim();
      }
    }

    console.log(`[Scraping] Encontrado: "${nomeAnuncio}" - R$ ${precoEncontrado}`);

    return {
      nome_anuncio: nomeAnuncio,
      preco_encontrado: precoEncontrado,
      url_anuncio: urlBusca,
      detalhes: {
        metodo: 'scraping',
        termo_busca: termoBusca,
        regex_preco: regexPreco,
        regex_titulo: config.regex_titulo,
      }
    };

  } catch (e) {
    console.error(`[Scraping] Erro:`, e);
    return null;
  }
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
    .select('id, nome_arquivo')
    .eq('fonte_id', fonte.id)
    .order('data_importacao', { ascending: false })
    .limit(1);

  if (!arquivos || arquivos.length === 0) {
    console.log(`[Arquivo] Nenhum arquivo encontrado para fonte ${fonte.nome_fonte}`);
    return null;
  }

  const arquivo = arquivos[0];

  // Buscar linhas que correspondam ao produto
  // Priorizar busca por nome (similaridade)
  const { data: linhas } = await supabase
    .from('linhas_arquivo_precos')
    .select('*')
    .eq('arquivo_id', arquivo.id);

  if (!linhas || linhas.length === 0) {
    console.log(`[Arquivo] Nenhuma linha encontrada no arquivo ${arquivo.nome_arquivo}`);
    return null;
  }

  console.log(`[Arquivo] Buscando "${termoBusca}" em ${linhas.length} linhas`);

  // Encontrar a melhor correspondência por nome
  const termoNormalizado = termoBusca.toLowerCase().trim();
  let melhorMatch = null;
  let melhorScore = 0;

  for (const linha of linhas) {
    const nomeArquivo = (linha.nome_produto || '').toLowerCase().trim();
    
    // Calcular score de similaridade
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
      const comuns = palavrasTermo.filter((p: string) => 
        palavrasArquivo.some((pa: string) => pa.includes(p) || p.includes(pa))
      );
      score = (comuns.length / Math.max(palavrasTermo.length, 1)) * 50;
    }

    // Bonus se EAN/SKU batem (validação)
    if (mapeamento.chave_correspondencia === 'usar_ean' && produto.ean_13 && linha.ean === produto.ean_13) {
      score += 30;
    }
    if (mapeamento.chave_correspondencia === 'usar_sku' && produto.codigo && linha.sku === produto.codigo) {
      score += 30;
    }

    if (score > melhorScore && linha.preco) {
      melhorScore = score;
      melhorMatch = linha;
    }
  }

  // Aceitar apenas se score > 50
  if (melhorMatch && melhorScore > 50) {
    console.log(`[Arquivo] Match encontrado: "${melhorMatch.nome_produto}" (score: ${melhorScore})`);
    
    return {
      nome_anuncio: melhorMatch.nome_produto,
      preco_encontrado: Number(melhorMatch.preco),
      url_anuncio: '',
      detalhes: {
        arquivo_id: arquivo.id,
        nome_arquivo: arquivo.nome_arquivo,
        score: melhorScore,
        ean_match: melhorMatch.ean === produto.ean_13,
        sku_match: melhorMatch.sku === produto.codigo,
        raw: melhorMatch.raw_json
      }
    };
  }

  console.log(`[Arquivo] Nenhum match com score suficiente (melhor: ${melhorScore})`);
  return null;
}
