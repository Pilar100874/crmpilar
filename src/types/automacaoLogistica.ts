export type LogisticaBlockType = 
  | 'iniciar_automacao'
  | 'gatilho_agendamento'
  | 'condicao_parado'

  | 'condicao_repetir_parado'
  | 'condicao_velocidade'
  | 'condicao_chegada'
  | 'condicao_saida_area'
  | 'condicao_horario'
  | 'condicao_zona_isenta'
  | 'acao_marcar_mapa'
  | 'acao_tempo_parado_mapa'
  | 'acao_endereco_mapa'
  | 'acao_relatorio_pdf'
  | 'acao_whatsapp'
  | 'acao_notificacao'
  | 'acao_email'
  | 'disparar_push'
  | 'enviar_sms'
  | 'return_response';



export interface CondicaoTempoParado {
  tempo_minutos: number;
  label?: string;
}

export interface LogisticaBlockConfig {
  // Para gatilho_agendamento
  agenda_modo?: 'intervalo' | 'diario' | 'semanal' | 'mensal';
  agenda_intervalo_minutos?: number;
  agenda_horarios?: string[];
  agenda_dias_semana?: string[];
  agenda_dias_mes?: number[];
  agenda_tolerancia_minutos?: number;
  // Para condicao_parado - múltiplas condições de tempo
  condicoes_tempo?: CondicaoTempoParado[];

  // Para acao_marcar_mapa
  icone_parada?: string;
  cor_icone_parada?: string;
  legenda_parada?: string;
  // Para acao_tempo_parado_mapa
  cor_tempo?: string;
  piscar_tempo?: boolean;
  formato_tempo?: 'hhmm' | 'minutos';
  // Para acao_endereco_mapa
  cor_endereco?: string;
  endereco_curto?: boolean;
  // Para condicao_zona_isenta
  zona_nome?: string;
  zona_endereco?: string;
  zona_lat?: number;
  zona_lng?: number;
  zona_raio_metros?: number;

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
  // Para acao_relatorio_pdf
  relatorio_periodo?: 'semanal' | 'mensal' | 'semestral';
  relatorio_limite_kmh?: number;
  relatorio_titulo?: string;
  relatorio_grafico?: boolean;
  // Para acao_whatsapp
  anexar_relatorio?: boolean;
  telefone?: string;
  mensagem?: string;
  usar_telefone_cliente?: boolean;
  // Disparo de bot junto com o WhatsApp
  disparar_bot?: boolean;
  bot_flow_id?: string | null;
  bot_flow_nome?: string | null;
  // Para condicao_repetir_parado
  repetir_inicio_minutos?: number;
  repetir_intervalo_minutos?: number;
  repetir_max?: number;

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
  // Para enviar_sms
  phoneNumbers?: string[];
  outputVariable?: string;
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
  mostrar_tempo?: boolean;
  mostrar_endereco?: boolean;
  endereco?: string | null;

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
  {
    type: 'gatilho_agendamento',
    label: 'Agendamento',
    category: 'gatilho',
    color: '#7C3AED',
    icon: 'CalendarClock',
    description: 'Dispara as ações do fluxo em horários agendados (diário, semanal, mensal ou a cada X minutos)',
    defaultData: {
      agenda_modo: 'diario',
      agenda_horarios: ['08:00'],
      agenda_dias_semana: ['seg', 'ter', 'qua', 'qui', 'sex'],
      agenda_dias_mes: [1],
      agenda_intervalo_minutos: 60,
      agenda_tolerancia_minutos: 5,
    },
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
    type: 'condicao_repetir_parado',
    label: 'Repetir a cada X min',
    category: 'condicao',
    color: '#0EA5E9',
    icon: 'Repeat',
    description: 'Dispara as ações repetidamente a cada X minutos enquanto o veículo permanecer parado',
    defaultData: { repetir_intervalo_minutos: 15 },
    outputs: 1,
    outputLabels: ['Disparar'],
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
  {
    type: 'condicao_zona_isenta',
    label: 'Zona Isenta (Raio)',
    category: 'condicao',
    color: '#14B8A6',
    icon: 'ShieldOff',
    description: 'Dentro do raio deste endereço nenhuma marcação de parada é criada (ex: pátio da empresa)',
    defaultData: { zona_nome: 'Empresa', zona_raio_metros: 200 },
    outputs: 2,
    outputLabels: ['Fora da zona', 'Dentro da zona'],
  },
  // Ações
  {
    type: 'acao_tempo_parado_mapa',
    label: 'Tempo Parado no Mapa',
    category: 'acao',
    color: '#F43F5E',
    icon: 'TimerReset',
    description: 'Mostra no mapa, abaixo do nome do veículo, há quanto tempo ele está parado (piscando). Some quando o veículo volta a se mover.',
    defaultData: { cor_tempo: '#F43F5E', piscar_tempo: true, formato_tempo: 'hhmm' },
    outputs: 1,
  },
  {
    type: 'acao_endereco_mapa',
    label: 'Endereço no Mapa (Balão)',
    category: 'acao',
    color: '#0EA5E9',
    icon: 'MapPinned',
    description: 'Mostra um balão com o endereço onde o veículo está parado. Some automaticamente quando o veículo volta a se mover.',
    defaultData: { cor_endereco: '#0EA5E9', endereco_curto: true },
    outputs: 1,
  },
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
    type: 'acao_relatorio_pdf',
    label: 'Gerar Relatório PDF',
    category: 'acao',
    color: '#DC2626',
    icon: 'FileText',
    description: 'Gera o relatório de velocidades excedidas no período (PDF com logo, tabela e gráfico) para anexar no WhatsApp',
    defaultData: {
      relatorio_periodo: 'semanal',
      relatorio_limite_kmh: 80,
      relatorio_titulo: 'Relatório de Velocidades Excedidas no Período',
      relatorio_grafico: true,
    },
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
  {
    type: 'enviar_sms',
    label: 'Enviar SMS',
    category: 'acao',
    color: '#0284c7',
    icon: 'MessageSquareText',
    description: 'Dispara SMS para um ou mais números via gateway',
    defaultData: {
      phoneNumbers: [''],
      mensagem: '',
      outputVariable: 'envio_sms_status',
    },
    outputs: 1,
  },
];
