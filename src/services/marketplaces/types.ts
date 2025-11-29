// Tipos para o módulo de Marketplaces

export interface Marketplace {
  id: string;
  nome: string;
  nome_display: string;
  descricao: string | null;
  icone: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContaMarketplace {
  id: string;
  estabelecimento_id: string;
  marketplace_id: string;
  nome_loja: string;
  seller_id: string | null;
  status: 'nao_conectado' | 'conectado' | 'erro_token' | 'sincronizando';
  access_token: string | null;
  refresh_token: string | null;
  data_expiracao_token: string | null;
  ambiente: 'producao' | 'sandbox';
  configuracoes: Record<string, any>;
  created_at: string;
  updated_at: string;
  marketplace?: Marketplace;
}

export interface MarketplaceProduto {
  id: string;
  produto_id: string;
  marketplace_id: string;
  conta_marketplace_id: string;
  sku_marketplace: string | null;
  titulo_marketplace: string | null;
  url_anuncio: string | null;
  status: 'listado' | 'nao_listado' | 'pausado' | 'erro';
  ultimo_sync: string | null;
  mensagem_erro: string | null;
  dados_extras: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface PedidoMarketplace {
  id: string;
  estabelecimento_id: string;
  conta_marketplace_id: string;
  marketplace_id: string;
  id_pedido_marketplace: string;
  data_pedido: string;
  status: 'novo' | 'em_processamento' | 'enviado' | 'entregue' | 'cancelado';
  valor_total: number;
  moeda: string;
  nome_cliente: string | null;
  endereco_entrega: Record<string, any> | null;
  dados_brutos_json: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  conta_marketplace?: ContaMarketplace;
  marketplace?: Marketplace;
}

export interface PedidoMarketplaceItem {
  id: string;
  pedido_marketplace_id: string;
  produto_id: string | null;
  marketplace_produto_id: string | null;
  sku: string | null;
  nome: string;
  quantidade: number;
  preco_unitario: number;
  created_at: string;
}

export interface MarketplaceLog {
  id: string;
  estabelecimento_id: string;
  conta_marketplace_id: string | null;
  marketplace_id: string | null;
  tipo: string;
  mensagem: string;
  detalhes: Record<string, any> | null;
  sucesso: boolean;
  created_at: string;
}

// Interface comum para todos os services de marketplace
export interface IMarketplaceService {
  conectarConta(contaMarketplaceId: string): Promise<void>;
  sincronizarProdutos(contaMarketplaceId: string): Promise<void>;
  sincronizarEstoquePrecos(contaMarketplaceId: string): Promise<void>;
  sincronizarPedidos(contaMarketplaceId: string): Promise<void>;
}
