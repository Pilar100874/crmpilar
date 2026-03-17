// Types for the Video Timeline Editor

export interface TimelineClip {
  id: string;
  trackId: string;
  type: 'video' | 'audio' | 'image' | 'text' | 'effect' | 'canvas';
  name: string;
  startTime: number;
  duration: number;
  trimStart: number;
  trimEnd: number;
  src?: string;
  thumbnail?: string;
  color: string;
  volume?: number;
  opacity?: number;
  filters?: VideoFilter[];
  transition?: ClipTransition;
  transitions?: ClipTransitions;
  locked?: boolean;
  muted?: boolean;
  canvasJson?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}

export interface VideoFilter {
  id: string;
  type: FilterType;
  label: string;
  value: number; // 0-100
  enabled: boolean;
}

export type FilterType =
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'hue-rotate'
  | 'blur'
  | 'grayscale'
  | 'sepia'
  | 'invert'
  | 'opacity'
  | 'sharpen'
  | 'drop-shadow'
  | 'vignette';

export interface ClipTransition {
  type: TransitionType;
  duration: number;
  easing?: string;
}

export interface ClipTransitions {
  entrance?: ClipTransition;
  exit?: ClipTransition;
}

export type TransitionType =
  | 'none'
  | 'fade'
  | 'crossfade'
  | 'dissolve'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'wipe-left'
  | 'wipe-right'
  | 'wipe-up'
  | 'wipe-down'
  | 'wipe-circle'
  | 'wipe-diamond'
  | 'zoom-in'
  | 'zoom-out'
  | 'blur-transition'
  | 'flash'
  | 'scale-up'
  | 'scale-down'
  | 'rotate-in'
  | 'rotate-out'
  | 'bounce'
  | 'elastic'
  | 'flip-x'
  | 'flip-y'
  | 'glitch'
  | 'split-horizontal'
  | 'split-vertical'
  | 'iris-open'
  | 'iris-close'
  | 'pixelate'
  | 'swing'
  | 'roll-left'
  | 'roll-right'
  | 'fade-blur'
  | 'morph-scale'
  | 'spiral'
  // --- NEW: Premiere / After Effects style ---
  | 'push-left'
  | 'push-right'
  | 'push-up'
  | 'push-down'
  | 'cover-left'
  | 'cover-right'
  | 'reveal-left'
  | 'reveal-right'
  | 'cross-zoom'
  | 'cross-spin'
  | 'luma-fade'
  | 'light-leak'
  | 'film-burn'
  | 'whip-pan'
  | 'shake'
  | 'stretch-h'
  | 'stretch-v'
  | 'page-curl'
  | 'cube-left'
  | 'cube-right'
  | 'door-open'
  | 'door-close'
  | 'blinds-h'
  | 'blinds-v'
  | 'clock-wipe'
  | 'radial-wipe'
  | 'mosaic'
  | 'color-wipe'
  | 'ripple'
  | 'spin-out'
  | 'tumble'
  | 'drop'
  | 'fly-in'
  | 'fly-out';

export interface TimelineTrack {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'text' | 'effect' | 'canvas' | 'image';
  height: number;
  muted: boolean;
  locked: boolean;
  visible: boolean;
  volume: number;
  solo: boolean;
}

export interface TimelineState {
  tracks: TimelineTrack[];
  clips: TimelineClip[];
  currentTime: number;
  duration: number;
  zoom: number;
  scrollX: number;
  scrollY: number;
  isPlaying: boolean;
  selectedClipIds: string[];
  snapEnabled: boolean;
  fps: number;
}

export interface EffectPreset {
  id: string;
  name: string;
  icon: string;
  category: string;
  filters: Omit<VideoFilter, 'id'>[];
  description?: string;
}

