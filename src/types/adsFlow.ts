export type AdsBlockType = 
  // Triggers
  | 'trigger_roas'
  | 'trigger_spend'
  | 'trigger_cpc'
  | 'trigger_ctr'
  | 'trigger_conversions'
  | 'trigger_impressions'
  | 'trigger_schedule'
  | 'trigger_frequency'
  | 'trigger_quality_score'
  | 'trigger_budget_depleted'
  | 'trigger_position'
  // Conditions
  | 'condition_platform'
  | 'condition_campaign'
  | 'condition_time'
  | 'condition_metric'
  | 'condition_day_of_week'
  | 'condition_budget_remaining'
  | 'condition_device'
  | 'condition_location'
  // Actions
  | 'action_pause'
  | 'action_resume'
  | 'action_budget_decrease'
  | 'action_budget_increase'
  | 'action_notify'
  | 'action_webhook'
  | 'action_email'
  | 'action_bid_adjust'
  | 'action_duplicate'
  | 'action_archive'
  | 'action_activate'
  | 'action_bid_device'
  | 'action_schedule_change'
  | 'action_slack'
  | 'action_create_report'
  | 'action_aviso_sistema'
  | 'action_mensagem_interna'
  | 'return_response'
  | 'disparar_push'
  | 'enviar_sms';

export interface AdsBlockDefinition {
  type: AdsBlockType;
  label: string;
  description: string;
  icon: string;
  category: 'trigger' | 'condition' | 'action';
  color: string;
  defaultData: Record<string, any>;
  outputs?: number; // 1 = single, 2 = binary (yes/no)
  outputLabels?: string[];
}

