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
  type: 'clients' | 'sales' | 'demographics' | 'income' | 'competition' | 'logistics' | 'units' | 'isochrone' | 'municipal_income' | 'density';
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
    visible: true,
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
  },
  {
    id: 'isochrone',
    name: 'Isócronas',
    description: 'Áreas de alcance por tempo de deslocamento',
    visible: false,
    color: '#10b981',
    icon: 'Clock',
    type: 'isochrone'
  },
  {
    id: 'municipal_income',
    name: 'Renda Municipal',
    description: 'Renda média por município (dados importados)',
    visible: false,
    color: '#eab308',
    icon: 'DollarSign',
    type: 'municipal_income'
  },
  {
    id: 'density',
    name: 'Densidade Estabelec.',
    description: 'Densidade de empresas por município',
    visible: false,
    color: '#f97316',
    icon: 'BarChart3',
    type: 'density'
  }
];

// Dados demográficos oficiais do IBGE - Estimativas da População 2025
// Fonte: IBGE. Diretoria de Pesquisas - DPE - Coordenação de População e Indicadores Sociais - COPIS
// Data de referência: 1º de julho de 2025
export const DADOS_DEMOGRAFICOS_UF: Record<string, {
  populacao: number;
  densidade: number;
  renda_media: number;
  urbanizacao: number;
  lat: number;
  lng: number;
}> = {
  // REGIÃO NORTE - 18.801.282 habitantes
  'RO': { populacao: 1751950, densidade: 7.38, renda_media: 1567, urbanizacao: 73.2, lat: -8.76, lng: -63.90 },
  'AC': { populacao: 884372, densidade: 5.37, renda_media: 1234, urbanizacao: 72.6, lat: -9.98, lng: -67.81 },
  'AM': { populacao: 4321616, densidade: 2.75, renda_media: 1345, urbanizacao: 79.1, lat: -3.12, lng: -60.02 },
  'RR': { populacao: 738772, densidade: 3.30, renda_media: 1456, urbanizacao: 76.6, lat: 2.82, lng: -60.67 },
  'PA': { populacao: 8711196, densidade: 6.98, renda_media: 1156, urbanizacao: 68.5, lat: -1.46, lng: -48.50 },
  'AP': { populacao: 806517, densidade: 5.63, renda_media: 1287, urbanizacao: 89.0, lat: 0.03, lng: -51.05 },
  'TO': { populacao: 1586859, densidade: 5.71, renda_media: 1345, urbanizacao: 79.0, lat: -10.17, lng: -48.33 },
  
  // REGIÃO NORDESTE - 57.244.485 habitantes
  'MA': { populacao: 7018211, densidade: 21.14, renda_media: 876, urbanizacao: 63.1, lat: -2.53, lng: -44.27 },
  'PI': { populacao: 3384547, densidade: 13.44, renda_media: 956, urbanizacao: 65.8, lat: -5.09, lng: -42.80 },
  'CE': { populacao: 9268836, densidade: 62.23, renda_media: 1098, urbanizacao: 75.1, lat: -3.72, lng: -38.53 },
  'RN': { populacao: 3455236, densidade: 65.40, renda_media: 1198, urbanizacao: 77.8, lat: -5.78, lng: -35.21 },
  'PB': { populacao: 4164468, densidade: 73.68, renda_media: 1087, urbanizacao: 75.4, lat: -7.12, lng: -34.86 },
  'PE': { populacao: 9562007, densidade: 96.93, renda_media: 1284, urbanizacao: 80.2, lat: -8.05, lng: -34.88 },
  'AL': { populacao: 3220848, densidade: 115.85, renda_media: 987, urbanizacao: 73.6, lat: -9.67, lng: -35.74 },
  'SE': { populacao: 2299425, densidade: 104.64, renda_media: 1134, urbanizacao: 73.5, lat: -10.91, lng: -37.05 },
  'BA': { populacao: 14870907, densidade: 26.26, renda_media: 1256, urbanizacao: 72.1, lat: -12.97, lng: -38.51 },
  
  // REGIÃO SUDESTE - 88.825.643 habitantes
  'MG': { populacao: 21393441, densidade: 36.52, renda_media: 1837, urbanizacao: 85.3, lat: -19.92, lng: -43.94 },
  'ES': { populacao: 4126854, densidade: 89.41, renda_media: 1876, urbanizacao: 83.4, lat: -20.32, lng: -40.34 },
  'RJ': { populacao: 17223547, densidade: 393.15, renda_media: 2295, urbanizacao: 97.0, lat: -22.91, lng: -43.17 },
  'SP': { populacao: 46081801, densidade: 174.11, renda_media: 2587, urbanizacao: 96.4, lat: -23.55, lng: -46.64 },
  
  // REGIÃO SUL - 31.310.809 habitantes
  'PR': { populacao: 11890517, densidade: 59.52, renda_media: 2063, urbanizacao: 85.3, lat: -25.43, lng: -49.27 },
  'SC': { populacao: 8187029, densidade: 85.78, renda_media: 2344, urbanizacao: 84.0, lat: -27.60, lng: -48.55 },
  'RS': { populacao: 11233263, densidade: 39.88, renda_media: 2147, urbanizacao: 85.1, lat: -30.03, lng: -51.23 },
  
  // REGIÃO CENTRO-OESTE - 17.238.818 habitantes
  'MS': { populacao: 2924631, densidade: 8.19, renda_media: 1987, urbanizacao: 85.6, lat: -20.45, lng: -54.62 },
  'MT': { populacao: 3893659, densidade: 4.31, renda_media: 1956, urbanizacao: 81.8, lat: -15.60, lng: -56.10 },
  'GO': { populacao: 7423629, densidade: 21.85, renda_media: 1823, urbanizacao: 90.3, lat: -16.68, lng: -49.25 },
  'DF': { populacao: 2996899, densidade: 517.81, renda_media: 3245, urbanizacao: 97.6, lat: -15.78, lng: -47.93 }
};

// População total do Brasil em 2025: 213.421.037 habitantes
export const POPULACAO_BRASIL_2025 = 213421037;

// Populações regionais 2025
export const POPULACAO_REGIOES_2025 = {
  'Norte': 18801282,
  'Nordeste': 57244485,
  'Sudeste': 88825643,
  'Sul': 31310809,
  'Centro-Oeste': 17238818
};
