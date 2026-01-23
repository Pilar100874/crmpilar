import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// API Alerta Licitação - Agregador comercial
// Documentação: https://alertalicitacao.com.br/api/
// REQUER API KEY PAGA
const ALERTA_API_BASE_URL = 'https://api.alertalicitacao.com.br/v1';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { estabelecimento_id } = await req.json();
    
    if (!estabelecimento_id) {
      throw new Error('estabelecimento_id é obrigatório');
    }

    console.log(`🔍 Iniciando busca Alerta Licitação para estabelecimento: ${estabelecimento_id}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar configuração da fonte com API key
    const { data: fonte } = await supabase
      .from('licitacoes_fontes')
      .select('api_key, config')
      .eq('estabelecimento_id', estabelecimento_id)
      .eq('fonte', 'alerta_licitacao')
      .maybeSingle();

    if (!fonte?.api_key) {
      console.log('⚠️ API Key do Alerta Licitação não configurada');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'API Key não configurada. Configure a chave na aba de Fontes de Dados.',
        requires_api_key: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const apiKey = fonte.api_key;

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

    const ufPrioridade = config?.uf_prioridade;

    let itemsFound = 0;
    let itemsInserted = 0;
    const processedIds = new Set<string>();

    // Buscar por cada keyword principal
    const keywordsToSearch = keywords.slice(0, 5).map(k => k.keyword); // Limitar a 5 para não exceder limites da API

    for (const searchKeyword of keywordsToSearch) {
      try {
        console.log(`🔎 Buscando "${searchKeyword}" no Alerta Licitação...`);
        
        // Endpoint de busca (exemplo baseado em APIs similares)
        const url = `${ALERTA_API_BASE_URL}/licitacoes?q=${encodeURIComponent(searchKeyword)}&limit=50`;
        
        const response = await fetch(url, {
          headers: { 
            'Accept': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'X-API-Key': apiKey
          }
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            console.error('❌ API Key inválida ou expirada');
            return new Response(JSON.stringify({ 
              success: false, 
              error: 'API Key inválida ou expirada',
              requires_api_key: true
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          console.error(`❌ Erro HTTP ${response.status}`);
          continue;
        }

        const data = await response.json();
        const licitacoes = data?.licitacoes || data?.data || data?.results || [];
        
        console.log(`📦 Encontradas ${licitacoes.length} licitações para "${searchKeyword}"`);

        for (const lic of licitacoes) {
          const sourceId = lic.id || lic.codigo || `alerta-${Date.now()}-${Math.random()}`;
          
          if (processedIds.has(sourceId)) continue;
          processedIds.add(sourceId);
          
          const objeto = (lic.objeto || lic.descricao || '').toLowerCase();
          
          // Verificar match com keywords
          const matchedKeywords: string[] = [];
          let totalPeso = 0;
          
          for (const kw of keywords) {
            if (objeto.includes(kw.keyword.toLowerCase())) {
              matchedKeywords.push(kw.keyword);
              totalPeso += kw.peso;
            }
          }

          if (matchedKeywords.length === 0) {
            matchedKeywords.push(searchKeyword);
            totalPeso = 3;
          }
          
          itemsFound++;
          
          let score = totalPeso;

          // Aplicar score configs
          if (scoreConfigs) {
            for (const sc of scoreConfigs) {
              const orgaoNome = lic.orgao || lic.entidade || '';
              if (sc.tipo === 'hospital' && /hospital|upa|ubs|santa casa|saúde/i.test(orgaoNome)) {
                score += sc.peso;
              }
              if (sc.tipo === 'escola' && /escola|creche|universidade|educação/i.test(orgaoNome)) {
                score += sc.peso;
              }
              if (sc.tipo === 'uf_prioridade' && ufPrioridade && lic.uf === ufPrioridade) {
                score += sc.peso;
              }
              if (sc.tipo === 'valor_alto' && lic.valor && lic.valor > 50000) {
                score += sc.peso;
              }
            }
          }

          // Inserir no banco
          const { error: insertError } = await supabase
            .from('licitacoes_opportunities')
            .upsert({
              estabelecimento_id,
              source: 'alerta_licitacao',
              source_id: sourceId,
              orgao_nome: lic.orgao || lic.entidade,
              orgao_cnpj: lic.cnpj,
              uf: lic.uf || lic.estado,
              municipio: lic.municipio || lic.cidade,
              modalidade: lic.modalidade,
              numero: lic.numero || lic.codigo,
              objeto: lic.objeto || lic.descricao,
              data_publicacao: lic.data_publicacao ? new Date(lic.data_publicacao).toISOString() : null,
              data_abertura: lic.data_abertura || lic.data_limite ? new Date(lic.data_abertura || lic.data_limite).toISOString() : null,
              valor_estimado: parseFloat(lic.valor || lic.valor_estimado || 0) || null,
              url_detalhe: lic.url || lic.link || lic.edital_url,
              keywords_matched: matchedKeywords,
              score,
              status: 'novo',
              source_details: { raw: lic }
            }, { onConflict: 'estabelecimento_id,source,source_id' });

          if (!insertError) {
            itemsInserted++;
          }
        }
      } catch (err) {
        console.error(`Erro na busca "${searchKeyword}":`, err);
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
      .eq('fonte', 'alerta_licitacao');

    console.log(`✅ Busca Alerta Licitação concluída: ${itemsFound} encontrados, ${itemsInserted} inseridos`);

    return new Response(
      JSON.stringify({ success: true, items_found: itemsFound, items_inserted: itemsInserted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro na busca Alerta Licitação:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
