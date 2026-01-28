import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PNCP_BASE_URL = 'https://pncp.gov.br/api/consulta/v1';

interface PNCPContratacao {
  orgaoEntidade?: { razaoSocial?: string; cnpj?: string };
  unidadeOrgao?: { ufNome?: string; municipioNome?: string; ufSigla?: string };
  modalidadeNome?: string;
  numeroCompra?: string;
  anoCompra?: number;
  objetoCompra?: string;
  dataPublicacaoPncp?: string;
  dataAberturaProposta?: string;
  dataEncerramentoProposta?: string;
  valorTotalEstimado?: number;
  linkSistemaOrigem?: string;
  numeroControlePNCP?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { estabelecimento_id, timeout_seconds = 15 } = await req.json();
    
    if (!estabelecimento_id) {
      throw new Error('estabelecimento_id é obrigatório');
    }

    console.log(`🔍 Iniciando busca PNCP para estabelecimento: ${estabelecimento_id}`);
    console.log(`⏱️ Timeout configurado: ${timeout_seconds}s`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Criar registro de execução
    const { data: run, error: runError } = await supabase
      .from('licitacoes_runs')
      .insert({
        estabelecimento_id,
        status: 'running'
      })
      .select()
      .single();

    if (runError) {
      console.error('Erro ao criar run:', runError);
      throw runError;
    }

    // Buscar keywords ativas
    const { data: keywords, error: kwError } = await supabase
      .from('licitacoes_keywords')
      .select('keyword, categoria, peso')
      .eq('estabelecimento_id', estabelecimento_id)
      .eq('ativo', true);

    if (kwError) {
      console.error('Erro ao buscar keywords:', kwError);
      throw kwError;
    }

    if (!keywords || keywords.length === 0) {
      console.log('⚠️ Nenhuma keyword configurada');
      await supabase.from('licitacoes_runs').update({
        finished_at: new Date().toISOString(),
        status: 'completed',
        items_found: 0,
        items_inserted: 0,
        error: 'Nenhuma keyword configurada'
      }).eq('id', run.id);
      
      return new Response(JSON.stringify({ success: true, message: 'Nenhuma keyword configurada', items_found: 0, items_inserted: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Buscar configurações de score
    const { data: scoreConfigs } = await supabase
      .from('licitacoes_score_config')
      .select('*')
      .eq('estabelecimento_id', estabelecimento_id)
      .eq('ativo', true);

    // Buscar configuração geral
    const { data: config } = await supabase
      .from('licitacoes_config')
      .select('uf_prioridade')
      .eq('estabelecimento_id', estabelecimento_id)
      .maybeSingle();

    const ufPrioridade = config?.uf_prioridade;

    // Calcular período de busca (últimos 7 dias)
    const dataFim = new Date();
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - 7);

    // Formato YYYYMMDD (sem hífens) exigido pela API PNCP
    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}${month}${day}`;
    };

    let itemsFound = 0;
    let itemsInserted = 0;
    const errors: string[] = [];
    const timeoutErrors: string[] = [];
    const processedIds = new Set<string>();

    // Buscar várias páginas de contratações recentes
    // Usar endpoint de propostas abertas que retorna licitações ativas
    const modalidades = [4, 6, 8]; // Concorrência Eletrônica, Pregão Eletrônico, Dispensa
    const modalidadeNames: Record<number, string> = {
      4: 'Concorrência Eletrônica',
      6: 'Pregão Eletrônico',
      8: 'Dispensa'
    };
    let successfulModalidades = 0;
    
    for (const modalidade of modalidades) {
      try {
        console.log(`🔎 Buscando modalidade ${modalidade}...`);
        
        // Usar endpoint de publicação com datas no formato correto (max 50 por página)
        const url = `${PNCP_BASE_URL}/contratacoes/publicacao?` + 
          `dataInicial=${formatDate(dataInicio)}&dataFinal=${formatDate(dataFim)}` +
          `&codigoModalidadeContratacao=${modalidade}&pagina=1&tamanhoPagina=50`;
        
        console.log(`📡 URL: ${url}`);
        
        // Criar AbortController para timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout_seconds * 1000);
        
        try {
          const response = await fetch(url, {
            headers: { 
              'Accept': 'application/json',
              'User-Agent': 'Mozilla/5.0 (compatible; LicitacoesBot/1.0)'
            },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response.text();
            console.log(`⚠️ PNCP retornou ${response.status} para modalidade ${modalidade}: ${errorText.substring(0, 200)}`);
            errors.push(`Modalidade ${modalidade}: HTTP ${response.status}`);
            continue;
          }

          const data = await response.json();
          const contratacoes: PNCPContratacao[] = data.data || data || [];
          
          console.log(`📦 Encontradas ${contratacoes.length} contratações na modalidade ${modalidade}`);
          successfulModalidades++;
          
          // Log de exemplos para debug (primeiros 3 objetos)
          if (contratacoes.length > 0 && modalidade === 4) {
            console.log(`📋 Exemplos de objetos (modalidade ${modalidade}):`);
            contratacoes.slice(0, 3).forEach((c, i) => {
              console.log(`   ${i + 1}. ${(c.objetoCompra || 'Sem objeto').substring(0, 120)}`);
            });
          }

          for (const cont of contratacoes) {
            const objeto = (cont.objetoCompra || '').toLowerCase();
            const sourceId = cont.numeroControlePNCP || `${cont.numeroCompra}-${cont.anoCompra}`;
            
            // Evitar processar duplicatas
            if (processedIds.has(sourceId)) continue;
            processedIds.add(sourceId);
            
            // Verificar se objeto contém alguma keyword (busca por substring)
            const matchedKeywords: string[] = [];
            let totalScore = 0;

            for (const k of keywords) {
              const kw = k.keyword.toLowerCase().trim();
              // Busca substring simples - a keyword pode aparecer em qualquer parte do objeto
              if (objeto.includes(kw)) {
                matchedKeywords.push(k.keyword);
                totalScore += k.peso || 5;
              }
            }

            // Log de match para debug
            if (matchedKeywords.length > 0) {
              console.log(`✅ Match encontrado: "${objeto.substring(0, 80)}..." => [${matchedKeywords.join(', ')}]`);
            }

            if (matchedKeywords.length === 0) continue;

            itemsFound++;

            // Calcular score adicional baseado em configurações
            if (scoreConfigs) {
              for (const sc of scoreConfigs) {
                switch (sc.tipo) {
                  case 'hospital':
                    if (/hospital|santa casa|upa|ubs|saúde|saude|pronto.?socorro/i.test(cont.orgaoEntidade?.razaoSocial || '')) {
                      totalScore += sc.peso || 10;
                    }
                    break;
                  case 'escola':
                    if (/escola|creche|secretaria.*educa|educação|educacao|universidade|instituto federal/i.test(cont.orgaoEntidade?.razaoSocial || '')) {
                      totalScore += sc.peso || 8;
                    }
                    break;
                  case 'uf_prioridade':
                    const ufValue = cont.unidadeOrgao?.ufSigla || cont.unidadeOrgao?.ufNome || '';
                    if (ufPrioridade && ufValue.toUpperCase().includes(ufPrioridade.toUpperCase())) {
                      totalScore += sc.peso || 5;
                    }
                    break;
                  case 'valor_alto':
                    if (cont.valorTotalEstimado && cont.valorTotalEstimado > 50000) {
                      totalScore += sc.peso || 5;
                    }
                    break;
                  case 'valor_baixo':
                    if (cont.valorTotalEstimado && cont.valorTotalEstimado < 5000) {
                      totalScore -= sc.peso || 5;
                    }
                    break;
                }
              }
            }

            // Extrair UF de forma mais robusta
            const ufValue = cont.unidadeOrgao?.ufSigla || cont.unidadeOrgao?.ufNome || null;

            // Inserir ou atualizar oportunidade
            const { error: insertError } = await supabase
              .from('licitacoes_opportunities')
              .upsert({
                estabelecimento_id,
                source: 'pncp',
                source_id: sourceId,
                orgao_nome: cont.orgaoEntidade?.razaoSocial,
                orgao_cnpj: cont.orgaoEntidade?.cnpj,
                uf: ufValue,
                municipio: cont.unidadeOrgao?.municipioNome,
                modalidade: cont.modalidadeNome,
                numero: cont.numeroCompra,
                ano: cont.anoCompra,
                objeto: cont.objetoCompra,
                data_publicacao: cont.dataPublicacaoPncp,
                data_abertura: cont.dataAberturaProposta,
                data_fim: cont.dataEncerramentoProposta,
                valor_estimado: cont.valorTotalEstimado,
                url_detalhe: cont.linkSistemaOrigem || `https://pncp.gov.br/app/editais/${sourceId}`,
                keywords_matched: matchedKeywords,
                score: totalScore,
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'estabelecimento_id,source,source_id'
              });

            if (!insertError) {
              itemsInserted++;
            } else {
              console.error('Erro ao inserir oportunidade:', insertError);
            }
          }

