export type AutomacaoVendasBlockType =
  // Blocos de sistema
  | "inicio"
  | "iniciar_validacao"
  | "fim"
  // Blocos de condição
  | "condicao_valor"
  | "condicao_mes"
  | "condicao_quantidade"
  | "condicao_cliente_acumulado"
  | "desconto_valor_compra"
  | "desconto_quantidade_compras"
  | "desconto_produtos_grupo"
  | "desconto_pagamento_antecipado"
  | "desconto_aniversario_cliente"
  | "desconto_aniversario_empresa"
  | "desconto_data_especial"
  | "desconto_historico_crescimento"
  | "desconto_tempo_desde_ultimo"
  | "validar_empresa"
  | "validar_usuario"
  // Blocos de lógica
  | "logica_e"
  | "logica_ou"
  // Blocos de ação
  | "acao_desconto_percentual"
  | "acao_desconto_fixo"
  | "acao_adicionar_frete"
  | "acao_enviar_alerta"
  | "aplicar_desconto";

// Operadores de comparação
export type OperadorComparacao = ">" | ">=" | "=" | "<" | "<=" | "!=";

// Estrutura de uma condição
export interface Condicao {
  type: "comparison";
  field: string;
  operator: OperadorComparacao;
  value?: number | string;
  valueSource?: string;
}

// Estrutura de uma ação
export interface Acao {
  type: "applyPercentageDiscount" | "applyFixedDiscount" | "addShipping" | "sendAlert";
  value?: number;
  message?: string;
}

// Estrutura completa de uma regra de automação
export interface RegraAutomacao {
  id: string;
  name: string;
  trigger: "onBudgetCalculate";
  conditions: Condicao[];
  logic: "AND" | "OR";
  actions: Acao[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Dados do orçamento para aplicar regras
export interface DadosOrcamento {
  id: string;
  valor_total: number;
  quantidade_produtos: number;
  data_compra: Date;
  cliente: {
    id: string;
    nome: string;
    mes_aniversario: number;
    valor_acumulado_mes: number;
  };
  desconto_aplicado?: number;
  frete?: number;
  observacoes?: string;
}

// Resultado da aplicação de regras
export interface ResultadoAutomacao {
  regras_aplicadas: string[];
  desconto_total: number;
  frete_adicional: number;
  alertas: string[];
  valor_final: number;
}

export interface AutomacaoVendasNode {
  id: string;
  type: "custom";
  position: { x: number; y: number };
  data: {
    type: AutomacaoVendasBlockType;
    label: string;
    config: Record<string, any>;
    onDelete?: (id: string) => void;
    onDuplicate?: (id: string) => void;
    onAddNote?: (id: string) => void;
    note?: string;
  };
}

export interface AutomacaoVendasEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  type?: string;
}

export interface AutomacaoVendasFlowData {
  nodes: AutomacaoVendasNode[];
  edges: AutomacaoVendasEdge[];
}

export interface AutomacaoVendas {
  id: string;
  estabelecimento_id: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
  flow_data: AutomacaoVendasFlowData;
  prioridade: number;
  created_at: string;
  updated_at: string;
}

export interface BlockDefinition {
  type: AutomacaoVendasBlockType;
  label: string;
  description: string;
  icon: string;
  color: string;
  category: "condicao" | "acao" | "data" | "sistema";
  defaultData?: Record<string, any>;
}

export const AUTOMACAO_VENDAS_BLOCKS: BlockDefinition[] = [
  {
    type: "iniciar_validacao",
    label: "Iniciar Validação",
    description: "Ponto inicial da validação de automação",
    icon: "Play",
    color: "#10b981",
    category: "sistema",
  },
  {
    type: "desconto_valor_compra",
    label: "Desconto no Valor Total",
    description: "Aplica desconto percentual no valor total do orçamento",
    icon: "Percent",
    color: "#3b82f6",
    category: "acao",
    defaultData: {
      percentual: 5,
    },
  },
  {
    type: "desconto_quantidade_compras",
    label: "Desconto por Frequência",
    description: "Desconto para clientes que compraram várias vezes no período",
    icon: "Repeat2",
    color: "#8b5cf6",
    category: "condicao",
    defaultData: {
      quantidadeMinima: 3,
      periodoMeses: 1,
      percentual: 7,
    },
  },
  {
    type: "desconto_produtos_grupo",
    label: "Desconto por Grupo",
    description: "Desconto quando produtos do mesmo grupo atingem valor mínimo",
    icon: "Boxes",
    color: "#f59e0b",
    category: "condicao",
    defaultData: {
      grupoId: "",
      valorMinimo: 1000,
      percentualExtra: 5,
    },
  },
  {
    type: "desconto_pagamento_antecipado",
    label: "Desconto Pagamento Antecipado",
    description: "Desconto especial para pagamento antecipado",
    icon: "Zap",
    color: "#06b6d4",
    category: "condicao",
    defaultData: {
      percentual: 5,
      diasAntecipacao: 7,
    },
  },
  {
    type: "desconto_aniversario_cliente",
    label: "Aniversário do Cliente",
    description: "Desconto no mês/dia de aniversário do cliente",
    icon: "Gift",
    color: "#ec4899",
    category: "data",
    defaultData: {
      tipoDesconto: "mes",
      percentual: 10,
    },
  },
  {
    type: "desconto_aniversario_empresa",
    label: "Aniversário da Empresa",
    description: "Desconto corporativo no mês de aniversário da empresa",
    icon: "Building2",
    color: "#a855f7",
    category: "data",
    defaultData: {
      percentual: 8,
    },
  },
  {
    type: "desconto_data_especial",
    label: "Data Especial",
    description: "Desconto em datas específicas (Black Friday, Natal, etc)",
    icon: "CalendarDays",
    color: "#ef4444",
    category: "data",
    defaultData: {
      tipo: "blackfriday",
      percentual: 15,
      dataPersonalizada: "",
    },
  },
  {
    type: "desconto_historico_crescimento",
    label: "Bônus por Crescimento",
    description: "Bônus quando compras crescem em relação ao histórico",
    icon: "TrendingUp",
    color: "#14b8a6",
    category: "condicao",
    defaultData: {
      percentualCrescimento: 30,
      bonusPercentual: 5,
    },
  },
  {
    type: "desconto_tempo_desde_ultimo",
    label: "Desconto por Retorno Rápido",
    description: "Desconto se cliente comprar dentro de X dias após último orçamento",
    icon: "Timer",
    color: "#f97316",
    category: "condicao",
    defaultData: {
      diasMaximos: 7,
      percentual: 5,
    },
  },
  {
    type: "validar_empresa",
    label: "Validar Empresa",
    description: "Valida se o orçamento é para uma empresa específica",
    icon: "Building",
    color: "#8b5cf6",
    category: "condicao",
    defaultData: {
      empresaId: "",
    },
  },
  {
    type: "validar_usuario",
    label: "Validar Usuário",
    description: "Valida se o orçamento está sendo feito por um usuário específico",
    icon: "User",
    color: "#06b6d4",
    category: "condicao",
    defaultData: {
      usuarioId: "",
    },
  },
  {
    type: "aplicar_desconto",
    label: "Aplicar Desconto",
    description: "Bloco que aplica o desconto calculado",
    icon: "CheckCircle2",
    color: "#10b981",
    category: "acao",
    defaultData: {
      tipoAplicacao: "automatico",
    },
  },
  {
    type: "fim",
    label: "Fim",
    description: "Fim da automação",
    icon: "Square",
    color: "#6b7280",
    category: "sistema",
  },
];
