// Types for the Video Timeline Editor

export interface TimelineClip {
  id: string;
  trackId: string;
  type: 'video' | 'audio' | 'image' | 'text' | 'effect' | 'canvas';
  name: string;
  startTime: number; // in seconds
  duration: number;
  trimStart: number; // trim from beginning
  trimEnd: number; // trim from end
  src?: string; // URL or data URI
  thumbnail?: string;
  color: string;
  volume?: number; // 0-1 for audio/video
  opacity?: number; // 0-1
  filters?: VideoFilter[];
  transition?: ClipTransition;
  locked?: boolean;
  muted?: boolean;
  canvasJson?: string; // JSON state for canvas compositions
  // Position and scale in the preview canvas (0-100 percentage based)
  x?: number; // left position (%)
  y?: number; // top position (%)
  w?: number; // width (%)
  h?: number; // height (%)
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
  | 'sharpen';

export interface ClipTransition {
  type: TransitionType;
  duration: number; // seconds
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
  | 'zoom-in'
  | 'zoom-out'
  | 'blur-transition'
  | 'flash';

export interface TimelineTrack {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'text' | 'effect' | 'canvas';
  height: number;
  muted: boolean;
  locked: boolean;
  visible: boolean;
  volume: number; // 0-1
  solo: boolean;
}

export interface TimelineState {
  tracks: TimelineTrack[];
  clips: TimelineClip[];
  currentTime: number;
  duration: number;
  zoom: number; // pixels per second
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
}

export const TRANSITION_PRESETS: { type: TransitionType; label: string; icon: string }[] = [
  { type: 'none', label: 'Sem transição', icon: '⬜' },
  { type: 'fade', label: 'Fade', icon: '🌫️' },
  { type: 'crossfade', label: 'Crossfade', icon: '🔀' },
  { type: 'dissolve', label: 'Dissolve', icon: '✨' },
  { type: 'slide-left', label: 'Slide Esquerda', icon: '⬅️' },
  { type: 'slide-right', label: 'Slide Direita', icon: '➡️' },
  { type: 'slide-up', label: 'Slide Cima', icon: '⬆️' },
  { type: 'slide-down', label: 'Slide Baixo', icon: '⬇️' },
  { type: 'wipe-left', label: 'Wipe Esquerda', icon: '🔲' },
  { type: 'wipe-right', label: 'Wipe Direita', icon: '🔳' },
  { type: 'zoom-in', label: 'Zoom In', icon: '🔍' },
  { type: 'zoom-out', label: 'Zoom Out', icon: '🔎' },
  { type: 'blur-transition', label: 'Blur', icon: '💫' },
  { type: 'flash', label: 'Flash', icon: '⚡' },
];

export const EFFECT_PRESETS: EffectPreset[] = [
  {
    id: 'cinematic',
    name: 'Cinematográfico',
    icon: '🎬',
    category: 'Cor',
    filters: [
      { type: 'contrast', label: 'Contraste', value: 65, enabled: true },
      { type: 'saturation', label: 'Saturação', value: 40, enabled: true },
      { type: 'brightness', label: 'Brilho', value: 45, enabled: true },
    ],
  },
  {
    id: 'vintage',
    name: 'Vintage',
    icon: '📷',
    category: 'Cor',
    filters: [
      { type: 'sepia', label: 'Sépia', value: 40, enabled: true },
      { type: 'contrast', label: 'Contraste', value: 60, enabled: true },
      { type: 'brightness', label: 'Brilho', value: 55, enabled: true },
    ],
  },
  {
    id: 'bw',
    name: 'Preto e Branco',
    icon: '⬛',
    category: 'Cor',
    filters: [
      { type: 'grayscale', label: 'Cinza', value: 100, enabled: true },
      { type: 'contrast', label: 'Contraste', value: 60, enabled: true },
    ],
  },
  {
    id: 'vivid',
    name: 'Vívido',
    icon: '🌈',
    category: 'Cor',
    filters: [
      { type: 'saturation', label: 'Saturação', value: 80, enabled: true },
      { type: 'contrast', label: 'Contraste', value: 55, enabled: true },
      { type: 'brightness', label: 'Brilho', value: 55, enabled: true },
    ],
  },
  {
    id: 'dreamy',
    name: 'Sonho',
    icon: '☁️',
    category: 'Estilo',
    filters: [
      { type: 'blur', label: 'Blur', value: 15, enabled: true },
      { type: 'brightness', label: 'Brilho', value: 60, enabled: true },
      { type: 'saturation', label: 'Saturação', value: 35, enabled: true },
    ],
  },
  {
    id: 'negative',
    name: 'Negativo',
    icon: '🔄',
    category: 'Estilo',
    filters: [
      { type: 'invert', label: 'Inverter', value: 100, enabled: true },
    ],
  },
  {
    id: 'warm',
    name: 'Quente',
    icon: '🔥',
    category: 'Cor',
    filters: [
      { type: 'hue-rotate', label: 'Matiz', value: 10, enabled: true },
      { type: 'saturation', label: 'Saturação', value: 60, enabled: true },
      { type: 'brightness', label: 'Brilho', value: 55, enabled: true },
    ],
  },
  {
    id: 'cold',
    name: 'Frio',
    icon: '❄️',
    category: 'Cor',
    filters: [
      { type: 'hue-rotate', label: 'Matiz', value: 60, enabled: true },
      { type: 'saturation', label: 'Saturação', value: 45, enabled: true },
    ],
  },
];

export const TRACK_COLORS: Record<string, string> = {
  video: '#3b82f6',
  audio: '#22c55e',
  text: '#f59e0b',
  effect: '#a855f7',
  canvas: '#ec4899',
};

export const DEFAULT_TRACKS: TimelineTrack[] = [
  { id: 'v1', name: 'Vídeo 1', type: 'video', height: 60, muted: false, locked: false, visible: true, volume: 1, solo: false },
  { id: 'v2', name: 'Vídeo 2', type: 'video', height: 60, muted: false, locked: false, visible: true, volume: 1, solo: false },
  { id: 'cv1', name: 'Canvas', type: 'canvas', height: 60, muted: false, locked: false, visible: true, volume: 1, solo: false },
  { id: 'a1', name: 'Áudio 1', type: 'audio', height: 50, muted: false, locked: false, visible: true, volume: 1, solo: false },
  { id: 'a2', name: 'Música', type: 'audio', height: 50, muted: false, locked: false, visible: true, volume: 0.7, solo: false },
  { id: 't1', name: 'Texto', type: 'text', height: 40, muted: false, locked: false, visible: true, volume: 1, solo: false },
  { id: 'e1', name: 'Efeitos', type: 'effect', height: 40, muted: false, locked: false, visible: true, volume: 1, solo: false },
];
