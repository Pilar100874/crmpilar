import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  contaMarketplaceId: string;
  action: 'produtos' | 'pedidos' | 'estoque';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contaMarketplaceId, action } = await req.json() as SyncRequest;

    if (!contaMarketplaceId || !action) {
      return new Response(JSON.stringify({ error: 'contaMarketplaceId e action são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`🔄 Iniciando sync ${action} para conta: ${contaMarketplaceId}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar conta com token válido
    const { data: conta, error: contaError } = await supabase
      .from('contas_marketplace')
      .select('*, estabelecimento_id')
      .eq('id', contaMarketplaceId)
      .single();

    if (contaError || !conta) {
      return new Response(JSON.stringify({ error: 'Conta não encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (conta.status !== 'conectado' || !conta.access_token) {
      return new Response(JSON.stringify({ error: 'Conta não está conectada. Faça a autenticação OAuth primeiro.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar se token está expirado e fazer refresh se necessário
    const accessToken = await ensureValidToken(supabase, conta);

    let result;
    switch (action) {
      case 'produtos':
        result = await syncProdutos(supabase, conta, accessToken);
        break;
      case 'pedidos':
        result = await syncPedidos(supabase, conta, accessToken);
        break;
      case 'estoque':
        result = await syncEstoque(supabase, conta, accessToken);
        break;
      default:
        return new Response(JSON.stringify({ error: 'Ação inválida' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('❌ Erro na sincronização:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function ensureValidToken(supabase: any, conta: any): Promise<string> {
  const expiresAt = new Date(conta.data_expiracao_token);
  const now = new Date();
  
  // Se token expira em menos de 5 minutos, fazer refresh
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
  
  if (expiresAt <= fiveMinutesFromNow) {
    console.log('🔄 Token expirando, fazendo refresh...');
    
    const config = conta.configuracoes as { ml_client_id?: string; ml_client_secret?: string } | null;
    
    if (!config?.ml_client_id || !config?.ml_client_secret || !conta.refresh_token) {
      throw new Error('Credenciais insuficientes para refresh do token');
    }

    const tokenResponse = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: config.ml_client_id,
        client_secret: config.ml_client_secret,
        refresh_token: conta.refresh_token,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      console.error('❌ Erro ao fazer refresh:', tokenData);
      
      // Marcar conta como erro de token
      await supabase
        .from('contas_marketplace')
        .update({ status: 'erro_token' })
        .eq('id', conta.id);
        
      throw new Error('Token expirado. Reconecte a conta.');
    }

    // Atualizar tokens
    const newExpiresAt = new Date();
    newExpiresAt.setSeconds(newExpiresAt.getSeconds() + tokenData.expires_in);

    await supabase
      .from('contas_marketplace')
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        data_expiracao_token: newExpiresAt.toISOString(),
      })
      .eq('id', conta.id);

    console.log('✅ Token renovado com sucesso');
    return tokenData.access_token;
  }

  return conta.access_token;
}

async function syncProdutos(supabase: any, conta: any, accessToken: string) {
  console.log('📦 Sincronizando produtos...');
  
  try {
    // Buscar IDs dos anúncios do vendedor
    const itemsResponse = await fetch(
      `https://api.mercadolibre.com/users/${conta.seller_id}/items/search?limit=100`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      }
    );

    const itemsData = await itemsResponse.json();

    if (!itemsResponse.ok) {
      throw new Error(itemsData.message || 'Erro ao buscar anúncios');
    }

    const itemIds = itemsData.results || [];
    console.log(`📦 Encontrados ${itemIds.length} anúncios`);

    let synced = 0;
    let errors = 0;

    // Buscar detalhes de cada item (em lotes de 20)
    for (let i = 0; i < itemIds.length; i += 20) {
      const batch = itemIds.slice(i, i + 20);
      const idsParam = batch.join(',');

      const detailsResponse = await fetch(
        `https://api.mercadolibre.com/items?ids=${idsParam}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );

      const detailsData = await detailsResponse.json();

      for (const itemResult of detailsData) {
        if (itemResult.code === 200 && itemResult.body) {
          const item = itemResult.body;
          
          // Upsert no marketplace_produtos
          const { error } = await supabase
            .from('marketplace_produtos')
            .upsert({
              conta_marketplace_id: conta.id,
              sku_marketplace: item.id,
              titulo_marketplace: item.title,
              status: item.status,
              preco_marketplace: item.price,
              estoque_marketplace: item.available_quantity,
              url_anuncio: item.permalink,
              ultimo_sync: new Date().toISOString(),
              dados_marketplace: {
                category_id: item.category_id,
                condition: item.condition,
                listing_type_id: item.listing_type_id,
                thumbnail: item.thumbnail,
              },
            }, {
              onConflict: 'conta_marketplace_id,sku_marketplace',
            });

          if (error) {
            console.error(`Erro ao salvar item ${item.id}:`, error);
            errors++;
          } else {
            synced++;
          }
        } else {
          errors++;
        }
      }
    }

    // Log do resultado
    await supabase.from('marketplace_logs').insert({
      conta_marketplace_id: conta.id,
      estabelecimento_id: conta.estabelecimento_id,
      tipo: 'sync_produtos',
      mensagem: `Sincronização concluída: ${synced} produtos atualizados, ${errors} erros`,
      sucesso: errors === 0,
    });

    console.log(`✅ Sync produtos: ${synced} ok, ${errors} erros`);
    return { success: true, synced, errors, total: itemIds.length };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    await supabase.from('marketplace_logs').insert({
      conta_marketplace_id: conta.id,
      estabelecimento_id: conta.estabelecimento_id,
      tipo: 'sync_produtos',
      mensagem: `Erro: ${errorMessage}`,
      sucesso: false,
    });
    throw error;
  }
}

async function syncPedidos(supabase: any, conta: any, accessToken: string) {
  console.log('🛒 Sincronizando pedidos...');
  
  try {
    // Buscar pedidos recentes (últimos 30 dias)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const ordersResponse = await fetch(
      `https://api.mercadolibre.com/orders/search?seller=${conta.seller_id}&order.date_created.from=${thirtyDaysAgo.toISOString()}&limit=50`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      }
    );

    const ordersData = await ordersResponse.json();

    if (!ordersResponse.ok) {
      throw new Error(ordersData.message || 'Erro ao buscar pedidos');
    }

    const orders = ordersData.results || [];
    console.log(`🛒 Encontrados ${orders.length} pedidos`);

    let synced = 0;
    let errors = 0;

    for (const order of orders) {
      try {
        // Upsert pedido
        const { error: orderError } = await supabase
          .from('pedidos_marketplace')
          .upsert({
            conta_marketplace_id: conta.id,
            id_pedido_marketplace: order.id.toString(),
            data_pedido: order.date_created,
            status: order.status,
            valor_total: order.total_amount,
            moeda: order.currency_id,
            dados_brutos_json: order,
          }, {
            onConflict: 'conta_marketplace_id,id_pedido_marketplace',
          });

        if (orderError) {
          console.error(`Erro ao salvar pedido ${order.id}:`, orderError);
          errors++;
          continue;
        }

        // Buscar ID do pedido salvo
        const { data: savedOrder } = await supabase
          .from('pedidos_marketplace')
          .select('id')
          .eq('conta_marketplace_id', conta.id)
          .eq('id_pedido_marketplace', order.id.toString())
          .single();

        if (savedOrder && order.order_items) {
          // Deletar itens antigos e inserir novos
          await supabase
            .from('pedidos_marketplace_itens')
            .delete()
            .eq('pedido_marketplace_id', savedOrder.id);

          for (const item of order.order_items) {
            await supabase
              .from('pedidos_marketplace_itens')
              .insert({
                pedido_marketplace_id: savedOrder.id,
                sku: item.item?.id || '',
                nome: item.item?.title || '',
                quantidade: item.quantity,
                preco_unitario: item.unit_price,
              });
          }
        }

        synced++;
      } catch (err) {
        console.error(`Erro no pedido ${order.id}:`, err);
        errors++;
      }
    }

    await supabase.from('marketplace_logs').insert({
      conta_marketplace_id: conta.id,
      estabelecimento_id: conta.estabelecimento_id,
      tipo: 'sync_pedidos',
      mensagem: `Sincronização concluída: ${synced} pedidos atualizados, ${errors} erros`,
      sucesso: errors === 0,
    });

    console.log(`✅ Sync pedidos: ${synced} ok, ${errors} erros`);
    return { success: true, synced, errors, total: orders.length };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    await supabase.from('marketplace_logs').insert({
      conta_marketplace_id: conta.id,
      estabelecimento_id: conta.estabelecimento_id,
      tipo: 'sync_pedidos',
      mensagem: `Erro: ${errorMessage}`,
      sucesso: false,
    });
    throw error;
  }
}

async function syncEstoque(supabase: any, conta: any, accessToken: string) {
  console.log('📊 Sincronizando estoque/preços...');
  
  try {
    // Buscar produtos vinculados que têm produto interno
    const { data: produtos, error: prodError } = await supabase
      .from('marketplace_produtos')
      .select('*, produto:produto_interno_id(id, preco, estoque)')
      .eq('conta_marketplace_id', conta.id)
      .not('produto_interno_id', 'is', null);

    if (prodError) {
      throw new Error('Erro ao buscar produtos vinculados');
    }

    console.log(`📊 Encontrados ${produtos?.length || 0} produtos vinculados`);

    let synced = 0;
    let errors = 0;

    for (const mp of produtos || []) {
      if (!mp.produto) continue;

      try {
        // Atualizar preço
        const priceResponse = await fetch(
          `https://api.mercadolibre.com/items/${mp.sku_marketplace}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              price: mp.produto.preco,
              available_quantity: mp.produto.estoque,
            }),
          }
        );

        if (!priceResponse.ok) {
          const errData = await priceResponse.json();
          console.error(`Erro ao atualizar ${mp.sku_marketplace}:`, errData);
          errors++;
          continue;
        }

        // Atualizar registro local
        await supabase
          .from('marketplace_produtos')
          .update({
            preco_marketplace: mp.produto.preco,
            estoque_marketplace: mp.produto.estoque,
            ultimo_sync: new Date().toISOString(),
          })
          .eq('id', mp.id);

        synced++;
      } catch (err) {
        console.error(`Erro no produto ${mp.sku_marketplace}:`, err);
        errors++;
      }
    }

    await supabase.from('marketplace_logs').insert({
      conta_marketplace_id: conta.id,
      estabelecimento_id: conta.estabelecimento_id,
      tipo: 'sync_estoque',
      mensagem: `Sincronização concluída: ${synced} produtos atualizados, ${errors} erros`,
      sucesso: errors === 0,
    });

    console.log(`✅ Sync estoque: ${synced} ok, ${errors} erros`);
    return { success: true, synced, errors, total: produtos?.length || 0 };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    await supabase.from('marketplace_logs').insert({
      conta_marketplace_id: conta.id,
      estabelecimento_id: conta.estabelecimento_id,
      tipo: 'sync_estoque',
      mensagem: `Erro: ${errorMessage}`,
      sucesso: false,
    });
    throw error;
  }
}
