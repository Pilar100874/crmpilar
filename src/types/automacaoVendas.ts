export type AutomacaoVendasBlockType =
  // Blocos de sistema
  | "inicio"
  | "iniciar_validacao"
  // Blocos de condição
  | "condicao_se"
  | "condicao_valor"
  | "condicao_mes"
  | "condicao_quantidade"
  | "condicao_cliente_acumulado"
  | "desconto_valor_compra"
  | "desconto_aniversario_cliente"
  | "desconto_aniversario_empresa"
  | "desconto_data_especial"
  | "validar_empresa"
  | "validar_usuario"
  | "validar_produto"
  | "valida_faixa_faturamento"
  // Blocos de lógica
  | "logica_e"
  | "logica_ou"
  // Blocos de ação
  | "acao_desconto_percentual"
  | "acao_desconto_fixo"
  | "acao_adicionar_frete"
  | "acao_enviar_alerta"
  | "aplicar_desconto"
  | "return_response"
  | "disparar_push";

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
    type: "condicao_se",
    label: "Condição SE",
    description: "Avalia uma ou mais condições e direciona para Sim ou Não",
    icon: "GitBranch",
    color: "#3b82f6",
    category: "condicao",
    defaultData: {
      condicoes: [
        { campo: "valor_total", operador: ">", valor: 0 }
      ],
      logica: "E"
    },
  },
  {
    type: "logica_e",
    label: "Operador E",
    description: "Todas as condições anteriores devem ser verdadeiras",
    icon: "Grid2x2",
    color: "#8b5cf6",
    category: "condicao",
  },
  {
    type: "logica_ou",
    label: "Operador OU",
    description: "Pelo menos uma das condições anteriores deve ser verdadeira",
    icon: "Rows3",
    color: "#a855f7",
    category: "condicao",
  },
  {
    type: "desconto_valor_compra",
    label: "Desconto em Percentual no total do orçamento",
    description: "Aplica desconto percentual diretamente no valor total (sem validação de valor mínimo)",
    icon: "Percent",
    color: "#3b82f6",
    category: "acao",
    defaultData: {
      percentual: 5,
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
    type: "validar_produto",
    label: "Validar Produto",
    description: "Valida se o orçamento contém um produto específico",
    icon: "Package",
    color: "#f59e0b",
    category: "condicao",
    defaultData: {
      produtoId: "",
    },
  },
  {
    type: "valida_faixa_faturamento",
    label: "Valida por Faixa de Faturamento",
    description: "Aplica diferentes ações baseadas em faixas de valor do faturamento total",
    icon: "TrendingUp",
    color: "#10b981",
    category: "condicao",
    defaultData: {
      faixas: [
        { min: 0, max: 100, label: "Até R$ 100" },
        { min: 100, max: 500, label: "De R$ 100 a R$ 500" },
        { min: 500, max: null, label: "Acima de R$ 500" }
      ],
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
    type: "return_response",
    label: "Retornar Resposta",
    description: "Devolve payload ao workflow chamador (modo síncrono) e encerra esta automação.",
    icon: "Reply",
    color: "#14b8a6",
    category: "acao",
    defaultData: {
      status: "success",
      statusCode: 200,
      message: "Automação concluída",
      payloadJson: "",
      includeAllVariables: false,
      stopFlow: true,
    },
  },
];
