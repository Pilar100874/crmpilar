import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('⏰ Iniciando execução programada do bot de licitações');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar todos os estabelecimentos com bot ativo
    const { data: configs, error: configError } = await supabase
      .from('licitacoes_config')
      .select('estabelecimento_id')
      .eq('ativo', true);

    if (configError) {
      throw configError;
    }

    if (!configs || configs.length === 0) {
      console.log('⚠️ Nenhum estabelecimento com bot ativo');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Nenhum estabelecimento ativo' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`🏢 ${configs.length} estabelecimento(s) ativo(s)`);

    const results = [];

    for (const config of configs) {
      try {
        console.log(`\n🔄 Processando: ${config.estabelecimento_id}`);

        // 1. Executar busca PNCP
        const fetchResult = await supabase.functions.invoke('licitacoes-pncp-fetch', {
          body: { estabelecimento_id: config.estabelecimento_id }
        });

        console.log(`📦 Busca: ${fetchResult.data?.items_found || 0} encontrados`);

        // 2. Notificar equipe
        const notifyResult = await supabase.functions.invoke('licitacoes-notify-team', {
          body: { estabelecimento_id: config.estabelecimento_id }
        });

        console.log(`📧 Notificação: ${notifyResult.data?.notified || 0} alertas`);

        results.push({
          estabelecimento_id: config.estabelecimento_id,
          success: true,
          items_found: fetchResult.data?.items_found || 0,
          items_inserted: fetchResult.data?.items_inserted || 0,
          notified: notifyResult.data?.notified || 0
        });

      } catch (estabErr) {
        console.error(`❌ Erro em ${config.estabelecimento_id}:`, estabErr);
        results.push({
          estabelecimento_id: config.estabelecimento_id,
          success: false,
          error: estabErr instanceof Error ? estabErr.message : 'Erro desconhecido'
        });
      }
    }

    console.log('\n✅ Execução programada concluída');

    return new Response(JSON.stringify({
      success: true,
      processed: configs.length,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Erro na execução programada:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
