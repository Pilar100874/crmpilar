import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse query parameters
    const url = new URL(req.url);
    const estabelecimentoId = url.searchParams.get('estabelecimento_id');
    const relatorioId = url.searchParams.get('relatorio_id');

    if (!estabelecimentoId) {
      return new Response(
        JSON.stringify({ 
          error: 'estabelecimento_id é obrigatório',
          message: 'Por favor, adicione o parâmetro ?estabelecimento_id=SEU_ID na URL',
          example: `${url.origin}${url.pathname}?estabelecimento_id=d579d299-e5c1-4b03-b74d-94b4af13e871`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar relatorioId - não pode ser null, "null", undefined ou string vazia
    if (!relatorioId || relatorioId === 'null' || relatorioId.trim() === '') {
      return new Response(
        JSON.stringify({ 
          error: 'relatorio_id é obrigatório e deve ser um UUID válido',
          message: 'Por favor, adicione o parâmetro &relatorio_id=SEU_ID na URL',
          example: `${url.origin}${url.pathname}?estabelecimento_id=${estabelecimentoId}&relatorio_id=UUID_DO_RELATORIO`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Buscando produtos para estabelecimento:', estabelecimentoId, 'relatório:', relatorioId);

    // Buscar produtos importados - retornar apenas as colunas de negócio (etapa 6) do relatório específico
    const { data, error } = await supabase
      .from('produtos_importados')
      .select('nome, quantidade, gramatura, largura, comprimento, tipo, obs, embalagem, numero_folhas, diametro')
      .eq('estabelecimento_id', estabelecimentoId)
      .eq('relatorio_importacao_id', relatorioId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar produtos:', error);
      throw error;
    }

    console.log(`${data?.length || 0} produtos encontrados`);

    return new Response(
      JSON.stringify({
        success: true,
        data: data || [],
        total: data?.length || 0,
        message: data?.length ? `${data.length} produtos encontrados` : 'Nenhum produto encontrado para este estabelecimento'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Erro na API de produtos importados:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erro interno do servidor' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
