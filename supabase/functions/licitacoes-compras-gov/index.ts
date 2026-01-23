import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// API Compras.gov.br - Dados Abertos (REST API pública)
// Documentação: https://compras.dados.gov.br/
const COMPRAS_GOV_BASE_URL = 'https://compras.dados.gov.br/licitacoes/v1';

interface LicitacaoComprasGov {
  identificador: string;
  uasg: {
    codigo: string;
    nome: string;
    uf?: string;
    municipio?: string;
  };
  modalidade: {
    codigo: string;
    descricao: string;
  };
  numero_aviso: string;
  objeto: string;
  data_publicacao: string;
  data_abertura_proposta?: string;
  data_entrega_proposta?: string;
  valor_estimado?: number;
  situacao?: string;
  link_portal?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { estabelecimento_id } = await req.json();
    
    if (!estabelecimento_id) {
      throw new Error('estabelecimento_id é obrigatório');
    }

    console.log(`🔍 Iniciando busca Compras.gov para estabelecimento: ${estabelecimento_id}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Criar registro de execução
    const { data: run } = await supabase
      .from('licitacoes_runs')
      .insert({
        estabelecimento_id,
        status: 'running',
        source: 'compras_gov'
      })
      .select()
      .single();

    // Buscar keywords ativas
    const { data: keywords } = await supabase
      .from('licitacoes_keywords')
      .select('keyword, categoria, peso')
      .eq('estabelecimento_id', estabelecimento_id)
      .eq('ativo', true);

    if (!keywords || keywords.length === 0) {
      console.log('⚠️ Nenhuma keyword configurada');
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

    const ufPrioridade = config?.uf_prioridade;

    let itemsFound = 0;
    let itemsInserted = 0;
    const processedIds = new Set<string>();

    // Buscar licitações recentes por diferentes categorias
    // Modalidades: 1=Concorrência, 2=Tomada de Preços, 3=Convite, 4=Concurso, 5=Leilão, 6=Dispensa, 7=Inexigibilidade, 8=Pregão
    const modalidades = ['1', '5', '8']; // Concorrência, Leilão, Pregão

    for (const modalidade of modalidades) {
      try {
        console.log(`🔎 Buscando modalidade ${modalidade} no Compras.gov...`);
        
        // Buscar licitações dos últimos 30 dias
        const dataInicio = new Date();
        dataInicio.setDate(dataInicio.getDate() - 30);
        const dataInicioStr = dataInicio.toISOString().split('T')[0];
        
        const url = `${COMPRAS_GOV_BASE_URL}/licitacoes.json?data_publicacao_min=${dataInicioStr}&modalidade=${modalidade}&_limit=100`;
        
        console.log(`📡 URL: ${url}`);
        
        const response = await fetch(url, {
          headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
          console.error(`❌ Erro HTTP ${response.status} na modalidade ${modalidade}`);
          continue;
        }

        const data = await response.json();
        const licitacoes = data?._embedded?.licitacoes || data?.licitacoes || [];
        
        console.log(`📦 Encontradas ${licitacoes.length} licitações na modalidade ${modalidade}`);

        for (const lic of licitacoes) {
          const sourceId = lic.identificador || `${lic.uasg?.codigo}-${lic.numero_aviso}`;
          
          if (processedIds.has(sourceId)) continue;
          processedIds.add(sourceId);
          
          const objeto = (lic.objeto || '').toLowerCase();
          
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
          
          // Calcular score
          let score = totalPeso;
          
          // Aplicar score configs
          if (scoreConfigs) {
            for (const sc of scoreConfigs) {
              if (sc.tipo === 'hospital' && /hospital|upa|ubs|santa casa|saúde/i.test(lic.uasg?.nome || '')) {
                score += sc.peso;
              }
              if (sc.tipo === 'escola' && /escola|creche|universidade|educação|educacao/i.test(lic.uasg?.nome || '')) {
                score += sc.peso;
              }
              if (sc.tipo === 'uf_prioridade' && ufPrioridade && lic.uasg?.uf === ufPrioridade) {
                score += sc.peso;
              }
              if (sc.tipo === 'valor_alto' && lic.valor_estimado && lic.valor_estimado > 50000) {
                score += sc.peso;
              }
              if (sc.tipo === 'valor_baixo' && lic.valor_estimado && lic.valor_estimado < 5000) {
                score -= sc.peso;
              }
            }
          }

          // Inserir/atualizar no banco
          const { error: insertError } = await supabase
            .from('licitacoes_opportunities')
            .upsert({
              estabelecimento_id,
              source: 'compras_gov',
              source_id: sourceId,
              orgao_nome: lic.uasg?.nome,
              orgao_cnpj: lic.uasg?.codigo,
              uf: lic.uasg?.uf,
              municipio: lic.uasg?.municipio,
              modalidade: lic.modalidade?.descricao,
              numero: lic.numero_aviso,
              objeto: lic.objeto,
              data_publicacao: lic.data_publicacao ? new Date(lic.data_publicacao).toISOString() : null,
              data_abertura: lic.data_abertura_proposta ? new Date(lic.data_abertura_proposta).toISOString() : null,
              valor_estimado: lic.valor_estimado,
              url_detalhe: lic.link_portal || `https://compras.dados.gov.br/licitacoes/doc/licitacao/${sourceId}`,
              keywords_matched: matchedKeywords,
              score,
              status: 'novo',
              source_details: { raw: lic }
            }, { onConflict: 'estabelecimento_id,source,source_id' });

          if (!insertError) {
            itemsInserted++;
          } else if (!insertError.message?.includes('duplicate')) {
            console.error('Erro ao inserir:', insertError.message);
          }
        }
      } catch (err) {
        console.error(`Erro na modalidade ${modalidade}:`, err);
      }
    }

    // Atualizar registro de execução
    if (run?.id) {
      await supabase.from('licitacoes_runs').update({
        finished_at: new Date().toISOString(),
        status: 'completed',
        items_found: itemsFound,
        items_inserted: itemsInserted
      }).eq('id', run.id);
    }

    // Atualizar fonte
    await supabase
      .from('licitacoes_fontes')
      .update({
        ultima_sincronizacao: new Date().toISOString(),
        total_importados: itemsInserted
      })
      .eq('estabelecimento_id', estabelecimento_id)
      .eq('fonte', 'compras_gov');

    console.log(`✅ Busca Compras.gov concluída: ${itemsFound} encontrados, ${itemsInserted} inseridos`);

    return new Response(
      JSON.stringify({ success: true, items_found: itemsFound, items_inserted: itemsInserted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro na busca Compras.gov:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
