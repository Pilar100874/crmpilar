export type OmnichannelBlockType = 
  | 'fila' 
  | 'atendente' 
  | 'skill' 
  | 'regra_roteamento'
  | 'inicio';

export interface OmnichannelNode {
  id: string;
  type: 'custom';
  position: { x: number; y: number };
  data: {
    type: OmnichannelBlockType;
    label: string;
    config: any;
    isSkipped?: boolean;
  };
}

export interface OmnichannelEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  style?: any;
  markerEnd?: any;
}

export interface OmnichannelFlowData {
  nodes: OmnichannelNode[];
  edges: OmnichannelEdge[];
  viewport: { x: number; y: number; zoom: number };
}

export interface OmnichannelFlow {
  id: string;
  estabelecimento_id: string;
  nome: string;
  descricao?: string;
  flow_data: OmnichannelFlowData;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}
