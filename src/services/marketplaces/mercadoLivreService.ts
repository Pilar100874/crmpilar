import { supabase } from "@/integrations/supabase/client";
import { BaseMarketplaceService } from "./baseService";

export class MercadoLivreService extends BaseMarketplaceService {
  constructor() {
    super("Mercado Livre");
  }

  async conectarConta(contaMarketplaceId: string): Promise<void> {
    // TODO: Implementar chamada real da API do Mercado Livre OAuth
    // https://developers.mercadolivre.com.br/pt_br/autenticacao-e-autorizacao
    
    console.log(`[${this.marketplaceName}] Conectando conta ${contaMarketplaceId}...`);
    
    // Simular conexão bem-sucedida
    const mockToken = `ML_TOKEN_${Date.now()}`;
    const mockRefresh = `ML_REFRESH_${Date.now()}`;
    const expiracao = new Date();
    expiracao.setHours(expiracao.getHours() + 6);

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
      'Conta conectada com sucesso ao Mercado Livre (mock)',
      true,
      { token_expira: expiracao.toISOString() }
    );
  }

  async sincronizarProdutos(contaMarketplaceId: string): Promise<void> {
    // TODO: Implementar chamada real da API do Mercado Livre
    // GET /users/{user_id}/items/search
    
    console.log(`[${this.marketplaceName}] Sincronizando produtos para conta ${contaMarketplaceId}...`);

    const estabelecimentoId = await this.getEstabelecimentoId();
    
    // Buscar produtos internos
    const { data: produtos } = await supabase
      .from('produtos')
      .select('id, nome')
      .eq('estabelecimento_id', estabelecimentoId)
      .eq('ativo', true)
      .limit(10);

    // Buscar marketplace_id
    const { data: conta } = await supabase
      .from('contas_marketplace')
      .select('marketplace_id')
      .eq('id', contaMarketplaceId)
      .single();

    if (produtos && conta) {
      for (const produto of produtos) {
        // Verificar se já existe
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
            sku_marketplace: `MLB${Math.random().toString(36).substring(7).toUpperCase()}`,
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
      `${produtos?.length || 0} produtos sincronizados com Mercado Livre (mock)`,
      true,
      { quantidade: produtos?.length || 0 }
    );
  }

  async sincronizarEstoquePrecos(contaMarketplaceId: string): Promise<void> {
    // TODO: Implementar chamada real da API do Mercado Livre
    // PUT /items/{item_id}
    
    console.log(`[${this.marketplaceName}] Sincronizando estoque/preços para conta ${contaMarketplaceId}...`);

    const { data: produtosMarketplace } = await supabase
      .from('marketplace_produtos')
      .select('id, produto_id')
      .eq('conta_marketplace_id', contaMarketplaceId);

    await this.criarLog(
      contaMarketplaceId,
      'sync_estoque_precos',
      `Estoque e preços de ${produtosMarketplace?.length || 0} produtos atualizados no Mercado Livre (mock)`,
      true,
      { quantidade: produtosMarketplace?.length || 0 }
    );
  }

  async sincronizarPedidos(contaMarketplaceId: string): Promise<void> {
    // TODO: Implementar chamada real da API do Mercado Livre
    // GET /orders/search
    
    console.log(`[${this.marketplaceName}] Sincronizando pedidos para conta ${contaMarketplaceId}...`);

    const estabelecimentoId = await this.getEstabelecimentoId();
    
    const { data: conta } = await supabase
      .from('contas_marketplace')
      .select('marketplace_id')
      .eq('id', contaMarketplaceId)
      .single();

    if (conta) {
      // Criar pedidos mock
      const mockPedidos = [
        {
          id_pedido_marketplace: `MLB-${Date.now()}-001`,
          valor_total: 299.90,
          nome_cliente: 'João Silva',
          status: 'novo',
        },
        {
          id_pedido_marketplace: `MLB-${Date.now()}-002`,
          valor_total: 599.00,
          nome_cliente: 'Maria Santos',
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
              dados_brutos_json: { source: 'mock', marketplace: 'mercado_livre' },
            })
            .select()
            .single();

          if (novoPedido) {
            await supabase.from('pedidos_marketplace_itens').insert({
              pedido_marketplace_id: novoPedido.id,
              sku: 'SKU-MOCK-001',
              nome: 'Produto Mock Mercado Livre',
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
      '2 pedidos importados do Mercado Livre (mock)',
      true,
      { quantidade: 2 }
    );
  }
}

export const mercadoLivreService = new MercadoLivreService();