          // Pequena pausa entre requisições
          await new Promise(resolve => setTimeout(resolve, 300));
          
        } catch (fetchErr: any) {
          clearTimeout(timeoutId);
          
          if (fetchErr.name === 'AbortError') {
            const timeoutMsg = `Timeout na ${modalidadeNames[modalidade] || `modalidade ${modalidade}`}`;
            console.error(`⏱️ ${timeoutMsg}`);
            timeoutErrors.push(timeoutMsg);
          } else {
            throw fetchErr;
          }
        }

      } catch (modErr) {
        console.error(`Erro na modalidade ${modalidade}:`, modErr);
        errors.push(`Modalidade ${modalidade}: ${modErr instanceof Error ? modErr.message : 'Erro'}`);
      }
    }

    // Determinar status final
    const allFailed = successfulModalidades === 0 && (timeoutErrors.length > 0 || errors.length > 0);
    const hasTimeouts = timeoutErrors.length > 0;
    
    let finalStatus = 'completed';
    if (allFailed) {
      finalStatus = 'failed';
    } else if (hasTimeouts || errors.length > 0) {
      finalStatus = 'completed_with_errors';
    }

    // Atualizar registro de execução
    await supabase.from('licitacoes_runs').update({
      finished_at: new Date().toISOString(),
      status: finalStatus,
      items_found: itemsFound,
      items_inserted: itemsInserted,
      error: [...errors, ...timeoutErrors].length > 0 ? [...errors, ...timeoutErrors].join('; ') : null
    }).eq('id', run.id);

    console.log(`✅ Busca concluída: ${itemsFound} encontrados, ${itemsInserted} inseridos`);
    if (timeoutErrors.length > 0) {
      console.log(`⚠️ Timeouts: ${timeoutErrors.join(', ')}`);
    }

    // Se todos falharam, retornar erro
    if (allFailed) {
      return new Response(JSON.stringify({
        success: false,
        run_id: run.id,
        items_found: itemsFound,
        items_inserted: itemsInserted,
        error: 'Todos os endpoints falharam',
        has_timeouts: hasTimeouts,
        timeout_details: timeoutErrors.length > 0 ? `API não respondeu: ${timeoutErrors.join(', ')}` : undefined,
        errors: errors.length > 0 ? errors : undefined
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      run_id: run.id,
      items_found: itemsFound,
      items_inserted: itemsInserted,
      has_timeouts: hasTimeouts,
      timeout_details: hasTimeouts ? `API não respondeu: ${timeoutErrors.join(', ')}` : undefined,
      errors: errors.length > 0 ? errors : undefined
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Erro na busca PNCP:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
