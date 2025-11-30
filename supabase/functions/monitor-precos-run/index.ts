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
 *   - validar se o produto encontrado confere com o meu (bonus no score)
 */

// ==================== HELPERS DE SIMILARIDADE ====================

/**
 * Normaliza texto: lowercase, remove acentos, remove caracteres especiais
 */
function normalizarTexto(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9\s]/g, ' ')    // remove especiais
    .replace(/\s+/g, ' ')            // múltiplos espaços -> um
    .trim();
}

/**
 * Calcula similaridade de Jaccard entre dois textos (0 a 1)
 * Baseado na interseção/união de tokens (palavras)
 */
function similaridadeNome(a: string, b: string): number {
  const tokensA = new Set(normalizarTexto(a).split(' ').filter(t => t.length > 1));
  const tokensB = new Set(normalizarTexto(b).split(' ').filter(t => t.length > 1));
  
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  
  const intersecao = new Set([...tokensA].filter(x => tokensB.has(x)));
  const uniao = new Set([...tokensA, ...tokensB]);
  
  return intersecao.size / uniao.size;
}

/**
 * Normaliza EAN: extrai apenas dígitos
 */
function normalizarEAN(ean: string | null | undefined): string {
  if (!ean) return '';
  return ean.replace(/\D/g, '');
}

/**
 * Extrai EANs/GTINs dos atributos do produto do Mercado Livre
 */
function extrairEansDosAtributos(attrs: any[]): Set<string> {
  const eans = new Set<string>();
  if (!attrs || !Array.isArray(attrs)) return eans;
  
  for (const attr of attrs) {
    const attrId = (attr.id || '').toUpperCase();
    const attrName = (attr.name || '').toUpperCase();
    
    // Verifica se é um atributo de EAN/GTIN
    if (attrId.includes('GTIN') || attrId.includes('EAN') || 
        attrName.includes('GTIN') || attrName.includes('EAN') ||
        attrName.includes('CÓDIGO DE BARRAS') || attrName.includes('CODIGO DE BARRAS')) {
      const valorNormalizado = normalizarEAN(attr.value_name);
      if (valorNormalizado.length >= 8) {
        eans.add(valorNormalizado);
      }
    }
  }
  
  return eans;
}

// ==================== LOGGER ====================

async function logColeta(
  supabase: any,
  fonteId: string,
  estabelecimentoId: string,
  tipo: 'info' | 'erro',
  mensagem: string,
  detalhes?: any
) {
  try {
    await supabase.from('logs_monitor_preco').insert({
      fonte_id: fonteId,
      estabelecimento_id: estabelecimentoId,
      tipo,
      mensagem,
      detalhes_json: detalhes || null,
    });
    console.log(`[LOG ${tipo.toUpperCase()}] ${mensagem}`);
  } catch (e) {
    console.error('Erro ao registrar log:', e);
  }
}

// ==================== DRIVER MERCADO LIVRE (AVANÇADO) ====================

interface ResultadoML {
  id: string;
  title: string;
  price: number;
  permalink: string;
  attributes: any[];
  seller?: any;
  condition?: string;
  shipping?: any;
  available_quantity?: number;
  original_price?: number;
  thumbnail?: string;
}

interface ResultadoProcessado {
  item: ResultadoML;
  score: number;
  simNome: number;
  bonusEAN: number;
  eansEncontrados: string[];
}

/**
 * Driver avançado para Mercado Livre (MLB)
 * - Usa NOME DO PRODUTO como base principal
 * - Calcula similaridade de nome (Jaccard)
 * - Adiciona bônus se EAN coincidir
 * - Filtra por score mínimo
 */
