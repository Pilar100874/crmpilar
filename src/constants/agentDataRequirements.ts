// Campos de dados que cada template de agente precisa para funcionar
export interface AgentDataField {
  campo: string;
  label: string;
  descricao: string;
  tipo: 'texto' | 'tabela' | 'lista' | 'numero' | 'json';
  obrigatorio: boolean;
  tabelas_sistema_sugeridas?: string[];
  colunas_sugeridas?: string[];
}

export interface AgentDataRequirement {
  template_key: string;
  nome: string;
  icone: string;
  campos: AgentDataField[];
}

export const AGENT_DATA_REQUIREMENTS: AgentDataRequirement[] = [
  {
    template_key: 'comercial',
    nome: 'Agente Comercial',
    icone: '💼',
    campos: [
      { campo: 'catalogo_produtos', label: 'Catálogo de Produtos', descricao: 'Lista de produtos com nome, código, preço e categoria', tipo: 'tabela', obrigatorio: true, tabelas_sistema_sugeridas: ['produtos', 'produtos_importados'], colunas_sugeridas: ['nome', 'codigo', 'preco_venda', 'categoria'] },
      { campo: 'tabela_precos', label: 'Tabela de Preços', descricao: 'Preços vigentes com condições comerciais', tipo: 'tabela', obrigatorio: true, tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['preco_venda', 'preco_custo'] },
      { campo: 'politica_desconto', label: 'Política de Descontos', descricao: 'Faixas de desconto permitidas, regras e limites', tipo: 'texto', obrigatorio: true },
      { campo: 'argumentos_venda', label: 'Argumentos de Venda', descricao: 'Diferenciais, benefícios e argumentação comercial', tipo: 'texto', obrigatorio: false },
      { campo: 'campanhas_ativas', label: 'Campanhas Ativas', descricao: 'Promoções e campanhas vigentes', tipo: 'texto', obrigatorio: false },
    ]
  },
  {
    template_key: 'inteligencia_cliente',
    nome: 'Agente Inteligência do Cliente',
    icone: '🧠',
    campos: [
      { campo: 'historico_compras', label: 'Histórico de Compras', descricao: 'Dados de pedidos e compras anteriores do cliente', tipo: 'tabela', obrigatorio: true, tabelas_sistema_sugeridas: ['orcamentos', 'orcamento_itens'], colunas_sugeridas: ['cliente_id', 'valor_total', 'data'] },
      { campo: 'dados_clientes', label: 'Cadastro de Clientes', descricao: 'Informações cadastrais dos clientes', tipo: 'tabela', obrigatorio: true, tabelas_sistema_sugeridas: ['customers', 'empresas'], colunas_sugeridas: ['nome', 'telefone', 'email'] },
      { campo: 'segmentos', label: 'Segmentos/Tags', descricao: 'Segmentação e classificação de clientes', tipo: 'tabela', obrigatorio: false, tabelas_sistema_sugeridas: ['customer_segmentos'] },
      { campo: 'metricas_comportamento', label: 'Métricas de Comportamento', descricao: 'Frequência de compra, ticket médio, recência', tipo: 'texto', obrigatorio: false },
    ]
  },
  {
    template_key: 'recompra',
    nome: 'Agente Recompra',
    icone: '🔄',
    campos: [
      { campo: 'ciclo_reposicao', label: 'Ciclo de Reposição', descricao: 'Intervalos típicos de recompra por produto/categoria', tipo: 'texto', obrigatorio: true },
      { campo: 'historico_compras', label: 'Histórico de Compras', descricao: 'Últimas compras e datas', tipo: 'tabela', obrigatorio: true, tabelas_sistema_sugeridas: ['orcamentos', 'orcamento_itens'] },
      { campo: 'alertas_recompra', label: 'Regras de Alerta', descricao: 'Quando alertar sobre necessidade de reposição', tipo: 'texto', obrigatorio: false },
    ]
  },
  {
    template_key: 'mix_crosssell',
    nome: 'Agente Mix e Cross-sell',
    icone: '🎯',
    campos: [
      { campo: 'regras_crosssell', label: 'Regras de Cross-sell', descricao: 'Produtos complementares e sugestões de venda cruzada', tipo: 'tabela', obrigatorio: true, tabelas_sistema_sugeridas: ['agent_cross_sell_rules'] },
      { campo: 'combos_kits', label: 'Combos e Kits', descricao: 'Kits de produtos pré-definidos', tipo: 'texto', obrigatorio: false },
      { campo: 'produtos_substitutos', label: 'Produtos Substitutos', descricao: 'Alternativas quando o produto não está disponível', tipo: 'texto', obrigatorio: false },
    ]
  },
  {
    template_key: 'financeiro',
    nome: 'Agente Financeiro',
    icone: '💰',
    campos: [
      { campo: 'limite_credito', label: 'Limite de Crédito', descricao: 'Limite de crédito por cliente e regras de análise', tipo: 'texto', obrigatorio: true },
      { campo: 'condicoes_pagamento', label: 'Condições de Pagamento', descricao: 'Formas e condições de pagamento aceitas', tipo: 'texto', obrigatorio: true },
      { campo: 'titulos_abertos', label: 'Títulos em Aberto', descricao: 'Inadimplência e títulos pendentes', tipo: 'tabela', obrigatorio: true },
      { campo: 'politica_credito', label: 'Política de Crédito', descricao: 'Regras de aprovação de crédito', tipo: 'texto', obrigatorio: false },
    ]
  },
  {
    template_key: 'logistico',
    nome: 'Agente Logístico',
    icone: '🚛',
    campos: [
      { campo: 'estoque_disponivel', label: 'Estoque Disponível', descricao: 'Quantidades em estoque por produto/filial', tipo: 'tabela', obrigatorio: true, tabelas_sistema_sugeridas: ['produtos'] },
      { campo: 'prazos_entrega', label: 'Prazos de Entrega', descricao: 'Tempos de entrega por região/modalidade', tipo: 'texto', obrigatorio: true },
      { campo: 'tabela_frete', label: 'Tabela de Frete', descricao: 'Custos de frete por região', tipo: 'texto', obrigatorio: false },
      { campo: 'centros_distribuicao', label: 'Centros de Distribuição', descricao: 'Filiais e CDs com endereços', tipo: 'texto', obrigatorio: false },
    ]
  },
  {
    template_key: 'margem',
    nome: 'Agente Margem e Estratégia',
    icone: '📊',
    campos: [
      { campo: 'margem_minima', label: 'Margem Mínima', descricao: 'Margem mínima aceitável por produto/categoria', tipo: 'texto', obrigatorio: true },
      { campo: 'custo_produtos', label: 'Custo dos Produtos', descricao: 'Custos de aquisição e despesas', tipo: 'tabela', obrigatorio: true, tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['preco_custo'] },
      { campo: 'metas_vendas', label: 'Metas de Vendas', descricao: 'Metas e objetivos comerciais', tipo: 'texto', obrigatorio: false },
    ]
  },
  {
    template_key: 'objecoes',
    nome: 'Agente Objeções',
    icone: '🛡️',
    campos: [
      { campo: 'objecoes_comuns', label: 'Objeções Comuns', descricao: 'Lista de objeções frequentes e respostas sugeridas', tipo: 'tabela', obrigatorio: true, tabelas_sistema_sugeridas: ['agent_objections'] },
      { campo: 'gatilhos_mentais', label: 'Gatilhos Mentais', descricao: 'Técnicas de persuasão e gatilhos', tipo: 'texto', obrigatorio: false },
      { campo: 'cases_sucesso', label: 'Cases de Sucesso', descricao: 'Exemplos e depoimentos de clientes', tipo: 'texto', obrigatorio: false },
    ]
  },
  {
    template_key: 'tecnico',
    nome: 'Agente Técnico',
    icone: '🔧',
    campos: [
      { campo: 'fichas_tecnicas', label: 'Fichas Técnicas', descricao: 'Especificações técnicas dos produtos', tipo: 'texto', obrigatorio: true },
      { campo: 'manuais', label: 'Manuais e Guias', descricao: 'Documentação técnica e manuais de uso', tipo: 'texto', obrigatorio: false },
      { campo: 'compatibilidade', label: 'Compatibilidade', descricao: 'Regras de compatibilidade entre produtos', tipo: 'texto', obrigatorio: false },
    ]
  },
  {
    template_key: 'excecoes',
    nome: 'Agente Exceções',
    icone: '⚠️',
    campos: [
      { campo: 'regras_excecao', label: 'Regras de Exceção', descricao: 'Condições especiais e regras de exceção', tipo: 'texto', obrigatorio: true },
      { campo: 'aprovadores', label: 'Aprovadores', descricao: 'Quem pode aprovar exceções e níveis de autoridade', tipo: 'texto', obrigatorio: true },
      { campo: 'historico_excecoes', label: 'Histórico de Exceções', descricao: 'Exceções anteriores e seus resultados', tipo: 'texto', obrigatorio: false },
    ]
  },
  {
    template_key: 'performance',
    nome: 'Agente Performance',
    icone: '📈',
    campos: [
      { campo: 'kpis', label: 'KPIs', descricao: 'Indicadores de performance a monitorar', tipo: 'texto', obrigatorio: true },
      { campo: 'metas', label: 'Metas', descricao: 'Metas de vendas e objetivos', tipo: 'texto', obrigatorio: false },
      { campo: 'benchmarks', label: 'Benchmarks', descricao: 'Referências do mercado para comparação', tipo: 'texto', obrigatorio: false },
    ]
  },
];

