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
    const grupoId = url.searchParams.get('grupo_id');
    const categoriaId = url.searchParams.get('categoria_id');
    const ativo = url.searchParams.get('ativo');
    const limit = url.searchParams.get('limit');
    const offset = url.searchParams.get('offset');

    if (!estabelecimentoId) {
      return new Response(
        JSON.stringify({ 
          error: 'estabelecimento_id é obrigatório',
          message: 'Por favor, adicione o parâmetro ?estabelecimento_id=SEU_ID na URL',
          example: `${url.origin}${url.pathname}?estabelecimento_id=UUID`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Buscando produtos para estabelecimento:', estabelecimentoId);

    // Build query
    let query = supabase
      .from('produtos')
      .select(`
        id,
        codigo,
        nome,
        descricao,
        preco,
        unidade,
        estoque_atual,
        codigo_barras,
        ncm,
        marca,
        modelo,
        peso,
        peso_bruto,
        largura,
        altura,
        comprimento,
        gramatura,
        numero_folhas,
        observacoes,
        ativo,
        campos_customizados,
        created_at,
        updated_at,
        grupo:produto_grupos(id, nome),
        categoria:produto_categorias(id, nome)
      `)
      .eq('estabelecimento_id', estabelecimentoId);

    // Apply optional filters
    if (grupoId) {
      query = query.eq('grupo_id', grupoId);
    }
    
    if (categoriaId) {
      query = query.eq('categoria_id', categoriaId);
    }
    
    if (ativo !== null && ativo !== undefined) {
      query = query.eq('ativo', ativo === 'true');
    }

    // Apply pagination
    if (limit) {
      query = query.limit(parseInt(limit));
    }
    
    if (offset) {
      query = query.range(parseInt(offset), parseInt(offset) + (parseInt(limit || '100') - 1));
    }

    // Order by name
    query = query.order('nome', { ascending: true });

    const { data, error, count } = await query;

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
        message: data?.length ? `${data.length} produtos encontrados` : 'Nenhum produto encontrado'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Erro na API de produtos:', error);
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