async function buscarPrecoMercadoLivre(
  supabase: any,
  fonte: any,
  produto: any,
  mapeamento: any
): Promise<any> {
  const config = fonte.config_json || {};
  const siteId = config.site_id || 'MLB';
  const limite = config.limite_resultados || 15;
  const minScoreAceite = config.min_score_aceite ?? 0.3;
  const bonusEanConfig = config.bonus_ean ?? 0.5;

  // Termo principal: prioriza mapeamento, senão usa nome do produto
  const termoPrincipal = mapeamento?.termo_busca || produto.nome;
  
  if (!termoPrincipal) {
    await logColeta(supabase, fonte.id, fonte.estabelecimento_id, 'erro',
      `Produto ${produto.id} sem termo de busca/nome`, { produto_id: produto.id });
    return null;
  }

  const produtoEan = normalizarEAN(produto.ean_13 || produto.ean);

  console.log(`[ML-ADV] Buscando: "${termoPrincipal}" | EAN produto: ${produtoEan || 'N/A'}`);

  // Monta URL da busca
  const query = encodeURIComponent(termoPrincipal);
  const url = `https://api.mercadolibre.com/sites/${siteId}/search?q=${query}&limit=${limite}`;

  try {
    const resp = await fetch(url);
    
    if (!resp.ok) {
      const body = await resp.text();
      await logColeta(supabase, fonte.id, fonte.estabelecimento_id, 'erro',
        `Erro HTTP ML: ${resp.status}`, { body, url });
      throw new Error(`Erro API ML: ${resp.status}`);
    }

    const json = await resp.json();
    const resultados: ResultadoML[] = json.results || [];

    console.log(`[ML-ADV] ${resultados.length} resultados encontrados`);

    if (resultados.length === 0) {
      // Tenta termo alternativo
      if (mapeamento?.termo_busca_alternativo) {
        console.log(`[ML-ADV] Tentando termo alternativo: "${mapeamento.termo_busca_alternativo}"`);
        const queryAlt = encodeURIComponent(mapeamento.termo_busca_alternativo);
        const urlAlt = `https://api.mercadolibre.com/sites/${siteId}/search?q=${queryAlt}&limit=${limite}`;
        
        const respAlt = await fetch(urlAlt);
        if (respAlt.ok) {
          const jsonAlt = await respAlt.json();
          if (jsonAlt.results?.length > 0) {
            return processarResultadosML(
              supabase, fonte, produto, mapeamento,
              jsonAlt.results, produtoEan, minScoreAceite, bonusEanConfig,
              mapeamento.termo_busca_alternativo
            );
          }
        }
      }

      await logColeta(supabase, fonte.id, fonte.estabelecimento_id, 'info',
        `Nenhum resultado ML para "${termoPrincipal}"`, { produto_id: produto.id });
      return null;
    }

    return processarResultadosML(
      supabase, fonte, produto, mapeamento,
      resultados, produtoEan, minScoreAceite, bonusEanConfig,
      termoPrincipal
    );

  } catch (e: any) {
    console.error(`[ML-ADV] Erro:`, e);
    await logColeta(supabase, fonte.id, fonte.estabelecimento_id, 'erro',
      `Erro ao buscar ML: ${e.message}`, { produto_id: produto.id, erro: e.message });
    throw e;
  }
}

/**
 * Processa resultados do ML com cálculo de score avançado
 */
