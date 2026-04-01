// Campos de dados que cada template de agente precisa para funcionar
export interface AgentDataField {
  campo: string;
  label: string;
  descricao: string;
  tipo: 'texto' | 'tabela' | 'lista' | 'numero' | 'json';
  obrigatorio: boolean;
  tabelas_sistema_sugeridas?: string[];
  colunas_sugeridas?: string[];
  exemplo?: string;
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
      // Produtos
      { campo: 'produto_nome', label: 'Nome do Produto', descricao: 'Nome ou descrição do produto', tipo: 'tabela', obrigatorio: true, tabelas_sistema_sugeridas: ['produtos', 'produtos_importados'], colunas_sugeridas: ['nome'], exemplo: 'Parafuso Sextavado M10' },
      { campo: 'produto_codigo', label: 'Código do Produto', descricao: 'SKU ou código interno', tipo: 'tabela', obrigatorio: true, tabelas_sistema_sugeridas: ['produtos', 'produtos_importados'], colunas_sugeridas: ['codigo'], exemplo: 'SKU-001234' },
      { campo: 'produto_preco', label: 'Preço de Venda', descricao: 'Preço vigente do produto', tipo: 'numero', obrigatorio: true, tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['preco_venda'], exemplo: '29.90' },
      { campo: 'produto_categoria', label: 'Categoria do Produto', descricao: 'Categoria ou grupo do produto', tipo: 'tabela', obrigatorio: false, tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['categoria', 'grupo'], exemplo: 'Fixadores' },
      { campo: 'produto_marca', label: 'Marca', descricao: 'Marca ou fabricante do produto', tipo: 'tabela', obrigatorio: false, tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['marca'], exemplo: 'Ciser' },
      { campo: 'produto_unidade', label: 'Unidade de Venda', descricao: 'Unidade de medida (UN, KG, CX, etc.)', tipo: 'tabela', obrigatorio: false, tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['unidade'], exemplo: 'UN' },
      { campo: 'produto_estoque', label: 'Estoque Disponível', descricao: 'Quantidade em estoque', tipo: 'numero', obrigatorio: false, tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['estoque'], exemplo: '150' },
      // Descontos
      { campo: 'desconto_maximo_percentual', label: 'Desconto Máximo (%)', descricao: 'Percentual máximo de desconto permitido', tipo: 'numero', obrigatorio: true, exemplo: '15' },
      { campo: 'desconto_por_volume', label: 'Desconto por Volume', descricao: 'Regras de desconto por quantidade comprada', tipo: 'texto', obrigatorio: false, exemplo: 'Acima de 100 UN: 5% | Acima de 500 UN: 10%' },
      { campo: 'desconto_por_pagamento', label: 'Desconto por Forma Pgto', descricao: 'Descontos por tipo de pagamento (à vista, PIX, etc.)', tipo: 'texto', obrigatorio: false, exemplo: 'PIX: 3% | Boleto à vista: 2%' },
      // Argumentação
      { campo: 'diferenciais_empresa', label: 'Diferenciais da Empresa', descricao: 'Principais diferenciais competitivos', tipo: 'texto', obrigatorio: false, exemplo: 'Entrega em 24h, estoque próprio, suporte técnico' },
      { campo: 'campanhas_ativas', label: 'Campanhas/Promoções Ativas', descricao: 'Promoções vigentes com regras e validade', tipo: 'texto', obrigatorio: false, exemplo: 'Semana do Construtor: 10% em ferramentas até 30/04' },
    ]
  },
  {
    template_key: 'inteligencia_cliente',
    nome: 'Agente Inteligência do Cliente',
    icone: '🧠',
    campos: [
      // Dados do cliente
      { campo: 'cliente_nome', label: 'Nome/Razão Social', descricao: 'Nome do cliente ou razão social da empresa', tipo: 'tabela', obrigatorio: true, tabelas_sistema_sugeridas: ['customers', 'empresas'], colunas_sugeridas: ['name', 'nome'], exemplo: 'Construtora ABC Ltda' },
      { campo: 'cliente_cnpj_cpf', label: 'CNPJ/CPF', descricao: 'Documento de identificação do cliente', tipo: 'tabela', obrigatorio: true, tabelas_sistema_sugeridas: ['empresas', 'customers'], colunas_sugeridas: ['cnpj', 'cpf'], exemplo: '12.345.678/0001-90' },
      { campo: 'cliente_email', label: 'E-mail', descricao: 'E-mail de contato principal', tipo: 'tabela', obrigatorio: false, tabelas_sistema_sugeridas: ['customers', 'empresas'], colunas_sugeridas: ['email'], exemplo: 'compras@abc.com.br' },
      { campo: 'cliente_telefone', label: 'Telefone', descricao: 'Telefone de contato', tipo: 'tabela', obrigatorio: false, tabelas_sistema_sugeridas: ['customers'], colunas_sugeridas: ['phone'], exemplo: '(11) 99999-0000' },
      { campo: 'cliente_endereco', label: 'Endereço', descricao: 'Endereço completo (cidade, estado, CEP)', tipo: 'tabela', obrigatorio: false, tabelas_sistema_sugeridas: ['empresas'], colunas_sugeridas: ['endereco', 'cidade', 'estado', 'cep'] },
      { campo: 'cliente_segmento', label: 'Segmento/Ramo', descricao: 'Segmento de atuação do cliente', tipo: 'tabela', obrigatorio: true, tabelas_sistema_sugeridas: ['empresas', 'customer_segmentos'], colunas_sugeridas: ['tipo_cliente', 'segmento'], exemplo: 'Construção Civil' },
      { campo: 'cliente_tags', label: 'Tags/Classificação', descricao: 'Tags ou etiquetas do cliente', tipo: 'tabela', obrigatorio: false, tabelas_sistema_sugeridas: ['customers'], colunas_sugeridas: ['tags'], exemplo: 'VIP, Recorrente, Grande Porte' },
      { campo: 'cliente_score', label: 'Score/Pontuação', descricao: 'Score ou pontuação do cliente', tipo: 'numero', obrigatorio: false, tabelas_sistema_sugeridas: ['customers'], colunas_sugeridas: ['score'], exemplo: '85' },
      // Histórico
      { campo: 'pedido_numero', label: 'Número do Pedido', descricao: 'Número/código do pedido ou orçamento', tipo: 'tabela', obrigatorio: true, tabelas_sistema_sugeridas: ['orcamentos', 'pedidos_ecommerce'], colunas_sugeridas: ['numero', 'numero_pedido'], exemplo: 'ORC-2025001' },
      { campo: 'pedido_data', label: 'Data do Pedido', descricao: 'Data em que o pedido foi realizado', tipo: 'tabela', obrigatorio: true, tabelas_sistema_sugeridas: ['orcamentos'], colunas_sugeridas: ['data_criacao', 'created_at'], exemplo: '2025-03-15' },
      { campo: 'pedido_valor_total', label: 'Valor Total do Pedido', descricao: 'Valor total do pedido/orçamento', tipo: 'numero', obrigatorio: true, tabelas_sistema_sugeridas: ['orcamentos'], colunas_sugeridas: ['valor_total'], exemplo: '4.500,00' },
      { campo: 'pedido_status', label: 'Status do Pedido', descricao: 'Status atual do pedido', tipo: 'tabela', obrigatorio: false, tabelas_sistema_sugeridas: ['orcamentos'], colunas_sugeridas: ['status'], exemplo: 'Aprovado' },
      { campo: 'pedido_itens_produto', label: 'Produto do Item', descricao: 'Nome/código do produto no item do pedido', tipo: 'tabela', obrigatorio: false, tabelas_sistema_sugeridas: ['orcamento_itens'], colunas_sugeridas: ['produto_id', 'nome_produto'] },
      { campo: 'pedido_itens_quantidade', label: 'Quantidade do Item', descricao: 'Quantidade comprada de cada item', tipo: 'numero', obrigatorio: false, tabelas_sistema_sugeridas: ['orcamento_itens'], colunas_sugeridas: ['quantidade'] },
      { campo: 'pedido_itens_preco', label: 'Preço Unitário do Item', descricao: 'Preço unitário praticado', tipo: 'numero', obrigatorio: false, tabelas_sistema_sugeridas: ['orcamento_itens'], colunas_sugeridas: ['preco_unitario'] },
      // Métricas calculadas
      { campo: 'cliente_ticket_medio', label: 'Ticket Médio', descricao: 'Valor médio das compras do cliente', tipo: 'numero', obrigatorio: false, exemplo: '2.300,00' },
      { campo: 'cliente_frequencia_compra', label: 'Frequência de Compra', descricao: 'Frequência média entre compras (dias)', tipo: 'numero', obrigatorio: false, exemplo: '30' },
      { campo: 'cliente_ultima_compra', label: 'Data Última Compra', descricao: 'Data da última compra realizada', tipo: 'tabela', obrigatorio: false, exemplo: '2025-03-20' },
      { campo: 'cliente_total_compras', label: 'Total de Compras', descricao: 'Quantidade total de compras realizadas', tipo: 'numero', obrigatorio: false, exemplo: '45' },
      { campo: 'cliente_valor_acumulado', label: 'Valor Acumulado', descricao: 'Valor total gasto pelo cliente', tipo: 'numero', obrigatorio: false, exemplo: '103.500,00' },
    ]
  },
  {
    template_key: 'recompra',
    nome: 'Agente Recompra',
    icone: '🔄',
    campos: [
      { campo: 'cliente_nome', label: 'Nome do Cliente', descricao: 'Nome/razão social do cliente', tipo: 'tabela', obrigatorio: true, tabelas_sistema_sugeridas: ['customers', 'empresas'], colunas_sugeridas: ['name', 'nome'] },
      { campo: 'cliente_cnpj_cpf', label: 'CNPJ/CPF', descricao: 'Documento do cliente', tipo: 'tabela', obrigatorio: true, tabelas_sistema_sugeridas: ['empresas'], colunas_sugeridas: ['cnpj'] },
      { campo: 'produto_comprado', label: 'Produto Comprado', descricao: 'Nome do produto comprado anteriormente', tipo: 'tabela', obrigatorio: true, tabelas_sistema_sugeridas: ['orcamento_itens'], colunas_sugeridas: ['nome_produto', 'produto_id'] },
      { campo: 'quantidade_comprada', label: 'Quantidade Comprada', descricao: 'Quantidade do último pedido', tipo: 'numero', obrigatorio: true, tabelas_sistema_sugeridas: ['orcamento_itens'], colunas_sugeridas: ['quantidade'] },
      { campo: 'data_ultima_compra', label: 'Data Última Compra', descricao: 'Data da compra mais recente', tipo: 'tabela', obrigatorio: true, tabelas_sistema_sugeridas: ['orcamentos'], colunas_sugeridas: ['data_criacao'] },
      { campo: 'ciclo_reposicao_dias', label: 'Ciclo de Reposição (dias)', descricao: 'Intervalo típico de recompra por produto/categoria', tipo: 'numero', obrigatorio: true, exemplo: '30' },
      { campo: 'categoria_produto', label: 'Categoria do Produto', descricao: 'Categoria para determinar ciclo de reposição', tipo: 'tabela', obrigatorio: false, tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['categoria', 'grupo'] },
      { campo: 'dias_sem_comprar', label: 'Dias sem Comprar', descricao: 'Quantos dias desde a última compra', tipo: 'numero', obrigatorio: false, exemplo: '45' },
      { campo: 'alerta_tipo', label: 'Tipo de Alerta', descricao: 'Quando alertar (X dias antes do vencimento do ciclo)', tipo: 'numero', obrigatorio: false, exemplo: '5' },
    ]
  },
  {
    template_key: 'mix_crosssell',
    nome: 'Agente Mix e Cross-sell',
    icone: '🎯',
    campos: [
      { campo: 'produto_origem', label: 'Produto de Origem', descricao: 'Produto que o cliente está comprando', tipo: 'tabela', obrigatorio: true, tabelas_sistema_sugeridas: ['agent_cross_sell_rules'], colunas_sugeridas: ['produto_origem'] },
      { campo: 'produto_sugerido', label: 'Produto Sugerido', descricao: 'Produto complementar a oferecer', tipo: 'tabela', obrigatorio: true, tabelas_sistema_sugeridas: ['agent_cross_sell_rules'], colunas_sugeridas: ['produto_sugerido'] },
      { campo: 'tipo_sugestao', label: 'Tipo de Sugestão', descricao: 'Cross-sell, up-sell ou complementar', tipo: 'tabela', obrigatorio: false, tabelas_sistema_sugeridas: ['agent_cross_sell_rules'], colunas_sugeridas: ['tipo'], exemplo: 'cross-sell' },
      { campo: 'motivo_sugestao', label: 'Motivo da Sugestão', descricao: 'Justificativa para recomendar o produto', tipo: 'tabela', obrigatorio: false, tabelas_sistema_sugeridas: ['agent_cross_sell_rules'], colunas_sugeridas: ['motivo'], exemplo: 'Produto complementar usado junto' },
      { campo: 'prioridade_sugestao', label: 'Prioridade', descricao: 'Ordem de prioridade da sugestão', tipo: 'numero', obrigatorio: false, tabelas_sistema_sugeridas: ['agent_cross_sell_rules'], colunas_sugeridas: ['prioridade'], exemplo: '1' },
      { campo: 'combo_nome', label: 'Nome do Combo/Kit', descricao: 'Nome de kits pré-definidos', tipo: 'texto', obrigatorio: false, exemplo: 'Kit Instalação Completa' },
      { campo: 'combo_produtos', label: 'Produtos do Combo', descricao: 'Lista de produtos que compõem o kit', tipo: 'texto', obrigatorio: false, exemplo: 'Torneira + Sifão + Flexível + Fita Veda Rosca' },
      { campo: 'combo_desconto', label: 'Desconto do Combo (%)', descricao: 'Desconto aplicado quando compra o kit completo', tipo: 'numero', obrigatorio: false, exemplo: '8' },
    ]
  },
  {
    template_key: 'financeiro',
    nome: 'Agente Financeiro',
    icone: '💰',
    campos: [
      { campo: 'cliente_nome', label: 'Nome do Cliente', descricao: 'Nome/razão social', tipo: 'tabela', obrigatorio: true, tabelas_sistema_sugeridas: ['customers', 'empresas'], colunas_sugeridas: ['name', 'nome'] },
      { campo: 'cliente_cnpj_cpf', label: 'CNPJ/CPF', descricao: 'Documento do cliente', tipo: 'tabela', obrigatorio: true, tabelas_sistema_sugeridas: ['empresas'], colunas_sugeridas: ['cnpj'] },
      { campo: 'limite_credito_valor', label: 'Limite de Crédito (R$)', descricao: 'Valor máximo de crédito aprovado', tipo: 'numero', obrigatorio: true, exemplo: '50.000,00' },
      { campo: 'credito_utilizado', label: 'Crédito Utilizado (R$)', descricao: 'Quanto do limite já está comprometido', tipo: 'numero', obrigatorio: true, exemplo: '32.000,00' },
      { campo: 'credito_disponivel', label: 'Crédito Disponível (R$)', descricao: 'Saldo disponível para novas compras', tipo: 'numero', obrigatorio: false, exemplo: '18.000,00' },
      // Títulos
      { campo: 'titulo_numero', label: 'Número do Título', descricao: 'Número da duplicata ou boleto', tipo: 'tabela', obrigatorio: true, exemplo: 'DUP-2025-001' },
      { campo: 'titulo_valor', label: 'Valor do Título', descricao: 'Valor do título em aberto', tipo: 'numero', obrigatorio: true, exemplo: '3.200,00' },
      { campo: 'titulo_vencimento', label: 'Data de Vencimento', descricao: 'Data de vencimento do título', tipo: 'tabela', obrigatorio: true, exemplo: '2025-04-15' },
      { campo: 'titulo_status', label: 'Status do Título', descricao: 'A vencer, vencido, pago, etc.', tipo: 'tabela', obrigatorio: false, exemplo: 'Vencido' },
      { campo: 'titulo_dias_atraso', label: 'Dias em Atraso', descricao: 'Quantidade de dias em atraso', tipo: 'numero', obrigatorio: false, exemplo: '15' },
      // Condições
      { campo: 'forma_pagamento', label: 'Formas de Pagamento', descricao: 'Formas de pagamento aceitas', tipo: 'texto', obrigatorio: true, exemplo: 'Boleto, PIX, Cartão, Cheque' },
      { campo: 'prazo_pagamento', label: 'Prazos de Pagamento', descricao: 'Condições de prazo disponíveis', tipo: 'texto', obrigatorio: true, exemplo: '30/60/90 dias, À vista' },
      { campo: 'juros_atraso', label: 'Juros por Atraso (%)', descricao: 'Percentual de juros por atraso', tipo: 'numero', obrigatorio: false, exemplo: '2' },
      { campo: 'multa_atraso', label: 'Multa por Atraso (%)', descricao: 'Percentual de multa por atraso', tipo: 'numero', obrigatorio: false, exemplo: '2' },
      { campo: 'politica_credito_regras', label: 'Regras de Aprovação de Crédito', descricao: 'Critérios para aprovação (ex: Serasa, histórico)', tipo: 'texto', obrigatorio: false, exemplo: 'Score Serasa > 500, sem títulos vencidos > 30 dias' },
    ]
  },
  {
    template_key: 'logistico',
    nome: 'Agente Logístico',
    icone: '🚛',
    campos: [
      { campo: 'produto_nome', label: 'Nome do Produto', descricao: 'Produto para consulta de estoque', tipo: 'tabela', obrigatorio: true, tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['nome'] },
      { campo: 'produto_codigo', label: 'Código do Produto', descricao: 'SKU para identificação', tipo: 'tabela', obrigatorio: true, tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['codigo'] },
      { campo: 'estoque_quantidade', label: 'Quantidade em Estoque', descricao: 'Qtd disponível por produto', tipo: 'numero', obrigatorio: true, tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['estoque'], exemplo: '250' },
      { campo: 'estoque_minimo', label: 'Estoque Mínimo', descricao: 'Quantidade mínima antes de alertar reposição', tipo: 'numero', obrigatorio: false, exemplo: '20' },
      { campo: 'estoque_filial', label: 'Filial/CD', descricao: 'Nome da filial ou centro de distribuição', tipo: 'tabela', obrigatorio: false, exemplo: 'CD São Paulo' },
      { campo: 'prazo_entrega_regiao', label: 'Região de Entrega', descricao: 'Região/cidade para cálculo de prazo', tipo: 'texto', obrigatorio: true, exemplo: 'Grande SP: 1 dia | Interior SP: 3 dias' },
      { campo: 'prazo_entrega_dias', label: 'Prazo de Entrega (dias)', descricao: 'Dias úteis para entrega', tipo: 'numero', obrigatorio: true, exemplo: '3' },
      { campo: 'frete_valor', label: 'Valor do Frete (R$)', descricao: 'Custo do frete por região', tipo: 'numero', obrigatorio: false, exemplo: '45,00' },
      { campo: 'frete_gratis_acima', label: 'Frete Grátis Acima de (R$)', descricao: 'Valor mínimo para frete grátis', tipo: 'numero', obrigatorio: false, exemplo: '500,00' },
      { campo: 'modalidade_entrega', label: 'Modalidades de Entrega', descricao: 'Tipos de entrega disponíveis', tipo: 'texto', obrigatorio: false, exemplo: 'Normal, Expressa, Retirada' },
    ]
  },
  {
    template_key: 'margem',
    nome: 'Agente Margem e Estratégia',
    icone: '📊',
    campos: [
      { campo: 'produto_nome', label: 'Nome do Produto', descricao: 'Produto para análise de margem', tipo: 'tabela', obrigatorio: true, tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['nome'] },
      { campo: 'produto_preco_venda', label: 'Preço de Venda (R$)', descricao: 'Preço praticado', tipo: 'numero', obrigatorio: true, tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['preco_venda'] },
      { campo: 'produto_preco_custo', label: 'Preço de Custo (R$)', descricao: 'Custo de aquisição do produto', tipo: 'numero', obrigatorio: true, tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['preco_custo'] },
      { campo: 'margem_percentual', label: 'Margem Atual (%)', descricao: 'Margem de lucro atual do produto', tipo: 'numero', obrigatorio: false, exemplo: '35' },
      { campo: 'margem_minima_percentual', label: 'Margem Mínima (%)', descricao: 'Menor margem aceitável', tipo: 'numero', obrigatorio: true, exemplo: '15' },
      { campo: 'despesas_operacionais', label: 'Despesas Operacionais (%)', descricao: 'Percentual de despesas sobre a venda', tipo: 'numero', obrigatorio: false, exemplo: '8' },
      { campo: 'impostos_percentual', label: 'Impostos (%)', descricao: 'Carga tributária média', tipo: 'numero', obrigatorio: false, exemplo: '12' },
      { campo: 'meta_faturamento_mensal', label: 'Meta Faturamento Mensal (R$)', descricao: 'Meta de faturamento do mês', tipo: 'numero', obrigatorio: false, exemplo: '500.000,00' },
      { campo: 'meta_margem_media', label: 'Meta Margem Média (%)', descricao: 'Meta de margem média da empresa', tipo: 'numero', obrigatorio: false, exemplo: '25' },
      { campo: 'curva_abc', label: 'Classificação ABC', descricao: 'Classificação do produto na curva ABC', tipo: 'tabela', obrigatorio: false, exemplo: 'A' },
    ]
  },
  {
    template_key: 'objecoes',
    nome: 'Agente Objeções',
    icone: '🛡️',
    campos: [
      { campo: 'objecao_texto', label: 'Objeção do Cliente', descricao: 'Texto da objeção levantada', tipo: 'tabela', obrigatorio: true, tabelas_sistema_sugeridas: ['agent_objections'], colunas_sugeridas: ['objecao'], exemplo: 'O preço está muito alto' },
      { campo: 'objecao_categoria', label: 'Categoria da Objeção', descricao: 'Tipo: preço, prazo, qualidade, confiança', tipo: 'tabela', obrigatorio: true, tabelas_sistema_sugeridas: ['agent_objections'], colunas_sugeridas: ['categoria'], exemplo: 'Preço' },
      { campo: 'resposta_sugerida', label: 'Resposta Sugerida', descricao: 'Resposta padrão para a objeção', tipo: 'tabela', obrigatorio: true, tabelas_sistema_sugeridas: ['agent_objections'], colunas_sugeridas: ['resposta_sugerida'], exemplo: 'Entendo sua preocupação. Nosso preço inclui...' },
      { campo: 'argumentos_apoio', label: 'Argumentos de Apoio', descricao: 'Argumentos complementares para reforçar', tipo: 'tabela', obrigatorio: false, tabelas_sistema_sugeridas: ['agent_objections'], colunas_sugeridas: ['argumentos'] },
      { campo: 'gatilho_mental', label: 'Gatilho Mental', descricao: 'Técnica de persuasão a usar', tipo: 'tabela', obrigatorio: false, tabelas_sistema_sugeridas: ['agent_objections'], colunas_sugeridas: ['gatilhos_mentais'], exemplo: 'Escassez: últimas unidades' },
      { campo: 'eficacia_percentual', label: 'Eficácia (%)', descricao: 'Taxa de sucesso dessa resposta', tipo: 'numero', obrigatorio: false, tabelas_sistema_sugeridas: ['agent_objections'], colunas_sugeridas: ['eficacia_percentual'], exemplo: '72' },
      { campo: 'case_sucesso', label: 'Case de Sucesso', descricao: 'Exemplo real de cliente satisfeito', tipo: 'texto', obrigatorio: false, exemplo: 'A empresa XYZ reduziu custos em 30% usando nosso produto' },
    ]
  },
  {
    template_key: 'tecnico',
    nome: 'Agente Técnico',
    icone: '🔧',
    campos: [
      { campo: 'produto_nome', label: 'Nome do Produto', descricao: 'Produto para consulta técnica', tipo: 'tabela', obrigatorio: true, tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['nome'] },
      { campo: 'produto_codigo', label: 'Código do Produto', descricao: 'SKU para identificação', tipo: 'tabela', obrigatorio: true, tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['codigo'] },
      { campo: 'ficha_tecnica', label: 'Ficha Técnica', descricao: 'Especificações técnicas completas', tipo: 'texto', obrigatorio: true, exemplo: 'Material: Aço Carbono | Diâmetro: 10mm | Rosca: M10x1.5' },
      { campo: 'descricao_tecnica', label: 'Descrição Técnica', descricao: 'Descrição detalhada do produto', tipo: 'tabela', obrigatorio: false, tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['descricao'] },
      { campo: 'norma_tecnica', label: 'Norma Técnica', descricao: 'Norma ou certificação aplicável', tipo: 'texto', obrigatorio: false, exemplo: 'NBR 8800, ISO 4014' },
      { campo: 'aplicacao', label: 'Aplicação', descricao: 'Para que serve / onde é usado', tipo: 'texto', obrigatorio: false, exemplo: 'Fixação de estruturas metálicas' },
      { campo: 'compativel_com', label: 'Compatível Com', descricao: 'Produtos compatíveis ou que funcionam junto', tipo: 'texto', obrigatorio: false, exemplo: 'Porca Sextavada M10, Arruela Lisa 10mm' },
      { campo: 'nao_compativel_com', label: 'Incompatível Com', descricao: 'Produtos que NÃO devem ser usados junto', tipo: 'texto', obrigatorio: false, exemplo: 'Não usar com materiais de alumínio em ambiente marítimo' },
      { campo: 'garantia', label: 'Garantia', descricao: 'Prazo e condições de garantia', tipo: 'texto', obrigatorio: false, exemplo: '12 meses contra defeito de fabricação' },
    ]
  },
  {
    template_key: 'excecoes',
    nome: 'Agente Exceções',
    icone: '⚠️',
    campos: [
      { campo: 'tipo_excecao', label: 'Tipo de Exceção', descricao: 'Categoria da exceção (preço, prazo, crédito)', tipo: 'texto', obrigatorio: true, exemplo: 'Preço abaixo da margem mínima' },
      { campo: 'condicao_ativacao', label: 'Condição de Ativação', descricao: 'Quando essa exceção é acionada', tipo: 'texto', obrigatorio: true, exemplo: 'Desconto > 15% ou margem < 10%' },
      { campo: 'aprovador_nivel1', label: 'Aprovador Nível 1', descricao: 'Quem aprova em primeiro nível', tipo: 'texto', obrigatorio: true, exemplo: 'Gerente Comercial' },
      { campo: 'aprovador_nivel2', label: 'Aprovador Nível 2', descricao: 'Quem aprova em segundo nível (valores altos)', tipo: 'texto', obrigatorio: false, exemplo: 'Diretor Comercial' },
      { campo: 'limite_aprovacao_nivel1', label: 'Limite Nível 1 (R$)', descricao: 'Valor máximo que o nível 1 pode aprovar', tipo: 'numero', obrigatorio: false, exemplo: '10.000,00' },
      { campo: 'limite_aprovacao_nivel2', label: 'Limite Nível 2 (R$)', descricao: 'Valor máximo que o nível 2 pode aprovar', tipo: 'numero', obrigatorio: false, exemplo: '50.000,00' },
      { campo: 'prazo_aprovacao_horas', label: 'Prazo para Aprovação (h)', descricao: 'Tempo máximo para responder', tipo: 'numero', obrigatorio: false, exemplo: '4' },
      { campo: 'justificativa_obrigatoria', label: 'Justificativa Obrigatória?', descricao: 'Se precisa justificar a exceção', tipo: 'texto', obrigatorio: false, exemplo: 'Sim, com motivo e cliente' },
    ]
  },
  {
    template_key: 'performance',
    nome: 'Agente Performance',
    icone: '📈',
    campos: [
      { campo: 'vendedor_nome', label: 'Nome do Vendedor', descricao: 'Nome do vendedor/representante', tipo: 'tabela', obrigatorio: true, tabelas_sistema_sugeridas: ['usuarios'], colunas_sugeridas: ['nome'] },
      { campo: 'meta_mensal_valor', label: 'Meta Mensal (R$)', descricao: 'Meta de faturamento do vendedor', tipo: 'numero', obrigatorio: true, exemplo: '150.000,00' },
      { campo: 'realizado_mensal_valor', label: 'Realizado no Mês (R$)', descricao: 'Quanto já vendeu no mês', tipo: 'numero', obrigatorio: true, exemplo: '98.000,00' },
      { campo: 'percentual_atingimento', label: 'Atingimento (%)', descricao: 'Percentual da meta alcançada', tipo: 'numero', obrigatorio: false, exemplo: '65' },
      { campo: 'qtd_pedidos_mes', label: 'Nº de Pedidos no Mês', descricao: 'Quantidade de pedidos fechados', tipo: 'numero', obrigatorio: false, exemplo: '23' },
      { campo: 'ticket_medio_vendedor', label: 'Ticket Médio (R$)', descricao: 'Valor médio por pedido', tipo: 'numero', obrigatorio: false, exemplo: '4.260,00' },
      { campo: 'taxa_conversao', label: 'Taxa de Conversão (%)', descricao: 'Orçamentos convertidos em vendas', tipo: 'numero', obrigatorio: false, exemplo: '38' },
      { campo: 'clientes_ativos', label: 'Clientes Ativos', descricao: 'Nº de clientes com compra no período', tipo: 'numero', obrigatorio: false, exemplo: '18' },
      { campo: 'clientes_novos', label: 'Clientes Novos', descricao: 'Nº de novos clientes no período', tipo: 'numero', obrigatorio: false, exemplo: '5' },
      { campo: 'margem_media_vendedor', label: 'Margem Média (%)', descricao: 'Margem média das vendas do vendedor', tipo: 'numero', obrigatorio: false, exemplo: '28' },
      { campo: 'ranking_posicao', label: 'Posição no Ranking', descricao: 'Posição do vendedor entre os demais', tipo: 'numero', obrigatorio: false, exemplo: '3' },
    ]
  },
];

