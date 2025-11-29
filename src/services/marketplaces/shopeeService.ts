import { supabase } from "@/integrations/supabase/client";
import { BaseMarketplaceService } from "./baseService";

export class ShopeeService extends BaseMarketplaceService {
  constructor() {
    super("Shopee");
  }

  async conectarConta(contaMarketplaceId: string): Promise<void> {
    // TODO: Implementar chamada real da API da Shopee OAuth
    // https://open.shopee.com/documents/v2/v2.auth.access_token.get
    
    console.log(`[${this.marketplaceName}] Conectando conta ${contaMarketplaceId}...`);
    
    const mockToken = `SHOPEE_TOKEN_${Date.now()}`;
    const mockRefresh = `SHOPEE_REFRESH_${Date.now()}`;
    const expiracao = new Date();
    expiracao.setHours(expiracao.getHours() + 4);

    await this.atualizarStatusConta(
      contaMarketplaceId, 
      'conectado', 
      mockToken, 
      mockRefresh, 
      expiracao
    );

    await this.criarLog(
      contaMarketplaceId,
      'conexao',
      'Conta conectada com sucesso à Shopee (mock)',
      true,
      { token_expira: expiracao.toISOString() }
    );
  }

  async sincronizarProdutos(contaMarketplaceId: string): Promise<void> {
    // TODO: Implementar chamada real da API da Shopee
    // GET /api/v2/product/get_item_list
    
    console.log(`[${this.marketplaceName}] Sincronizando produtos para conta ${contaMarketplaceId}...`);

    const estabelecimentoId = await this.getEstabelecimentoId();
    
    const { data: produtos } = await supabase
      .from('produtos')
      .select('id, nome')
      .eq('estabelecimento_id', estabelecimentoId)
      .eq('ativo', true)
      .limit(10);

    const { data: conta } = await supabase
      .from('contas_marketplace')
      .select('marketplace_id')
      .eq('id', contaMarketplaceId)
      .single();

    if (produtos && conta) {
      for (const produto of produtos) {
        const { data: existing } = await supabase
          .from('marketplace_produtos')
          .select('id')
          .eq('produto_id', produto.id)
          .eq('conta_marketplace_id', contaMarketplaceId)
          .single();

        if (!existing) {
          await supabase.from('marketplace_produtos').insert({
            produto_id: produto.id,
            marketplace_id: conta.marketplace_id,
            conta_marketplace_id: contaMarketplaceId,
            sku_marketplace: `SPE${Math.floor(Math.random() * 10000000000)}`,
            titulo_marketplace: produto.nome,
            status: 'listado',
            ultimo_sync: new Date().toISOString(),
          });
        } else {
          await supabase
            .from('marketplace_produtos')
            .update({
              ultimo_sync: new Date().toISOString(),
              status: 'listado',
            })
            .eq('id', existing.id);
        }
      }
    }

    await this.criarLog(
      contaMarketplaceId,
      'sync_produtos',
      `${produtos?.length || 0} produtos sincronizados com Shopee (mock)`,
      true,
      { quantidade: produtos?.length || 0 }
    );
  }

  async sincronizarEstoquePrecos(contaMarketplaceId: string): Promise<void> {
    // TODO: Implementar chamada real da API da Shopee
    // POST /api/v2/product/update_stock
    
    console.log(`[${this.marketplaceName}] Sincronizando estoque/preços para conta ${contaMarketplaceId}...`);

    const { data: produtosMarketplace } = await supabase
      .from('marketplace_produtos')
      .select('id, produto_id')
      .eq('conta_marketplace_id', contaMarketplaceId);

    await this.criarLog(
      contaMarketplaceId,
      'sync_estoque_precos',
      `Estoque e preços de ${produtosMarketplace?.length || 0} produtos atualizados na Shopee (mock)`,
      true,
      { quantidade: produtosMarketplace?.length || 0 }
    );
  }

  async sincronizarPedidos(contaMarketplaceId: string): Promise<void> {
    // TODO: Implementar chamada real da API da Shopee
    // GET /api/v2/order/get_order_list
    
    console.log(`[${this.marketplaceName}] Sincronizando pedidos para conta ${contaMarketplaceId}...`);

    const estabelecimentoId = await this.getEstabelecimentoId();
    
    const { data: conta } = await supabase
      .from('contas_marketplace')
      .select('marketplace_id')
      .eq('id', contaMarketplaceId)
      .single();

    if (conta) {
      const mockPedidos = [
        {
          id_pedido_marketplace: `SPE${Date.now()}001`,
          valor_total: 89.90,
          nome_cliente: 'Ana Costa',
          status: 'novo',
        },
      ];

      for (const pedido of mockPedidos) {
        const { data: existing } = await supabase
          .from('pedidos_marketplace')
          .select('id')
          .eq('id_pedido_marketplace', pedido.id_pedido_marketplace)
          .eq('conta_marketplace_id', contaMarketplaceId)
          .single();

        if (!existing) {
          const { data: novoPedido } = await supabase
            .from('pedidos_marketplace')
            .insert({
              estabelecimento_id: estabelecimentoId,
              conta_marketplace_id: contaMarketplaceId,
              marketplace_id: conta.marketplace_id,
              id_pedido_marketplace: pedido.id_pedido_marketplace,
              data_pedido: new Date().toISOString(),
              status: pedido.status,
              valor_total: pedido.valor_total,
              nome_cliente: pedido.nome_cliente,
              dados_brutos_json: { source: 'mock', marketplace: 'shopee' },
            })
            .select()
            .single();

          if (novoPedido) {
            await supabase.from('pedidos_marketplace_itens').insert({
              pedido_marketplace_id: novoPedido.id,
              sku: 'SKU-MOCK-SPE',
              nome: 'Produto Mock Shopee',
              quantidade: 1,
              preco_unitario: pedido.valor_total,
            });
          }
        }
      }
    }

    await this.criarLog(
      contaMarketplaceId,
      'sync_pedidos',
      '1 pedido importado da Shopee (mock)',
      true,
      { quantidade: 1 }
    );
  }
}

export const shopeeService = new ShopeeService();
