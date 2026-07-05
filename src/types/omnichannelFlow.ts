export type OmnichannelBlockType = 
  | 'fila' 
  | 'atendente' 
  | 'skill' 
  | 'regra_roteamento'
  | 'horario'
  | 'webhook'
  | 'aguardar'
  | 'analytics'
  | 'inicio'
  | 'return_response'
  | 'disparar_push';

export interface OmnichannelNode {
  id: string;
  type: 'custom';
  position: { x: number; y: number };
  data: {
    type: OmnichannelBlockType;
    label: string;
    config: any;
    note?: string;
    isSkipped?: boolean;
    isBreakpoint?: boolean;
    isHighlighted?: boolean;
    onSetBreakpoint?: (nodeId: string) => void;
    onSetSkip?: (nodeId: string) => void;
    onDuplicate?: (nodeId: string) => void;
    onDelete?: (nodeId: string) => void;
    onClearDebug?: (nodeId: string) => void;
    onAddNote?: (nodeId: string) => void;
  };
}

export interface OmnichannelEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  label?: string;
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
  is_default?: boolean;
  created_at: string;
  updated_at: string;
}
