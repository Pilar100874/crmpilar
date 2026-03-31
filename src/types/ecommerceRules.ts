// Types for E-commerce Rules Workflow Builder

export type EcommerceRuleBlockType =
  // Sistema
  | "inicio_regra"
  // Condições - Carrinho
  | "condicao_valor_carrinho"
  | "condicao_quantidade_itens"
  | "condicao_produto_especifico"
  | "condicao_categoria_produto"
  | "condicao_grupo_produto"
  // Condições - Cliente
  | "condicao_tipo_cliente"
  | "condicao_cliente_especifico"
  | "condicao_primeira_compra"
  | "condicao_cliente_recorrente"
  | "condicao_regiao_entrega"
  // Condições - Temporal
  | "condicao_periodo"
  | "condicao_dia_semana"
  | "condicao_horario"
  // Condições - Cupom
  | "condicao_cupom"
  // Lógica
  | "logica_e"
  | "logica_ou"
  // Ações - Desconto
  | "acao_desconto_percentual"
  | "acao_desconto_fixo"
  | "acao_desconto_progressivo"
  | "acao_compre_x_leve_y"
  // Ações - Frete
  | "acao_frete_gratis"
  | "acao_desconto_frete"
  | "acao_frete_fixo"
  // Ações - Brinde/Propaganda
  | "acao_brinde"
  | "acao_banner_promocional"
  | "acao_popup_promocional"
  | "acao_destaque_vitrine"
  | "acao_mensagem_carrinho"
  // Ações - Pagamento
  | "acao_parcelas_extras"
  | "acao_desconto_pix"
  | "acao_desconto_boleto"
  | "acao_regra_pagamento";

export interface EcommerceBlockDefinition {
  type: EcommerceRuleBlockType;
  label: string;
  description: string;
  icon: string;
  color: string;
  category: "sistema" | "condicao_carrinho" | "condicao_cliente" | "condicao_temporal" | "condicao_cupom" | "logica" | "acao_desconto" | "acao_frete" | "acao_propaganda" | "acao_pagamento";
  defaultData?: Record<string, any>;
}

