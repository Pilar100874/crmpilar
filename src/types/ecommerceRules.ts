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
  // Condicionais com múltiplas saídas
  | "condicao_valor_pedido"
  // Gatilhos de comportamento (mapa de calor)
  | "gatilho_tempo_em_tela"
  | "gatilho_carrinho_abandonado"
  // Gatilhos de comportamento por usuário (tempo real)
  | "gatilho_visitou_pagina"
  | "gatilho_tempo_na_pagina"
  | "gatilho_intencao_saida"
  | "gatilho_scroll_profundo"
  | "gatilho_inatividade"
  | "gatilho_rage_click"
  | "gatilho_dead_click"
  | "gatilho_clique_elemento"
  | "gatilho_visualizou_produto_vezes"
  | "gatilho_retorno_visitante"
  // Ações de recuperação
  | "acao_enviar_lembrete_carrinho"
  // Ações em tempo real para o visitante ativo
  | "acao_popup_personalizado"
  | "acao_oferecer_cupom_instantaneo"
  | "acao_chat_proativo"
  | "acao_notificacao_navegador"
  | "acao_destacar_elemento"
  | "acao_enviar_sms"
  | "acao_disparar_push"
  | "acao_webhook"
  | "acao_email"
  | "acao_whatsapp"
  | "acao_mensagem_interna"
  | "acao_aviso_sistema"
  | "return_response";


export interface EcommerceBlockDefinition {
  type: EcommerceRuleBlockType;
  label: string;
  description: string;
  icon: string;
  color: string;
  category: "sistema" | "condicao_carrinho" | "condicao_cliente" | "condicao_temporal" | "condicao_cupom" | "logica" | "acao_desconto" | "acao_frete" | "acao_propaganda" | "acao_pagamento" | "gatilho_comportamento" | "acao_recuperacao" | "retorno";
  defaultData?: Record<string, any>;
}