export const ADS_BLOCK_DEFINITIONS: AdsBlockDefinition[] = [
  // Triggers
  {
    type: 'trigger_roas',
    label: 'ROAS Baixo',
    description: 'Gatilho quando ROAS está abaixo do limite',
    icon: 'TrendingDown',
    category: 'trigger',
    color: '#f97316',
    defaultData: { threshold: 1, comparison: 'below' }
  },
  {
    type: 'trigger_spend',
    label: 'Gasto Alto',
    description: 'Gatilho quando gasto ultrapassa limite',
    icon: 'DollarSign',
    category: 'trigger',
    color: '#f97316',
    defaultData: { threshold: 1000, comparison: 'above' }
  },
  {
    type: 'trigger_cpc',
    label: 'CPC Alto',
    description: 'Gatilho quando CPC está acima do limite',
    icon: 'MousePointerClick',
    category: 'trigger',
    color: '#f97316',
    defaultData: { threshold: 5, comparison: 'above' }
  },
  {
    type: 'trigger_ctr',
    label: 'CTR Baixo',
    description: 'Gatilho quando CTR está abaixo do limite',
    icon: 'Percent',
    category: 'trigger',
    color: '#f97316',
    defaultData: { threshold: 1, comparison: 'below' }
  },
  {
    type: 'trigger_conversions',
    label: 'Sem Conversões',
    description: 'Gatilho quando não há conversões em X horas',
    icon: 'Target',
    category: 'trigger',
    color: '#f97316',
    defaultData: { hours: 24 }
  },
  {
    type: 'trigger_impressions',
    label: 'Impressões Baixas',
    description: 'Gatilho quando impressões estão baixas',
    icon: 'Eye',
    category: 'trigger',
    color: '#f97316',
    defaultData: { threshold: 100, comparison: 'below' }
  },
  {
    type: 'trigger_schedule',
    label: 'Agendamento',
    description: 'Gatilho em horário específico',
    icon: 'Clock',
    category: 'trigger',
    color: '#f97316',
    defaultData: { cron: '0 9 * * *' }
  },
  {
    type: 'trigger_frequency',
    label: 'Frequência',
    description: 'Gatilho quando frequência muda',
    icon: 'Repeat',
    category: 'trigger',
    color: '#f97316',
    defaultData: { threshold: 3, comparison: 'above' }
  },
  {
    type: 'trigger_quality_score',
    label: 'Score de Qualidade',
    description: 'Gatilho quando score de qualidade muda',
    icon: 'Star',
    category: 'trigger',
    color: '#f97316',
    defaultData: { threshold: 5, comparison: 'below' }
  },
  {
    type: 'trigger_budget_depleted',
    label: 'Orçamento Esgotando',
    description: 'Gatilho quando orçamento está acabando',
    icon: 'AlertTriangle',
    category: 'trigger',
    color: '#f97316',
    defaultData: { percentageRemaining: 20 }
  },
  {
    type: 'trigger_position',
    label: 'Posição do Anúncio',
    description: 'Gatilho quando posição média muda',
    icon: 'ArrowUpDown',
    category: 'trigger',
    color: '#f97316',
    defaultData: { threshold: 4, comparison: 'above' }
  },
  // Conditions
  {
    type: 'condition_platform',
    label: 'Plataforma',
    description: 'Verifica qual plataforma de anúncios',
    icon: 'Layers',
    category: 'condition',
    color: '#8b5cf6',
    defaultData: { platforms: [] },
    outputs: 2,
    outputLabels: ['Corresponde', 'Não corresponde']
  },
  {
    type: 'condition_campaign',
    label: 'Campanha',
    description: 'Verifica nome ou tipo da campanha',
    icon: 'Megaphone',
    category: 'condition',
    color: '#8b5cf6',
    defaultData: { nameContains: '', campaignType: '' },
    outputs: 2,
    outputLabels: ['Corresponde', 'Não corresponde']
  },
  {
    type: 'condition_time',
    label: 'Horário',
    description: 'Verifica horário atual',
    icon: 'Clock',
    category: 'condition',
    color: '#8b5cf6',
    defaultData: { startHour: 9, endHour: 18 },
    outputs: 2,
    outputLabels: ['Dentro', 'Fora']
  },
  {
    type: 'condition_metric',
    label: 'Métrica',
    description: 'Verifica valor de métrica específica',
    icon: 'BarChart3',
    category: 'condition',
    color: '#8b5cf6',
    defaultData: { metric: 'ctr', operator: '>', value: 0 },
    outputs: 2,
    outputLabels: ['Verdadeiro', 'Falso']
  },
  {
    type: 'condition_day_of_week',
    label: 'Dia da Semana',
    description: 'Verifica se é dia específico',
    icon: 'Calendar',
    category: 'condition',
    color: '#8b5cf6',
    defaultData: { days: [] },
    outputs: 2,
    outputLabels: ['Corresponde', 'Não corresponde']
  },
  {
    type: 'condition_budget_remaining',
    label: 'Orçamento Restante',
    description: 'Verifica % do orçamento restante',
    icon: 'PiggyBank',
    category: 'condition',
    color: '#8b5cf6',
    defaultData: { percentage: 50, operator: '<' },
    outputs: 2,
    outputLabels: ['Verdadeiro', 'Falso']
  },
  {
    type: 'condition_device',
    label: 'Dispositivo',
    description: 'Verifica tipo de dispositivo',
    icon: 'Smartphone',
    category: 'condition',
    color: '#8b5cf6',
    defaultData: { devices: [] },
    outputs: 2,
    outputLabels: ['Corresponde', 'Não corresponde']
  },
  {
    type: 'condition_location',
    label: 'Localização',
    description: 'Verifica região geográfica',
    icon: 'MapPin',
    category: 'condition',
    color: '#8b5cf6',
    defaultData: { locations: [] },
    outputs: 2,
    outputLabels: ['Corresponde', 'Não corresponde']
  },
  // Actions
  {
    type: 'action_pause',
    label: 'Pausar Campanha',
    description: 'Pausa a campanha/conjunto/anúncio',
    icon: 'Pause',
    category: 'action',
    color: '#22c55e',
    defaultData: { level: 'campaign' }
  },
  {
    type: 'action_resume',
    label: 'Retomar Campanha',
    description: 'Retoma campanha pausada',
    icon: 'Play',
    category: 'action',
    color: '#22c55e',
    defaultData: { level: 'campaign' }
  },
  {
    type: 'action_budget_decrease',
    label: 'Reduzir Orçamento',
    description: 'Diminui orçamento em percentual',
    icon: 'TrendingDown',
    category: 'action',
    color: '#22c55e',
    defaultData: { percentage: 20, minBudget: 10 }
  },
  {
    type: 'action_budget_increase',
    label: 'Aumentar Orçamento',
    description: 'Aumenta orçamento em percentual',
    icon: 'TrendingUp',
    category: 'action',
    color: '#22c55e',
    defaultData: { percentage: 20, maxBudget: 1000 }
  },
  {
    type: 'action_notify',
    label: 'Enviar Notificação',
    description: 'Envia notificação ao usuário',
    icon: 'Bell',
    category: 'action',
    color: '#22c55e',
    defaultData: { message: '', channels: ['app'] }
  },
  {
    type: 'action_webhook',
    label: 'Chamar Webhook',
    description: 'Envia dados para URL externa',
    icon: 'Webhook',
    category: 'action',
    color: '#22c55e',
    defaultData: { url: '', method: 'POST' }
  },
  {
    type: 'action_email',
    label: 'Enviar Email',
    description: 'Envia email de alerta',
    icon: 'Mail',
    category: 'action',
    color: '#22c55e',
    defaultData: { to: '', subject: '', body: '' }
  },
  {
    type: 'action_bid_adjust',
    label: 'Ajustar Lance',
    description: 'Ajusta lance da campanha',
    icon: 'DollarSign',
    category: 'action',
    color: '#22c55e',
    defaultData: { adjustment: 0, type: 'percentage' }
  },
  {
    type: 'action_duplicate',
    label: 'Duplicar Campanha',
    description: 'Cria cópia da campanha',
    icon: 'Copy',
    category: 'action',
    color: '#22c55e',
    defaultData: { nameSuffix: '_copy' }
  },
  {
    type: 'action_archive',
    label: 'Arquivar',
    description: 'Arquiva campanha/anúncio',
    icon: 'Archive',
    category: 'action',
    color: '#22c55e',
    defaultData: { level: 'campaign' }
  },
  {
    type: 'action_activate',
    label: 'Ativar',
    description: 'Ativa campanha/anúncio pausado',
    icon: 'Power',
    category: 'action',
    color: '#22c55e',
    defaultData: { level: 'campaign' }
  },
  {
    type: 'action_bid_device',
    label: 'Lance por Dispositivo',
    description: 'Ajusta lance por tipo de dispositivo',
    icon: 'Smartphone',
    category: 'action',
    color: '#22c55e',
    defaultData: { mobile: 0, desktop: 0, tablet: 0 }
  },
  {
    type: 'action_schedule_change',
    label: 'Agendar Mudança',
    description: 'Agenda ativação/pausa futura',
    icon: 'CalendarClock',
    category: 'action',
    color: '#22c55e',
    defaultData: { action: 'pause', scheduledTime: '' }
  },
  {
    type: 'action_slack',
    label: 'Notificar Slack',
    description: 'Envia mensagem para canal Slack',
    icon: 'MessageSquare',
    category: 'action',
    color: '#22c55e',
    defaultData: { webhookUrl: '', message: '' }
  },
  {
    type: 'action_create_report',
    label: 'Gerar Relatório',
    description: 'Cria relatório automático',
    icon: 'FileText',
    category: 'action',
    color: '#22c55e',
    defaultData: { reportType: 'performance', period: '7d' }
  },
  {
    type: 'action_aviso_sistema',
    label: 'Aviso do Sistema',
    description: 'Envia aviso para usuários do sistema',
    icon: 'Bell',
    category: 'action',
    color: '#f97316',
    defaultData: { 
      titulo: '',
      mensagem: '',
      tipo: 'info',
      destinatarios_tipo: 'todos',
      destinatarios_ids: [],
      destinatarios_roles: []
    }
  },
  {
    type: 'action_mensagem_interna',
    label: 'Mensagem Interna',
    description: 'Envia mensagem no chat interno',
    icon: 'MessageCircle',
    category: 'action',
    color: '#3b82f6',
    defaultData: { 
      tipo_destinatario: 'usuario',
      usuario_id: '',
      mensagem: '',
      titulo_conversa: ''
    }
  },
  {
    type: 'return_response',
    label: 'Retornar Resposta',
    description: 'Devolve payload ao workflow chamador',
    icon: 'Reply',
    category: 'action',
    color: '#14b8a6',
    defaultData: {
      status: 'success',
      statusCode: 200,
      message: 'Automação concluída',
      payloadJson: '',
      includeAllVariables: false,
      stopFlow: true,
    },
  },
  {
    type: 'disparar_push',
    label: 'Disparar Push',
    description: 'Envia notificação push para usuário interno ou cliente',
    icon: 'BellRing',
    category: 'action',
    color: '#f97316',
    defaultData: {
      destinatario_tipo: 'todos_usuarios',
      usuario_ids: [],
      contato_ids: [],
      titulo: 'Alerta de anúncio',
      corpo: 'Verifique os detalhes da campanha',
      url: '/ads',
    },
  },
];

export interface AdsFlowNodeData {
  label: string;
  type: AdsBlockType;
  config: Record<string, any>;
  note?: string;
  isBreakpoint?: boolean;
  isSkipped?: boolean;
}

export interface AdsFlowData {
  nodes: any[];
  edges: any[];
  viewport?: { x: number; y: number; zoom: number };
  variables?: any[];
}
