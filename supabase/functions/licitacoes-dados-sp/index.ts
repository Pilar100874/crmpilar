import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// API Dados Abertos SP - Licitações
// Documentação: https://dados.sp.gov.br/
const DADOS_SP_BASE_URL = 'https://dados.sp.gov.br/api/3/action';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { estabelecimento_id, timeout_seconds = 10 } = await req.json();
    
    if (!estabelecimento_id) {
      throw new Error('estabelecimento_id é obrigatório');
    }

    const timeoutMs = (timeout_seconds || 10) * 1000;
    console.log(`🔍 Iniciando busca Dados SP para estabelecimento: ${estabelecimento_id} (timeout: ${timeout_seconds}s)`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar keywords ativas
    const { data: keywords } = await supabase
      .from('licitacoes_keywords')
      .select('keyword, categoria, peso')
      .eq('estabelecimento_id', estabelecimento_id)
      .eq('ativo', true);

    if (!keywords || keywords.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'Nenhuma keyword configurada', items_found: 0, items_inserted: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Buscar configurações
    const { data: config } = await supabase
      .from('licitacoes_config')
      .select('uf_prioridade')
      .eq('estabelecimento_id', estabelecimento_id)
      .maybeSingle();

    const { data: scoreConfigs } = await supabase
      .from('licitacoes_score_config')
      .select('*')
      .eq('estabelecimento_id', estabelecimento_id)
      .eq('ativo', true);

    let itemsFound = 0;
    let itemsInserted = 0;
    const processedIds = new Set<string>();
    const timeoutErrors: string[] = [];

    // Buscar datasets de licitações no portal SP
    // IDs de datasets conhecidos de licitações
    const datasetIds = [
      'licitacoes-governo-estado', 
      'compras-governo',
      'pregoes-eletronicos'
    ];

    for (const datasetId of datasetIds) {
      try {
        console.log(`🔎 Buscando dataset ${datasetId}...`);
        
        // Primeiro buscar informações do dataset
        const searchUrl = `${DADOS_SP_BASE_URL}/package_search?q=licitacao&rows=10`;
        
        // Timeout configurável para evitar travamentos
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        
        let response;
        try {
          response = await fetch(searchUrl, {
            headers: { 'Accept': 'application/json' },
            signal: controller.signal
          });
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          if (fetchError.name === 'AbortError') {
            const timeoutMsg = `Timeout no dataset ${datasetId} (${timeout_seconds}s)`;
            console.log(`⏱️ ${timeoutMsg}`);
            timeoutErrors.push(timeoutMsg);
          } else {
            console.log(`⚠️ Erro de rede no dataset ${datasetId}: ${fetchError.message}`);
          }
          continue;
        }
        clearTimeout(timeoutId);

        if (!response.ok) {
          console.log(`⚠️ Dataset ${datasetId} não encontrado, tentando busca geral`);
          continue;
        }

        const searchData = await response.json();
        const datasets = searchData?.result?.results || [];
        
        console.log(`📦 Encontrados ${datasets.length} datasets de licitações`);

        for (const dataset of datasets) {
          // Processar recursos do dataset (CSVs, JSONs)
          const resources = dataset.resources || [];
          
          for (const resource of resources) {
            if (resource.format?.toLowerCase() !== 'json' && resource.format?.toLowerCase() !== 'csv') {
              continue;
            }

            try {
              // Tentar buscar dados do recurso
              const resourceUrl = resource.url;
              if (!resourceUrl) continue;

              console.log(`📥 Baixando recurso: ${resource.name || resourceUrl}`);
              
              const resourceResponse = await fetch(resourceUrl);
              if (!resourceResponse.ok) continue;

              const contentType = resourceResponse.headers.get('content-type') || '';
              let records: any[] = [];

              if (contentType.includes('json') || resource.format?.toLowerCase() === 'json') {
                const jsonData = await resourceResponse.json();
                records = Array.isArray(jsonData) ? jsonData : jsonData?.records || jsonData?.data || [];
              }

              // Processar registros
              for (const record of records.slice(0, 100)) { // Limitar a 100 registros por recurso
                const sourceId = record.id || record.numero || `sp-${Date.now()}-${Math.random()}`;
                
                if (processedIds.has(sourceId)) continue;
                processedIds.add(sourceId);

                const objeto = (record.objeto || record.descricao || record.title || '').toLowerCase();
                
                // Verificar match com keywords
                const matchedKeywords: string[] = [];
                let totalPeso = 0;
                
                for (const kw of keywords) {
                  if (objeto.includes(kw.keyword.toLowerCase())) {
                    matchedKeywords.push(kw.keyword);
                    totalPeso += kw.peso;
                  }
                }

                if (matchedKeywords.length === 0) continue;
                
                itemsFound++;
                
                let score = totalPeso;

                // Aplicar score configs
                if (scoreConfigs) {
                  for (const sc of scoreConfigs) {
                    const orgaoNome = record.orgao || record.unidade || '';
                    if (sc.tipo === 'hospital' && /hospital|upa|ubs|santa casa|saúde/i.test(orgaoNome)) {
                      score += sc.peso;
                    }
                    if (sc.tipo === 'escola' && /escola|creche|universidade|educação/i.test(orgaoNome)) {
                      score += sc.peso;
                    }
                  }
                }

                // Inserir no banco
                const { error: insertError } = await supabase
                  .from('licitacoes_opportunities')
                  .upsert({
                    estabelecimento_id,
                    source: 'dados_sp',
                    source_id: sourceId,
                    orgao_nome: record.orgao || record.unidade,
                    uf: 'SP',
                    municipio: record.municipio || record.cidade || 'São Paulo',
                    modalidade: record.modalidade || record.tipo,
                    numero: record.numero,
                    objeto: record.objeto || record.descricao,
                    data_publicacao: record.data_publicacao ? new Date(record.data_publicacao).toISOString() : null,
                    data_abertura: record.data_abertura ? new Date(record.data_abertura).toISOString() : null,
                    valor_estimado: parseFloat(record.valor_estimado || record.valor || 0) || null,
                    url_detalhe: record.url || record.link,
                    keywords_matched: matchedKeywords,
                    score,
                    status: 'novo',
                    source_details: { dataset: dataset.name, resource: resource.name }
                  }, { onConflict: 'estabelecimento_id,source,source_id' });

                if (!insertError) {
                  itemsInserted++;
                }
              }
            } catch (resourceErr) {
              console.log(`⚠️ Erro ao processar recurso: ${resourceErr}`);
            }
          }
        }
      } catch (err) {
        console.error(`Erro no dataset ${datasetId}:`, err);
      }
    }

    // Atualizar fonte
    await supabase
      .from('licitacoes_fontes')
      .update({
        ultima_sincronizacao: new Date().toISOString(),
        total_importados: itemsInserted
      })
      .eq('estabelecimento_id', estabelecimento_id)
      .eq('fonte', 'dados_sp');

    const hasTimeouts = timeoutErrors.length > 0;
    const allTimedOut = timeoutErrors.length === datasetIds.length;
    
    if (allTimedOut) {
      console.log(`❌ Busca Dados SP: Todos os endpoints deram timeout`);
    } else if (hasTimeouts) {
      console.log(`⚠️ Busca Dados SP concluída com timeouts: ${itemsFound} encontrados, ${itemsInserted} inseridos`);
    } else {
      console.log(`✅ Busca Dados SP concluída: ${itemsFound} encontrados, ${itemsInserted} inseridos`);
    }

    return new Response(
      JSON.stringify({ 
        success: !allTimedOut, 
        items_found: itemsFound, 
        items_inserted: itemsInserted,
        has_timeouts: hasTimeouts,
        timeout_details: timeoutErrors.length > 0 ? timeoutErrors.join('; ') : undefined,
        error: allTimedOut ? `API não respondeu: ${timeoutErrors.join('; ')}` : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro na busca Dados SP:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