export const ECOMMERCE_RULE_BLOCKS: EcommerceBlockDefinition[] = [
  // ─── Sistema ────────────────────────────────────────────────
  {
    type: "inicio_regra",
    label: "Início",
    description: "Ponto de partida da regra — todo fluxo começa aqui",
    icon: "Play",
    color: "#10b981",
    category: "sistema",
  },

  // ─── Condições - Carrinho ───────────────────────────────────
  {
    type: "condicao_valor_carrinho",
    label: "SE valor do carrinho",
    description: "Dispara quando o subtotal atinge um valor mínimo, máximo ou intervalo",
    icon: "ShoppingCart",
    color: "#3b82f6",
    category: "condicao_carrinho",
    defaultData: { operador: ">", valor: 100 },
  },
  {
    type: "condicao_quantidade_itens",
    label: "SE quantidade de itens",
    description: "Dispara conforme a quantidade total de produtos no carrinho",
    icon: "Hash",
    color: "#3b82f6",
    category: "condicao_carrinho",
    defaultData: { operador: ">=", valor: 3 },
  },
  {
    type: "condicao_produto_especifico",
    label: "SE contém produto",
    description: "Dispara quando um produto específico está no carrinho",
    icon: "Package",
    color: "#3b82f6",
    category: "condicao_carrinho",
    defaultData: { produtoId: "", produtoNome: "" },
  },
  {
    type: "condicao_categoria_produto",
    label: "SE contém categoria",
    description: "Dispara quando há itens de uma categoria específica no carrinho",
    icon: "Layers",
    color: "#3b82f6",
    category: "condicao_carrinho",
    defaultData: { categoriaId: "", categoriaNome: "" },
  },
  {
    type: "condicao_grupo_produto",
    label: "SE contém grupo",
    description: "Dispara quando há itens de um grupo de produtos no carrinho",
    icon: "FolderOpen",
    color: "#3b82f6",
    category: "condicao_carrinho",
    defaultData: { grupoId: "", grupoNome: "" },
  },

  // ─── Condições - Cliente ────────────────────────────────────
  {
    type: "condicao_tipo_cliente",
    label: "SE tipo de cliente",
    description: "Aplica somente para clientes B2B (atacado) ou B2C (varejo)",
    icon: "Users",
    color: "#8b5cf6",
    category: "condicao_cliente",
    defaultData: { tipo: "b2c" },
  },
  {
    type: "condicao_cliente_especifico",
    label: "SE cliente é",
    description: "Aplica apenas para um cliente específico selecionado",
    icon: "UserCheck",
    color: "#8b5cf6",
    category: "condicao_cliente",
    defaultData: { clienteId: "", clienteNome: "", clienteTipo: "" },
  },
  {
    type: "condicao_primeira_compra",
    label: "SE primeira compra",
    description: "Aplica somente quando for a primeira compra do cliente",
    icon: "Star",
    color: "#8b5cf6",
    category: "condicao_cliente",
  },
  {
    type: "condicao_cliente_recorrente",
    label: "SE cliente recorrente",
    description: "Aplica quando o cliente já fez um número mínimo de compras",
    icon: "RefreshCw",
    color: "#8b5cf6",
    category: "condicao_cliente",
    defaultData: { minCompras: 3 },
  },
  {
    type: "condicao_regiao_entrega",
    label: "SE região de entrega",
    description: "Aplica conforme UF ou faixa de CEP do endereço de entrega",
    icon: "MapPin",
    color: "#8b5cf6",
    category: "condicao_cliente",
    defaultData: { ufs: [], ceps: "" },
  },

  // ─── Condições - Temporal ───────────────────────────────────
  {
    type: "condicao_periodo",
    label: "SE período (datas)",
    description: "Ativa a regra somente entre uma data inicial e uma final",
    icon: "Calendar",
    color: "#ec4899",
    category: "condicao_temporal",
    defaultData: { dataInicio: "", dataFim: "" },
  },
  {
    type: "condicao_dia_semana",
    label: "SE dia da semana",
    description: "Ativa apenas em dias selecionados da semana",
    icon: "CalendarDays",
    color: "#ec4899",
    category: "condicao_temporal",
    defaultData: { dias: [] },
  },
  {
    type: "condicao_horario",
    label: "SE horário",
    description: "Ativa em um intervalo de horas (ex.: Happy Hour, Flash Sale)",
    icon: "Clock",
    color: "#ec4899",
    category: "condicao_temporal",
    defaultData: { horaInicio: "18:00", horaFim: "23:59" },
  },

  // ─── Condição - Cupom ───────────────────────────────────────
  {
    type: "condicao_cupom",
    label: "SE cupom aplicado",
    description: "Dispara quando um cupom de desconto válido for inserido",
    icon: "Ticket",
    color: "#f59e0b",
    category: "condicao_cupom",
    defaultData: { cupomId: "", codigo: "" },
  },

  // ─── Lógica ─────────────────────────────────────────────────
  {
    type: "logica_e",
    label: "E (todas verdadeiras)",
    description: "Avança somente se TODAS as condições conectadas forem verdadeiras",
    icon: "Grid2x2",
    color: "#6366f1",
    category: "logica",
  },
  {
    type: "logica_ou",
    label: "OU (qualquer uma)",
    description: "Avança se PELO MENOS UMA das condições conectadas for verdadeira",
    icon: "Rows3",
    color: "#a855f7",
    category: "logica",
  },

  // ─── Ações - Desconto ───────────────────────────────────────
  {
    type: "acao_desconto_percentual",
    label: "Aplicar desconto %",
    description: "Aplica um desconto percentual sobre o carrinho ou itens selecionados",
    icon: "Percent",
    color: "#10b981",
    category: "acao_desconto",
    defaultData: { percentual: 10, aplicarEm: "carrinho" },
  },
  {
    type: "acao_desconto_fixo",
    label: "Aplicar desconto R$",
    description: "Desconta um valor fixo em reais do total do pedido",
    icon: "DollarSign",
    color: "#10b981",
    category: "acao_desconto",
    defaultData: { valor: 20 },
  },
  {
    type: "acao_desconto_progressivo",
    label: "Desconto progressivo",
    description: "Aumenta o desconto conforme a quantidade (ex.: 1un=5%, 3un=10%, 5un=15%)",
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
    label: "Compre X, leve Y",
    description: "Promoção do tipo leve mais pagando menos (ex.: Compre 2, Leve 3)",
    icon: "Gift",
    color: "#10b981",
    category: "acao_desconto",
    defaultData: { compre: 2, leve: 3 },
  },

  // ─── Ações - Frete ──────────────────────────────────────────
  {
    type: "acao_frete_gratis",
    label: "Liberar frete grátis",
    description: "Zera o valor do frete para o pedido",
    icon: "Truck",
    color: "#06b6d4",
    category: "acao_frete",
    defaultData: { regioes: "todas" },
  },
  {
    type: "acao_desconto_frete",
    label: "Desconto no frete",
    description: "Aplica um percentual de desconto sobre o valor do frete",
    icon: "BadgePercent",
    color: "#06b6d4",
    category: "acao_frete",
    defaultData: { percentual: 50 },
  },
  {
    type: "acao_frete_fixo",
    label: "Frete com valor fixo",
    description: "Define um valor fixo de frete, ignorando o cálculo padrão",
    icon: "Tag",
    color: "#06b6d4",
    category: "acao_frete",
    defaultData: { valor: 9.90 },
  },

  // ─── Ações - Propaganda/Visual ──────────────────────────────
  {
    type: "acao_banner_promocional",
    label: "Exibir banner",
    description: "Mostra um banner promocional em uma posição da loja",
    icon: "Image",
    color: "#f59e0b",
    category: "acao_propaganda",
    defaultData: { titulo: "", imagem: "", link: "", posicao: "topo" },
  },
  {
    type: "acao_popup_promocional",
    label: "Exibir popup",
    description: "Abre um popup promocional ao acessar a loja",
    icon: "MessageSquare",
    color: "#f59e0b",
    category: "acao_propaganda",
    defaultData: { titulo: "", mensagem: "", botaoTexto: "Aproveitar!", delay: 3 },
  },
  {
    type: "acao_destaque_vitrine",
    label: "Destacar na vitrine",
    description: "Coloca produtos selecionados em destaque na home da loja",
    icon: "Sparkles",
    color: "#f59e0b",
    category: "acao_propaganda",
    defaultData: { titulo: "Oferta Especial", produtos: [] },
  },
  {
    type: "acao_mensagem_carrinho",
    label: "Mensagem no carrinho",
    description: "Mostra uma mensagem persuasiva no carrinho (ex.: faltam R$ X para frete grátis)",
    icon: "MessageCircle",
    color: "#f59e0b",
    category: "acao_propaganda",
    defaultData: { mensagem: "Falta apenas R$ {valor} para frete grátis!" },
  },
  {
    type: "acao_brinde",
    label: "Adicionar brinde",
    description: "Inclui um brinde ou amostra grátis automaticamente no pedido",
    icon: "Gift",
    color: "#f59e0b",
    category: "acao_propaganda",
    defaultData: { produtoId: "", produtoNome: "", quantidade: 1 },
  },

  // ─── Ações - Pagamento ──────────────────────────────────────
  {
    type: "acao_parcelas_extras",
    label: "Parcelas sem juros",
    description: "Libera mais parcelas sem juros no cartão de crédito",
    icon: "CreditCard",
    color: "#ef4444",
    category: "acao_pagamento",
    defaultData: { maxParcelas: 12, semJuros: true },
  },
  {
    type: "acao_desconto_pix",
    label: "Desconto no Pix",
    description: "Aplica desconto exclusivo para pagamentos via Pix",
    icon: "QrCode",
    color: "#ef4444",
    category: "acao_pagamento",
    defaultData: { percentual: 5 },
  },
  {
    type: "acao_desconto_boleto",
    label: "Desconto no boleto",
    description: "Aplica desconto exclusivo para pagamentos via boleto",
    icon: "FileText",
    color: "#ef4444",
    category: "acao_pagamento",
    defaultData: { percentual: 3 },
  },
  // ─── Condicionais com múltiplas saídas ────────────────────────
  {
    type: "condicao_valor_pedido",
    label: "Dividir por faixa de valor",
    description: "Cria várias saídas, uma para cada faixa de valor do pedido",
    icon: "GitBranch",
    color: "#8b5cf6",
    category: "condicao_carrinho",
    defaultData: {
      faixas: [
        { valorMin: 0, valorMax: 500, label: "Até R$ 500" },
        { valorMin: 500, valorMax: null, label: "Acima de R$ 500" },
      ],
    },
  },

  // ─── Gatilhos de Comportamento (mapa de calor) ────────────────
  {
    type: "gatilho_tempo_em_tela",
    label: "Gatilho: tempo em tela",
    description: "Dispara quando um visitante (sistema ou loja) fica X minutos em uma tela específica",
    icon: "Timer",
    color: "#f97316",
    category: "gatilho_comportamento",
    defaultData: { escopo: "ecommerce", rota: "/ecommerce", tempoMinutos: 5 },
  },
  {
    type: "gatilho_carrinho_abandonado",
    label: "Gatilho: carrinho abandonado",
    description: "Dispara quando o carrinho fica X minutos sem checkout (com itens dentro)",
    icon: "ShoppingCart",
    color: "#f97316",
    category: "gatilho_comportamento",
    defaultData: { tempoMinutos: 30, valorMinimo: 0 },
  },

  // ─── Ações de Recuperação ─────────────────────────────────────
  {
    type: "acao_enviar_lembrete_carrinho",
    label: "Enviar lembrete de carrinho",
    description: "Envia mensagem (e-mail/WhatsApp) com link do carrinho para o cliente recuperar a compra",
    icon: "Mail",
    color: "#10b981",
    category: "acao_recuperacao",
    defaultData: { canal: "email", assunto: "Você esqueceu algo no seu carrinho!", mensagem: "Olá! Seus itens te esperam. Conclua sua compra agora." },
  },

  // ─── Gatilhos por usuário (tempo real / individual) ────────────
  {
    type: "gatilho_visitou_pagina",
    label: "Gatilho: visitou página",
    description: "Dispara para o visitante quando ele acessa uma rota/URL específica da loja",
    icon: "MousePointerClick",
    color: "#f97316",
    category: "gatilho_comportamento",
    defaultData: { rota: "/ecommerce" },
  },
  {
    type: "gatilho_tempo_na_pagina",
    label: "Gatilho: tempo na página (usuário)",
    description: "Dispara individualmente quando o visitante fica X segundos na página atual",
    icon: "Timer",
    color: "#f97316",
    category: "gatilho_comportamento",
    defaultData: { rota: "", segundos: 60 },
  },
  {
    type: "gatilho_intencao_saida",
    label: "Gatilho: intenção de saída",
    description: "Dispara quando o cursor do visitante sai pelo topo da janela (exit intent)",
    icon: "LogOut",
    color: "#f97316",
    category: "gatilho_comportamento",
    defaultData: { rota: "" },
  },
  {
    type: "gatilho_scroll_profundo",
    label: "Gatilho: scroll profundo",
    description: "Dispara quando o visitante rola além de X% da página",
    icon: "ArrowDownToLine",
    color: "#f97316",
    category: "gatilho_comportamento",
    defaultData: { rota: "", percentual: 70 },
  },
  {
    type: "gatilho_inatividade",
    label: "Gatilho: inatividade",
    description: "Dispara quando o visitante fica X segundos sem mover o mouse, clicar ou rolar",
    icon: "Pause",
    color: "#f97316",
    category: "gatilho_comportamento",
    defaultData: { segundos: 30 },
  },
  {
    type: "gatilho_rage_click",
    label: "Gatilho: rage click",
    description: "Dispara quando o visitante clica várias vezes seguidas no mesmo lugar (frustração)",
    icon: "MousePointer2",
    color: "#f97316",
    category: "gatilho_comportamento",
    defaultData: { cliquesMinimos: 4, janelaSegundos: 2 },
  },
  {
    type: "gatilho_dead_click",
    label: "Gatilho: dead click",
    description: "Dispara quando o visitante clica em um elemento que não responde (clique morto)",
    icon: "MouseOff",
    color: "#f97316",
    category: "gatilho_comportamento",
  },
  {
    type: "gatilho_clique_elemento",
    label: "Gatilho: clique em elemento",
    description: "Dispara quando o visitante clica em um elemento específico (CSS selector)",
    icon: "Crosshair",
    color: "#f97316",
    category: "gatilho_comportamento",
    defaultData: { seletor: "#botao-comprar" },
  },
  {
    type: "gatilho_visualizou_produto_vezes",
    label: "Gatilho: visualizou produto N vezes",
    description: "Dispara quando o visitante vê o mesmo produto N vezes na sessão (alto interesse)",
    icon: "Eye",
    color: "#f97316",
    category: "gatilho_comportamento",
    defaultData: { vezes: 3, produtoId: "", produtoNome: "" },
  },
  {
    type: "gatilho_retorno_visitante",
    label: "Gatilho: visitante recorrente",
    description: "Dispara quando o visitante volta à loja após X dias da última visita",
    icon: "Repeat",
    color: "#f97316",
    category: "gatilho_comportamento",
    defaultData: { diasMin: 1, diasMax: 30 },
  },

  // ─── Ações em tempo real para o visitante ativo ────────────────
  {
    type: "acao_popup_personalizado",
    label: "Mostrar popup ao visitante",
    description: "Exibe um popup personalizado em tempo real apenas para o visitante que disparou o gatilho",
    icon: "MessageSquare",
    color: "#10b981",
    category: "acao_recuperacao",
    defaultData: { titulo: "Espera!", mensagem: "Temos uma oferta especial para você.", botaoTexto: "Quero aproveitar", botaoLink: "" },
  },
  {
    type: "acao_oferecer_cupom_instantaneo",
    label: "Oferecer cupom na hora",
    description: "Gera/exibe um cupom de desconto válido por X minutos para o visitante atual",
    icon: "Ticket",
    color: "#10b981",
    category: "acao_recuperacao",
    defaultData: { codigo: "VOLTA10", percentual: 10, validadeMinutos: 15 },
  },
  {
    type: "acao_chat_proativo",
    label: "Abrir chat proativo",
    description: "Abre a janela de atendimento com uma mensagem pré-pronta para o visitante",
    icon: "MessagesSquare",
    color: "#10b981",
    category: "acao_recuperacao",
    defaultData: { mensagem: "Olá! Posso te ajudar a finalizar a compra?" },
  },
  {
    type: "acao_notificacao_navegador",
    label: "Notificação no navegador",
    description: "Envia uma notificação push no navegador do visitante (requer permissão)",
    icon: "Bell",
    color: "#10b981",
    category: "acao_recuperacao",
    defaultData: { titulo: "Oferta para você!", corpo: "Veja agora as condições especiais.", link: "" },
  },
  {
    type: "acao_destacar_elemento",
    label: "Destacar elemento na tela",
    description: "Pisca/destaca um elemento (CSS selector) para guiar a atenção do visitante",
    icon: "Sparkles",
    color: "#10b981",
    category: "acao_recuperacao",
    defaultData: { seletor: "#botao-comprar", duracaoSegundos: 5 },
  },
  {
    type: "return_response",
    label: "Retornar Resposta",
    description: "Devolve payload ao workflow chamador (modo síncrono) e encerra esta regra.",
    icon: "Reply",
    color: "#14b8a6",
    category: "retorno",
    defaultData: {
      status: "success",
      statusCode: 200,
      message: "Regra aplicada",
      payloadJson: "",
      includeAllVariables: false,
      stopFlow: true,
    },
  },
  {
    type: "acao_enviar_sms",
    label: "Enviar SMS",
    description: "Dispara SMS para um ou mais números via gateway",
    icon: "MessageSquareText",
    color: "#0284c7",
    category: "acao_recuperacao",
    defaultData: {
      phoneNumbers: [""],
      message: "",
      outputVariable: "envio_sms_status",
    },
  },
  {
    type: "acao_disparar_push",
    label: "Disparar Push",
    description: "Envia notificação push para usuário interno ou cliente",
    icon: "BellRing",
    color: "#f97316",
    category: "acao_recuperacao",
    defaultData: {
      destinatario_tipo: "todos_contatos",
      usuario_ids: [],
      contato_ids: [],
      titulo: "Oferta especial pra você",
      corpo: "",
      url: "/",
    },
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
