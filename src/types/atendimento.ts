// Tipos para o sistema de atendimento omnichannel

export type AtendenteStatus = 'disponivel' | 'ocupado' | 'ausente' | 'offline' | 'pausa';
export type ChatStatus = 'novo' | 'em_fila' | 'em_atendimento' | 'transferido' | 'aguardando_cliente' | 'encerrado' | 'reaberto';
export type ChatPrioridade = 'baixa' | 'normal' | 'alta' | 'urgente';
export type TipoRoteamento = 'round_robin' | 'por_skill' | 'por_disponibilidade' | 'por_prioridade' | 'por_carteira';
export type TipoTransferencia = 'fila' | 'atendente' | 'supervisor_forcada';

// Interface para Atendente
export interface Atendente {
  id: string;
  usuario_id: string;
  estabelecimento_id: string;
  status: AtendenteStatus;
  max_chats_simultaneos: number;
  aceita_novos_chats: boolean;
  ultimo_status_mudanca: string;
  tempo_pausa_inicio: string | null;
  motivo_pausa: string | null;
  created_at: string;
  updated_at: string;
}

// Interface para Fila de Atendimento
export interface FilaAtendimento {
  id: string;
  estabelecimento_id: string;
  nome: string;
  descricao: string | null;
  tipo_roteamento: TipoRoteamento;
  max_chats_por_atendente: number;
  prioridade: number;
  ativa: boolean;
  horario_funcionamento: any;
  tempo_resposta_esperado: number;
  mensagem_fila: string | null;
  created_at: string;
  updated_at: string;
}

// Interface para Skill
export interface Skill {
  id: string;
  estabelecimento_id: string;
  nome: string;
  descricao: string | null;
  cor: string | null;
  created_at: string;
}

// Interface para Skill do Atendente
export interface AtendenteSkill {
  id: string;
  atendente_id: string;
  skill_id: string;
  nivel: number;
  created_at: string;
}

// Interface para Skill da Fila
export interface FilaSkill {
  id: string;
  fila_id: string;
  skill_id: string;
  nivel_minimo: number;
  created_at: string;
}

// Interface para Carteira do Atendente
export interface AtendenteCarteira {
  id: string;
  atendente_id: string;
  customer_id: string;
  estabelecimento_id: string;
  ativa: boolean;
  created_at: string;
  updated_at: string;
}

// Interface para Chat (Conversation)
export interface Chat {
  id: string;
  customer_id: string;
  estabelecimento_id: string | null;
  canal: string;
  status: string;
  chat_status: ChatStatus | null;
  fila_id: string | null;
  atendente_atual_id: string | null;
  prioridade: ChatPrioridade | null;
  tempo_espera_inicio: string | null;
  tempo_atendimento_inicio: string | null;
  tempo_encerramento: string | null;
  bot_active: boolean;
  bot_id: string | null;
  avaliacao: number | null;
  comentario_avaliacao: string | null;
  motivo_encerramento: string | null;
  reaberto_automaticamente: boolean | null;
  numero_reaberturas: number | null;
  origem_abertura: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

// Interface para Transferência de Chat
export interface ChatTransferencia {
  id: string;
  chat_id: string;
  atendente_origem_id: string | null;
  atendente_destino_id: string | null;
  fila_origem_id: string | null;
  fila_destino_id: string | null;
  tipo: TipoTransferencia | null;
  motivo: string | null;
  realizada_por: string | null;
  created_at: string;
}

// Interface para Tag de Chat
export interface ChatTag {
  id: string;
  estabelecimento_id: string;
  nome: string;
  cor: string | null;
  categoria: string | null;
  created_at: string;
}

// Interface para Tag Aplicada
export interface ChatTagAplicada {
  id: string;
  chat_id: string;
  tag_id: string;
  aplicada_por: string | null;
  created_at: string;
}

// Interface para Métricas do Atendente
export interface MetricaAtendente {
  id: string;
  atendente_id: string;
  data: string;
  total_chats: number;
  chats_encerrados: number;
  chats_transferidos: number;
  tempo_online: number; // em segundos
  tempo_pausa: number; // em segundos
  tempo_medio_atendimento: number; // em segundos
  tempo_medio_primeira_resposta: number; // em segundos
  avaliacao_media: number | null;
  created_at: string;
}

// Interface para Dashboard do Atendente
export interface DashboardAtendente {
  atendente: Atendente;
  chats_ativos: Chat[];
  chats_em_espera: Chat[];
  metricas_hoje: MetricaAtendente | null;
  skills: (AtendenteSkill & { skill: Skill })[];
}

// Interface para Dashboard do Supervisor
export interface DashboardSupervisor {
  filas: (FilaAtendimento & { 
    chats_em_fila: number;
    atendentes_disponiveis: number;
    atendentes_total: number;
  })[];
  atendentes: (Atendente & {
    chats_ativos: number;
    usuario: {
      nome: string;
      email: string;
    };
  })[];
  metricas_gerais: {
    total_chats_ativos: number;
    total_chats_em_fila: number;
    tempo_medio_espera: number;
    taxa_abandono: number;
  };
}

// Interface para Atendente com Filas
export interface AtendenteComFilas extends Atendente {
  filas: (FilaAtendimento & { prioridade_atendente: number })[];
  skills: (AtendenteSkill & { skill: Skill })[];
  carteiras: AtendenteCarteira[];
}
