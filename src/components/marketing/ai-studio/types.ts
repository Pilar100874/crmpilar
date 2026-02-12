import { Node, Edge } from '@xyflow/react';

// Node types available in the studio
export type StudioNodeType = 
  | 'textInput'
  | 'systemPrompt'
  | 'imageInput'
  | 'llmProcess'
  | 'imageGen'
  | 'imageEdit'
  | 'productComposite'
  | 'videoGen'
  | 'audioGen'
  | 'musicGen'
  | 'lipSync'
  | 'videoMerge'
  | 'imageAnalyze'
  | 'output';

export interface StudioNodeData {
  label: string;
  type: StudioNodeType;
  config: Record<string, any>;
  result?: any;
  isProcessing?: boolean;
  error?: string;
  [key: string]: unknown;
}

export type StudioNode = Node<StudioNodeData>;
export type StudioEdge = Edge;

export interface NodeCategory {
  id: string;
  label: string;
  icon: string;
  nodes: {
    type: StudioNodeType;
    label: string;
    description: string;
    icon: string;
    color: string;
    defaultConfig: Record<string, any>;
  }[];
}

export const NODE_CATEGORIES: NodeCategory[] = [
  {
    id: 'input',
    label: 'Entrada',
    icon: '📝',
    nodes: [
      {
        type: 'textInput',
        label: 'Texto / Prompt',
        description: 'Entrada de texto ou prompt do usuário',
        icon: '✏️',
        color: '#6366f1',
        defaultConfig: { text: '' },
      },
      {
        type: 'systemPrompt',
        label: 'Mensagem do Sistema',
        description: 'Instruções para o modelo de IA',
        icon: '⚙️',
        color: '#8b5cf6',
        defaultConfig: { systemPrompt: '' },
      },
      {
        type: 'imageInput',
        label: 'Imagens de Referência',
        description: 'Carregue imagens como referência para geração',
        icon: '🖼️',
        color: '#f97316',
        defaultConfig: { images: [] },
      },
    ],
  },
  {
    id: 'ai-text',
    label: 'IA Texto',
    icon: '🧠',
    nodes: [
      {
        type: 'llmProcess',
        label: 'Processar com LLM',
        description: 'Processe texto com modelos de linguagem',
        icon: '🧠',
        color: '#0ea5e9',
        defaultConfig: { model: 'google/gemini-2.5-flash' },
      },
      {
        type: 'imageAnalyze',
        label: 'Analisar Imagem',
        description: 'Analise e descreva imagens com IA',
        icon: '🔍',
        color: '#14b8a6',
        defaultConfig: { model: 'google/gemini-2.5-flash', prompt: 'Descreva esta imagem em detalhes.' },
      },
    ],
  },
  {
    id: 'ai-image',
    label: 'IA Imagem',
    icon: '🎨',
    nodes: [
      {
        type: 'imageGen',
        label: 'Gerar Imagem',
        description: 'Gere imagens a partir de prompts de texto',
        icon: '🖼️',
        color: '#f43f5e',
        defaultConfig: { model: 'google/gemini-2.5-flash-image', quality: 'standard' },
      },
      {
        type: 'imageEdit',
        label: 'Editar Imagem',
        description: 'Edite imagens existentes com IA',
        icon: '✨',
        color: '#ec4899',
        defaultConfig: { model: 'google/gemini-2.5-flash-image', editPrompt: '' },
      },
      {
        type: 'productComposite',
        label: 'Produto em Pessoa',
        description: 'Coloque produtos/roupas em pessoas com IA',
        icon: '👕',
        color: '#8b5cf6',
        defaultConfig: { 
          model: 'google/gemini-2.5-flash-image',
          compositeMode: 'clothing',
          prompt: '',
        },
      },
    ],
  },
  {
    id: 'ai-video',
    label: 'IA Vídeo',
    icon: '🎬',
    nodes: [
      {
        type: 'videoGen',
        label: 'Gerar Vídeo',
        description: 'Gere vídeos a partir de prompts ou imagens',
        icon: '🎬',
        color: '#f59e0b',
        defaultConfig: { duration: 5, resolution: '1080p', aspectRatio: '16:9' },
      },
      {
        type: 'videoMerge',
        label: 'Unir Vídeos',
        description: 'Combine vídeos com frames iniciais e finais',
        icon: '🔗',
        color: '#d97706',
        defaultConfig: { transition: 'fade', transitionDuration: 1 },
      },
    ],
  },
  {
    id: 'ai-audio',
    label: 'IA Áudio',
    icon: '🎵',
    nodes: [
      {
        type: 'audioGen',
        label: 'Gerar Áudio/SFX',
        description: 'Gere efeitos sonoros e narração',
        icon: '🔊',
        color: '#22c55e',
        defaultConfig: { duration: 5, type: 'sfx' },
      },
      {
        type: 'musicGen',
        label: 'Criar Música',
        description: 'Crie músicas originais com IA',
        icon: '🎵',
        color: '#10b981',
        defaultConfig: { duration: 30, genre: 'ambient' },
      },
      {
        type: 'lipSync',
        label: 'Sincronismo Labial',
        description: 'Sincronize áudio com vídeo de lábios',
        icon: '👄',
        color: '#06b6d4',
        defaultConfig: {},
      },
    ],
  },
  {
    id: 'output',
    label: 'Saída',
    icon: '📤',
    nodes: [
      {
        type: 'output',
        label: 'Resultado Final',
        description: 'Visualize e exporte o resultado',
        icon: '📤',
        color: '#64748b',
        defaultConfig: { format: 'auto' },
      },
    ],
  },
];

export const getNodeMeta = (type: StudioNodeType) => {
  for (const cat of NODE_CATEGORIES) {
    for (const n of cat.nodes) {
      if (n.type === type) return n;
    }
  }
  return null;
};