export const TRANSITION_PRESETS: { type: TransitionType; label: string; icon: string; description: string }[] = [
  { type: 'none', label: 'Nenhum', icon: '⬜', description: 'Sem efeito' },
  // Básicas
  { type: 'fade', label: 'Fade', icon: '🌫️', description: 'Aparece/desaparece suavemente' },
  { type: 'dissolve', label: 'Dissolve', icon: '✨', description: 'Dissolução gradual com partículas' },
  { type: 'crossfade', label: 'Crossfade', icon: '🔄', description: 'Transição cruzada entre clipes' },
  { type: 'fade-blur', label: 'Fade + Blur', icon: '🌀', description: 'Fade com desfoque progressivo' },
  // Movimento
  { type: 'slide-left', label: 'Slide ←', icon: '⬅️', description: 'Desliza pela esquerda' },
  { type: 'slide-right', label: 'Slide →', icon: '➡️', description: 'Desliza pela direita' },
  { type: 'slide-up', label: 'Slide ↑', icon: '⬆️', description: 'Desliza por cima' },
  { type: 'slide-down', label: 'Slide ↓', icon: '⬇️', description: 'Desliza por baixo' },
  { type: 'roll-left', label: 'Roll ←', icon: '🎞️', description: 'Rola com rotação lateral' },
  { type: 'roll-right', label: 'Roll →', icon: '📽️', description: 'Rola com rotação lateral' },
  // Escala & Rotação
  { type: 'zoom-in', label: 'Zoom In', icon: '🔍', description: 'Cresce do centro' },
  { type: 'zoom-out', label: 'Zoom Out', icon: '🔎', description: 'Diminui ao centro' },
  { type: 'scale-up', label: 'Pop', icon: '💥', description: 'Aparece com impacto e bounce' },
  { type: 'scale-down', label: 'Encolher', icon: '🫧', description: 'Encolhe suavemente' },
  { type: 'morph-scale', label: 'Morph', icon: '🎭', description: 'Escala com distorção suave' },
  { type: 'rotate-in', label: 'Rotação ↻', icon: '↻', description: 'Gira ao aparecer (horário)' },
  { type: 'rotate-out', label: 'Rotação ↺', icon: '↺', description: 'Gira ao aparecer (anti-horário)' },
  { type: 'spiral', label: 'Espiral', icon: '🌀', description: 'Espiral do centro' },
  { type: 'flip-x', label: 'Flip H', icon: '↔️', description: 'Gira horizontalmente (3D)' },
  { type: 'flip-y', label: 'Flip V', icon: '↕️', description: 'Gira verticalmente (3D)' },
  // Dinâmicas
  { type: 'bounce', label: 'Bounce', icon: '🏀', description: 'Efeito elástico natural' },
  { type: 'elastic', label: 'Elástico', icon: '🎢', description: 'Efeito mola com overshoot' },
  { type: 'swing', label: 'Swing', icon: '🎪', description: 'Balanço pendular' },
  // Revelação
  { type: 'wipe-left', label: 'Wipe ←', icon: '◀️', description: 'Cortina para esquerda' },
  { type: 'wipe-right', label: 'Wipe →', icon: '▶️', description: 'Cortina para direita' },
  { type: 'wipe-up', label: 'Wipe ↑', icon: '🔼', description: 'Cortina para cima' },
  { type: 'wipe-down', label: 'Wipe ↓', icon: '🔽', description: 'Cortina para baixo' },
  { type: 'wipe-circle', label: 'Wipe Círculo', icon: '⭕', description: 'Revelação circular do centro' },
  { type: 'wipe-diamond', label: 'Wipe Losango', icon: '💎', description: 'Revelação em losango' },
  { type: 'iris-open', label: 'Iris Open', icon: '👁️', description: 'Abertura tipo íris de câmera' },
  { type: 'iris-close', label: 'Iris Close', icon: '🔘', description: 'Fechamento tipo íris' },
  { type: 'split-horizontal', label: 'Split H', icon: '↔️', description: 'Divide ao meio horizontalmente' },
  { type: 'split-vertical', label: 'Split V', icon: '↕️', description: 'Divide ao meio verticalmente' },
  // Efeitos Especiais
  { type: 'blur-transition', label: 'Blur', icon: '💫', description: 'Desfoque progressivo' },
  { type: 'flash', label: 'Flash', icon: '⚡', description: 'Lampejo branco cinematográfico' },
  { type: 'glitch', label: 'Glitch', icon: '📺', description: 'Distorção digital RGB' },
  { type: 'pixelate', label: 'Pixelate', icon: '🟩', description: 'Pixelização progressiva' },
];

