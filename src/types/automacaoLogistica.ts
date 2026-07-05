export type LogisticaBlockType = 
  | 'iniciar_automacao'
  | 'condicao_parado'
  | 'condicao_velocidade'
  | 'condicao_chegada'
  | 'condicao_saida_area'
  | 'condicao_horario'
  | 'acao_marcar_mapa'
  | 'acao_whatsapp'
  | 'acao_notificacao'
  | 'acao_email'
  | 'disparar_push'
  | 'return_response';

export interface CondicaoTempoParado {
  tempo_minutos: number;
  label?: string;
}

export interface LogisticaBlockConfig {
  // Para condicao_parado - múltiplas condições de tempo
  condicoes_tempo?: CondicaoTempoParado[];
  // Para acao_marcar_mapa
  icone_parada?: string;
  cor_icone_parada?: string;
  legenda_parada?: string;
  // Para condicao_velocidade
  velocidade_km?: number;
  operador_velocidade?: 'maior' | 'menor';
  // Para condicao_chegada
  raio_metros?: number;
  endereco?: string;
  lat?: number;
  lng?: number;
  // Para condicao_saida_area
  area_nome?: string;
  area_coordenadas?: Array<{ lat: number; lng: number }>;
  // Para condicao_horario
  horario_inicio?: string;
  horario_fim?: string;
  dias_semana?: string[];
  // Para acao_whatsapp
  telefone?: string;
  mensagem?: string;
  usar_telefone_cliente?: boolean;
  // Para acao_notificacao
  titulo_notificacao?: string;
  corpo_notificacao?: string;
  // Para acao_email
  email_destino?: string;
  assunto_email?: string;
  corpo_email?: string;
  // Para disparar_push
  destinatario_tipo?: 'usuario' | 'contato' | 'todos_usuarios' | 'todos_contatos' | 'variavel';
  usuario_ids?: string[];
  contato_ids?: string[];
  variavel_destinatario?: string;
  variavel_tipo?: 'usuario' | 'contato';
  titulo?: string;
  corpo?: string;
  url?: string;
  icone?: string;
}

export interface LogisticaBlock {
  type: LogisticaBlockType;
  label: string;
  category: 'gatilho' | 'condicao' | 'acao';
  color: string;
  icon: string;
  description: string;
  defaultData?: LogisticaBlockConfig;
  outputs?: number;
  outputLabels?: string[];
}

// Tipo para marcador de parada no mapa
export interface ParadaMarcada {
  id: string;
  veiculo_id: string;
  estabelecimento_id: string;
  lat: number;
  lng: number;
  tempo_parado_minutos: number;
  categoria_tempo: '10_20' | '21_30' | 'mais_30';
  icone_parada?: string;
  cor_icone_parada?: string;
  legenda_parada?: string;
  data_inicio: string;
  data_fim: string | null;
  ativa: boolean;
  automacao_id: string | null;
  created_at: string;
  // Dados do veículo para exibição
  veiculo?: {
    placa: string;
    descricao?: string;
  };
}

export const LOGISTICA_BLOCKS: LogisticaBlock[] = [
  // Gatilhos / Início
  {
    type: 'iniciar_automacao',
    label: 'Iniciar Automação',
    category: 'gatilho',
    color: '#10B981',
    icon: 'Play',
    description: 'Ponto de início da automação',
    outputs: 1,
  },
  // Condições
  {
    type: 'condicao_parado',
    label: 'Veículo Parado',
    category: 'condicao',
    color: '#F59E0B',
    icon: 'Pause',
    description: 'Dispara quando o veículo ficar parado por X minutos (múltiplas condições)',
    defaultData: { condicoes_tempo: [{ tempo_minutos: 30, label: '30 min' }] },
    outputs: 2,
    outputLabels: ['Sim', 'Não'],
  },
  {
    type: 'condicao_velocidade',
    label: 'Velocidade Excedida',
    category: 'condicao',
    color: '#EF4444',
    icon: 'Gauge',
    description: 'Dispara quando a velocidade ultrapassar ou ficar abaixo do limite',
    defaultData: { velocidade_km: 80, operador_velocidade: 'maior' },
    outputs: 2,
    outputLabels: ['Sim', 'Não'],
  },
  {
    type: 'condicao_chegada',
    label: 'Chegou no Destino',
    category: 'condicao',
    color: '#3B82F6',
    icon: 'MapPin',
    description: 'Dispara quando o veículo chegar próximo ao endereço',
    defaultData: { raio_metros: 100 },
    outputs: 2,
    outputLabels: ['Chegou', 'Não chegou'],
  },
  {
    type: 'condicao_saida_area',
    label: 'Saiu da Área',
    category: 'condicao',
    color: '#8B5CF6',
    icon: 'MapPinOff',
    description: 'Dispara quando o veículo sair de uma área definida',
    outputs: 2,
    outputLabels: ['Saiu', 'Dentro'],
  },
  {
    type: 'condicao_horario',
    label: 'Fora do Horário',
    category: 'condicao',
    color: '#6366F1',
    icon: 'Clock',
    description: 'Verifica se está dentro do horário permitido',
    defaultData: { horario_inicio: '08:00', horario_fim: '18:00', dias_semana: ['seg', 'ter', 'qua', 'qui', 'sex'] },
    outputs: 2,
    outputLabels: ['Dentro', 'Fora'],
  },
  // Ações
  {
    type: 'acao_marcar_mapa',
    label: 'Marcar no Mapa',
    category: 'acao',
    color: '#EAB308',
    icon: 'MapPin',
    description: 'Adiciona um marcador no mapa de monitoramento',
    defaultData: { icone_parada: 'MapPin', cor_icone_parada: '#EAB308', legenda_parada: '' },
    outputs: 1,
  },
  {
    type: 'acao_whatsapp',
    label: 'Enviar WhatsApp',
    category: 'acao',
    color: '#25D366',
    icon: 'MessageCircle',
    description: 'Envia uma mensagem via WhatsApp',
    defaultData: { mensagem: '', usar_telefone_cliente: false },
    outputs: 1,
  },
  {
    type: 'acao_notificacao',
    label: 'Enviar Notificação',
    category: 'acao',
    color: '#F97316',
    icon: 'Bell',
    description: 'Envia uma notificação no sistema',
    defaultData: { titulo_notificacao: '', corpo_notificacao: '' },
    outputs: 1,
  },
  {
    type: 'acao_email',
    label: 'Enviar E-mail',
    category: 'acao',
    color: '#0EA5E9',
    icon: 'Mail',
    description: 'Envia um e-mail',
    defaultData: { email_destino: '', assunto_email: '', corpo_email: '' },
    outputs: 1,
  },
  {
    type: 'disparar_push',
    label: 'Disparar Push',
    category: 'acao',
    color: '#f97316',
    icon: 'BellRing',
    description: 'Envia notificação push para usuário interno ou cliente',
    defaultData: {
      destinatario_tipo: 'todos_usuarios',
      usuario_ids: [],
      contato_ids: [],
      titulo: 'Alerta de logística',
      corpo: '',
      url: '/logistica-veiculos',
    },
    outputs: 1,
  },
];
