export type AtendimentoV2Canal = "whatsapp" | "telefone" | "email" | "visita";
export type AtendimentoV2Filtro = "todos" | "agendados" | "recebidos";
export type AtendimentoV2TelaMobile = "agenda" | "atendimento" | "cadastro" | "finalizacao" | "massa";

export interface AtendimentoV2EmpresaVinculada {
  id: string;
  empresa_id?: string;
  is_primary?: boolean;
  cargo?: string | null;
  empresas?: {
    id: string;
    nome?: string | null;
    nome_fantasia?: string | null;
    cnpj?: string | null;
  } | null;
}

export interface AtendimentoV2Contato {
  id: string;
  nome: string;
  telefone: string;
  tel: string;
  email: string;
  companies: AtendimentoV2EmpresaVinculada[];
}

export interface AtendimentoV2Mensagem {
  id: string;
  conversation_id: string;
  sender: string;
  text: string;
  created_at: string;
  attachments?: string[] | null;
  payload?: Record<string, unknown> | null;
}

export interface AtendimentoV2Conversa {
  id: string;
  customer_id: string | null;
  status: string;
  canal: string;
  updated_at: string;
  metadata?: Record<string, unknown> | null;
  customer: AtendimentoV2Contato | null;
  lastMessage?: AtendimentoV2Mensagem | null;
  unreadCount: number;
}

export interface AtendimentoV2Tarefa {
  id: string;
  contact_id: string | null;
  contact_name: string;
  title: string;
  description?: string | null;
  date: string;
  time?: string | null;
  origem?: string | null;
  status: string;
  data_original?: string | null;
  customers: AtendimentoV2Contato | null;
}

export interface AtendimentoV2FilaItem {
  key: string;
  contato: AtendimentoV2Contato | null;
  contatoId: string | null;
  nome: string;
  empresa: string;
  motivo: string;
  horario: string;
  canal: AtendimentoV2Canal;
  atrasado: boolean;
  recebido: boolean;
  naoIdentificado: boolean;
  naoLidas: number;
  tarefa: AtendimentoV2Tarefa | null;
  conversa: AtendimentoV2Conversa | null;
}