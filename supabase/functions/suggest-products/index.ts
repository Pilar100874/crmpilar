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
    const { clienteId, orcamentoId } = await req.json();
    console.log('Generating product suggestions for cliente:', clienteId, 'orcamento:', orcamentoId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar histórico de compras do cliente
    const { data: orcamentosAnteriores, error: orcamentosError } = await supabase
      .from('orcamentos')
      .select(`
        id,
        created_at,
        orcamento_itens (
          produto_id,
          quantidade,
          preco_unitario,
          produtos (
            id,
            nome,
            categoria_id,
            grupo_id
          )
        )
      `)
      .eq('cliente_id', clienteId)
      .eq('status', 'finalizado')
      .order('created_at', { ascending: false })
      .limit(5);

    if (orcamentosError) {
      console.error('Error fetching purchase history:', orcamentosError);
      throw orcamentosError;
    }

    // Buscar itens do orçamento atual
    const { data: itensAtuais, error: itensError } = await supabase
      .from('orcamento_itens')
      .select(`
        produto_id,
        produtos (
          id,
          nome,
          categoria_id,
          grupo_id
        )
      `)
      .eq('orcamento_id', orcamentoId);

    if (itensError) {
      console.error('Error fetching current items:', itensError);
      throw itensError;
    }

    // Buscar todos os produtos disponíveis
    const { data: todosProdutos, error: produtosError } = await supabase
      .from('produtos')
      .select('id, nome, categoria_id, grupo_id')
      .eq('ativo', true);

    if (produtosError) {
      console.error('Error fetching products:', produtosError);
      throw produtosError;
    }

    // Preparar contexto para a IA
    const historicoCompras = orcamentosAnteriores?.map(o => ({
      data: o.created_at,
      produtos: o.orcamento_itens?.map((item: any) => ({
        nome: item.produtos?.nome,
        categoria: item.produtos?.categoria_id,
        grupo: item.produtos?.grupo_id
      }))
    })) || [];

    const produtosAtuais = itensAtuais?.map((item: any) => ({
      nome: item.produtos?.nome,
      categoria: item.produtos?.categoria_id,
      grupo: item.produtos?.grupo_id
    })) || [];

    const prompt = `
Baseado no histórico de compras e no pedido atual, sugira 3 produtos complementares relevantes:

Histórico de compras:
${JSON.stringify(historicoCompras, null, 2)}

Produtos no pedido atual:
${JSON.stringify(produtosAtuais, null, 2)}

Produtos disponíveis:
${JSON.stringify(todosProdutos, null, 2)}

Sugira 3 produtos que façam sentido adicionar a este pedido, considerando:
1. Complementaridade com itens já escolhidos
2. Padrões de compra anteriores
3. Produtos frequentemente comprados juntos

Responda com o ID e nome dos produtos sugeridos.
`;

    // Chamar Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente de vendas especializado em sugestões de produtos complementares.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'suggest_products',
              description: 'Retorna lista de produtos sugeridos',
              parameters: {
                type: 'object',
                properties: {
                  suggestions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        produto_id: { type: 'string' },
                        nome: { type: 'string' },
                        razao: { type: 'string' }
                      },
                      required: ['produto_id', 'nome', 'razao']
                    }
                  }
                },
                required: ['suggestions']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'suggest_products' } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI Response:', JSON.stringify(aiData, null, 2));

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.log('No tool call in response');
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const suggestions = JSON.parse(toolCall.function.arguments).suggestions;

    // Salvar sugestões no banco
    const sugestoesParaInserir = suggestions.map((s: any) => ({
      orcamento_id: orcamentoId,
      produto_id: s.produto_id,
      enviado: false,
      aceito: false
    }));

    const { error: insertError } = await supabase
      .from('produtos_sugeridos')
      .insert(sugestoesParaInserir);

    if (insertError) {
      console.error('Error inserting suggestions:', insertError);
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in suggest-products:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
