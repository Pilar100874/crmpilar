// Types for Marketing Resources System

export type FieldType = 
  | 'text' 
  | 'textarea' 
  | 'image' 
  | 'audio' 
  | 'dropdown';

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
  stepId?: string; // ID da etapa à qual o campo pertence
}

export interface FormStep {
  id: string;
  number: number;
  title: string;
  description?: string;
}

export interface MarketingResource {
  id: string;
  name: string;
  description?: string;
  fields: ResourceField[];
  steps?: FormStep[]; // Etapas do formulário
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
    label: 'Texto',
    types: ['text', 'textarea'] as FieldType[],
  },
  media: {
    label: 'Mídia',
    types: ['image', 'audio'] as FieldType[],
  },
  selection: {
    label: 'Seleção',
    types: ['dropdown'] as FieldType[],
  },
};

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Texto Curto',
  textarea: 'Texto Longo',
  image: 'Imagem',
  audio: 'Áudio',
  dropdown: 'Lista Suspensa',
};

export const FIELD_TYPE_DESCRIPTIONS: Record<FieldType, string> = {
  text: 'Campo de texto simples',
  textarea: 'Área de texto maior',
  image: 'Upload ou seleção de imagens',
  audio: 'Upload de arquivo de áudio',
  dropdown: 'Lista de opções',
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
