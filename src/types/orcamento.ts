export interface ProdutoGrupo {
  id: string;
  estabelecimento_id: string;
  nome: string;
  percentual_comissao: number;
  created_at: string;
  updated_at: string;
}

export interface ProdutoCategoria {
  id: string;
  estabelecimento_id: string;
  nome: string;
  created_at: string;
  updated_at: string;
}

export interface Produto {
  id: string;
  estabelecimento_id: string;
  nome: string;
  largura?: number;
  gramatura?: number;
  comprimento?: number;
  peso_unitario?: number;
  foto_url?: string;
  categoria_id?: string;
  grupo_id?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  categoria?: ProdutoCategoria;
  grupo?: ProdutoGrupo;
}

export interface CondicaoPagamento {
  id: string;
  estabelecimento_id: string;
  nome: string;
  descricao?: string;
  valor_minimo: number;
  valor_maximo?: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface TabelaPreco {
  id: string;
  estabelecimento_id: string;
  unidade_id?: string;
  categoria_id: string;
  preco_minimo: number;
  preco_tabela: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  categoria?: ProdutoCategoria;
}

export type OrcamentoEtapa = 'orcamento' | 'negociacao' | 'aprovacao_gerencia' | 'perdido' | 'finalizado';

export interface Orcamento {
  id: string;
  estabelecimento_id: string;
  cliente_id: string;
  vendedor_id: string;
  unidade_id?: string;
  condicao_pagamento_id?: string;
  etapa: OrcamentoEtapa;
  status: string;
  valor_total: number;
  valor_desconto: number;
  percentual_desconto: number;
  observacoes?: string;
  motivo_perda?: string;
  token_compartilhamento?: string;
  data_envio?: string;
  data_visualizacao?: string;
  data_modificacao_cliente?: string;
  orcamento_origem_id?: string;
  created_at: string;
  updated_at: string;
  cliente?: any;
  vendedor?: any;
  condicao_pagamento?: CondicaoPagamento;
  itens?: OrcamentoItem[];
}

export interface OrcamentoItem {
  id: string;
  orcamento_id: string;
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
  preco_original: number;
  desconto: number;
  subtotal: number;
  created_at: string;
  updated_at: string;
  produto?: Produto;
}

export interface OrcamentoHistorico {
  id: string;
  orcamento_id: string;
  usuario_id?: string;
  tipo_usuario: 'vendedor' | 'cliente' | 'gerente' | 'sistema';
  acao: string;
  dados_anteriores?: any;
  dados_novos?: any;
  created_at: string;
}

export interface ProdutoSugerido {
  id: string;
  orcamento_id: string;
  produto_id: string;
  enviado: boolean;
  aceito: boolean;
  created_at: string;
  produto?: Produto;
}
