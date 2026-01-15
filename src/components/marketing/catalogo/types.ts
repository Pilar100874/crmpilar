export interface CatalogProduct {
  id: string;
  nome: string;
  descricao?: string;
  foto_url?: string;
  preco_tabela?: number;
  codigo?: string;
  categoria_nome?: string;
  grupo_nome?: string;
  grupo_id?: string;
}

export interface ProductGroup {
  id: string;
  nome: string;
  products: CatalogProduct[];
  backgroundImage?: string;
}

export interface CatalogPage {
  id: string;
  type: 'cover' | 'products' | 'backcover';
  title?: string;
  subtitle?: string;
  products?: CatalogProduct[];
  layout?: 'grid-2' | 'grid-3' | 'grid-4' | 'list';
  backgroundColor?: string;
  backgroundImage?: string;
  logoUrl?: string;
  contactInfo?: {
    phone?: string;
    email?: string;
    website?: string;
    address?: string;
  };
  groupByCategory?: boolean;
}

export interface CatalogConfig {
  id?: string;
  name: string;
  pages: CatalogPage[];
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  showPrices: boolean;
  showCodes: boolean;
  businessType?: string;
  created_at?: string;
  updated_at?: string;
}

export interface WizardStep {
  id: string;
  title: string;
  description: string;
}

export const WIZARD_STEPS: WizardStep[] = [
  { id: 'info', title: 'Informações', description: 'Nome e configurações do catálogo' },
  { id: 'cover', title: 'Capa', description: 'Configure a capa do catálogo' },
  { id: 'products', title: 'Produtos', description: 'Selecione os produtos' },
  { id: 'groups', title: 'Grupos', description: 'Imagens dos grupos' },
  { id: 'backcover', title: 'Contracapa', description: 'Informações de contato' },
  { id: 'preview', title: 'Visualização', description: 'Revise e exporte o PDF' },
];

export const LAYOUT_OPTIONS = [
  { value: 'grid-2', label: '2 Colunas', cols: 2 },
  { value: 'grid-3', label: '3 Colunas', cols: 3 },
  { value: 'grid-4', label: '4 Colunas', cols: 4 },
  { value: 'list', label: 'Lista', cols: 1 },
] as const;

export const FONT_OPTIONS = [
  { value: 'Inter, sans-serif', label: 'Inter' },
  { value: 'Roboto, sans-serif', label: 'Roboto' },
  { value: 'Montserrat, sans-serif', label: 'Montserrat' },
  { value: 'Poppins, sans-serif', label: 'Poppins' },
  { value: 'Playfair Display, serif', label: 'Playfair Display' },
] as const;

export const COVER_STYLES = [
  { id: 'elegant', label: 'Elegante', prompt: 'Professional elegant catalog cover with subtle gradients, deep blues and golds, minimalist geometric patterns' },
  { id: 'modern', label: 'Moderno', prompt: 'Modern sleek catalog cover with clean lines, monochromatic scheme, abstract shapes' },
  { id: 'nature', label: 'Natural', prompt: 'Natural organic catalog cover with soft earth tones, botanical elements, warm textures' },
  { id: 'tech', label: 'Tecnológico', prompt: 'Futuristic tech catalog cover with digital patterns, neon accents, dark background' },
  { id: 'luxury', label: 'Luxo', prompt: 'Luxury premium catalog cover with marble textures, gold accents, sophisticated black background' },
] as const;