export const EFFECT_PRESETS: EffectPreset[] = [
  // Cor
  {
    id: 'cinematic', name: 'Cinematográfico', icon: '🎬', category: 'Cor',
    description: 'Look de cinema com contraste alto e tons quentes',
    filters: [
      { type: 'contrast', label: 'Contraste', value: 65, enabled: true },
      { type: 'saturation', label: 'Saturação', value: 40, enabled: true },
      { type: 'brightness', label: 'Brilho', value: 45, enabled: true },
    ],
  },
  {
    id: 'cinematic-teal', name: 'Teal & Orange', icon: '🎥', category: 'Cor',
    description: 'Paleta Hollywood: tons teal nas sombras e laranja na pele',
    filters: [
      { type: 'contrast', label: 'Contraste', value: 62, enabled: true },
      { type: 'saturation', label: 'Saturação', value: 55, enabled: true },
      { type: 'hue-rotate', label: 'Matiz', value: 5, enabled: true },
      { type: 'brightness', label: 'Brilho', value: 48, enabled: true },
    ],
  },
  {
    id: 'vintage', name: 'Vintage', icon: '📷', category: 'Cor',
    description: 'Estilo retrô com sépia e contraste suave',
    filters: [
      { type: 'sepia', label: 'Sépia', value: 40, enabled: true },
      { type: 'contrast', label: 'Contraste', value: 60, enabled: true },
      { type: 'brightness', label: 'Brilho', value: 55, enabled: true },
    ],
  },
  {
    id: 'retro-vhs', name: 'VHS Retro', icon: '📼', category: 'Estilo',
    description: 'Estética de fita VHS dos anos 80/90',
    filters: [
      { type: 'contrast', label: 'Contraste', value: 55, enabled: true },
      { type: 'saturation', label: 'Saturação', value: 65, enabled: true },
      { type: 'brightness', label: 'Brilho', value: 52, enabled: true },
      { type: 'blur', label: 'Blur', value: 3, enabled: true },
    ],
  },
  {
    id: 'bw', name: 'Preto e Branco', icon: '⬛', category: 'Cor',
    description: 'Monocromático clássico com alto contraste',
    filters: [
      { type: 'grayscale', label: 'Cinza', value: 100, enabled: true },
      { type: 'contrast', label: 'Contraste', value: 60, enabled: true },
    ],
  },
  {
    id: 'noir', name: 'Film Noir', icon: '🕵️', category: 'Cor',
    description: 'Noir dramático com sombras profundas',
    filters: [
      { type: 'grayscale', label: 'Cinza', value: 100, enabled: true },
      { type: 'contrast', label: 'Contraste', value: 75, enabled: true },
      { type: 'brightness', label: 'Brilho', value: 42, enabled: true },
    ],
  },
  {
    id: 'vivid', name: 'Vívido', icon: '🌈', category: 'Cor',
    description: 'Cores ultra saturadas e vibrantes',
    filters: [
      { type: 'saturation', label: 'Saturação', value: 85, enabled: true },
      { type: 'contrast', label: 'Contraste', value: 58, enabled: true },
      { type: 'brightness', label: 'Brilho', value: 55, enabled: true },
    ],
  },
  {
    id: 'warm', name: 'Quente', icon: '🔥', category: 'Cor',
    description: 'Tons alaranjados e aconchegantes',
    filters: [
      { type: 'hue-rotate', label: 'Matiz', value: 8, enabled: true },
      { type: 'saturation', label: 'Saturação', value: 60, enabled: true },
      { type: 'brightness', label: 'Brilho', value: 55, enabled: true },
    ],
  },
  {
    id: 'cold', name: 'Frio', icon: '❄️', category: 'Cor',
    description: 'Tons azulados e gélidos',
    filters: [
      { type: 'hue-rotate', label: 'Matiz', value: 60, enabled: true },
      { type: 'saturation', label: 'Saturação', value: 45, enabled: true },
    ],
  },
  {
    id: 'sunset', name: 'Pôr do Sol', icon: '🌅', category: 'Cor',
    description: 'Tons dourados de golden hour',
    filters: [
      { type: 'hue-rotate', label: 'Matiz', value: 6, enabled: true },
      { type: 'saturation', label: 'Saturação', value: 65, enabled: true },
      { type: 'brightness', label: 'Brilho', value: 58, enabled: true },
      { type: 'contrast', label: 'Contraste', value: 52, enabled: true },
    ],
  },
  // Estilo
  {
    id: 'dreamy', name: 'Sonho', icon: '☁️', category: 'Estilo',
    description: 'Visual etéreo e onírico',
    filters: [
      { type: 'blur', label: 'Blur', value: 12, enabled: true },
      { type: 'brightness', label: 'Brilho', value: 62, enabled: true },
      { type: 'saturation', label: 'Saturação', value: 35, enabled: true },
    ],
  },
  {
    id: 'hdr', name: 'HDR', icon: '📸', category: 'Estilo',
    description: 'Alto alcance dinâmico simulado',
    filters: [
      { type: 'contrast', label: 'Contraste', value: 70, enabled: true },
      { type: 'saturation', label: 'Saturação', value: 65, enabled: true },
      { type: 'brightness', label: 'Brilho', value: 52, enabled: true },
      { type: 'sharpen', label: 'Nitidez', value: 40, enabled: true },
    ],
  },
  {
    id: 'matte', name: 'Matte', icon: '🎞️', category: 'Estilo',
    description: 'Pretos suaves estilo cinematográfico',
    filters: [
      { type: 'contrast', label: 'Contraste', value: 45, enabled: true },
      { type: 'brightness', label: 'Brilho', value: 52, enabled: true },
      { type: 'saturation', label: 'Saturação', value: 42, enabled: true },
    ],
  },
  {
    id: 'bleach', name: 'Bleach Bypass', icon: '🧪', category: 'Estilo',
    description: 'Desaturado com contraste dramático',
    filters: [
      { type: 'saturation', label: 'Saturação', value: 25, enabled: true },
      { type: 'contrast', label: 'Contraste', value: 72, enabled: true },
      { type: 'brightness', label: 'Brilho', value: 48, enabled: true },
    ],
  },
  {
    id: 'lomo', name: 'Lomo', icon: '📸', category: 'Estilo',
    description: 'Efeito lomografia com vinheta',
    filters: [
      { type: 'contrast', label: 'Contraste', value: 68, enabled: true },
      { type: 'saturation', label: 'Saturação', value: 70, enabled: true },
      { type: 'brightness', label: 'Brilho', value: 48, enabled: true },
    ],
  },
  {
    id: 'negative', name: 'Negativo', icon: '🔄', category: 'Especial',
    description: 'Inversão total de cores',
    filters: [
      { type: 'invert', label: 'Inverter', value: 100, enabled: true },
    ],
  },
  {
    id: 'xray', name: 'Raio-X', icon: '🦴', category: 'Especial',
    description: 'Efeito radiografia',
    filters: [
      { type: 'invert', label: 'Inverter', value: 100, enabled: true },
      { type: 'grayscale', label: 'Cinza', value: 80, enabled: true },
      { type: 'contrast', label: 'Contraste', value: 70, enabled: true },
    ],
  },
  {
    id: 'cyberpunk', name: 'Cyberpunk', icon: '🌃', category: 'Especial',
    description: 'Neon urbano futurista',
    filters: [
      { type: 'contrast', label: 'Contraste', value: 72, enabled: true },
      { type: 'saturation', label: 'Saturação', value: 80, enabled: true },
      { type: 'hue-rotate', label: 'Matiz', value: 75, enabled: true },
      { type: 'brightness', label: 'Brilho', value: 48, enabled: true },
    ],
  },
];