async function processarResultadosML(
  supabase: any,
  fonte: any,
  produto: any,
  mapeamento: any,
  resultados: ResultadoML[],
  produtoEan: string,
  minScoreAceite: number,
  bonusEanConfig: number,
  termoBuscaUsado: string
): Promise<any> {
  const nomeProduto = produto.nome || '';
  
  // Calcula score para cada resultado
  const resultadosProcessados: ResultadoProcessado[] = resultados.map(item => {
    // Similaridade de nome (Jaccard)
    const simNome = similaridadeNome(nomeProduto, item.title);
    
    // Extrai EANs do anúncio
    const eansAnuncio = extrairEansDosAtributos(item.attributes);
    const eansEncontrados = [...eansAnuncio];
    
    // Bonus se EAN do produto coincide
    let bonusEAN = 0;
    if (produtoEan && eansAnuncio.has(produtoEan)) {
      bonusEAN = bonusEanConfig;
      console.log(`[ML-ADV] ✓ EAN match: ${produtoEan} encontrado em "${item.title}"`);
    }
    
    // Score final (máximo 1)
    const score = Math.min(1, simNome + bonusEAN);
    
    return { item, score, simNome, bonusEAN, eansEncontrados };
  });

  // Ordena por score decrescente
  resultadosProcessados.sort((a, b) => b.score - a.score);

  // Log dos top 3 para debug
  console.log(`[ML-ADV] Top 3 scores:`);
  resultadosProcessados.slice(0, 3).forEach((r, i) => {
    console.log(`  ${i+1}. Score: ${r.score.toFixed(2)} (sim: ${r.simNome.toFixed(2)}, ean: ${r.bonusEAN.toFixed(2)}) - "${r.item.title.substring(0, 50)}..."`);
  });

  // Filtra por score mínimo
  const melhoresResultados = resultadosProcessados.filter(r => r.score >= minScoreAceite);

  if (melhoresResultados.length === 0) {
    await logColeta(supabase, fonte.id, fonte.estabelecimento_id, 'info',
      `Nenhum resultado com score >= ${minScoreAceite} para "${produto.nome}"`,
      { 
        produto_id: produto.id,
        melhor_score: resultadosProcessados[0]?.score || 0,
        min_score_aceite: minScoreAceite,
        total_resultados: resultados.length
      }
    );
    return null;
  }

  // Pega o melhor resultado
  const melhor = melhoresResultados[0];
  const dataHoje = new Date().toISOString().slice(0, 10);

  console.log(`[ML-ADV] ✓ Melhor match: Score ${melhor.score.toFixed(2)} | R$ ${melhor.item.price} | "${melhor.item.title}"`);

  // Grava no histórico
  const { error } = await supabase.from('historico_precos_concorrentes').insert({
    produto_id: produto.id,
    fonte_id: fonte.id,
    estabelecimento_id: fonte.estabelecimento_id,
    nome_anuncio: melhor.item.title,
    preco_encontrado: melhor.item.price,
    url_anuncio: melhor.item.permalink,
    data_coleta: dataHoje,
    detalhes_json: {
      // Dados do match
      score: melhor.score,
      simNome: melhor.simNome,
      bonusEAN: melhor.bonusEAN,
      eansResultado: melhor.eansEncontrados,
      produtoEan: produtoEan || null,
      termo_busca_usado: termoBuscaUsado,
      min_score_aceite: minScoreAceite,
      
      // Dados do anúncio
      item_id: melhor.item.id,
      seller_id: melhor.item.seller?.id,
      seller_nickname: melhor.item.seller?.nickname,
      condition: melhor.item.condition,
      free_shipping: melhor.item.shipping?.free_shipping,
      available_quantity: melhor.item.available_quantity,
      original_price: melhor.item.original_price,
      thumbnail: melhor.item.thumbnail,
      
      // Estatísticas
      total_resultados: resultados.length,
      resultados_aceitos: melhoresResultados.length,
    },
  });

  if (error) {
    await logColeta(supabase, fonte.id, fonte.estabelecimento_id, 'erro',
      'Erro ao salvar histórico ML', { produto_id: produto.id, erro: error.message });
    throw error;
  }

  await logColeta(supabase, fonte.id, fonte.estabelecimento_id, 'info',
    `Coleta ML OK: "${produto.nome}" → R$ ${melhor.item.price} (score: ${melhor.score.toFixed(2)})`,
    {
      produto_id: produto.id,
      score: melhor.score,
      simNome: melhor.simNome,
      bonusEAN: melhor.bonusEAN,
      preco: melhor.item.price,
    }
  );

  return {
    produto_id: produto.id,
    fonte_id: fonte.id,
    nome_anuncio: melhor.item.title,
    preco_encontrado: melhor.item.price,
    url_anuncio: melhor.item.permalink,
    score: melhor.score,
  };
}

// ==================== ROTEADOR DE APIs ====================

/**
 * Função principal que roteia para o driver correto baseado em config_json.tipo_api
 */