// Tabelas disponíveis do sistema para mapeamento
export const SYSTEM_TABLES = [
  { value: 'produtos', label: 'Produtos', colunas: ['id', 'nome', 'codigo', 'descricao', 'preco_venda', 'preco_custo', 'estoque', 'categoria', 'marca', 'grupo', 'subgrupo', 'unidade'] },
  { value: 'produtos_importados', label: 'Produtos Importados', colunas: ['id', 'nome', 'codigo', 'descricao', 'preco_venda', 'preco_custo', 'estoque', 'categoria', 'marca'] },
  { value: 'customers', label: 'Clientes/Contatos', colunas: ['id', 'name', 'phone', 'email', 'tags', 'score', 'cpf'] },
  { value: 'empresas', label: 'Empresas', colunas: ['id', 'nome', 'cnpj', 'tipo_cliente', 'email', 'telefone', 'endereco', 'cidade', 'estado', 'cep', 'segmento'] },
  { value: 'orcamentos', label: 'Orçamentos', colunas: ['id', 'numero', 'cliente_id', 'valor_total', 'status', 'data_criacao', 'vendedor_id', 'desconto_total'] },
  { value: 'orcamento_itens', label: 'Itens do Orçamento', colunas: ['id', 'orcamento_id', 'produto_id', 'nome_produto', 'quantidade', 'preco_unitario', 'desconto', 'subtotal'] },
  { value: 'pedidos_ecommerce', label: 'Pedidos E-commerce', colunas: ['id', 'numero_pedido', 'customer_id', 'valor_total', 'status', 'created_at', 'desconto_total', 'frete'] },
  { value: 'agent_cross_sell_rules', label: 'Regras Cross-sell', colunas: ['id', 'produto_origem', 'produto_sugerido', 'tipo', 'motivo', 'prioridade'] },
  { value: 'agent_objections', label: 'Objeções', colunas: ['id', 'objecao', 'resposta_sugerida', 'categoria', 'argumentos', 'gatilhos_mentais', 'eficacia_percentual'] },
  { value: 'usuarios', label: 'Usuários/Vendedores', colunas: ['id', 'nome', 'email', 'role'] },
  { value: 'customer_segmentos', label: 'Segmentos de Clientes', colunas: ['id', 'customer_id', 'segmento', 'valor'] },
];
