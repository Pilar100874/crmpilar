export type AdsBlockType = 
  | 'trigger_roas'
  | 'trigger_spend'
  | 'trigger_cpc'
  | 'trigger_ctr'
  | 'trigger_conversions'
  | 'trigger_impressions'
  | 'trigger_schedule'
  | 'condition_platform'
  | 'condition_campaign'
  | 'condition_time'
  | 'condition_metric'
  | 'action_pause'
  | 'action_resume'
  | 'action_budget_decrease'
  | 'action_budget_increase'
  | 'action_notify'
  | 'action_webhook'
  | 'action_email'
  | 'action_bid_adjust';

export interface AdsBlockDefinition {
  type: AdsBlockType;
  label: string;
  description: string;
  icon: string;
  category: 'trigger' | 'condition' | 'action';
  color: string;
  defaultData: Record<string, any>;
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
  // Conditions
  {
    type: 'condition_platform',
    label: 'Plataforma',
    description: 'Verifica qual plataforma de anúncios',
    icon: 'Layers',
    category: 'condition',
    color: '#8b5cf6',
    defaultData: { platforms: [] }
  },
  {
    type: 'condition_campaign',
    label: 'Campanha',
    description: 'Verifica nome ou tipo da campanha',
    icon: 'Megaphone',
    category: 'condition',
    color: '#8b5cf6',
    defaultData: { nameContains: '', campaignType: '' }
  },
  {
    type: 'condition_time',
    label: 'Horário',
    description: 'Verifica horário atual',
    icon: 'Clock',
    category: 'condition',
    color: '#8b5cf6',
    defaultData: { startHour: 9, endHour: 18 }
  },
  {
    type: 'condition_metric',
    label: 'Métrica',
    description: 'Verifica valor de métrica específica',
    icon: 'BarChart3',
    category: 'condition',
    color: '#8b5cf6',
    defaultData: { metric: 'ctr', operator: '>', value: 0 }
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
