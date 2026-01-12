// Tipos para as camadas do mapa geoespacial

export interface DadosRegiao {
  regiao: {
    pais: string;
    uf: string;
    municipio: string;
    bairro: string;
    cep: string;
  };
  demografia: {
    populacao: number | null;
    densidade: number | null;
    faixa_etaria: Record<string, number>;
    domicilios_media: number | null;
    fonte: string;
    ano: string;
  };
  renda: {
    renda_media: number | null;
    renda_per_capita: number | null;
    fonte: string;
    ano: string;
  };
  mercado: {
    urbanizacao: number | null;
    varejo_presente: string[];
    fonte: string;
    ano: string;
  };
  concorrencia: {
    quantidade: number | null;
    densidade: number | null;
    fonte: string;
    ano: string;
  };
  logistica: {
    acesso: 'baixo' | 'medio' | 'alto' | '';
    tempo_medio_entrega_h: number | null;
    fonte: string;
  };
  scores: {
    potencial_mercado: number | null;
    poder_compra: number | null;
    logistica: number | null;
    concorrencia: number | null;
  };
  observacoes: string;
}

export interface VendasRegiao {
  uf: string;
  cidade: string;
  total_orcamentos: number;
  total_vendas: number;
  valor_total: number;
  ticket_medio: number;
  latitude?: number;
  longitude?: number;
}