export const ECOMMERCE_RULE_BLOCKS: EcommerceBlockDefinition[] = [
  // ─── Sistema ────────────────────────────────────────────────
  {
    type: "inicio_regra",
    label: "Iniciar Regra",
    description: "Ponto inicial da regra de e-commerce",
    icon: "Play",
    color: "#10b981",
    category: "sistema",
  },

  // ─── Condições - Carrinho ───────────────────────────────────
  {
    type: "condicao_valor_carrinho",
    label: "Valor do Carrinho",
    description: "Verifica o valor total do carrinho",
    icon: "ShoppingCart",
    color: "#3b82f6",
    category: "condicao_carrinho",
    defaultData: { operador: ">", valor: 100 },
  },
  {
    type: "condicao_quantidade_itens",
    label: "Quantidade de Itens",
    description: "Verifica quantidade de itens no carrinho",
    icon: "Hash",
    color: "#3b82f6",
    category: "condicao_carrinho",
    defaultData: { operador: ">=", valor: 3 },
  },
  {
    type: "condicao_produto_especifico",
    label: "Produto Específico",
    description: "Verifica se um produto está no carrinho",
    icon: "Package",
    color: "#3b82f6",
    category: "condicao_carrinho",
    defaultData: { produtoId: "", produtoNome: "" },
  },
  {
    type: "condicao_categoria_produto",
    label: "Categoria de Produto",
    description: "Verifica se itens de uma categoria estão no carrinho",
    icon: "Layers",
    color: "#3b82f6",
    category: "condicao_carrinho",
    defaultData: { categoriaId: "", categoriaNome: "" },
  },
  {
    type: "condicao_grupo_produto",
    label: "Grupo de Produto",
    description: "Verifica se itens de um grupo estão no carrinho",
    icon: "FolderOpen",
    color: "#3b82f6",
    category: "condicao_carrinho",
    defaultData: { grupoId: "", grupoNome: "" },
  },

  // ─── Condições - Cliente ────────────────────────────────────
  {
    type: "condicao_tipo_cliente",
    label: "Tipo de Cliente",
    description: "Verifica se é B2B ou B2C",
    icon: "Users",
    color: "#8b5cf6",
    category: "condicao_cliente",
    defaultData: { tipo: "b2c" },
  },
  {
    type: "condicao_cliente_especifico",
    label: "Cliente Específico",
    description: "Aplica regra para um cliente selecionado",
    icon: "UserCheck",
    color: "#8b5cf6",
    category: "condicao_cliente",
    defaultData: { clienteId: "", clienteNome: "", clienteTipo: "" },
  },
  {
    type: "condicao_primeira_compra",
    label: "Primeira Compra",
    description: "Verifica se é a primeira compra do cliente",
    icon: "Star",
    color: "#8b5cf6",
    category: "condicao_cliente",
  },
  {
    type: "condicao_cliente_recorrente",
    label: "Cliente Recorrente",
    description: "Verifica se o cliente já comprou X vezes",
    icon: "RefreshCw",
    color: "#8b5cf6",
    category: "condicao_cliente",
    defaultData: { minCompras: 3 },
  },
  {
    type: "condicao_regiao_entrega",
    label: "Região de Entrega",
    description: "Verifica a região/UF de entrega",
    icon: "MapPin",
    color: "#8b5cf6",
    category: "condicao_cliente",
    defaultData: { ufs: [], ceps: "" },
  },

  // ─── Condições - Temporal ───────────────────────────────────
  {
    type: "condicao_periodo",
    label: "Período Específico",
    description: "Ativa a regra em um período de datas",
    icon: "Calendar",
    color: "#ec4899",
    category: "condicao_temporal",
    defaultData: { dataInicio: "", dataFim: "" },
  },
  {
    type: "condicao_dia_semana",
    label: "Dia da Semana",
    description: "Ativa em dias específicos da semana",
    icon: "CalendarDays",
    color: "#ec4899",
    category: "condicao_temporal",
    defaultData: { dias: [] },
  },
  {
    type: "condicao_horario",
    label: "Faixa de Horário",
    description: "Ativa em um horário específico (Happy Hour, Flash Sale)",
    icon: "Clock",
    color: "#ec4899",
    category: "condicao_temporal",
    defaultData: { horaInicio: "18:00", horaFim: "23:59" },
  },

  // ─── Condição - Cupom ───────────────────────────────────────
  {
    type: "condicao_cupom",
    label: "Cupom de Desconto",
    description: "Verifica se um cupom válido foi aplicado",
    icon: "Ticket",
    color: "#f59e0b",
    category: "condicao_cupom",
    defaultData: { cupomId: "", codigo: "" },
  },

  // ─── Lógica ─────────────────────────────────────────────────
  {
    type: "logica_e",
    label: "Operador E (AND)",
    description: "Todas as condições anteriores devem ser verdadeiras",
    icon: "Grid2x2",
    color: "#6366f1",
    category: "logica",
  },
  {
    type: "logica_ou",
    label: "Operador OU (OR)",
    description: "Pelo menos uma condição deve ser verdadeira",
    icon: "Rows3",
    color: "#a855f7",
    category: "logica",
  },

  // ─── Ações - Desconto ───────────────────────────────────────
  {
    type: "acao_desconto_percentual",
    label: "Desconto Percentual",
    description: "Aplica desconto em % no carrinho ou itens",
    icon: "Percent",
    color: "#10b981",
    category: "acao_desconto",
    defaultData: { percentual: 10, aplicarEm: "carrinho" },
  },
  {
    type: "acao_desconto_fixo",
    label: "Desconto Fixo (R$)",
    description: "Aplica desconto fixo em reais",
    icon: "DollarSign",
    color: "#10b981",
    category: "acao_desconto",
    defaultData: { valor: 20 },
  },
  {
    type: "acao_desconto_progressivo",
    label: "Desconto Progressivo",
    description: "Desconto aumenta com quantidade (1un=5%, 3un=10%, 5un=15%)",
    icon: "TrendingUp",
    color: "#10b981",
    category: "acao_desconto",
    defaultData: {
      faixas: [
        { quantidade: 1, percentual: 5 },
        { quantidade: 3, percentual: 10 },
        { quantidade: 5, percentual: 15 },
      ],
    },
  },
  {
    type: "acao_compre_x_leve_y",
    label: "Compre X Leve Y",
    description: "Compre X itens e leve Y (ex: Compre 2 Leve 3)",
    icon: "Gift",
    color: "#10b981",
    category: "acao_desconto",
    defaultData: { compre: 2, leve: 3 },
  },

  // ─── Ações - Frete ──────────────────────────────────────────
  {
    type: "acao_frete_gratis",
    label: "Frete Grátis",
    description: "Concede frete grátis ao pedido",
    icon: "Truck",
    color: "#06b6d4",
    category: "acao_frete",
    defaultData: { regioes: "todas" },
  },
  {
    type: "acao_desconto_frete",
    label: "Desconto no Frete",
    description: "Aplica desconto percentual no frete",
    icon: "BadgePercent",
    color: "#06b6d4",
    category: "acao_frete",
    defaultData: { percentual: 50 },
  },
  {
    type: "acao_frete_fixo",
    label: "Frete Fixo",
    description: "Define um valor fixo de frete",
    icon: "Tag",
    color: "#06b6d4",
    category: "acao_frete",
    defaultData: { valor: 9.90 },
  },

  // ─── Ações - Propaganda/Visual ──────────────────────────────
  {
    type: "acao_banner_promocional",
    label: "Exibir Banner",
    description: "Mostra um banner promocional na loja",
    icon: "Image",
    color: "#f59e0b",
    category: "acao_propaganda",
    defaultData: { titulo: "", imagem: "", link: "", posicao: "topo" },
  },
  {
    type: "acao_popup_promocional",
    label: "Popup Promocional",
    description: "Exibe popup de promoção ao acessar a loja",
    icon: "MessageSquare",
    color: "#f59e0b",
    category: "acao_propaganda",
    defaultData: { titulo: "", mensagem: "", botaoTexto: "Aproveitar!", delay: 3 },
  },
  {
    type: "acao_destaque_vitrine",
    label: "Destaque na Vitrine",
    description: "Destaca produtos específicos na home",
    icon: "Sparkles",
    color: "#f59e0b",
    category: "acao_propaganda",
    defaultData: { titulo: "Oferta Especial", produtos: [] },
  },
  {
    type: "acao_mensagem_carrinho",
    label: "Mensagem no Carrinho",
    description: "Exibe mensagem persuasiva no carrinho",
    icon: "MessageCircle",
    color: "#f59e0b",
    category: "acao_propaganda",
    defaultData: { mensagem: "Falta apenas R$ {valor} para frete grátis!" },
  },
  {
    type: "acao_brinde",
    label: "Brinde / Amostra Grátis",
    description: "Adiciona um brinde ao pedido",
    icon: "Gift",
    color: "#f59e0b",
    category: "acao_propaganda",
    defaultData: { produtoId: "", produtoNome: "", quantidade: 1 },
  },

  // ─── Ações - Pagamento ──────────────────────────────────────
  {
    type: "acao_parcelas_extras",
    label: "Parcelas Extras",
    description: "Oferece parcelas extras sem juros",
    icon: "CreditCard",
    color: "#ef4444",
    category: "acao_pagamento",
    defaultData: { maxParcelas: 12, semJuros: true },
  },
  {
    type: "acao_desconto_pix",
    label: "Desconto no Pix",
    description: "Desconto especial para pagamentos via Pix",
    icon: "QrCode",
    color: "#ef4444",
    category: "acao_pagamento",
    defaultData: { percentual: 5 },
  },
  {
    type: "acao_desconto_boleto",
    label: "Desconto no Boleto",
    description: "Desconto especial para pagamentos via boleto",
    icon: "FileText",
    color: "#ef4444",
    category: "acao_pagamento",
    defaultData: { percentual: 3 },
  },
];

export interface EcommerceRuleNode {
  id: string;
  type: "custom";
  position: { x: number; y: number };
  data: {
    type: EcommerceRuleBlockType;
    label: string;
    config: Record<string, any>;
    onDelete?: (id: string) => void;
    onDuplicate?: (id: string) => void;
    onAddNote?: (id: string) => void;
    note?: string;
  };
}

export interface EcommerceRuleEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  type?: string;
}

export interface EcommerceRuleFlowData {
  nodes: EcommerceRuleNode[];
  edges: EcommerceRuleEdge[];
}
