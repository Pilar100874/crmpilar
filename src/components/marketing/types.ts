// Types for Marketing Resources System

export type FieldType = 
  | 'text' 
  | 'textarea' 
  | 'image' 
  | 'audio' 
  | 'dropdown' 
  | 'image_selection' 
  | 'text_selection'
  | 'number'
  | 'date'
  | 'checkbox';

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

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Texto Curto',
  textarea: 'Texto Longo',
  image: 'Upload de Imagem',
  audio: 'Upload de Áudio',
  dropdown: 'Lista Suspensa',
  image_selection: 'Seleção de Imagens',
  text_selection: 'Seleção de Textos',
  number: 'Número',
  date: 'Data',
  checkbox: 'Checkbox',
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