export interface Unidade {
  id: string;
  nome: string;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface MapLayer {
  id: string;
  name: string;
  description: string;
  visible: boolean;
  color: string;
  icon: string;
  type: 'clients' | 'sales' | 'demographics' | 'income' | 'competition' | 'logistics' | 'units';
}

export const DEFAULT_LAYERS: MapLayer[] = [
  {
    id: 'units',
    name: 'Unidades/Filiais',
    description: 'Seus pontos de venda e filiais',
    visible: true,
    color: '#ec4899',
    icon: 'MapPin',
    type: 'units'
  },
  {
    id: 'clients',
    name: 'Clientes',
    description: 'Localização das empresas cadastradas',
    visible: true,
    color: '#3b82f6',
    icon: 'Building2',
    type: 'clients'
  },
  {
    id: 'sales',
    name: 'Vendas/Orçamentos',
    description: 'Volume de vendas e orçamentos por região',
    visible: false,
    color: '#22c55e',
    icon: 'DollarSign',
    type: 'sales'
  },
  {
    id: 'demographics',
    name: 'Demografia',
    description: 'População e densidade demográfica (IBGE)',
    visible: false,
    color: '#8b5cf6',
    icon: 'Users',
    type: 'demographics'
  },
  {
    id: 'income',
    name: 'Renda',
    description: 'Renda média e poder de compra',
    visible: false,
    color: '#f59e0b',
    icon: 'Wallet',
    type: 'income'
  },
  {
    id: 'competition',
    name: 'Concorrência',
    description: 'Densidade de estabelecimentos similares',
    visible: false,
    color: '#ef4444',
    icon: 'Store',
    type: 'competition'
  },
  {
    id: 'logistics',
    name: 'Logística',
    description: 'Acesso e tempo de entrega',
    visible: false,
    color: '#06b6d4',
    icon: 'Truck',
    type: 'logistics'
  }
];

// Dados demográficos simulados do IBGE para estados brasileiros (2022)
export const DADOS_DEMOGRAFICOS_UF: Record<string, {
  populacao: number;
  densidade: number;
  renda_media: number;
  urbanizacao: number;
  lat: number;
  lng: number;
}> = {
  'SP': { populacao: 46649132, densidade: 176.25, renda_media: 2587, urbanizacao: 96.4, lat: -23.55, lng: -46.64 },
  'RJ': { populacao: 17503832, densidade: 400.56, renda_media: 2295, urbanizacao: 97.0, lat: -22.91, lng: -43.17 },
  'MG': { populacao: 21411923, densidade: 36.55, renda_media: 1837, urbanizacao: 85.3, lat: -19.92, lng: -43.94 },
  'BA': { populacao: 14985284, densidade: 26.47, renda_media: 1256, urbanizacao: 72.1, lat: -12.97, lng: -38.51 },
  'RS': { populacao: 11473595, densidade: 40.73, renda_media: 2147, urbanizacao: 85.1, lat: -30.03, lng: -51.23 },
  'PR': { populacao: 11597484, densidade: 58.05, renda_media: 2063, urbanizacao: 85.3, lat: -25.43, lng: -49.27 },
  'PE': { populacao: 9674793, densidade: 98.07, renda_media: 1284, urbanizacao: 80.2, lat: -8.05, lng: -34.88 },
  'CE': { populacao: 9240580, densidade: 62.04, renda_media: 1098, urbanizacao: 75.1, lat: -3.72, lng: -38.53 },
  'PA': { populacao: 8777124, densidade: 7.04, renda_media: 1156, urbanizacao: 68.5, lat: -1.46, lng: -48.50 },
  'SC': { populacao: 7610361, densidade: 79.73, renda_media: 2344, urbanizacao: 84.0, lat: -27.60, lng: -48.55 },
  'MA': { populacao: 7153262, densidade: 21.55, renda_media: 876, urbanizacao: 63.1, lat: -2.53, lng: -44.27 },
  'GO': { populacao: 7206589, densidade: 21.21, renda_media: 1823, urbanizacao: 90.3, lat: -16.68, lng: -49.25 },
  'AM': { populacao: 4240358, densidade: 2.70, renda_media: 1345, urbanizacao: 79.1, lat: -3.12, lng: -60.02 },
  'PB': { populacao: 4059905, densidade: 71.83, renda_media: 1087, urbanizacao: 75.4, lat: -7.12, lng: -34.86 },
  'ES': { populacao: 4108508, densidade: 89.02, renda_media: 1876, urbanizacao: 83.4, lat: -20.32, lng: -40.34 },
  'RN': { populacao: 3560903, densidade: 67.38, renda_media: 1198, urbanizacao: 77.8, lat: -5.78, lng: -35.21 },
  'MT': { populacao: 3658649, densidade: 4.05, renda_media: 1956, urbanizacao: 81.8, lat: -15.60, lng: -56.10 },
  'AL': { populacao: 3365351, densidade: 121.05, renda_media: 987, urbanizacao: 73.6, lat: -9.67, lng: -35.74 },
  'PI': { populacao: 3289290, densidade: 13.06, renda_media: 956, urbanizacao: 65.8, lat: -5.09, lng: -42.80 },
  'MS': { populacao: 2839188, densidade: 7.95, renda_media: 1987, urbanizacao: 85.6, lat: -20.45, lng: -54.62 },
  'SE': { populacao: 2338474, densidade: 106.42, renda_media: 1134, urbanizacao: 73.5, lat: -10.91, lng: -37.05 },
  'DF': { populacao: 3094325, densidade: 534.63, renda_media: 3245, urbanizacao: 97.6, lat: -15.78, lng: -47.93 },
  'RO': { populacao: 1815278, densidade: 7.62, renda_media: 1567, urbanizacao: 73.2, lat: -8.76, lng: -63.90 },
  'TO': { populacao: 1607363, densidade: 5.79, renda_media: 1345, urbanizacao: 79.0, lat: -10.17, lng: -48.33 },
  'AC': { populacao: 906876, densidade: 5.50, renda_media: 1234, urbanizacao: 72.6, lat: -9.98, lng: -67.81 },
  'AP': { populacao: 877613, densidade: 6.13, renda_media: 1287, urbanizacao: 89.0, lat: 0.03, lng: -51.05 },
  'RR': { populacao: 652713, densidade: 2.91, renda_media: 1456, urbanizacao: 76.6, lat: 2.82, lng: -60.67 }
};