async function buscarPrecoPorAPI(
  supabase: any,
  fonte: any,
  produto: any,
  mapeamento: any
): Promise<any> {
  const config = fonte.config_json || {};
  const tipoApi = config.tipo_api || 'mercado_livre';

  console.log(`[API] Iniciando busca via ${tipoApi} para: ${produto.nome}`);

  switch (tipoApi) {
    case 'mercado_livre':
      return buscarPrecoMercadoLivre(supabase, fonte, produto, mapeamento);
    
    // TODO: Implementar outros drivers
    // case 'amazon':
    //   return buscarPrecoAmazon(supabase, fonte, produto, mapeamento);
    // case 'magalu':
    //   return buscarPrecoMagalu(supabase, fonte, produto, mapeamento);
    
    default:
      await logColeta(supabase, fonte.id, fonte.estabelecimento_id, 'erro',
        `Tipo de API não suportado: ${tipoApi}`, { produto_id: produto.id });
      return null;
  }
}

// ==================== SCRAPING (SIMPLIFICADO) ====================

async function buscarPrecoPorScraping(
  supabase: any,
  fonte: any,
  produto: any,
  mapeamento: any
): Promise<any> {
  const config = fonte.config_json || {};
  
  let urlBusca = mapeamento?.url_direta;
  const termoBusca = mapeamento?.termo_busca || produto.nome;
  
  if (!urlBusca && config.url_busca) {
    urlBusca = config.url_busca.replace('{TERMO}', encodeURIComponent(termoBusca));
  }
  
  if (!urlBusca) {
    console.log(`[SCRAPING] URL não configurada para ${fonte.nome_fonte}`);
    return null;
  }

  console.log(`[SCRAPING] Buscando em: ${urlBusca}`);
  
  try {
    const response = await fetch(urlBusca, { 
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
    });

    if (!response.ok) {
      console.log(`[SCRAPING] Erro HTTP: ${response.status}`);
      return null;
    }

    const html = await response.text();
    const regexPreco = config.regex_preco || 'R\\$\\s*([\\d.,]+)';
    const matchPreco = html.match(new RegExp(regexPreco));
    
    if (!matchPreco?.[1]) {
      console.log(`[SCRAPING] Preço não encontrado`);
      return null;
    }

    const precoStr = matchPreco[1].replace(/\./g, '').replace(',', '.');
    const precoEncontrado = parseFloat(precoStr);
    
    if (isNaN(precoEncontrado)) return null;

    let nomeAnuncio = 'Produto encontrado';
    if (config.regex_titulo) {
      const matchTitulo = html.match(new RegExp(config.regex_titulo));
      if (matchTitulo?.[1]) nomeAnuncio = matchTitulo[1].trim();
    }

    const dataHoje = new Date().toISOString().slice(0, 10);

    await supabase.from('historico_precos_concorrentes').insert({
      produto_id: produto.id,
      fonte_id: fonte.id,
      estabelecimento_id: fonte.estabelecimento_id,
      nome_anuncio: nomeAnuncio,
      preco_encontrado: precoEncontrado,
      url_anuncio: urlBusca,
      data_coleta: dataHoje,
      detalhes_json: { metodo: 'scraping', termo_busca: termoBusca },
    });

    return {
      produto_id: produto.id,
      fonte_id: fonte.id,
      nome_anuncio: nomeAnuncio,
      preco_encontrado: precoEncontrado,
      url_anuncio: urlBusca,
    };

  } catch (e) {
    console.error(`[SCRAPING] Erro:`, e);
    return null;
  }
}

// ==================== ARQUIVO IMPORTADO ====================