// Tabelas disponíveis do sistema para mapeamento
export const SYSTEM_TABLES = [
  { value: 'produtos', label: 'Produtos', colunas: ['id', 'nome', 'codigo', 'descricao', 'preco_venda', 'preco_custo', 'estoque', 'categoria', 'marca', 'grupo', 'subgrupo', 'unidade'] },
  { value: 'produtos_importados', label: 'Produtos Importados', colunas: ['id', 'nome', 'codigo', 'descricao', 'preco_venda', 'preco_custo', 'estoque', 'categoria', 'marca'] },
  { value: 'customers', label: 'Clientes/Contatos', colunas: ['id', 'name', 'phone', 'email', 'tags', 'score'] },
  { value: 'empresas', label: 'Empresas', colunas: ['id', 'nome', 'cnpj', 'tipo_cliente', 'email', 'telefone'] },
  { value: 'orcamentos', label: 'Orçamentos', colunas: ['id', 'numero', 'cliente_id', 'valor_total', 'status', 'data_criacao'] },
  { value: 'orcamento_itens', label: 'Itens do Orçamento', colunas: ['id', 'orcamento_id', 'produto_id', 'quantidade', 'preco_unitario', 'desconto'] },
  { value: 'agent_cross_sell_rules', label: 'Regras Cross-sell', colunas: ['id', 'produto_origem', 'produto_sugerido', 'tipo', 'motivo', 'prioridade'] },
  { value: 'agent_objections', label: 'Objeções', colunas: ['id', 'objecao', 'resposta_sugerida', 'categoria', 'argumentos'] },
];
