import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Orquestrador que busca em todas as fontes ativas
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { estabelecimento_id, fontes } = await req.json();
    
    if (!estabelecimento_id) {
      throw new Error('estabelecimento_id é obrigatório');
    }

    console.log(`🚀 Iniciando busca multi-fonte para estabelecimento: ${estabelecimento_id}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar fontes ativas
    let query = supabase
      .from('licitacoes_fontes')
      .select('fonte, nome_display, api_key')
      .eq('estabelecimento_id', estabelecimento_id)
      .eq('ativo', true);

    // Se especificado, filtrar por fontes específicas
    if (fontes && Array.isArray(fontes) && fontes.length > 0) {
      query = query.in('fonte', fontes);
    }

    const { data: fontesAtivas } = await query;

    if (!fontesAtivas || fontesAtivas.length === 0) {
      console.log('⚠️ Nenhuma fonte ativa configurada');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Nenhuma fonte ativa',
        results: []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📊 ${fontesAtivas.length} fonte(s) ativa(s): ${fontesAtivas.map(f => f.fonte).join(', ')}`);

    const results: any[] = [];

    // Mapear fontes para suas respectivas edge functions
    const fonteToFunction: Record<string, string> = {
      'pncp': 'licitacoes-pncp-fetch',
      'compras_gov': 'licitacoes-compras-gov',
      'dados_sp': 'licitacoes-dados-sp',
      'alerta_licitacao': 'licitacoes-alerta-api',
      'portal_dados_abertos': 'licitacoes-compras-gov' // Usa mesma lógica
    };

    // Executar busca em cada fonte ativa
    for (const fonte of fontesAtivas) {
      const functionName = fonteToFunction[fonte.fonte];
      
      if (!functionName) {
        console.log(`⚠️ Função não mapeada para fonte: ${fonte.fonte}`);
        results.push({
          fonte: fonte.fonte,
          nome: fonte.nome_display,
          success: false,
          error: 'Fonte não implementada'
        });
        continue;
      }

      try {
        console.log(`\n🔄 Executando ${functionName} (${fonte.nome_display})...`);

        const { data, error } = await supabase.functions.invoke(functionName, {
          body: { estabelecimento_id }
        });

        if (error) {
          console.error(`❌ Erro em ${fonte.fonte}:`, error);
          results.push({
            fonte: fonte.fonte,
            nome: fonte.nome_display,
            success: false,
            error: error.message
          });
        } else {
          console.log(`✅ ${fonte.fonte}: ${data?.items_found || 0} encontrados, ${data?.items_inserted || 0} novos`);
          results.push({
            fonte: fonte.fonte,
            nome: fonte.nome_display,
            success: true,
            items_found: data?.items_found || 0,
            items_inserted: data?.items_inserted || 0
          });
        }
      } catch (err: any) {
        console.error(`❌ Exceção em ${fonte.fonte}:`, err);
        results.push({
          fonte: fonte.fonte,
          nome: fonte.nome_display,
          success: false,
          error: err.message
        });
      }
    }

    // Calcular totais
    const totals = results.reduce((acc, r) => {
      if (r.success) {
        acc.items_found += r.items_found || 0;
        acc.items_inserted += r.items_inserted || 0;
        acc.sources_success++;
      } else {
        acc.sources_failed++;
      }
      return acc;
    }, { items_found: 0, items_inserted: 0, sources_success: 0, sources_failed: 0 });

    console.log(`\n📈 RESUMO: ${totals.items_found} encontrados, ${totals.items_inserted} novos, ${totals.sources_success} fontes ok, ${totals.sources_failed} falhas`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        totals
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro no orquestrador multi-fonte:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
