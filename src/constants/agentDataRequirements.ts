// Campos de dados que cada template de agente precisa para funcionar
export interface AgentDataField {
  campo: string;
  label: string;
  descricao: string;
  tipo: 'texto' | 'tabela' | 'lista' | 'numero' | 'json' | 'sistema_auto';
  obrigatorio: boolean;
  categoria: string; // agrupamento visual no wizard
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

// ========== CONFIGURAÇÕES GLOBAIS (compartilhadas por todos os agentes) ==========
export const GLOBAL_AGENT_SETTINGS: AgentDataField[] = [
  // Empresa
  { campo: 'empresa_nome', label: 'Nome da Empresa', descricao: 'Razão social ou nome fantasia', tipo: 'texto', obrigatorio: true, categoria: 'Empresa', exemplo: 'Distribuidora ABC Ltda' },
  { campo: 'empresa_segmento_atuacao', label: 'Segmento de Atuação', descricao: 'Ramo da empresa (atacado, varejo, indústria)', tipo: 'texto', obrigatorio: true, categoria: 'Empresa', exemplo: 'Distribuição de materiais elétricos' },
  { campo: 'empresa_horario_atendimento', label: 'Horário de Atendimento', descricao: 'Horário comercial da empresa', tipo: 'texto', obrigatorio: true, categoria: 'Empresa', exemplo: 'Seg-Sex 08:00-18:00, Sáb 08:00-12:00' },
  { campo: 'empresa_telefone', label: 'Telefone da Empresa', descricao: 'Telefone principal para contato', tipo: 'texto', obrigatorio: false, categoria: 'Empresa', exemplo: '(11) 3333-4444' },
  { campo: 'empresa_email', label: 'E-mail da Empresa', descricao: 'E-mail principal de contato', tipo: 'texto', obrigatorio: false, categoria: 'Empresa', exemplo: 'contato@abc.com.br' },
  { campo: 'empresa_site', label: 'Site/URL', descricao: 'Site da empresa', tipo: 'texto', obrigatorio: false, categoria: 'Empresa', exemplo: 'www.abc.com.br' },
  // Comunicação (padrão para todos os agentes)
  { campo: 'saudacao_inicial', label: 'Saudação Inicial', descricao: 'Mensagem de boas-vindas ao cliente', tipo: 'texto', obrigatorio: true, categoria: 'Comunicação', exemplo: 'Olá! Sou o assistente da ABC. Como posso ajudar?' },
  { campo: 'saudacao_fora_horario', label: 'Mensagem Fora do Horário', descricao: 'Resposta quando fora do expediente', tipo: 'texto', obrigatorio: false, categoria: 'Comunicação', exemplo: 'Nosso horário é de seg a sex, 8h às 18h.' },
  { campo: 'mensagem_espera', label: 'Mensagem de Espera', descricao: 'Quando precisa de mais tempo para responder', tipo: 'texto', obrigatorio: false, categoria: 'Comunicação', exemplo: 'Só um momento, estou consultando isso para você...' },
  { campo: 'mensagem_escalacao', label: 'Mensagem de Escalação', descricao: 'Quando transfere para humano', tipo: 'texto', obrigatorio: false, categoria: 'Comunicação', exemplo: 'Vou transferir você para um especialista.' },
  // Roteamento
  { campo: 'tempo_max_resposta_segundos', label: 'Tempo Máximo Resposta (seg)', descricao: 'Tempo limite para responder ao cliente', tipo: 'numero', obrigatorio: true, categoria: 'Roteamento', exemplo: '30' },
  { campo: 'confianca_minima_resposta', label: 'Confiança Mínima (%)', descricao: 'Score mínimo para responder sem escalar', tipo: 'numero', obrigatorio: true, categoria: 'Roteamento', exemplo: '70' },
  { campo: 'max_agentes_simultaneos', label: 'Máx. Agentes Simultâneos', descricao: 'Quantos agentes podem ser consultados por vez', tipo: 'numero', obrigatorio: false, categoria: 'Roteamento', exemplo: '3' },
  { campo: 'escalar_humano_apos_tentativas', label: 'Escalar Após N Tentativas', descricao: 'Após quantas tentativas escalar para humano', tipo: 'numero', obrigatorio: false, categoria: 'Roteamento', exemplo: '3' },
  // Diferenciais (usados por vários agentes)
  { campo: 'diferenciais_empresa', label: 'Diferenciais da Empresa', descricao: 'Principais diferenciais competitivos', tipo: 'texto', obrigatorio: false, categoria: 'Empresa', exemplo: 'Entrega em 24h, estoque próprio, suporte técnico' },
  { campo: 'politica_devolucao', label: 'Política de Devolução', descricao: 'Regras gerais de devolução', tipo: 'texto', obrigatorio: false, categoria: 'Políticas', exemplo: 'Até 7 dias, com NF, produto lacrado' },
  { campo: 'formas_pagamento', label: 'Formas de Pagamento Aceitas', descricao: 'Carregado automaticamente da tabela Tipos de Pagamento', tipo: 'sistema_auto', obrigatorio: true, categoria: 'Políticas', tabelas_sistema_sugeridas: ['tipos_pagamento'], colunas_sugeridas: ['nome', 'taxa_percentual'] },
  { campo: 'prazos_pagamento', label: 'Condições/Prazos de Pagamento', descricao: 'Carregado automaticamente da tabela Condições de Pagamento (com faixas de valor)', tipo: 'sistema_auto', obrigatorio: true, categoria: 'Políticas', tabelas_sistema_sugeridas: ['condicoes_pagamento'], colunas_sugeridas: ['nome', 'descricao', 'valor_minimo', 'valor_maximo'] },
];

// ========== AGENTE ORQUESTRADOR ==========
const orquestradorCampos: AgentDataField[] = [
  // Campos específicos do orquestrador (empresa/comunicação/roteamento agora são globais)
];

// ========== AGENTE COMERCIAL ==========
const comercialCampos: AgentDataField[] = [
  // Produtos
  { campo: 'produto_codigo', label: 'Código do Produto', descricao: 'SKU ou código interno do produto', tipo: 'tabela', obrigatorio: true, categoria: 'Produtos', tabelas_sistema_sugeridas: ['produtos', 'produtos_importados'], colunas_sugeridas: ['codigo'], exemplo: 'SKU-001234' },
  { campo: 'produto_nome', label: 'Nome do Produto', descricao: 'Nome ou descrição do produto', tipo: 'tabela', obrigatorio: true, categoria: 'Produtos', tabelas_sistema_sugeridas: ['produtos', 'produtos_importados'], colunas_sugeridas: ['nome'], exemplo: 'Parafuso Sextavado M10' },
  { campo: 'produto_descricao', label: 'Descrição do Produto', descricao: 'Descrição detalhada', tipo: 'tabela', obrigatorio: false, categoria: 'Produtos', tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['descricao'] },
  { campo: 'produto_categoria', label: 'Categoria', descricao: 'Categoria ou grupo do produto', tipo: 'tabela', obrigatorio: false, categoria: 'Produtos', tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['categoria', 'grupo'], exemplo: 'Fixadores' },
  { campo: 'produto_marca', label: 'Marca/Fabricante', descricao: 'Marca ou fabricante', tipo: 'tabela', obrigatorio: false, categoria: 'Produtos', tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['marca'], exemplo: 'Ciser' },
  { campo: 'produto_unidade', label: 'Unidade de Venda', descricao: 'UN, KG, CX, MT, etc.', tipo: 'tabela', obrigatorio: false, categoria: 'Produtos', tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['unidade'], exemplo: 'UN' },
  { campo: 'produto_ncm', label: 'NCM', descricao: 'Nomenclatura Comum do Mercosul', tipo: 'tabela', obrigatorio: false, categoria: 'Produtos', tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['ncm'], exemplo: '7318.15.00' },
  // Preços
  { campo: 'produto_preco_venda', label: 'Preço de Venda (R$)', descricao: 'Preço de tabela vigente', tipo: 'numero', obrigatorio: true, categoria: 'Preços', tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['preco_venda'], exemplo: '29.90' },
  { campo: 'produto_preco_promocional', label: 'Preço Promocional (R$)', descricao: 'Preço com promoção ativa', tipo: 'numero', obrigatorio: false, categoria: 'Preços', exemplo: '24.90' },
  { campo: 'produto_preco_minimo', label: 'Preço Mínimo (R$)', descricao: 'Menor preço autorizado para negociação', tipo: 'numero', obrigatorio: false, categoria: 'Preços', exemplo: '22.00' },
  { campo: 'tabela_preco_id', label: 'Tabela de Preço', descricao: 'Qual tabela de preço aplicar', tipo: 'tabela', obrigatorio: false, categoria: 'Preços', exemplo: 'Tabela Atacado' },
  // Estoque
  { campo: 'produto_estoque', label: 'Estoque Disponível', descricao: 'Quantidade em estoque atual', tipo: 'numero', obrigatorio: true, categoria: 'Estoque', tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['estoque'], exemplo: '150' },
  { campo: 'produto_estoque_reservado', label: 'Estoque Reservado', descricao: 'Quantidade reservada em pedidos', tipo: 'numero', obrigatorio: false, categoria: 'Estoque', exemplo: '20' },
  { campo: 'produto_estoque_minimo', label: 'Estoque Mínimo', descricao: 'Ponto de reposição', tipo: 'numero', obrigatorio: false, categoria: 'Estoque', exemplo: '10' },
  // Descontos
  { campo: 'desconto_maximo_percentual', label: 'Desconto Máximo (%)', descricao: 'Desconto máximo permitido sem aprovação', tipo: 'numero', obrigatorio: true, categoria: 'Descontos', exemplo: '15' },
  { campo: 'desconto_por_volume', label: 'Desconto por Volume', descricao: 'Regras de desconto progressivo por quantidade', tipo: 'texto', obrigatorio: false, categoria: 'Descontos', exemplo: '>100 UN: 5% | >500 UN: 10% | >1000 UN: 15%' },
  { campo: 'desconto_por_pagamento', label: 'Desconto por Forma de Pgto', descricao: 'Desconto por tipo de pagamento', tipo: 'texto', obrigatorio: false, categoria: 'Descontos', exemplo: 'PIX: 3% | Boleto à vista: 2%' },
  { campo: 'desconto_primeira_compra', label: 'Desconto 1ª Compra (%)', descricao: 'Desconto especial para novos clientes', tipo: 'numero', obrigatorio: false, categoria: 'Descontos', exemplo: '5' },
  // Argumentação
  { campo: 'campanhas_ativas', label: 'Campanhas Ativas', descricao: 'Promoções vigentes', tipo: 'texto', obrigatorio: false, categoria: 'Argumentação', exemplo: 'Semana do Construtor: 10% em ferramentas até 30/04' },
  { campo: 'condicoes_especiais', label: 'Condições Especiais', descricao: 'Condições especiais por segmento ou porte', tipo: 'texto', obrigatorio: false, categoria: 'Argumentação', exemplo: 'Construtoras: prazo estendido 120 dias' },
];

// ========== AGENTE INTELIGÊNCIA DO CLIENTE ==========
const inteligenciaClienteCampos: AgentDataField[] = [
  // Dados cadastrais
  { campo: 'cliente_codigo', label: 'Código do Cliente', descricao: 'Código interno do cliente no ERP', tipo: 'tabela', obrigatorio: true, categoria: 'Cadastro', tabelas_sistema_sugeridas: ['customers', 'empresas'], colunas_sugeridas: ['id'], exemplo: 'CLI-00123' },
  { campo: 'cliente_cnpj_cpf', label: 'CNPJ/CPF', descricao: 'Documento de identificação', tipo: 'tabela', obrigatorio: true, categoria: 'Cadastro', tabelas_sistema_sugeridas: ['empresas', 'customers'], colunas_sugeridas: ['cnpj', 'cpf'], exemplo: '12.345.678/0001-90' },
  { campo: 'cliente_razao_social', label: 'Razão Social', descricao: 'Razão social da empresa', tipo: 'tabela', obrigatorio: true, categoria: 'Cadastro', tabelas_sistema_sugeridas: ['empresas'], colunas_sugeridas: ['nome'], exemplo: 'Construtora ABC Ltda' },
  { campo: 'cliente_nome_fantasia', label: 'Nome Fantasia', descricao: 'Nome fantasia ou apelido', tipo: 'tabela', obrigatorio: false, categoria: 'Cadastro', tabelas_sistema_sugeridas: ['empresas'], colunas_sugeridas: ['nome_fantasia'] },
  { campo: 'cliente_contato_nome', label: 'Nome do Contato', descricao: 'Pessoa de contato principal', tipo: 'tabela', obrigatorio: false, categoria: 'Cadastro', tabelas_sistema_sugeridas: ['customers'], colunas_sugeridas: ['name'], exemplo: 'João Silva' },
  { campo: 'cliente_email', label: 'E-mail', descricao: 'E-mail de contato', tipo: 'tabela', obrigatorio: false, categoria: 'Cadastro', tabelas_sistema_sugeridas: ['customers', 'empresas'], colunas_sugeridas: ['email'] },
  { campo: 'cliente_telefone', label: 'Telefone', descricao: 'Telefone principal', tipo: 'tabela', obrigatorio: false, categoria: 'Cadastro', tabelas_sistema_sugeridas: ['customers'], colunas_sugeridas: ['phone'] },
  { campo: 'cliente_endereco', label: 'Endereço', descricao: 'Endereço completo', tipo: 'tabela', obrigatorio: false, categoria: 'Cadastro', tabelas_sistema_sugeridas: ['empresas'], colunas_sugeridas: ['endereco', 'cidade', 'estado', 'cep'] },
  { campo: 'cliente_segmento', label: 'Segmento/Ramo', descricao: 'Segmento de atuação', tipo: 'tabela', obrigatorio: true, categoria: 'Cadastro', tabelas_sistema_sugeridas: ['empresas', 'customer_segmentos'], colunas_sugeridas: ['tipo_cliente', 'segmento'], exemplo: 'Construção Civil' },
  { campo: 'cliente_porte', label: 'Porte da Empresa', descricao: 'MEI, ME, EPP, Médio, Grande', tipo: 'texto', obrigatorio: false, categoria: 'Cadastro', exemplo: 'Médio Porte' },
  { campo: 'cliente_tags', label: 'Tags/Classificação', descricao: 'Etiquetas do cliente', tipo: 'tabela', obrigatorio: false, categoria: 'Cadastro', tabelas_sistema_sugeridas: ['customers'], colunas_sugeridas: ['tags'], exemplo: 'VIP, Recorrente' },
  { campo: 'cliente_vendedor', label: 'Vendedor Responsável', descricao: 'Vendedor que atende o cliente', tipo: 'tabela', obrigatorio: false, categoria: 'Cadastro', tabelas_sistema_sugeridas: ['usuarios'], colunas_sugeridas: ['nome'] },
  // Histórico de Pedidos
  { campo: 'pedido_codigo', label: 'Código do Pedido', descricao: 'Número/código do pedido', tipo: 'tabela', obrigatorio: true, categoria: 'Pedidos', tabelas_sistema_sugeridas: ['orcamentos', 'pedidos_ecommerce'], colunas_sugeridas: ['numero', 'numero_pedido'], exemplo: 'PED-2025001' },
  { campo: 'pedido_data', label: 'Data do Pedido', descricao: 'Data de emissão', tipo: 'tabela', obrigatorio: true, categoria: 'Pedidos', tabelas_sistema_sugeridas: ['orcamentos'], colunas_sugeridas: ['data_criacao', 'created_at'] },
  { campo: 'pedido_valor_total', label: 'Valor Total (R$)', descricao: 'Valor total do pedido', tipo: 'numero', obrigatorio: true, categoria: 'Pedidos', tabelas_sistema_sugeridas: ['orcamentos'], colunas_sugeridas: ['valor_total'], exemplo: '4.500,00' },
  { campo: 'pedido_desconto', label: 'Desconto Aplicado (R$)', descricao: 'Valor de desconto dado', tipo: 'numero', obrigatorio: false, categoria: 'Pedidos', tabelas_sistema_sugeridas: ['orcamentos'], colunas_sugeridas: ['desconto_total'] },
  { campo: 'pedido_status', label: 'Status do Pedido', descricao: 'Status atual', tipo: 'tabela', obrigatorio: false, categoria: 'Pedidos', tabelas_sistema_sugeridas: ['orcamentos'], colunas_sugeridas: ['status'] },
  { campo: 'pedido_condicao_pagamento', label: 'Condição de Pagamento', descricao: 'Condição aplicada (ex: 30/60/90 dias) - depende do valor do pedido (faixa mín/máx)', tipo: 'tabela', obrigatorio: false, categoria: 'Pedidos', tabelas_sistema_sugeridas: ['condicoes_pagamento'], colunas_sugeridas: ['nome', 'valor_minimo', 'valor_maximo'] },
  { campo: 'pedido_tipo_pagamento', label: 'Tipo/Forma de Pagamento', descricao: 'Forma de pagto (Boleto, Cartão, Pix) - pode ter taxa/juros por parcela', tipo: 'tabela', obrigatorio: false, categoria: 'Pedidos', tabelas_sistema_sugeridas: ['tipos_pagamento'], colunas_sugeridas: ['nome', 'taxa_percentual'] },
  // Itens do Pedido
  { campo: 'item_codigo_produto', label: 'Código Produto (item)', descricao: 'Código do produto no item', tipo: 'tabela', obrigatorio: true, categoria: 'Itens do Pedido', tabelas_sistema_sugeridas: ['orcamento_itens'], colunas_sugeridas: ['produto_id'] },
  { campo: 'item_nome_produto', label: 'Nome Produto (item)', descricao: 'Nome do produto comprado', tipo: 'tabela', obrigatorio: true, categoria: 'Itens do Pedido', tabelas_sistema_sugeridas: ['orcamento_itens'], colunas_sugeridas: ['nome_produto'] },
  { campo: 'item_quantidade', label: 'Quantidade', descricao: 'Quantidade comprada', tipo: 'numero', obrigatorio: true, categoria: 'Itens do Pedido', tabelas_sistema_sugeridas: ['orcamento_itens'], colunas_sugeridas: ['quantidade'] },
  { campo: 'item_preco_unitario', label: 'Preço Unitário (R$)', descricao: 'Preço unitário praticado', tipo: 'numero', obrigatorio: true, categoria: 'Itens do Pedido', tabelas_sistema_sugeridas: ['orcamento_itens'], colunas_sugeridas: ['preco_unitario'] },
  { campo: 'item_desconto', label: 'Desconto do Item (%)', descricao: 'Desconto dado no item', tipo: 'numero', obrigatorio: false, categoria: 'Itens do Pedido', tabelas_sistema_sugeridas: ['orcamento_itens'], colunas_sugeridas: ['desconto'] },
  { campo: 'item_subtotal', label: 'Subtotal (R$)', descricao: 'Valor total do item', tipo: 'numero', obrigatorio: false, categoria: 'Itens do Pedido', tabelas_sistema_sugeridas: ['orcamento_itens'], colunas_sugeridas: ['subtotal'] },
  // Métricas
  { campo: 'cliente_ticket_medio', label: 'Ticket Médio (R$)', descricao: 'Valor médio das compras', tipo: 'numero', obrigatorio: false, categoria: 'Métricas', exemplo: '2.300,00' },
  { campo: 'cliente_frequencia_compra', label: 'Frequência de Compra (dias)', descricao: 'Intervalo médio entre compras', tipo: 'numero', obrigatorio: false, categoria: 'Métricas', exemplo: '30' },
  { campo: 'cliente_ultima_compra', label: 'Data Última Compra', descricao: 'Data da compra mais recente', tipo: 'tabela', obrigatorio: false, categoria: 'Métricas' },
  { campo: 'cliente_total_pedidos', label: 'Total de Pedidos', descricao: 'Quantidade total de pedidos', tipo: 'numero', obrigatorio: false, categoria: 'Métricas', exemplo: '45' },
  { campo: 'cliente_valor_acumulado', label: 'Valor Acumulado (R$)', descricao: 'Valor total comprado', tipo: 'numero', obrigatorio: false, categoria: 'Métricas', exemplo: '103.500,00' },
  { campo: 'cliente_score', label: 'Score do Cliente', descricao: 'Pontuação/classificação do cliente', tipo: 'numero', obrigatorio: false, categoria: 'Métricas', tabelas_sistema_sugeridas: ['customers'], colunas_sugeridas: ['score'], exemplo: '85' },
];

// ========== AGENTE RECOMPRA ==========
const recompraCampos: AgentDataField[] = [
  { campo: 'cliente_codigo', label: 'Código do Cliente', descricao: 'Código interno do cliente', tipo: 'tabela', obrigatorio: true, categoria: 'Cliente', tabelas_sistema_sugeridas: ['customers', 'empresas'], colunas_sugeridas: ['id'] },
  { campo: 'cliente_cnpj_cpf', label: 'CNPJ/CPF', descricao: 'Documento do cliente', tipo: 'tabela', obrigatorio: true, categoria: 'Cliente', tabelas_sistema_sugeridas: ['empresas'], colunas_sugeridas: ['cnpj'] },
  { campo: 'cliente_nome', label: 'Nome do Cliente', descricao: 'Nome/razão social', tipo: 'tabela', obrigatorio: true, categoria: 'Cliente', tabelas_sistema_sugeridas: ['customers', 'empresas'], colunas_sugeridas: ['name', 'nome'] },
  { campo: 'cliente_segmento', label: 'Segmento', descricao: 'Segmento do cliente', tipo: 'tabela', obrigatorio: false, categoria: 'Cliente', tabelas_sistema_sugeridas: ['empresas'], colunas_sugeridas: ['segmento'] },
  // Histórico de compra
  { campo: 'produto_codigo', label: 'Código do Produto Comprado', descricao: 'SKU do produto comprado anteriormente', tipo: 'tabela', obrigatorio: true, categoria: 'Histórico', tabelas_sistema_sugeridas: ['orcamento_itens'], colunas_sugeridas: ['produto_id'] },
  { campo: 'produto_nome', label: 'Nome do Produto Comprado', descricao: 'Nome do produto', tipo: 'tabela', obrigatorio: true, categoria: 'Histórico', tabelas_sistema_sugeridas: ['orcamento_itens'], colunas_sugeridas: ['nome_produto'] },
  { campo: 'produto_categoria', label: 'Categoria do Produto', descricao: 'Categoria para ciclo de reposição', tipo: 'tabela', obrigatorio: false, categoria: 'Histórico', tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['categoria', 'grupo'] },
  { campo: 'quantidade_comprada', label: 'Quantidade Comprada', descricao: 'Qtd do último pedido', tipo: 'numero', obrigatorio: true, categoria: 'Histórico', tabelas_sistema_sugeridas: ['orcamento_itens'], colunas_sugeridas: ['quantidade'] },
  { campo: 'data_ultima_compra', label: 'Data Última Compra', descricao: 'Data da compra mais recente desse produto', tipo: 'tabela', obrigatorio: true, categoria: 'Histórico', tabelas_sistema_sugeridas: ['orcamentos'], colunas_sugeridas: ['data_criacao'] },
  { campo: 'preco_praticado', label: 'Preço Praticado (R$)', descricao: 'Último preço pago pelo cliente', tipo: 'numero', obrigatorio: false, categoria: 'Histórico', tabelas_sistema_sugeridas: ['orcamento_itens'], colunas_sugeridas: ['preco_unitario'] },
  // Ciclos
  { campo: 'ciclo_reposicao_dias', label: 'Ciclo de Reposição (dias)', descricao: 'Intervalo típico de recompra', tipo: 'numero', obrigatorio: true, categoria: 'Ciclos', exemplo: '30' },
  { campo: 'dias_sem_comprar', label: 'Dias sem Comprar', descricao: 'Quantos dias desde a última compra', tipo: 'numero', obrigatorio: false, categoria: 'Ciclos', exemplo: '45' },
  { campo: 'alerta_dias_antes', label: 'Alertar X Dias Antes', descricao: 'Dias de antecedência para alertar recompra', tipo: 'numero', obrigatorio: false, categoria: 'Ciclos', exemplo: '5' },
  { campo: 'consumo_medio_mensal', label: 'Consumo Médio Mensal', descricao: 'Quantidade média consumida por mês', tipo: 'numero', obrigatorio: false, categoria: 'Ciclos', exemplo: '200' },
];

// ========== AGENTE MIX E CROSS-SELL ==========
const mixCrosssellCampos: AgentDataField[] = [
  { campo: 'produto_origem_codigo', label: 'Código Produto Origem', descricao: 'Código do produto que o cliente está comprando', tipo: 'tabela', obrigatorio: true, categoria: 'Regras Cross-sell', tabelas_sistema_sugeridas: ['agent_cross_sell_rules'], colunas_sugeridas: ['produto_origem'] },
  { campo: 'produto_origem_nome', label: 'Nome Produto Origem', descricao: 'Nome do produto de origem', tipo: 'tabela', obrigatorio: true, categoria: 'Regras Cross-sell', tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['nome'] },
  { campo: 'produto_sugerido_codigo', label: 'Código Produto Sugerido', descricao: 'Código do produto a sugerir', tipo: 'tabela', obrigatorio: true, categoria: 'Regras Cross-sell', tabelas_sistema_sugeridas: ['agent_cross_sell_rules'], colunas_sugeridas: ['produto_sugerido'] },
  { campo: 'produto_sugerido_nome', label: 'Nome Produto Sugerido', descricao: 'Nome do produto complementar', tipo: 'tabela', obrigatorio: false, categoria: 'Regras Cross-sell', tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['nome'] },
  { campo: 'produto_sugerido_preco', label: 'Preço do Sugerido (R$)', descricao: 'Preço do produto complementar', tipo: 'numero', obrigatorio: false, categoria: 'Regras Cross-sell', tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['preco_venda'] },
  { campo: 'tipo_sugestao', label: 'Tipo', descricao: 'Cross-sell, up-sell ou complementar', tipo: 'tabela', obrigatorio: false, categoria: 'Regras Cross-sell', tabelas_sistema_sugeridas: ['agent_cross_sell_rules'], colunas_sugeridas: ['tipo'], exemplo: 'cross-sell' },
  { campo: 'motivo_sugestao', label: 'Motivo', descricao: 'Por que recomendar', tipo: 'tabela', obrigatorio: false, categoria: 'Regras Cross-sell', tabelas_sistema_sugeridas: ['agent_cross_sell_rules'], colunas_sugeridas: ['motivo'], exemplo: 'Complementar' },
  { campo: 'prioridade_sugestao', label: 'Prioridade', descricao: 'Ordem de prioridade', tipo: 'numero', obrigatorio: false, categoria: 'Regras Cross-sell', tabelas_sistema_sugeridas: ['agent_cross_sell_rules'], colunas_sugeridas: ['prioridade'], exemplo: '1' },
  // Combos/Kits
  { campo: 'combo_nome', label: 'Nome do Combo/Kit', descricao: 'Nome do kit pré-definido', tipo: 'texto', obrigatorio: false, categoria: 'Combos', exemplo: 'Kit Instalação Completa' },
  { campo: 'combo_produtos', label: 'Produtos do Combo', descricao: 'Lista de produtos no kit', tipo: 'texto', obrigatorio: false, categoria: 'Combos', exemplo: 'Torneira + Sifão + Flexível' },
  { campo: 'combo_desconto', label: 'Desconto do Combo (%)', descricao: 'Desconto ao comprar o kit completo', tipo: 'numero', obrigatorio: false, categoria: 'Combos', exemplo: '8' },
  { campo: 'combo_preco_total', label: 'Preço do Combo (R$)', descricao: 'Preço total do kit', tipo: 'numero', obrigatorio: false, categoria: 'Combos', exemplo: '189,90' },
];

// ========== AGENTE FINANCEIRO ==========
const financeiroCampos: AgentDataField[] = [
  // Cliente
  { campo: 'cliente_codigo', label: 'Código do Cliente', descricao: 'Código interno', tipo: 'tabela', obrigatorio: true, categoria: 'Cliente', tabelas_sistema_sugeridas: ['customers', 'empresas'], colunas_sugeridas: ['id'] },
  { campo: 'cliente_cnpj_cpf', label: 'CNPJ/CPF', descricao: 'Documento', tipo: 'tabela', obrigatorio: true, categoria: 'Cliente', tabelas_sistema_sugeridas: ['empresas'], colunas_sugeridas: ['cnpj'] },
  { campo: 'cliente_nome', label: 'Nome do Cliente', descricao: 'Nome/razão social', tipo: 'tabela', obrigatorio: true, categoria: 'Cliente', tabelas_sistema_sugeridas: ['customers', 'empresas'], colunas_sugeridas: ['name', 'nome'] },
  // Crédito
  { campo: 'limite_credito', label: 'Limite de Crédito (R$)', descricao: 'Valor máximo de crédito aprovado', tipo: 'numero', obrigatorio: true, categoria: 'Crédito', exemplo: '50.000,00' },
  { campo: 'credito_utilizado', label: 'Crédito Utilizado (R$)', descricao: 'Quanto já está comprometido', tipo: 'numero', obrigatorio: true, categoria: 'Crédito', exemplo: '32.000,00' },
  { campo: 'credito_disponivel', label: 'Crédito Disponível (R$)', descricao: 'Saldo disponível', tipo: 'numero', obrigatorio: false, categoria: 'Crédito', exemplo: '18.000,00' },
  { campo: 'status_credito', label: 'Status do Crédito', descricao: 'Aprovado, bloqueado, em análise', tipo: 'texto', obrigatorio: false, categoria: 'Crédito', exemplo: 'Aprovado' },
  { campo: 'score_credito', label: 'Score de Crédito', descricao: 'Pontuação de crédito (Serasa, etc.)', tipo: 'numero', obrigatorio: false, categoria: 'Crédito', exemplo: '750' },
  // Títulos
  { campo: 'titulo_numero', label: 'Nº do Título/Duplicata', descricao: 'Número da duplicata ou boleto', tipo: 'tabela', obrigatorio: true, categoria: 'Títulos', exemplo: 'DUP-2025-001' },
  { campo: 'titulo_valor', label: 'Valor do Título (R$)', descricao: 'Valor do título', tipo: 'numero', obrigatorio: true, categoria: 'Títulos', exemplo: '3.200,00' },
  { campo: 'titulo_emissao', label: 'Data de Emissão', descricao: 'Data em que o título foi emitido', tipo: 'tabela', obrigatorio: false, categoria: 'Títulos' },
  { campo: 'titulo_vencimento', label: 'Data de Vencimento', descricao: 'Data de vencimento', tipo: 'tabela', obrigatorio: true, categoria: 'Títulos', exemplo: '2025-04-15' },
  { campo: 'titulo_status', label: 'Status do Título', descricao: 'A vencer, vencido, pago, parcial', tipo: 'tabela', obrigatorio: true, categoria: 'Títulos', exemplo: 'Vencido' },
  { campo: 'titulo_dias_atraso', label: 'Dias em Atraso', descricao: 'Qtd de dias em atraso', tipo: 'numero', obrigatorio: false, categoria: 'Títulos', exemplo: '15' },
  { campo: 'titulo_valor_pago', label: 'Valor Pago (R$)', descricao: 'Quanto já foi pago', tipo: 'numero', obrigatorio: false, categoria: 'Títulos' },
  { campo: 'titulo_nf', label: 'Nº Nota Fiscal', descricao: 'NF vinculada ao título', tipo: 'tabela', obrigatorio: false, categoria: 'Títulos' },
  // Condições de Pagamento
  { campo: 'condicao_pagamento_nome', label: 'Condição de Pagamento', descricao: 'Nome da condição (ex: À Vista, 30/60/90)', tipo: 'tabela', obrigatorio: false, categoria: 'Condições de Pagamento', tabelas_sistema_sugeridas: ['condicoes_pagamento'], colunas_sugeridas: ['nome', 'descricao'] },
  { campo: 'condicao_pagamento_valor_minimo', label: 'Valor Mínimo do Pedido (R$)', descricao: 'Valor mínimo para liberar esta condição', tipo: 'numero', obrigatorio: false, categoria: 'Condições de Pagamento', tabelas_sistema_sugeridas: ['condicoes_pagamento'], colunas_sugeridas: ['valor_minimo'], exemplo: '500,00' },
  { campo: 'condicao_pagamento_valor_maximo', label: 'Valor Máximo do Pedido (R$)', descricao: 'Valor máximo para esta condição', tipo: 'numero', obrigatorio: false, categoria: 'Condições de Pagamento', tabelas_sistema_sugeridas: ['condicoes_pagamento'], colunas_sugeridas: ['valor_maximo'], exemplo: '50.000,00' },
  { campo: 'tipo_pagamento_nome', label: 'Tipo/Forma de Pagamento', descricao: 'Forma de pgto vinculada à condição (Boleto, Cartão, Pix)', tipo: 'tabela', obrigatorio: false, categoria: 'Condições de Pagamento', tabelas_sistema_sugeridas: ['tipos_pagamento'], colunas_sugeridas: ['nome'] },
  { campo: 'tipo_pagamento_taxa', label: 'Taxa/Juros por Parcela (%)', descricao: 'Percentual de juros aplicado nas parcelas desta forma', tipo: 'numero', obrigatorio: false, categoria: 'Condições de Pagamento', tabelas_sistema_sugeridas: ['tipos_pagamento'], colunas_sugeridas: ['taxa_percentual'], exemplo: '1.5' },
  // Inadimplência
  { campo: 'juros_atraso', label: 'Juros por Atraso (% mês)', descricao: 'Percentual de juros por atraso', tipo: 'numero', obrigatorio: false, categoria: 'Inadimplência', exemplo: '2' },
  { campo: 'multa_atraso', label: 'Multa por Atraso (%)', descricao: 'Percentual de multa', tipo: 'numero', obrigatorio: false, categoria: 'Inadimplência', exemplo: '2' },
  { campo: 'politica_credito', label: 'Regras de Crédito', descricao: 'Critérios de aprovação', tipo: 'texto', obrigatorio: false, categoria: 'Inadimplência', exemplo: 'Score > 500, sem títulos vencidos > 30 dias' },
];

// ========== AGENTE LOGÍSTICO ==========
const logisticoCampos: AgentDataField[] = [
  // Estoque
  { campo: 'produto_codigo', label: 'Código do Produto', descricao: 'SKU do produto', tipo: 'tabela', obrigatorio: true, categoria: 'Estoque', tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['codigo'] },
  { campo: 'produto_nome', label: 'Nome do Produto', descricao: 'Nome do produto', tipo: 'tabela', obrigatorio: true, categoria: 'Estoque', tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['nome'] },
  { campo: 'estoque_disponivel', label: 'Estoque Disponível', descricao: 'Quantidade disponível', tipo: 'numero', obrigatorio: true, categoria: 'Estoque', tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['estoque'], exemplo: '250' },
  { campo: 'estoque_reservado', label: 'Estoque Reservado', descricao: 'Quantidade em reserva', tipo: 'numero', obrigatorio: false, categoria: 'Estoque', exemplo: '30' },
  { campo: 'estoque_minimo', label: 'Estoque Mínimo', descricao: 'Ponto de reposição', tipo: 'numero', obrigatorio: false, categoria: 'Estoque', exemplo: '20' },
  { campo: 'estoque_em_transito', label: 'Estoque em Trânsito', descricao: 'Quantidade a caminho do CD', tipo: 'numero', obrigatorio: false, categoria: 'Estoque', exemplo: '100' },
  { campo: 'previsao_chegada', label: 'Previsão de Chegada', descricao: 'Data prevista de reposição', tipo: 'tabela', obrigatorio: false, categoria: 'Estoque' },
  { campo: 'lote', label: 'Lote', descricao: 'Número do lote', tipo: 'tabela', obrigatorio: false, categoria: 'Estoque' },
  { campo: 'validade', label: 'Data de Validade', descricao: 'Validade do lote', tipo: 'tabela', obrigatorio: false, categoria: 'Estoque' },
  // Filiais
  { campo: 'filial_nome', label: 'Filial/CD', descricao: 'Nome da filial ou centro de distribuição', tipo: 'tabela', obrigatorio: false, categoria: 'Filiais', exemplo: 'CD São Paulo' },
  { campo: 'filial_estoque', label: 'Estoque na Filial', descricao: 'Quantidade disponível na filial', tipo: 'numero', obrigatorio: false, categoria: 'Filiais' },
  // Entrega
  { campo: 'regiao_entrega', label: 'Região de Entrega', descricao: 'Área de cobertura', tipo: 'texto', obrigatorio: true, categoria: 'Entrega', exemplo: 'Grande SP: 1 dia | Interior: 3 dias' },
  { campo: 'prazo_entrega_dias', label: 'Prazo de Entrega (dias)', descricao: 'Dias úteis para entrega', tipo: 'numero', obrigatorio: true, categoria: 'Entrega', exemplo: '3' },
  { campo: 'frete_valor', label: 'Valor do Frete (R$)', descricao: 'Custo do frete', tipo: 'numero', obrigatorio: false, categoria: 'Entrega', exemplo: '45,00' },
  { campo: 'frete_gratis_acima', label: 'Frete Grátis Acima de (R$)', descricao: 'Valor mínimo para frete grátis', tipo: 'numero', obrigatorio: false, categoria: 'Entrega', exemplo: '500,00' },
  { campo: 'modalidades_entrega', label: 'Modalidades de Entrega', descricao: 'Tipos disponíveis', tipo: 'texto', obrigatorio: false, categoria: 'Entrega', exemplo: 'Normal, Expressa, Retirada' },
  { campo: 'peso_produto', label: 'Peso (kg)', descricao: 'Peso do produto para cálculo de frete', tipo: 'numero', obrigatorio: false, categoria: 'Entrega', tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['peso'] },
  { campo: 'dimensoes_produto', label: 'Dimensões (CxLxA)', descricao: 'Dimensões para cubagem', tipo: 'texto', obrigatorio: false, categoria: 'Entrega' },
];

// ========== AGENTE MARGEM E ESTRATÉGIA ==========
const margemCampos: AgentDataField[] = [
  { campo: 'produto_codigo', label: 'Código do Produto', descricao: 'SKU', tipo: 'tabela', obrigatorio: true, categoria: 'Produto', tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['codigo'] },
  { campo: 'produto_nome', label: 'Nome do Produto', descricao: 'Nome', tipo: 'tabela', obrigatorio: true, categoria: 'Produto', tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['nome'] },
  { campo: 'produto_categoria', label: 'Categoria', descricao: 'Grupo/categoria', tipo: 'tabela', obrigatorio: false, categoria: 'Produto', tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['categoria'] },
  { campo: 'curva_abc', label: 'Classificação ABC', descricao: 'Classificação na curva ABC', tipo: 'tabela', obrigatorio: false, categoria: 'Produto', exemplo: 'A' },
  // Preços e custos
  { campo: 'preco_venda', label: 'Preço de Venda (R$)', descricao: 'Preço de tabela', tipo: 'numero', obrigatorio: true, categoria: 'Preços', tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['preco_venda'] },
  { campo: 'preco_custo', label: 'Preço de Custo (R$)', descricao: 'Custo de aquisição', tipo: 'numero', obrigatorio: true, categoria: 'Preços', tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['preco_custo'] },
  { campo: 'custo_operacional', label: 'Custo Operacional (%)', descricao: 'Despesas operacionais sobre a venda', tipo: 'numero', obrigatorio: false, categoria: 'Preços', exemplo: '8' },
  { campo: 'impostos_percentual', label: 'Impostos (%)', descricao: 'Carga tributária média', tipo: 'numero', obrigatorio: false, categoria: 'Preços', exemplo: '12' },
  { campo: 'comissao_percentual', label: 'Comissão Vendedor (%)', descricao: 'Percentual de comissão', tipo: 'numero', obrigatorio: false, categoria: 'Preços', exemplo: '3' },
  // Margens
  { campo: 'margem_atual', label: 'Margem Atual (%)', descricao: 'Margem de lucro atual', tipo: 'numero', obrigatorio: false, categoria: 'Margens', exemplo: '35' },
  { campo: 'margem_minima', label: 'Margem Mínima (%)', descricao: 'Menor margem aceitável', tipo: 'numero', obrigatorio: true, categoria: 'Margens', exemplo: '15' },
  { campo: 'margem_ideal', label: 'Margem Ideal (%)', descricao: 'Margem alvo da empresa', tipo: 'numero', obrigatorio: false, categoria: 'Margens', exemplo: '30' },
  // Metas
  { campo: 'meta_faturamento_mensal', label: 'Meta Faturamento (R$/mês)', descricao: 'Meta de faturamento mensal', tipo: 'numero', obrigatorio: false, categoria: 'Metas', exemplo: '500.000,00' },
  { campo: 'realizado_faturamento', label: 'Faturamento Realizado (R$)', descricao: 'Quanto já faturou no período', tipo: 'numero', obrigatorio: false, categoria: 'Metas' },
  { campo: 'meta_margem_media', label: 'Meta Margem Média (%)', descricao: 'Meta de margem média', tipo: 'numero', obrigatorio: false, categoria: 'Metas', exemplo: '25' },
  // Concorrência
  { campo: 'preco_concorrente', label: 'Preço do Concorrente (R$)', descricao: 'Preço praticado pelo concorrente', tipo: 'numero', obrigatorio: false, categoria: 'Concorrência' },
  { campo: 'nome_concorrente', label: 'Nome do Concorrente', descricao: 'Nome do concorrente', tipo: 'texto', obrigatorio: false, categoria: 'Concorrência' },
];

// ========== AGENTE OBJEÇÕES ==========
const objecoesCampos: AgentDataField[] = [
  { campo: 'objecao_texto', label: 'Objeção do Cliente', descricao: 'Texto da objeção', tipo: 'tabela', obrigatorio: true, categoria: 'Objeções', tabelas_sistema_sugeridas: ['agent_objections'], colunas_sugeridas: ['objecao'], exemplo: 'O preço está muito alto' },
  { campo: 'objecao_categoria', label: 'Categoria', descricao: 'Tipo: preço, prazo, qualidade, confiança', tipo: 'tabela', obrigatorio: true, categoria: 'Objeções', tabelas_sistema_sugeridas: ['agent_objections'], colunas_sugeridas: ['categoria'] },
  { campo: 'resposta_sugerida', label: 'Resposta Sugerida', descricao: 'Resposta padrão para a objeção', tipo: 'tabela', obrigatorio: true, categoria: 'Objeções', tabelas_sistema_sugeridas: ['agent_objections'], colunas_sugeridas: ['resposta_sugerida'] },
  { campo: 'argumentos_apoio', label: 'Argumentos de Apoio', descricao: 'Argumentos complementares', tipo: 'tabela', obrigatorio: false, categoria: 'Objeções', tabelas_sistema_sugeridas: ['agent_objections'], colunas_sugeridas: ['argumentos'] },
  { campo: 'gatilho_mental', label: 'Gatilho Mental', descricao: 'Técnica de persuasão', tipo: 'tabela', obrigatorio: false, categoria: 'Objeções', tabelas_sistema_sugeridas: ['agent_objections'], colunas_sugeridas: ['gatilhos_mentais'], exemplo: 'Escassez' },
  { campo: 'eficacia_percentual', label: 'Eficácia (%)', descricao: 'Taxa de sucesso da resposta', tipo: 'numero', obrigatorio: false, categoria: 'Objeções', tabelas_sistema_sugeridas: ['agent_objections'], colunas_sugeridas: ['eficacia_percentual'] },
  { campo: 'case_sucesso', label: 'Case de Sucesso', descricao: 'Exemplo real de cliente satisfeito', tipo: 'texto', obrigatorio: false, categoria: 'Objeções', exemplo: 'Empresa XYZ reduziu custos em 30%' },
  { campo: 'contra_argumento_preco', label: 'Contra-argumento de Preço', descricao: 'Resposta específica para objeção de preço', tipo: 'texto', obrigatorio: false, categoria: 'Scripts', exemplo: 'Nosso preço inclui garantia e suporte' },
  { campo: 'contra_argumento_prazo', label: 'Contra-argumento de Prazo', descricao: 'Resposta para objeção de prazo', tipo: 'texto', obrigatorio: false, categoria: 'Scripts', exemplo: 'Temos entrega expressa em 24h' },
  { campo: 'contra_argumento_confianca', label: 'Contra-argumento de Confiança', descricao: 'Resposta para falta de confiança', tipo: 'texto', obrigatorio: false, categoria: 'Scripts', exemplo: 'Atendemos mais de 500 empresas' },
];

// ========== AGENTE TÉCNICO ==========
const tecnicoCampos: AgentDataField[] = [
  { campo: 'produto_codigo', label: 'Código do Produto', descricao: 'SKU', tipo: 'tabela', obrigatorio: true, categoria: 'Produto', tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['codigo'] },
  { campo: 'produto_nome', label: 'Nome do Produto', descricao: 'Nome', tipo: 'tabela', obrigatorio: true, categoria: 'Produto', tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['nome'] },
  { campo: 'produto_descricao', label: 'Descrição', descricao: 'Descrição do produto', tipo: 'tabela', obrigatorio: false, categoria: 'Produto', tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['descricao'] },
  { campo: 'produto_categoria', label: 'Categoria', descricao: 'Grupo/categoria', tipo: 'tabela', obrigatorio: false, categoria: 'Produto', tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['categoria'] },
  { campo: 'produto_marca', label: 'Marca/Fabricante', descricao: 'Marca', tipo: 'tabela', obrigatorio: false, categoria: 'Produto', tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['marca'] },
  // Ficha técnica
  { campo: 'ficha_tecnica', label: 'Ficha Técnica', descricao: 'Especificações técnicas completas', tipo: 'texto', obrigatorio: true, categoria: 'Especificações', exemplo: 'Material: Aço Carbono | Diâmetro: 10mm' },
  { campo: 'dimensoes', label: 'Dimensões', descricao: 'Medidas do produto', tipo: 'texto', obrigatorio: false, categoria: 'Especificações', exemplo: '100x50x20mm' },
  { campo: 'peso', label: 'Peso', descricao: 'Peso do produto', tipo: 'texto', obrigatorio: false, categoria: 'Especificações', exemplo: '0,5 kg' },
  { campo: 'material', label: 'Material', descricao: 'Material de fabricação', tipo: 'texto', obrigatorio: false, categoria: 'Especificações', exemplo: 'Aço Inox 304' },
  { campo: 'cor', label: 'Cor/Acabamento', descricao: 'Cor ou acabamento', tipo: 'texto', obrigatorio: false, categoria: 'Especificações', exemplo: 'Zincado' },
  { campo: 'norma_tecnica', label: 'Norma Técnica', descricao: 'Norma ou certificação', tipo: 'texto', obrigatorio: false, categoria: 'Especificações', exemplo: 'NBR 8800, ISO 4014' },
  // Uso e compatibilidade
  { campo: 'aplicacao', label: 'Aplicação', descricao: 'Para que serve / onde usar', tipo: 'texto', obrigatorio: false, categoria: 'Aplicação', exemplo: 'Fixação de estruturas metálicas' },
  { campo: 'modo_uso', label: 'Modo de Uso', descricao: 'Instruções de uso', tipo: 'texto', obrigatorio: false, categoria: 'Aplicação' },
  { campo: 'compativel_com', label: 'Compatível Com', descricao: 'Produtos que funcionam junto', tipo: 'texto', obrigatorio: false, categoria: 'Aplicação', exemplo: 'Porca M10, Arruela 10mm' },
  { campo: 'nao_compativel_com', label: 'Incompatível Com', descricao: 'Produtos que NÃO devem ser usados junto', tipo: 'texto', obrigatorio: false, categoria: 'Aplicação' },
  { campo: 'produto_substituto', label: 'Produto Substituto', descricao: 'Alternativa quando não houver estoque', tipo: 'texto', obrigatorio: false, categoria: 'Aplicação' },
  { campo: 'garantia', label: 'Garantia', descricao: 'Prazo e condições de garantia', tipo: 'texto', obrigatorio: false, categoria: 'Garantia', exemplo: '12 meses contra defeito' },
  { campo: 'validade', label: 'Validade', descricao: 'Prazo de validade do produto', tipo: 'texto', obrigatorio: false, categoria: 'Garantia' },
];

// ========== AGENTE EXCEÇÕES ==========
const excecoesCampos: AgentDataField[] = [
  { campo: 'tipo_excecao', label: 'Tipo de Exceção', descricao: 'Categoria (preço, prazo, crédito, frete)', tipo: 'texto', obrigatorio: true, categoria: 'Exceções', exemplo: 'Preço abaixo da margem mínima' },
  { campo: 'condicao_ativacao', label: 'Condição de Ativação', descricao: 'Quando essa exceção é acionada', tipo: 'texto', obrigatorio: true, categoria: 'Exceções', exemplo: 'Desconto > 15% ou margem < 10%' },
  { campo: 'nivel_risco', label: 'Nível de Risco', descricao: 'Baixo, médio, alto, crítico', tipo: 'texto', obrigatorio: false, categoria: 'Exceções', exemplo: 'Alto' },
  { campo: 'acao_automatica', label: 'Ação Automática', descricao: 'O que o sistema faz automaticamente', tipo: 'texto', obrigatorio: false, categoria: 'Exceções', exemplo: 'Bloquear venda e notificar gerente' },
  // Aprovação
  { campo: 'aprovador_nivel1', label: 'Aprovador Nível 1', descricao: 'Quem aprova em primeiro nível', tipo: 'texto', obrigatorio: true, categoria: 'Aprovação', exemplo: 'Gerente Comercial' },
  { campo: 'aprovador_nivel2', label: 'Aprovador Nível 2', descricao: 'Quem aprova valores altos', tipo: 'texto', obrigatorio: false, categoria: 'Aprovação', exemplo: 'Diretor Comercial' },
  { campo: 'limite_nivel1', label: 'Limite Nível 1 (R$)', descricao: 'Valor máximo para nível 1', tipo: 'numero', obrigatorio: false, categoria: 'Aprovação', exemplo: '10.000,00' },
  { campo: 'limite_nivel2', label: 'Limite Nível 2 (R$)', descricao: 'Valor máximo para nível 2', tipo: 'numero', obrigatorio: false, categoria: 'Aprovação', exemplo: '50.000,00' },
  { campo: 'prazo_aprovacao_horas', label: 'Prazo para Aprovação (h)', descricao: 'Tempo máximo para responder', tipo: 'numero', obrigatorio: false, categoria: 'Aprovação', exemplo: '4' },
  { campo: 'justificativa_obrigatoria', label: 'Justificativa Obrigatória?', descricao: 'Se precisa justificar', tipo: 'texto', obrigatorio: false, categoria: 'Aprovação', exemplo: 'Sim' },
  // Alertas
  { campo: 'alerta_venda_abaixo_custo', label: 'Alertar Venda Abaixo do Custo', descricao: 'Ativar alerta quando preço < custo', tipo: 'texto', obrigatorio: false, categoria: 'Alertas', exemplo: 'Sim, bloquear automaticamente' },
  { campo: 'alerta_cliente_inadimplente', label: 'Alertar Cliente Inadimplente', descricao: 'Bloquear venda para inadimplentes', tipo: 'texto', obrigatorio: false, categoria: 'Alertas', exemplo: 'Sim, se atraso > 30 dias' },
  { campo: 'alerta_limite_credito', label: 'Alertar Limite Excedido', descricao: 'Quando pedido ultrapassa limite', tipo: 'texto', obrigatorio: false, categoria: 'Alertas', exemplo: 'Sim, bloquear e notificar' },
];

// ========== AGENTE PERFORMANCE ==========
const performanceCampos: AgentDataField[] = [
  // Vendedor
  { campo: 'vendedor_codigo', label: 'Código do Vendedor', descricao: 'ID interno', tipo: 'tabela', obrigatorio: true, categoria: 'Vendedor', tabelas_sistema_sugeridas: ['usuarios'], colunas_sugeridas: ['id'] },
  { campo: 'vendedor_nome', label: 'Nome do Vendedor', descricao: 'Nome do vendedor/representante', tipo: 'tabela', obrigatorio: true, categoria: 'Vendedor', tabelas_sistema_sugeridas: ['usuarios'], colunas_sugeridas: ['nome'] },
  { campo: 'vendedor_equipe', label: 'Equipe/Regional', descricao: 'Equipe ou região do vendedor', tipo: 'texto', obrigatorio: false, categoria: 'Vendedor' },
  { campo: 'vendedor_cargo', label: 'Cargo', descricao: 'Cargo do vendedor', tipo: 'tabela', obrigatorio: false, categoria: 'Vendedor', tabelas_sistema_sugeridas: ['usuarios'], colunas_sugeridas: ['role'] },
  // Metas
  { campo: 'meta_mensal_valor', label: 'Meta Mensal (R$)', descricao: 'Meta de faturamento', tipo: 'numero', obrigatorio: true, categoria: 'Metas', exemplo: '150.000,00' },
  { campo: 'realizado_mensal', label: 'Realizado no Mês (R$)', descricao: 'Quanto já vendeu', tipo: 'numero', obrigatorio: true, categoria: 'Metas', exemplo: '98.000,00' },
  { campo: 'meta_clientes_novos', label: 'Meta Clientes Novos', descricao: 'Meta de novos clientes no mês', tipo: 'numero', obrigatorio: false, categoria: 'Metas', exemplo: '10' },
  { campo: 'meta_visitas', label: 'Meta de Visitas', descricao: 'Meta de visitas no mês', tipo: 'numero', obrigatorio: false, categoria: 'Metas' },
  // Indicadores
  { campo: 'qtd_pedidos_mes', label: 'Nº Pedidos no Mês', descricao: 'Quantidade de pedidos fechados', tipo: 'numero', obrigatorio: false, categoria: 'Indicadores', exemplo: '23' },
  { campo: 'ticket_medio', label: 'Ticket Médio (R$)', descricao: 'Valor médio por pedido', tipo: 'numero', obrigatorio: false, categoria: 'Indicadores', exemplo: '4.260,00' },
  { campo: 'taxa_conversao', label: 'Taxa de Conversão (%)', descricao: 'Orçamentos convertidos em vendas', tipo: 'numero', obrigatorio: false, categoria: 'Indicadores', exemplo: '38' },
  { campo: 'clientes_ativos', label: 'Clientes Ativos', descricao: 'Nº de clientes com compra no período', tipo: 'numero', obrigatorio: false, categoria: 'Indicadores', exemplo: '18' },
  { campo: 'clientes_novos', label: 'Clientes Novos', descricao: 'Novos clientes no período', tipo: 'numero', obrigatorio: false, categoria: 'Indicadores', exemplo: '5' },
  { campo: 'clientes_inativos', label: 'Clientes Inativos', descricao: 'Clientes sem compra no período', tipo: 'numero', obrigatorio: false, categoria: 'Indicadores', exemplo: '12' },
  { campo: 'margem_media', label: 'Margem Média (%)', descricao: 'Margem média das vendas', tipo: 'numero', obrigatorio: false, categoria: 'Indicadores', exemplo: '28' },
  { campo: 'ranking_posicao', label: 'Posição no Ranking', descricao: 'Posição entre os vendedores', tipo: 'numero', obrigatorio: false, categoria: 'Indicadores', exemplo: '3' },
  { campo: 'comissao_acumulada', label: 'Comissão Acumulada (R$)', descricao: 'Comissão gerada no período', tipo: 'numero', obrigatorio: false, categoria: 'Indicadores' },
];

// ========== AGENTE PÓS-VENDA ==========
const posVendaCampos: AgentDataField[] = [
  // Cliente
  { campo: 'cliente_codigo', label: 'Código do Cliente', descricao: 'Código interno', tipo: 'tabela', obrigatorio: true, categoria: 'Cliente', tabelas_sistema_sugeridas: ['customers'], colunas_sugeridas: ['id'] },
  { campo: 'cliente_nome', label: 'Nome do Cliente', descricao: 'Nome/razão social', tipo: 'tabela', obrigatorio: true, categoria: 'Cliente', tabelas_sistema_sugeridas: ['customers', 'empresas'], colunas_sugeridas: ['name', 'nome'] },
  { campo: 'cliente_cnpj_cpf', label: 'CNPJ/CPF', descricao: 'Documento', tipo: 'tabela', obrigatorio: true, categoria: 'Cliente', tabelas_sistema_sugeridas: ['empresas'], colunas_sugeridas: ['cnpj'] },
  { campo: 'cliente_telefone', label: 'Telefone', descricao: 'Telefone de contato', tipo: 'tabela', obrigatorio: false, categoria: 'Cliente', tabelas_sistema_sugeridas: ['customers'], colunas_sugeridas: ['phone'] },
  // Pedido
  { campo: 'pedido_numero', label: 'Nº do Pedido', descricao: 'Número do pedido entregue', tipo: 'tabela', obrigatorio: true, categoria: 'Pedido', tabelas_sistema_sugeridas: ['orcamentos', 'pedidos_ecommerce'], colunas_sugeridas: ['numero', 'numero_pedido'] },
  { campo: 'pedido_data', label: 'Data do Pedido', descricao: 'Data da compra', tipo: 'tabela', obrigatorio: true, categoria: 'Pedido', tabelas_sistema_sugeridas: ['orcamentos'], colunas_sugeridas: ['data_criacao'] },
  { campo: 'pedido_data_entrega', label: 'Data de Entrega', descricao: 'Quando foi entregue', tipo: 'tabela', obrigatorio: false, categoria: 'Pedido' },
  { campo: 'pedido_valor', label: 'Valor do Pedido (R$)', descricao: 'Valor total', tipo: 'numero', obrigatorio: false, categoria: 'Pedido', tabelas_sistema_sugeridas: ['orcamentos'], colunas_sugeridas: ['valor_total'] },
  { campo: 'pedido_itens', label: 'Itens do Pedido', descricao: 'Produtos que o cliente comprou', tipo: 'tabela', obrigatorio: false, categoria: 'Pedido', tabelas_sistema_sugeridas: ['orcamento_itens'], colunas_sugeridas: ['nome_produto'] },
  // Ocorrências
  { campo: 'ocorrencia_tipo', label: 'Tipo de Ocorrência', descricao: 'Troca, devolução, reclamação, dúvida', tipo: 'texto', obrigatorio: false, categoria: 'Ocorrências', exemplo: 'Troca de produto' },
  { campo: 'ocorrencia_motivo', label: 'Motivo', descricao: 'Motivo da ocorrência', tipo: 'texto', obrigatorio: false, categoria: 'Ocorrências', exemplo: 'Produto com defeito' },
  { campo: 'ocorrencia_status', label: 'Status da Ocorrência', descricao: 'Aberta, em análise, resolvida', tipo: 'texto', obrigatorio: false, categoria: 'Ocorrências' },
  { campo: 'prazo_troca_dias', label: 'Prazo para Troca (dias)', descricao: 'Dias permitidos para troca', tipo: 'numero', obrigatorio: false, categoria: 'Ocorrências', exemplo: '7' },
  // politica_devolucao agora é global
  // Follow-up
  { campo: 'dias_pos_entrega_contato', label: 'Contato Após (dias)', descricao: 'Quantos dias após entrega fazer contato', tipo: 'numero', obrigatorio: false, categoria: 'Follow-up', exemplo: '3' },
  { campo: 'mensagem_followup', label: 'Mensagem de Follow-up', descricao: 'Mensagem padrão de acompanhamento', tipo: 'texto', obrigatorio: false, categoria: 'Follow-up', exemplo: 'Olá! Seu pedido chegou bem? Precisa de algo?' },
];

// ========== AGENTE SATISFAÇÃO ==========
const satisfacaoCampos: AgentDataField[] = [
  // Cliente
  { campo: 'cliente_codigo', label: 'Código do Cliente', descricao: 'Código interno', tipo: 'tabela', obrigatorio: true, categoria: 'Cliente', tabelas_sistema_sugeridas: ['customers'], colunas_sugeridas: ['id'] },
  { campo: 'cliente_nome', label: 'Nome do Cliente', descricao: 'Nome/razão social', tipo: 'tabela', obrigatorio: true, categoria: 'Cliente', tabelas_sistema_sugeridas: ['customers', 'empresas'], colunas_sugeridas: ['name', 'nome'] },
  { campo: 'cliente_segmento', label: 'Segmento', descricao: 'Segmento do cliente', tipo: 'tabela', obrigatorio: false, categoria: 'Cliente', tabelas_sistema_sugeridas: ['empresas'], colunas_sugeridas: ['segmento'] },
  // Pesquisa
  { campo: 'pesquisa_tipo', label: 'Tipo de Pesquisa', descricao: 'NPS, CSAT, CES', tipo: 'texto', obrigatorio: true, categoria: 'Pesquisa', exemplo: 'NPS' },
  { campo: 'pesquisa_nota', label: 'Nota/Score', descricao: 'Nota dada pelo cliente', tipo: 'numero', obrigatorio: true, categoria: 'Pesquisa', exemplo: '9' },
  { campo: 'pesquisa_comentario', label: 'Comentário', descricao: 'Comentário livre do cliente', tipo: 'texto', obrigatorio: false, categoria: 'Pesquisa' },
  { campo: 'pesquisa_data', label: 'Data da Pesquisa', descricao: 'Quando respondeu', tipo: 'tabela', obrigatorio: false, categoria: 'Pesquisa' },
  { campo: 'classificacao_nps', label: 'Classificação NPS', descricao: 'Promotor, neutro ou detrator', tipo: 'texto', obrigatorio: false, categoria: 'Pesquisa', exemplo: 'Promotor' },
  // Análise
  { campo: 'pontos_positivos', label: 'Pontos Positivos', descricao: 'O que o cliente elogia', tipo: 'texto', obrigatorio: false, categoria: 'Análise' },
  { campo: 'pontos_negativos', label: 'Pontos Negativos', descricao: 'O que o cliente reclama', tipo: 'texto', obrigatorio: false, categoria: 'Análise' },
  { campo: 'sugestoes', label: 'Sugestões', descricao: 'Sugestões de melhoria', tipo: 'texto', obrigatorio: false, categoria: 'Análise' },
  // Ações
  { campo: 'acao_detrator', label: 'Ação para Detratores', descricao: 'O que fazer quando o cliente é detrator', tipo: 'texto', obrigatorio: false, categoria: 'Ações', exemplo: 'Ligar em até 24h, oferecer compensação' },
  { campo: 'acao_neutro', label: 'Ação para Neutros', descricao: 'O que fazer com neutros', tipo: 'texto', obrigatorio: false, categoria: 'Ações', exemplo: 'Enviar cupom de desconto, pedir feedback' },
  { campo: 'acao_promotor', label: 'Ação para Promotores', descricao: 'O que fazer com promotores', tipo: 'texto', obrigatorio: false, categoria: 'Ações', exemplo: 'Pedir indicação, oferecer programa de fidelidade' },
];

// ========== AGENTE CADASTRO DE PRODUTOS E ESTOQUE ==========
const cadastroProdutosCampos: AgentDataField[] = [
  // Dados Básicos do Produto
  { campo: 'produto_codigo', label: 'Código do Produto', descricao: 'SKU ou código interno', tipo: 'tabela', obrigatorio: true, categoria: 'Dados Básicos', tabelas_sistema_sugeridas: ['produtos', 'produtos_importados'], colunas_sugeridas: ['codigo', 'id'], exemplo: 'SKU-001234' },
  { campo: 'produto_nome', label: 'Nome do Produto', descricao: 'Nome ou descrição do material', tipo: 'tabela', obrigatorio: true, categoria: 'Dados Básicos', tabelas_sistema_sugeridas: ['produtos', 'produtos_importados'], colunas_sugeridas: ['nome'], exemplo: 'Papel Sulfite A4 75g' },
  { campo: 'produto_descricao', label: 'Descrição Detalhada', descricao: 'Descrição técnica do produto', tipo: 'tabela', obrigatorio: false, categoria: 'Dados Básicos', tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['descricao'] },
  { campo: 'produto_categoria', label: 'Categoria/Grupo', descricao: 'Categoria ou grupo do produto', tipo: 'tabela', obrigatorio: true, categoria: 'Dados Básicos', tabelas_sistema_sugeridas: ['produtos', 'produto_grupos'], colunas_sugeridas: ['categoria', 'grupo', 'nome'], exemplo: 'Papéis' },
  { campo: 'produto_marca', label: 'Marca/Fabricante', descricao: 'Marca ou fabricante', tipo: 'tabela', obrigatorio: false, categoria: 'Dados Básicos', tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['marca'], exemplo: 'Chamex' },
  { campo: 'produto_unidade', label: 'Unidade de Medida', descricao: 'UN, KG, CX, MT, RS, PC, etc.', tipo: 'tabela', obrigatorio: true, categoria: 'Dados Básicos', tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['unidade'], exemplo: 'RS (resma)' },
  { campo: 'produto_ncm', label: 'NCM', descricao: 'Nomenclatura Comum do Mercosul', tipo: 'tabela', obrigatorio: false, categoria: 'Dados Básicos', tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['ncm'], exemplo: '4802.56.10' },
  { campo: 'produto_ean', label: 'EAN/Código de Barras', descricao: 'Código de barras EAN-13', tipo: 'tabela', obrigatorio: false, categoria: 'Dados Básicos', tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['ean_13'] },
  { campo: 'produto_origem', label: 'Origem', descricao: 'Nacional, importado, etc.', tipo: 'tabela', obrigatorio: false, categoria: 'Dados Básicos', tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['origem'] },
  // Especificações Técnicas (Campos Customizados por grupo)
  { campo: 'produto_gramatura', label: 'Gramatura (g/m²)', descricao: 'Peso por metro quadrado do material', tipo: 'tabela', obrigatorio: false, categoria: 'Especificações Técnicas', tabelas_sistema_sugeridas: ['produtos_importados', 'produto_campos_customizados'], colunas_sugeridas: ['gramatura', 'valor'], exemplo: '75' },
  { campo: 'produto_largura', label: 'Largura (cm/mm)', descricao: 'Largura do material', tipo: 'tabela', obrigatorio: false, categoria: 'Especificações Técnicas', tabelas_sistema_sugeridas: ['produtos', 'produtos_importados', 'produto_campos_customizados'], colunas_sugeridas: ['largura', 'valor'], exemplo: '210' },
  { campo: 'produto_comprimento', label: 'Comprimento (cm/mm)', descricao: 'Comprimento do material', tipo: 'tabela', obrigatorio: false, categoria: 'Especificações Técnicas', tabelas_sistema_sugeridas: ['produtos', 'produtos_importados', 'produto_campos_customizados'], colunas_sugeridas: ['comprimento', 'valor'], exemplo: '297' },
  { campo: 'produto_altura', label: 'Altura (cm/mm)', descricao: 'Altura do produto ou embalagem', tipo: 'tabela', obrigatorio: false, categoria: 'Especificações Técnicas', tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['altura'] },
  { campo: 'produto_peso', label: 'Peso Unitário (kg)', descricao: 'Peso por unidade', tipo: 'tabela', obrigatorio: false, categoria: 'Especificações Técnicas', tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['peso_unitario'], exemplo: '2.5' },
  { campo: 'produto_diametro', label: 'Diâmetro (cm/mm)', descricao: 'Diâmetro do material (ex: bobinas)', tipo: 'tabela', obrigatorio: false, categoria: 'Especificações Técnicas', tabelas_sistema_sugeridas: ['produtos_importados', 'produto_campos_customizados'], colunas_sugeridas: ['diametro', 'valor'] },
  { campo: 'produto_numero_folhas', label: 'Número de Folhas', descricao: 'Quantidade de folhas (ex: resmas)', tipo: 'tabela', obrigatorio: false, categoria: 'Especificações Técnicas', tabelas_sistema_sugeridas: ['produtos_importados'], colunas_sugeridas: ['numero_folhas'], exemplo: '500' },
  { campo: 'produto_cor', label: 'Cor', descricao: 'Cor do material', tipo: 'tabela', obrigatorio: false, categoria: 'Especificações Técnicas', tabelas_sistema_sugeridas: ['produtos', 'produto_campos_customizados'], colunas_sugeridas: ['cor', 'valor'], exemplo: 'Branco' },
  { campo: 'produto_material', label: 'Material/Composição', descricao: 'Tipo de material ou composição', tipo: 'tabela', obrigatorio: false, categoria: 'Especificações Técnicas', tabelas_sistema_sugeridas: ['produtos', 'produto_campos_customizados'], colunas_sugeridas: ['material', 'valor'], exemplo: 'Celulose virgem' },
  { campo: 'produto_campos_customizados_grupo', label: 'Campos Customizados do Grupo', descricao: 'Campos extras configurados por grupo de produto (automático)', tipo: 'sistema_auto', obrigatorio: false, categoria: 'Especificações Técnicas', tabelas_sistema_sugeridas: ['produto_campos_customizados'], colunas_sugeridas: ['campo_key', 'label', 'tipo', 'opcoes'] },
  // Embalagem e Acondicionamento
  { campo: 'produto_tipo_embalagem', label: 'Tipo de Embalagem', descricao: 'Pallet, pacote, caixa, bobina, fardo', tipo: 'tabela', obrigatorio: true, categoria: 'Embalagem', tabelas_sistema_sugeridas: ['produtos_importados'], colunas_sugeridas: ['embalagem', 'tipo'], exemplo: 'Pallet' },
  { campo: 'produto_qtd_por_embalagem', label: 'Qtd por Embalagem', descricao: 'Quantas unidades por pacote/caixa', tipo: 'numero', obrigatorio: false, categoria: 'Embalagem', exemplo: '10' },
  { campo: 'produto_qtd_por_pallet', label: 'Qtd por Pallet', descricao: 'Quantas unidades/caixas por pallet', tipo: 'numero', obrigatorio: false, categoria: 'Embalagem', exemplo: '40' },
  { campo: 'produto_peso_embalagem', label: 'Peso da Embalagem (kg)', descricao: 'Peso bruto da embalagem fechada', tipo: 'numero', obrigatorio: false, categoria: 'Embalagem', exemplo: '25' },
  // Estoque
  { campo: 'produto_estoque_atual', label: 'Estoque Atual', descricao: 'Quantidade disponível em estoque', tipo: 'tabela', obrigatorio: true, categoria: 'Estoque', tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['estoque'], exemplo: '500' },
  { campo: 'produto_estoque_reservado', label: 'Estoque Reservado', descricao: 'Quantidade reservada em pedidos', tipo: 'numero', obrigatorio: false, categoria: 'Estoque', exemplo: '50' },
  { campo: 'produto_estoque_minimo', label: 'Estoque Mínimo', descricao: 'Ponto de reposição', tipo: 'numero', obrigatorio: false, categoria: 'Estoque', exemplo: '100' },
  { campo: 'produto_estoque_maximo', label: 'Estoque Máximo', descricao: 'Limite máximo de estoque', tipo: 'numero', obrigatorio: false, categoria: 'Estoque', exemplo: '2000' },
  { campo: 'produto_localizacao', label: 'Localização no Estoque', descricao: 'Rua, prateleira, posição', tipo: 'texto', obrigatorio: false, categoria: 'Estoque', exemplo: 'Rua A - Prat. 3 - Pos. 12' },
  { campo: 'produto_lote', label: 'Lote', descricao: 'Número do lote atual', tipo: 'texto', obrigatorio: false, categoria: 'Estoque', exemplo: 'LT-2025-0042' },
  { campo: 'produto_validade', label: 'Data de Validade', descricao: 'Data de validade (se aplicável)', tipo: 'texto', obrigatorio: false, categoria: 'Estoque' },
  // Preços
  { campo: 'produto_preco_custo', label: 'Preço de Custo (R$)', descricao: 'Custo de aquisição', tipo: 'numero', obrigatorio: false, categoria: 'Preços', exemplo: '15.00' },
  { campo: 'produto_preco_venda', label: 'Preço de Venda (R$)', descricao: 'Preço de tabela', tipo: 'tabela', obrigatorio: true, categoria: 'Preços', tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['preco_tabela'], exemplo: '29.90' },
  { campo: 'produto_preco_minimo', label: 'Preço Mínimo (R$)', descricao: 'Preço mínimo autorizado', tipo: 'tabela', obrigatorio: false, categoria: 'Preços', tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['preco_minimo'], exemplo: '22.00' },
  // Status
  { campo: 'produto_ativo', label: 'Produto Ativo', descricao: 'Se o produto está ativo para venda', tipo: 'tabela', obrigatorio: false, categoria: 'Status', tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['ativo'] },
  { campo: 'produto_condicao', label: 'Condição', descricao: 'Novo, usado, recondicionado', tipo: 'tabela', obrigatorio: false, categoria: 'Status', tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['condicao'], exemplo: 'Novo' },
  { campo: 'produto_garantia', label: 'Garantia', descricao: 'Prazo de garantia', tipo: 'tabela', obrigatorio: false, categoria: 'Status', tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['garantia'], exemplo: '12 meses' },
];

// ========== AGENTE CADASTRO DE CLIENTES ==========
const cadastroClientesCampos: AgentDataField[] = [
  { campo: 'cliente_nome', label: 'Nome/Razão Social', descricao: 'Nome do cliente ou razão social', tipo: 'tabela', obrigatorio: true, categoria: 'Dados Básicos', tabelas_sistema_sugeridas: ['customers', 'empresas'], colunas_sugeridas: ['nome', 'nome_fantasia'] },
  { campo: 'cliente_cnpj_cpf', label: 'CNPJ/CPF', descricao: 'Documento fiscal', tipo: 'tabela', obrigatorio: false, categoria: 'Dados Básicos', tabelas_sistema_sugeridas: ['empresas'], colunas_sugeridas: ['cnpj'] },
  { campo: 'cliente_email', label: 'E-mail', descricao: 'E-mail principal', tipo: 'tabela', obrigatorio: false, categoria: 'Contato', tabelas_sistema_sugeridas: ['customers', 'empresas'], colunas_sugeridas: ['email'] },
  { campo: 'cliente_telefone', label: 'Telefone', descricao: 'Telefone principal', tipo: 'tabela', obrigatorio: false, categoria: 'Contato', tabelas_sistema_sugeridas: ['customers', 'empresas'], colunas_sugeridas: ['telefone'] },
  { campo: 'cliente_endereco', label: 'Endereço', descricao: 'Endereço completo', tipo: 'tabela', obrigatorio: false, categoria: 'Endereço', tabelas_sistema_sugeridas: ['empresas'], colunas_sugeridas: ['endereco', 'bairro', 'cidade', 'estado', 'cep'] },
  { campo: 'cliente_tipo', label: 'Tipo de Cliente', descricao: 'PF, PJ, MEI, etc.', tipo: 'tabela', obrigatorio: false, categoria: 'Classificação', tabelas_sistema_sugeridas: ['empresas'], colunas_sugeridas: ['tipo_cliente'] },
  { campo: 'cliente_segmento', label: 'Segmento', descricao: 'Segmento de atuação', tipo: 'tabela', obrigatorio: false, categoria: 'Classificação', tabelas_sistema_sugeridas: ['empresas'], colunas_sugeridas: ['cnae_descricao', 'segmento_id'] },
  { campo: 'cliente_tags', label: 'Tags/Categorias', descricao: 'Tags para classificação', tipo: 'tabela', obrigatorio: false, categoria: 'Classificação', tabelas_sistema_sugeridas: ['customers'], colunas_sugeridas: ['tags'] },
];

// ========== AGENTE TABELA DE PREÇOS ==========
const tabelaPrecosCampos: AgentDataField[] = [
  { campo: 'tabela_nome', label: 'Nome da Tabela', descricao: 'Identificação da tabela de preço', tipo: 'texto', obrigatorio: true, categoria: 'Tabela' },
  { campo: 'tabela_produto', label: 'Produto', descricao: 'Produto vinculado', tipo: 'tabela', obrigatorio: true, categoria: 'Preços', tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['nome', 'codigo'] },
  { campo: 'tabela_preco_tabela', label: 'Preço de Tabela (R$)', descricao: 'Preço base da tabela', tipo: 'tabela', obrigatorio: true, categoria: 'Preços', tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['preco_tabela'] },
  { campo: 'tabela_preco_minimo', label: 'Preço Mínimo (R$)', descricao: 'Preço mínimo autorizado', tipo: 'tabela', obrigatorio: false, categoria: 'Preços', tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['preco_minimo'] },
  { campo: 'tabela_desconto_max', label: 'Desconto Máximo (%)', descricao: 'Percentual máximo de desconto', tipo: 'numero', obrigatorio: false, categoria: 'Regras' },
  { campo: 'tabela_vigencia', label: 'Vigência', descricao: 'Período de validade da tabela', tipo: 'texto', obrigatorio: false, categoria: 'Regras' },
  { campo: 'tabela_condicoes', label: 'Condições Especiais', descricao: 'Condições por volume, cliente, etc.', tipo: 'texto', obrigatorio: false, categoria: 'Regras' },
];

// ========== AGENTE GESTÃO DE ESTOQUE ==========
const gestaoEstoqueCampos: AgentDataField[] = [
  { campo: 'estoque_produto', label: 'Produto', descricao: 'Produto em estoque', tipo: 'tabela', obrigatorio: true, categoria: 'Identificação', tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['nome', 'codigo'] },
  { campo: 'estoque_atual', label: 'Quantidade Atual', descricao: 'Estoque disponível', tipo: 'tabela', obrigatorio: true, categoria: 'Quantidades', tabelas_sistema_sugeridas: ['produtos'], colunas_sugeridas: ['estoque'] },
  { campo: 'estoque_reservado', label: 'Reservado', descricao: 'Quantidade reservada em pedidos', tipo: 'numero', obrigatorio: false, categoria: 'Quantidades' },
  { campo: 'estoque_minimo', label: 'Estoque Mínimo', descricao: 'Ponto de reposição', tipo: 'numero', obrigatorio: false, categoria: 'Parâmetros' },
  { campo: 'estoque_maximo', label: 'Estoque Máximo', descricao: 'Limite máximo', tipo: 'numero', obrigatorio: false, categoria: 'Parâmetros' },
  { campo: 'estoque_localizacao', label: 'Localização', descricao: 'Rua, prateleira, posição', tipo: 'texto', obrigatorio: false, categoria: 'Armazém' },
  { campo: 'estoque_lote', label: 'Lote', descricao: 'Número do lote', tipo: 'texto', obrigatorio: false, categoria: 'Rastreabilidade' },
  { campo: 'estoque_validade', label: 'Data de Validade', descricao: 'Validade do lote', tipo: 'texto', obrigatorio: false, categoria: 'Rastreabilidade' },
  { campo: 'estoque_tipo_embalagem', label: 'Tipo Embalagem', descricao: 'Pallet, caixa, pacote, bobina', tipo: 'tabela', obrigatorio: false, categoria: 'Embalagem', tabelas_sistema_sugeridas: ['produtos_importados'], colunas_sugeridas: ['embalagem'] },
];

export const AGENT_DATA_REQUIREMENTS: AgentDataRequirement[] = [
  { template_key: 'orquestrador', nome: 'Orquestrador de Vendas', icone: '🧠', campos: orquestradorCampos },
  { template_key: 'comercial', nome: 'Agente Comercial', icone: '💼', campos: comercialCampos },
  { template_key: 'inteligencia_cliente', nome: 'Agente Inteligência do Cliente', icone: '📊', campos: inteligenciaClienteCampos },
  { template_key: 'recompra', nome: 'Agente Recompra', icone: '🔄', campos: recompraCampos },
  { template_key: 'mix_crosssell', nome: 'Agente Mix e Cross-sell', icone: '🎯', campos: mixCrosssellCampos },
  { template_key: 'financeiro', nome: 'Agente Financeiro', icone: '💰', campos: financeiroCampos },
  { template_key: 'logistico', nome: 'Agente Logístico', icone: '🚛', campos: logisticoCampos },
  { template_key: 'margem', nome: 'Agente Margem e Estratégia', icone: '📈', campos: margemCampos },
  { template_key: 'objecoes', nome: 'Agente Objeções', icone: '🛡️', campos: objecoesCampos },
  { template_key: 'tecnico', nome: 'Agente Técnico', icone: '🔧', campos: tecnicoCampos },
  { template_key: 'excecoes', nome: 'Agente Exceções', icone: '⚠️', campos: excecoesCampos },
  { template_key: 'performance', nome: 'Agente Performance', icone: '🏆', campos: performanceCampos },
  { template_key: 'pos_venda', nome: 'Agente Pós-Venda', icone: '📦', campos: posVendaCampos },
  { template_key: 'satisfacao', nome: 'Agente Satisfação', icone: '⭐', campos: satisfacaoCampos },
  { template_key: 'cadastro_produtos', nome: 'Agente Cadastro de Produtos e Estoque', icone: '📋', campos: cadastroProdutosCampos },
  { template_key: 'cadastro_clientes', nome: 'Agente Cadastro de Clientes', icone: '👥', campos: cadastroClientesCampos },
  { template_key: 'tabela_precos', nome: 'Agente Tabela de Preços', icone: '💲', campos: tabelaPrecosCampos },
  { template_key: 'gestao_estoque', nome: 'Agente Gestão de Estoque', icone: '📦', campos: gestaoEstoqueCampos },
];

// Tabelas disponíveis do sistema para mapeamento (baseado nas colunas reais do banco)
export const SYSTEM_TABLES = [
  { value: 'produtos', label: 'Produtos', colunas: ['id', 'nome', 'codigo', 'descricao', 'marca', 'estoque', 'preco_tabela', 'preco_minimo', 'tipo_preco', 'preco_ativo', 'ncm', 'ean_13', 'peso_unitario', 'largura', 'comprimento', 'altura', 'cor', 'tamanho', 'material', 'condicao', 'origem', 'garantia', 'ativo'] },
  { value: 'produtos_importados', label: 'Produtos Importados', colunas: ['id', 'nome', 'quantidade', 'gramatura', 'largura', 'comprimento', 'tipo', 'embalagem', 'numero_folhas', 'diametro', 'obs'] },
  { value: 'produto_campos_customizados', label: 'Campos Customizados (por grupo)', colunas: ['id', 'grupo_id', 'campo_key', 'label', 'tipo', 'opcoes', 'obrigatorio', 'ordem', 'ativo'] },
  { value: 'produto_grupos', label: 'Grupos de Produtos', colunas: ['id', 'nome', 'descricao'] },
  { value: 'customers', label: 'Clientes/Contatos', colunas: ['id', 'nome', 'telefone', 'email', 'tags', 'tipo_operador', 'tel', 'empresa_id'] },
  { value: 'empresas', label: 'Empresas', colunas: ['id', 'nome', 'nome_fantasia', 'cnpj', 'tipo_cliente', 'email', 'telefone', 'endereco', 'bairro', 'cidade', 'estado', 'cep', 'latitude', 'longitude', 'cnae_principal', 'cnae_descricao', 'segmento_id'] },
  { value: 'orcamentos', label: 'Orçamentos', colunas: ['id', 'cliente_id', 'empresa_id', 'vendedor_id', 'unidade_id', 'condicao_pagamento_id', 'etapa', 'status', 'valor_total', 'valor_desconto', 'percentual_desconto', 'observacoes', 'motivo_perda', 'origem', 'data_envio', 'created_at'] },
  { value: 'orcamento_itens', label: 'Itens do Orçamento', colunas: ['id', 'orcamento_id', 'produto_id', 'quantidade', 'preco_unitario', 'preco_original', 'desconto', 'subtotal'] },
  { value: 'pedidos_ecommerce', label: 'Pedidos E-commerce', colunas: ['id', 'numero_pedido', 'status', 'nome_cliente', 'email_cliente', 'telefone_cliente', 'cpf_cliente', 'cnpj_cliente', 'razao_social', 'tipo_cliente', 'endereco_cidade', 'endereco_estado', 'tipo_pagamento_nome', 'condicao_pagamento_nome', 'subtotal', 'desconto', 'frete', 'valor_total', 'created_at'] },
  { value: 'pedidos_ecommerce_itens', label: 'Itens Pedido E-commerce', colunas: ['id', 'pedido_id', 'produto_id', 'nome_produto', 'quantidade', 'preco_unitario', 'subtotal'] },
  { value: 'agent_cross_sell_rules', label: 'Regras Cross-sell', colunas: ['id', 'produto_origem', 'produto_sugerido', 'tipo', 'motivo', 'prioridade', 'ativo'] },
  { value: 'agent_objections', label: 'Objeções', colunas: ['id', 'categoria', 'objecao', 'resposta_sugerida', 'gatilhos_mentais', 'argumentos', 'eficacia_percentual', 'vezes_usada', 'ativo'] },
  { value: 'usuarios', label: 'Usuários/Vendedores', colunas: ['id', 'nome', 'email', 'whatsapp', 'ramal'] },
  { value: 'customer_segmentos', label: 'Segmentos de Clientes', colunas: ['id', 'customer_id', 'segmento_id'] },
  { value: 'pesquisas_respostas', label: 'Respostas de Pesquisas', colunas: ['id', 'pesquisa_id', 'customer_id', 'atendente_id', 'nota', 'comentario', 'classificacao', 'canal', 'enviada_em', 'respondida_em', 'tempo_resposta_segundos'] },
  { value: 'condicoes_pagamento', label: 'Condições de Pagamento', colunas: ['id', 'nome', 'descricao', 'valor_minimo', 'valor_maximo', 'tipo_pagamento_id', 'ativo'] },
  { value: 'tipos_pagamento', label: 'Tipos/Formas de Pagamento', colunas: ['id', 'nome', 'taxa_percentual', 'ativo'] },
];
