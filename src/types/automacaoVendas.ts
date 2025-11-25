export type AutomacaoVendasBlockType =
  // Blocos de condição
  | "inicio"
  | "desconto_valor_compra"
  | "desconto_quantidade_compras"
  | "desconto_produtos_grupo"
  | "desconto_pagamento_antecipado"
  | "desconto_aniversario_cliente"
  | "desconto_aniversario_empresa"
  | "desconto_data_especial"
  | "desconto_historico_crescimento"
  | "desconto_tempo_desde_ultimo"
  | "aplicar_desconto"
  | "fim";

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
    type: "inicio",
    label: "Início",
    description: "Ponto inicial da automação",
    icon: "Play",
    color: "#10b981",
    category: "sistema",
  },
  {
    type: "desconto_valor_compra",
    label: "Desconto por Valor",
    description: "Aplica desconto baseado no valor total da compra",
    icon: "DollarSign",
    color: "#3b82f6",
    category: "condicao",
    defaultData: {
      regras: [
        { valorMinimo: 1000, percentual: 5 },
        { valorMinimo: 2000, percentual: 10 },
        { valorMinimo: 5000, percentual: 15 },
      ],
    },
  },
  {
    type: "desconto_quantidade_compras",
    label: "Desconto por Frequência",
    description: "Desconto para clientes que compraram várias vezes no período",
    icon: "Repeat",
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
    icon: "Package",
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
      tipoDesconto: "mes", // "mes" ou "dia"
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
    icon: "Calendar",
    color: "#ef4444",
    category: "data",
    defaultData: {
      tipo: "blackfriday", // blackfriday, natal, diadocliente, feriado
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
    icon: "Clock",
    color: "#f97316",
    category: "condicao",
    defaultData: {
      diasMaximos: 7,
      percentual: 5,
    },
  },
  {
    type: "aplicar_desconto",
    label: "Aplicar Desconto",
    description: "Bloco que aplica o desconto calculado",
    icon: "CheckCircle",
    color: "#10b981",
    category: "acao",
    defaultData: {
      tipoAplicacao: "automatico", // automatico ou aprovacao
    },
  },
  {
    type: "fim",
    label: "Fim",
    description: "Fim da automação",
    icon: "StopCircle",
    color: "#6b7280",
    category: "sistema",
  },
];
