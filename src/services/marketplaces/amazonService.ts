import { supabase } from "@/integrations/supabase/client";
import { BaseMarketplaceService } from "./baseService";

export class AmazonService extends BaseMarketplaceService {
  constructor() {
    super("Amazon Brasil");
  }

  async conectarConta(contaMarketplaceId: string): Promise<void> {
    // TODO: Implementar chamada real da Amazon SP-API OAuth
    // https://developer-docs.amazon.com/sp-api/docs/connecting-to-the-selling-partner-api
    
    console.log(`[${this.marketplaceName}] Conectando conta ${contaMarketplaceId}...`);
    
    const mockToken = `AMZ_TOKEN_${Date.now()}`;
    const mockRefresh = `AMZ_REFRESH_${Date.now()}`;
    const expiracao = new Date();
    expiracao.setHours(expiracao.getHours() + 1);

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
      'Conta conectada com sucesso à Amazon Brasil (mock)',
      true,
      { token_expira: expiracao.toISOString() }
    );
  }

  async sincronizarProdutos(contaMarketplaceId: string): Promise<void> {
    // TODO: Implementar chamada real da Amazon SP-API
    // GET /catalog/v0/items
    
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
            sku_marketplace: `ASIN${Math.random().toString(36).substring(2, 12).toUpperCase()}`,
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
      `${produtos?.length || 0} produtos sincronizados com Amazon (mock)`,
      true,
      { quantidade: produtos?.length || 0 }
    );
  }

  async sincronizarEstoquePrecos(contaMarketplaceId: string): Promise<void> {
    // TODO: Implementar chamada real da Amazon SP-API
    // POST /feeds/v0/feeds (JSON_LISTINGS_FEED)
    
    console.log(`[${this.marketplaceName}] Sincronizando estoque/preços para conta ${contaMarketplaceId}...`);

    const { data: produtosMarketplace } = await supabase
      .from('marketplace_produtos')
      .select('id, produto_id')
      .eq('conta_marketplace_id', contaMarketplaceId);

    await this.criarLog(
      contaMarketplaceId,
      'sync_estoque_precos',
      `Estoque e preços de ${produtosMarketplace?.length || 0} produtos atualizados na Amazon (mock)`,
      true,
      { quantidade: produtosMarketplace?.length || 0 }
    );
  }

  async sincronizarPedidos(contaMarketplaceId: string): Promise<void> {
    // TODO: Implementar chamada real da Amazon SP-API
    // GET /orders/v0/orders
    
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
          id_pedido_marketplace: `408-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
          valor_total: 459.00,
          nome_cliente: 'Pedro Oliveira',
          status: 'em_processamento',
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
              dados_brutos_json: { source: 'mock', marketplace: 'amazon' },
            })
            .select()
            .single();

          if (novoPedido) {
            await supabase.from('pedidos_marketplace_itens').insert({
              pedido_marketplace_id: novoPedido.id,
              sku: 'SKU-MOCK-AMZ',
              nome: 'Produto Mock Amazon',
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
      '1 pedido importado da Amazon (mock)',
      true,
      { quantidade: 1 }
    );
  }
}

export const amazonService = new AmazonService();