async function buscarPrecoPorArquivoImportado(
  supabase: any,
  fonte: any,
  produto: any,
  mapeamento: any
): Promise<any> {
  const { data: arquivos } = await supabase
    .from('arquivos_precos_importados')
    .select('id, nome_arquivo')
    .eq('fonte_id', fonte.id)
    .order('data_importacao', { ascending: false })
    .limit(1);

  if (!arquivos?.length) {
    console.log(`[ARQUIVO] Nenhum arquivo para fonte ${fonte.nome_fonte}`);
    return null;
  }

  const arquivo = arquivos[0];
  const { data: linhas } = await supabase
    .from('linhas_arquivo_precos')
    .select('*')
    .eq('arquivo_id', arquivo.id);

  if (!linhas?.length) return null;

  const termoBusca = mapeamento?.termo_busca || produto.nome;
  const produtoEan = normalizarEAN(produto.ean_13 || produto.ean);
  const produtoSku = produto.codigo || '';

  let melhorMatch = null;
  let melhorScore = 0;

  for (const linha of linhas) {
    // Similaridade de nome
    const simNome = similaridadeNome(termoBusca, linha.nome_produto || '');
    
    // Bonus por EAN/SKU
    let bonus = 0;
    if (mapeamento?.chave_correspondencia === 'usar_ean' && produtoEan) {
      if (normalizarEAN(linha.ean) === produtoEan) bonus = 0.4;
    } else if (mapeamento?.chave_correspondencia === 'usar_sku' && produtoSku) {
      if (linha.sku === produtoSku) bonus = 0.4;
    }

    const score = Math.min(1, simNome + bonus);

    if (score > melhorScore && linha.preco) {
      melhorScore = score;
      melhorMatch = linha;
    }
  }

  if (melhorMatch && melhorScore >= 0.4) {
    const dataHoje = new Date().toISOString().slice(0, 10);

    await supabase.from('historico_precos_concorrentes').insert({
      produto_id: produto.id,
      fonte_id: fonte.id,
      estabelecimento_id: fonte.estabelecimento_id,
      nome_anuncio: melhorMatch.nome_produto,
      preco_encontrado: Number(melhorMatch.preco),
      url_anuncio: '',
      data_coleta: dataHoje,
      detalhes_json: {
        metodo: 'arquivo_importado',
        arquivo_id: arquivo.id,
        nome_arquivo: arquivo.nome_arquivo,
        score: melhorScore,
      },
    });

    return {
      produto_id: produto.id,
      fonte_id: fonte.id,
      nome_anuncio: melhorMatch.nome_produto,
      preco_encontrado: Number(melhorMatch.preco),
      url_anuncio: '',
      score: melhorScore,
    };
  }

  return null;
}

// ==================== HANDLER PRINCIPAL ====================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Buscar mapeamentos ativos com produtos e fontes
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
    let erros: any[] = [];

    for (const mapeamento of mapeamentos || []) {
      const produto = mapeamento.produto;
      const fonte = mapeamento.fonte;

      if (!produto || !fonte || !fonte.ativo) continue;

      produtosProcessados++;
      fontesProcessadas.add(fonte.id);

      try {
        let resultado = null;

        switch (fonte.tipo) {
          case 'api':
            resultado = await buscarPrecoPorAPI(supabase, fonte, produto, mapeamento);
            break;
          case 'scraping':
            resultado = await buscarPrecoPorScraping(supabase, fonte, produto, mapeamento);
            break;
          case 'arquivo_importado':
            resultado = await buscarPrecoPorArquivoImportado(supabase, fonte, produto, mapeamento);
            break;
        }

        if (resultado) {
          registrosInseridos++;
        }
      } catch (error: any) {
        erros.push({
          produto_id: produto.id,
          fonte_id: fonte.id,
          erro: error.message,
        });
      }
    }

    const resumo = {
      success: true,
      mensagem: 'Monitor de preços executado com sucesso',
      produtos_processados: produtosProcessados,
      fontes_processadas: fontesProcessadas.size,
      registros_inseridos: registrosInseridos,
      erros: erros.length > 0 ? erros : undefined,
      timestamp: new Date().toISOString(),
    };

    console.log('[MONITOR] Resumo:', resumo);

    return new Response(
      JSON.stringify(resumo),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[MONITOR] Erro:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
