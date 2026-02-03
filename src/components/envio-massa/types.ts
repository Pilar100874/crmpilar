export interface EnvioMassaFilters {
  nome?: string;
  telefone?: string;
  empresa?: string;
  tags?: string[];
  segmentos?: string[];
  origem?: string;
  dataCadastroInicio?: string;
  dataCadastroFim?: string;
}

export interface ContentItem {
  id: string;
  type: 'text' | 'quick_reply' | 'image' | 'video';
  content: string;
  mediaUrl?: string;
  mediaThumbnail?: string;
  mediaDuration?: number;
  quickReplyId?: string;
  quickReplyTitle?: string;
}

export interface ContactForBulkSend {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  empresa?: string | null;
  tags?: string[];
}

export interface QuickReplyCategory {
  id: string;
  nome: string;
  ordem: number;
}

export interface QuickReply {
  id: string;
  title: string;
  content: string;
  categoria?: string | null;
  shortcut?: string | null;
}

export interface MediaGalleryItem {
  id: string;
  tipo: 'image' | 'video' | 'audio' | 'document';
  storage_path: string;
  public_url: string;
  nome: string;
  descricao?: string;
  thumbnail_url?: string;
  duracao_segundos?: number;
}

export type CanalEnvio = 'whatsapp' | 'email';

export type WizardStep = 'channel' | 'filter' | 'compose' | 'preview' | 'schedule' | 'confirm';

export interface EnvioMassaState {
  step: WizardStep;
  canal: CanalEnvio | null;
  filters: EnvioMassaFilters;
  selectedContacts: ContactForBulkSend[];
  contentItems: ContentItem[];
  proximaDataContato: Date;
}
