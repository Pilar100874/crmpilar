export type NodeType =
  | "start"
  | "ai_agent"
  | "send_message"
  | "media"
  | "goodbye"
  | "reply_buttons"
  | "list_buttons"
  | "keyword_options"
  | "message_template"
  | "opt_in_out"
  | "opt_in_check"
  | "audience"
  | "ask_name"
  | "ask_question"
  | "ask_email"
  | "ask_number"
  | "ask_phone"
  | "ask_date"
  | "ask_file"
  | "ask_address"
  | "ask_url"
  | "condition"
  | "set_field"
  | "keyword_jump"
  | "global_keywords"
  | "formulas"
  | "jump_to"
  | "lead_scoring"
  | "goal"
  | "webhook"
  | "n8n"
  | "trigger_automation"
  | "dynamic_data";

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
  inputs?: Record<string, any>;  // Valores de entrada do bloco anterior
  outputs?: Record<string, any>; // Valores de saída para o próximo bloco
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
  // AI
  {
    type: "ai_agent",
    label: "AI Agent",
    description: "Agente de IA conversacional",
    icon: "Sparkles",
    color: "text-primary",
    defaultData: { model: "gpt-4", systemPrompt: "", temperature: 0.7 },
  },
  // Messages
  {
    type: "send_message",
    label: "Send a message",
    description: "Enviar mensagem de texto",
    icon: "MessageSquare",
    color: "text-primary",
    defaultData: { text: "" },
  },
  {
    type: "media",
    label: "Media",
    description: "Enviar imagem, vídeo ou áudio",
    icon: "Image",
    color: "text-primary",
    defaultData: { mediaType: "image", url: "", caption: "" },
  },
  {
    type: "goodbye",
    label: "Goodbye message",
    description: "Mensagem de despedida",
    icon: "HandWaving",
    color: "text-warning",
    defaultData: { text: "Obrigado pelo contato!" },
  },
  // WhatsApp Essential
  {
    type: "reply_buttons",
    label: "Reply buttons",
    description: "Botões de resposta rápida",
    icon: "SquareStack",
    color: "text-success",
    defaultData: { text: "", buttons: [] },
  },
  {
    type: "list_buttons",
    label: "List buttons",
    description: "Menu de lista",
    icon: "List",
    color: "text-success",
    defaultData: { text: "", buttonText: "Ver opções", sections: [] },
  },
  {
    type: "keyword_options",
    label: "Keyword options",
    description: "Opções por palavra-chave",
    icon: "Hash",
    color: "text-accent",
    defaultData: { keywords: [] },
  },
  {
    type: "message_template",
    label: "Send a Message Template",
    description: "Template aprovado do WhatsApp",
    icon: "FileText",
    color: "text-primary",
    defaultData: { templateName: "", language: "pt_BR", parameters: [] },
  },
  {
    type: "opt_in_out",
    label: "Opt-in/out",
    description: "Gerenciar consentimento",
    icon: "ToggleLeft",
    color: "text-success",
    defaultData: { action: "opt-in", category: "marketing" },
  },
  {
    type: "opt_in_check",
    label: "Opt-in check",
    description: "Verificar consentimento",
    icon: "CheckCircle2",
    color: "text-success",
    defaultData: { category: "marketing" },
  },
  {
    type: "audience",
    label: "Audience",
    description: "Segmentar audiência",
    icon: "Users",
    color: "text-primary",
    defaultData: { segments: [], action: "add" },
  },
  // Questions
  {
    type: "ask_name",
    label: "Ask for a name",
    description: "Capturar nome do usuário",
    icon: "User",
    color: "text-warning",
    defaultData: { question: "Qual é o seu nome?", variable: "user_name" },
  },
  {
    type: "ask_question",
    label: "Ask a question",
    description: "Pergunta aberta",
    icon: "HelpCircle",
    color: "text-accent",
    defaultData: { question: "", variable: "", required: true },
  },
  {
    type: "ask_email",
    label: "Ask for an email",
    description: "Capturar email",
    icon: "Mail",
    color: "text-primary",
    defaultData: { question: "Qual é o seu email?", variable: "user_email" },
  },
  {
    type: "ask_number",
    label: "Ask for a number",
    description: "Capturar número",
    icon: "Hash",
    color: "text-primary",
    defaultData: { question: "Digite um número:", variable: "user_number" },
  },
  {
    type: "ask_phone",
    label: "Ask for a phone",
    description: "Capturar telefone",
    icon: "Phone",
    color: "text-success",
    defaultData: { question: "Qual é o seu telefone?", variable: "user_phone" },
  },
  {
    type: "ask_date",
    label: "Ask for a date",
    description: "Capturar data",
    icon: "Calendar",
    color: "text-destructive",
    defaultData: { question: "Selecione uma data:", variable: "user_date" },
  },
  {
    type: "ask_file",
    label: "Ask for a file",
    description: "Solicitar upload de arquivo",
    icon: "Folder",
    color: "text-primary",
    defaultData: { question: "Envie o arquivo:", variable: "user_file", allowedTypes: [] },
  },
  {
    type: "ask_address",
    label: "Ask for an address",
    description: "Capturar endereço",
    icon: "MapPin",
    color: "text-destructive",
    defaultData: { question: "Qual é o seu endereço?", variable: "user_address" },
  },
  {
    type: "ask_url",
    label: "Ask for a Url",
    description: "Capturar URL",
    icon: "Globe",
    color: "text-primary",
    defaultData: { question: "Cole o link:", variable: "user_url" },
  },
  // Logic
  {
    type: "condition",
    label: "Conditions",
    description: "Ramificação condicional",
    icon: "GitBranch",
    color: "text-primary",
    defaultData: { conditions: [] },
  },
  {
    type: "set_field",
    label: "Set a field",
    description: "Definir/atualizar variável",
    icon: "Variable",
    color: "text-accent",
    defaultData: { operations: [] },
  },
  {
    type: "keyword_jump",
    label: "Keyword jump",
    description: "Pular para bloco por palavra-chave",
    icon: "CornerDownRight",
    color: "text-warning",
    defaultData: { keywords: [] },
  },
  {
    type: "global_keywords",
    label: "Global keywords",
    description: "Palavras-chave globais",
    icon: "Globe",
    color: "text-primary",
    defaultData: { keywords: [] },
  },
  {
    type: "formulas",
    label: "Formulas",
    description: "Cálculos e transformações",
    icon: "Calculator",
    color: "text-warning",
    defaultData: { formula: "", outputVariable: "" },
  },
  {
    type: "jump_to",
    label: "Jump to",
    description: "Ir para outro bloco",
    icon: "ArrowRight",
    color: "text-accent",
    defaultData: { targetNodeId: "" },
  },
  {
    type: "lead_scoring",
    label: "Lead scoring",
    description: "Pontuação de leads",
    icon: "TrendingUp",
    color: "text-success",
    defaultData: { scoreField: "lead_score", points: 0, action: "add" },
  },
  {
    type: "goal",
    label: "Goal",
    description: "Meta de conversão",
    icon: "Flag",
    color: "text-destructive",
    defaultData: { goalName: "", value: 0 },
  },
  // Low code
  {
    type: "webhook",
    label: "Webhook",
    description: "Chamar API externa",
    icon: "Webhook",
    color: "text-primary",
    defaultData: { method: "POST", url: "", headers: {}, body: "" },
  },
  {
    type: "n8n",
    label: "N8n Workflow",
    description: "Executar workflow n8n",
    icon: "Workflow",
    color: "text-accent",
    defaultData: { webhookUrl: "", inputData: "{}", outputVariable: "" },
  },
  {
    type: "trigger_automation",
    label: "Trigger automation",
    description: "Disparar automação externa",
    icon: "Zap",
    color: "text-warning",
    defaultData: { automationId: "", parameters: {} },
  },
  {
    type: "dynamic_data",
    label: "Dynamic data",
    description: "Dados dinâmicos",
    icon: "Database",
    color: "text-accent",
    defaultData: { source: "", query: "", outputVariable: "" },
  },
];