export const TRACK_COLORS: Record<string, string> = {
  video: '#3b82f6',
  audio: '#22c55e',
  image: '#f97316',
  text: '#f59e0b',
  effect: '#a855f7',
  canvas: '#ec4899',
};

export const DEFAULT_TRACKS: TimelineTrack[] = [
  { id: 'cv1', name: 'Canvas', type: 'canvas', height: 50, muted: false, locked: false, visible: true, volume: 1, solo: false },
  { id: 'img1', name: 'Imagem', type: 'image', height: 50, muted: false, locked: false, visible: true, volume: 1, solo: false },
  { id: 'v1', name: 'Vídeo 1', type: 'video', height: 50, muted: false, locked: false, visible: true, volume: 1, solo: false },
  { id: 'v2', name: 'Vídeo 2', type: 'video', height: 50, muted: false, locked: false, visible: true, volume: 1, solo: false },
  { id: 'a1', name: 'Áudio 1', type: 'audio', height: 50, muted: false, locked: false, visible: true, volume: 1, solo: false },
  { id: 'a2', name: 'Música', type: 'audio', height: 50, muted: false, locked: false, visible: true, volume: 0.7, solo: false },
  { id: 'e1', name: 'Efeitos', type: 'effect', height: 50, muted: false, locked: false, visible: true, volume: 1, solo: false },
];
