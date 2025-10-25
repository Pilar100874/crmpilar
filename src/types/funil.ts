export type FunilStage = 'lead' | 'qualificacao' | 'proposta' | 'negociacao' | 'fechamento';

export interface Deal {
  id: string;
  cliente: string;
  valor: number;
  dataEstimada: string;
  responsavel: string;
  origem?: string;
  segmento?: string;
  cluster?: string;
  status?: 'normal' | 'vencido' | 'parado' | 'urgente';
  saude?: 'verde' | 'amarelo' | 'vermelho';
  diasParado?: number;
  prioridade?: number;
  ultimaInteracao?: string;
  tags?: string[];
}

export interface FunilColumn {
  id: FunilStage;
  title: string;
  deals: Deal[];
}
