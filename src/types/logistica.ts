export interface Veiculo {
  id: string;
  estabelecimento_id: string;
  placa: string;
  descricao?: string;
  motorista?: string;
  ativo: boolean;
  tipo_veiculo?: string;
  grupo_id?: string | null;
  created_at: string;
  updated_at: string;
  // Computed from latest position
  ultima_posicao?: VeiculoPosicao;
}

export interface VeiculoPosicao {
  id: string;
  veiculo_id: string;
  lat: number;
  lng: number;
  velocidade: number;
  direcao?: number;
  data_hora: string;
  created_at: string;
}

export interface RotaSalva {
  id: string;
  estabelecimento_id: string;
  nome: string;
  descricao?: string;
  coordenadas_json: {
    coordinates: Array<{ lat: number; lng: number }>;
    geometry?: Array<{ lat: number; lng: number }>;
  };
  pontos_parada?: Array<{
    endereco: string;
    lat: number;
    lng: number;
    ordem: number;
  }>;
  distancia_metros?: number;
  tempo_estimado_segundos?: number;
  created_at: string;
  updated_at: string;
}

export interface EntregaProgramada {
  id: string;
  rota_id: string;
  veiculo_id?: string;
  endereco: string;
  lat?: number;
  lng?: number;
  ordem: number;
  status: 'pendente' | 'em_rota' | 'entregue' | 'cancelada';
  hora_prevista?: string;
  hora_chegada?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export type VeiculoStatus = 'movendo' | 'parado' | 'offline';

export interface VeiculoComStatus extends Veiculo {
  status: VeiculoStatus;
  ultima_atualizacao?: string;
  cor?: string; // Cor única para identificação no mapa
  motorista_atual?: {
    nome: string;
    telefone: string | null;
    exit_time: string;
  } | null;
}

export interface HistoricoEstatisticas {
  distancia_total_km: number;
  velocidade_maxima: number;
  velocidade_media: number;
  tempo_movimento_minutos: number;
  tempo_parado_minutos: number;
  pontos_total: number;
}