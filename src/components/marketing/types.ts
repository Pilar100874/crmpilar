// Types for Marketing Resources System

export type FieldType = 
  | 'text' 
  | 'textarea' 
  | 'image' 
  | 'audio' 
  | 'dropdown' 
  | 'text_selection'
  | 'number'
  | 'date'
  | 'checkbox'
  | 'product_name'
  | 'product_image';

export type ReturnType = 'image' | 'audio' | 'video' | 'text';

export type PublishChannel = 
  | 'whatsapp' 
  | 'instagram' 
  | 'facebook' 
  | 'twitter' 
  | 'linkedin'
  | 'telegram'
  | 'email';

export interface FieldOption {
  id: string;
  label: string;
  value: string;
  imageUrl?: string;
}

export interface ResourceField {
  id: string;
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  options?: FieldOption[]; // For dropdown, image_selection, text_selection
  defaultValue?: string;
}

export interface MarketingResource {
  id: string;
  name: string;
  description?: string;
  fields: ResourceField[];
  returnType: ReturnType;
  saveLocation?: string;
  n8nWebhookUrl?: string;
  publishChannels?: PublishChannel[]; // Canais habilitados para publicação
  autoPublishEnabled?: boolean; // Se publicação automática está ativada
  createdAt: string;
  updatedAt: string;
}

export interface WizardStep {
  id: string;
  resourceId: string;
  values: Record<string, any>;
}

export interface ContentCreationSession {
  id: string;
  steps: WizardStep[];
  selectedChannels: PublishChannel[];
  status: 'draft' | 'processing' | 'completed' | 'failed';
  result?: {
    type: ReturnType;
    content: string; // URL or text content
  };
  createdAt: string;
}

// Field type categories for better UI organization
export const FIELD_TYPE_CATEGORIES = {
  basic: {
    label: 'Básicos',
    types: ['text', 'textarea', 'number', 'date', 'checkbox'] as FieldType[],
  },
  media: {
    label: 'Mídia',
    types: ['image', 'audio'] as FieldType[],
  },
  selection: {
    label: 'Seleção',
    types: ['dropdown', 'text_selection'] as FieldType[],
  },
  product: {
    label: 'Produto',
    types: ['product_name', 'product_image'] as FieldType[],
  },
};

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Texto Curto',
  textarea: 'Texto Longo',
  image: 'Imagem',
  audio: 'Upload de Áudio',
  dropdown: 'Lista Suspensa',
  text_selection: 'Seleção de Textos',
  number: 'Número',
  date: 'Data',
  checkbox: 'Checkbox',
  product_name: 'Nome do Produto',
  product_image: 'Imagem do Produto',
};

export const FIELD_TYPE_DESCRIPTIONS: Record<FieldType, string> = {
  text: 'Campo de texto simples',
  textarea: 'Área de texto maior',
  image: 'Upload, URL ou seleção de imagens',
  audio: 'Upload de arquivo de áudio',
  dropdown: 'Lista de opções',
  text_selection: 'Escolha entre textos pré-definidos',
  number: 'Valor numérico',
  date: 'Seletor de data',
  checkbox: 'Opção sim/não',
  product_name: 'Selecione um produto e use seu nome',
  product_image: 'Selecione um produto e use uma de suas imagens',
};

export const RETURN_TYPE_LABELS: Record<ReturnType, string> = {
  image: 'Imagem',
  audio: 'Áudio',
  video: 'Vídeo',
  text: 'Texto',
};

export const CHANNEL_CONFIG: Record<PublishChannel, { label: string; icon: string; color: string }> = {
  whatsapp: { label: 'WhatsApp', icon: 'MessageCircle', color: 'bg-green-500' },
  instagram: { label: 'Instagram', icon: 'Instagram', color: 'bg-pink-500' },
  facebook: { label: 'Facebook', icon: 'Facebook', color: 'bg-blue-600' },
  twitter: { label: 'Twitter', icon: 'Twitter', color: 'bg-sky-500' },
  linkedin: { label: 'LinkedIn', icon: 'Linkedin', color: 'bg-blue-700' },
  telegram: { label: 'Telegram', icon: 'Send', color: 'bg-blue-400' },
  email: { label: 'E-mail', icon: 'Mail', color: 'bg-gray-600' },
};
