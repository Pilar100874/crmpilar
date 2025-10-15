export type NodeType =
  | "start"
  | "message"
  | "question"
  | "entity"
  | "intent"
  | "condition"
  | "variables"
  | "api"
  | "script"
  | "delay"
  | "queue"
  | "handoff"
  | "fallback"
  | "n8n"
  | "subflow"
  | "event"
  | "consent";

export interface BlockDefinition {
  type: NodeType;
  label: string;
  description: string;
  icon: string;
  color: string;
  defaultData?: Record<string, any>;
}

export interface FlowNodeData extends Record<string, any> {
  label: string;
  type: NodeType;
  config?: Record<string, any>;
}

export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  {
    type: "start",
    label: "Start",
    description: "Início do fluxo",
    icon: "Play",
    color: "text-success",
    defaultData: {},
  },
  {
    type: "message",
    label: "Mensagem/Resposta",
    description: "Texto, mídia, botões, carrossel",
    icon: "MessageSquare",
    color: "text-primary",
    defaultData: { text: "", type: "text" },
  },
  {
    type: "question",
    label: "Pergunta",
    description: "Input livre, múltipla escolha, etc",
    icon: "HelpCircle",
    color: "text-accent",
    defaultData: { questionType: "free", question: "", variable: "" },
  },
  {
    type: "entity",
    label: "Entidade",
    description: "Extrair entidades de uma mensagem",
    icon: "Tags",
    color: "text-warning",
    defaultData: { entities: [] },
  },
  {
    type: "intent",
    label: "Intent",
    description: "Classificação NLU via n8n",
    icon: "Brain",
    color: "text-primary-glow",
    defaultData: { minConfidence: 0.7 },
  },
  {
    type: "condition",
    label: "Condição/Switch",
    description: "if/else, match, regex",
    icon: "GitBranch",
    color: "text-accent",
    defaultData: { conditions: [] },
  },
  {
    type: "variables",
    label: "Variáveis",
    description: "Set/unset/merge em context.vars",
    icon: "Database",
    color: "text-muted-foreground",
    defaultData: { operations: [] },
  },
  {
    type: "api",
    label: "API/Webhook",
    description: "REST/GraphQL com retry",
    icon: "Globe",
    color: "text-primary",
    defaultData: { method: "GET", url: "", headers: {} },
  },
  {
    type: "script",
    label: "Script (JS)",
    description: "Transformações controladas",
    icon: "Code",
    color: "text-destructive",
    defaultData: { code: "" },
  },
  {
    type: "delay",
    label: "Delay/Espera",
    description: "Segundos/minutos",
    icon: "Clock",
    color: "text-warning",
    defaultData: { duration: 5, unit: "seconds" },
  },
  {
    type: "queue",
    label: "Fila/Tarefa",
    description: "Ação assíncrona com callback",
    icon: "ListOrdered",
    color: "text-accent",
    defaultData: { taskType: "" },
  },
  {
    type: "handoff",
    label: "Handoff",
    description: "Transferência para humano",
    icon: "UserPlus",
    color: "text-primary",
    defaultData: { note: "", department: "" },
  },
  {
    type: "fallback",
    label: "Fallback",
    description: "Quando nada casa",
    icon: "AlertCircle",
    color: "text-destructive",
    defaultData: { threshold: 0.5 },
  },
  {
    type: "n8n",
    label: "N8n Node",
    description: "Chama workflow n8n",
    icon: "Webhook",
    color: "text-primary-glow",
    defaultData: { workflowId: "", mapping: {} },
  },
  {
    type: "subflow",
    label: "Subflow",
    description: "Chamável com parâmetros",
    icon: "Component",
    color: "text-accent",
    defaultData: { flowId: "", params: {} },
  },
  {
    type: "event",
    label: "Evento/Telemetry",
    description: "Emitir evento custom",
    icon: "Activity",
    color: "text-success",
    defaultData: { eventName: "", data: {} },
  },
  {
    type: "consent",
    label: "Consentimento (LGPD)",
    description: "Captura opt-in/opt-out",
    icon: "Shield",
    color: "text-warning",
    defaultData: { consentType: "marketing" },
  },
];
