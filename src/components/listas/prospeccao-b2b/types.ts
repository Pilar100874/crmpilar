export interface ProspectB2B {
  id: string;
  estabelecimento_id: string;
  place_id: string;
  nome: string;
  categoria?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  latitude?: number;
  longitude?: number;
  telefone?: string;
  website?: string;
  rating?: number;
  total_avaliacoes?: number;
  horario_funcionamento?: any;
  google_maps_url?: string;
  fonte_dados: string;
  status_lead: 'novo' | 'contatado' | 'qualificado' | 'nao_interessado' | 'cliente';
  busca_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BuscaB2B {
  id: string;
  estabelecimento_id: string;
  palavra_chave: string;
  polygon_coords: any;
  bounding_box?: any;
  total_resultados: number;
  custo_estimado?: number;
  status: 'em_andamento' | 'concluida' | 'erro';
  created_at?: string;
}

export interface ConfigB2B {
  id: string;
  estabelecimento_id: string;
  google_places_api_key?: string;
  limite_resultados_busca: number;
  limite_custo_mensal?: number;
  custo_por_requisicao: number;
  created_at?: string;
  updated_at?: string;
}

export interface ApiLogB2B {
  id: string;
  estabelecimento_id: string;
  busca_id?: string;
  tipo_requisicao: string;
  custo: number;
  sucesso: boolean;
  mensagem_erro?: string;
  created_at?: string;
}

export interface PolygonPoint {
  lat: number;
  lng: number;
}

export interface SearchFilters {
  keyword: string;
  polygon: PolygonPoint[];
  limit: number;
}

export interface PlaceResult {
  place_id: string;
  name: string;
  types?: string[];
  formatted_address?: string;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  formatted_phone_number?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: any;
  url?: string;
  address_components?: any[];
}
