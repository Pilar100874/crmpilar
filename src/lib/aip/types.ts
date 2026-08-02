export interface AipAgent {
  id: string;
  estabelecimento_id: string;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  modelo_ia: string;
  prompt_principal: string;
  skill_ids: string[];
  tool_ids: string[];
  mcp_ids: string[];
  limite_custo: number | null;
  limite_tempo_seg: number | null;
  tags: string[];
  versao: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface AipSkill {
  id: string;
  estabelecimento_id: string;
  nome: string;
  slug: string | null;
  categoria: string | null;
  descricao: string | null;
  conteudo_md: string;
  versao: number;
  status: string;
  tags: string[];
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface AipTool {
  id: string;
  estabelecimento_id: string;
  nome: string;
  categoria: string;
  descricao: string | null;
  tipo: string;
  endpoint: string | null;
  metodo: string;
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
  permissoes: string[];
  credencial_ref: string | null;
  timeout_seg: number;
  retry: number;
  status: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface AipMcp {
  id: string;
  estabelecimento_id: string;
  nome: string;
  endpoint: string;
  tipo: string;
  descricao: string | null;
  status: string;
  ferramentas: Array<{ name: string; description?: string }>;
  ambiente: string;
  credencial_ref: string | null;
  ultimo_handshake: string | null;
  ultimo_erro: string | null;
  created_at: string;
  updated_at: string;
}

export interface AipResource {
  id: string;
  estabelecimento_id: string | null;
  categoria: string;
  subcategoria: string | null;
  nome: string;
  slug: string;
  descricao: string | null;
  icone: string | null;
  config: Record<string, unknown>;
  config_schema: Record<string, unknown>;
  is_padrao: boolean;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface AipWorkflow {
  id: string;
  estabelecimento_id: string;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  flow_data: { nodes: any[]; edges: any[] };
  versao: number;
  tags: string[];
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface AipWizard {
  id: string;
  estabelecimento_id: string;
  nome: string;
  descricao: string | null;
  icone: string | null;
  etapas: AipWizardStep[];
  workflow_id: string | null;
  entrega: Record<string, unknown>;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface AipWizardStep {
  id: string;
  titulo: string;
  descricao?: string;
  tipo: "campos" | "recursos" | "entrega";
  campos?: Array<{
    nome: string;
    label: string;
    tipo: "texto" | "textarea" | "numero" | "select";
    opcoes?: string[];
    obrigatorio?: boolean;
  }>;
}

export interface AipExecution {
  id: string;
  estabelecimento_id: string;
  workflow_id: string | null;
  agent_id: string | null;
  wizard_id: string | null;
  origem: string;
  usuario_id: string | null;
  status: "pendente" | "executando" | "aguardando_aprovacao" | "concluida" | "erro" | "cancelada";
  etapa_atual: string | null;
  modelo: string | null;
  prompt: string | null;
  resposta: string | null;
  input: Record<string, unknown>;
  contexto: Record<string, unknown>;
  tokens_input: number;
  tokens_output: number;
  custo: number;
  duracao_ms: number | null;
  erro: string | null;
  remote_run_id: string | null;
  iniciado_em: string;
  finalizado_em: string | null;
  created_at: string;
  updated_at: string;
}

export interface AipApproval {
  id: string;
  estabelecimento_id: string;
  execution_id: string;
  node_id: string | null;
  titulo: string;
  instrucoes: string | null;
  tipo: "texto" | "imagens" | "video" | "arquivos";
  payload: Record<string, any>;
  selecionados: any[];
  status: "pendente" | "aprovado" | "rejeitado";
  comentario: string | null;
  decidido_em: string | null;
  created_at: string;
}

export interface AipAsset {
  id: string;
  estabelecimento_id: string;
  nome: string;
  tipo: string;
  mime_type: string | null;
  url: string | null;
  storage_path: string | null;
  tamanho_bytes: number | null;
  metadata: Record<string, unknown>;
  execution_id: string | null;
  workflow_id: string | null;
  versao: number;
  created_at: string;
  updated_at: string;
}

export const MODELOS_IA = [
  "claude-opus-4-6",
  "claude-sonnet-4-5",
  "claude-haiku-4-5",
  "google/gemini-3.6-flash",
  "google/gemini-3.1-pro-preview",
  "openai/gpt-5.5",
  "openai/gpt-5.4-mini",
];

export const CATEGORIAS_TOOL = [
  "comunicacao",
  "arquivos",
  "ia",
  "banco",
  "storage",
  "api",
  "helpers",
];

export const TIPOS_TOOL = ["http", "sql", "funcao", "mcp", "helper"];
