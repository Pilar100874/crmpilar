import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Wand2, Zap, Eye, X, ArrowRightToLine, ArrowLeftFromLine, Clock,
  RotateCcw, Plus, Play, Pause, RefreshCw
} from 'lucide-react';
import { TimelineClip, EFFECT_PRESETS, TRANSITION_PRESETS, VideoFilter, TransitionType, ClipTransition, FilterType } from './types';
import TransitionPreviewThumb from './TransitionPreviewThumb';

interface Props {
  selectedClip: TimelineClip;
  onUpdateClip: (id: string, updates: Partial<TimelineClip>) => void;
  onPreviewTransition?: (clipId: string, phase: 'entrance' | 'exit') => void;
  onToggleFilterPreview?: (active: boolean) => void;
  onClose: () => void;
  onSimulate?: (active: boolean) => void;
  isSimulating?: boolean;
}

const TRANSITION_CATEGORIES = [
  { id: 'basic', label: 'Básicas', icon: '✨', types: ['fade', 'dissolve', 'crossfade', 'fade-blur'] as TransitionType[] },
  { id: 'movement', label: 'Movimento', icon: '🔀', types: ['slide-left', 'slide-right', 'slide-up', 'slide-down', 'roll-left', 'roll-right'] as TransitionType[] },
  { id: 'scale', label: 'Escala & Rotação', icon: '🔍', types: ['zoom-in', 'zoom-out', 'scale-up', 'scale-down', 'morph-scale', 'rotate-in', 'rotate-out', 'spiral', 'flip-x', 'flip-y'] as TransitionType[] },
  { id: 'dynamic', label: 'Dinâmicas', icon: '🎢', types: ['bounce', 'elastic', 'swing'] as TransitionType[] },
  { id: 'reveal', label: 'Revelação & Wipe', icon: '🎭', types: ['wipe-left', 'wipe-right', 'wipe-up', 'wipe-down', 'wipe-circle', 'wipe-diamond', 'iris-open', 'iris-close', 'split-horizontal', 'split-vertical'] as TransitionType[] },
  { id: 'special', label: 'Efeitos Especiais', icon: '⚡', types: ['blur-transition', 'flash', 'glitch', 'pixelate'] as TransitionType[] },
];

const FILTER_CATEGORIES = [
  { id: 'cor', label: 'Cor', presets: ['cinematic', 'cinematic-teal', 'vintage', 'vivid', 'warm', 'cold', 'sunset', 'bw', 'noir'] },
  { id: 'estilo', label: 'Estilo', presets: ['dreamy', 'hdr', 'matte', 'bleach', 'lomo', 'retro-vhs'] },
  { id: 'especial', label: 'Especial', presets: ['negative', 'xray', 'cyberpunk'] },
];

const INDIVIDUAL_FILTERS: { type: FilterType; label: string; icon: string; defaultValue: number }[] = [
  { type: 'brightness', label: 'Brilho', icon: '☀️', defaultValue: 50 },
  { type: 'contrast', label: 'Contraste', icon: '◐', defaultValue: 50 },
  { type: 'saturation', label: 'Saturação', icon: '🎨', defaultValue: 50 },
  { type: 'hue-rotate', label: 'Matiz', icon: '🌈', defaultValue: 0 },
  { type: 'blur', label: 'Desfoque', icon: '💫', defaultValue: 0 },
  { type: 'grayscale', label: 'Escala Cinza', icon: '⬜', defaultValue: 0 },
  { type: 'sepia', label: 'Sépia', icon: '📜', defaultValue: 0 },
  { type: 'invert', label: 'Inverter', icon: '🔄', defaultValue: 0 },
  { type: 'opacity', label: 'Opacidade', icon: '👁️', defaultValue: 100 },
  { type: 'drop-shadow', label: 'Sombra', icon: '🌑', defaultValue: 0 },
];

const EASING_OPTIONS = [
  { value: 'ease-out', label: 'Suave' },
  { value: 'ease-in', label: 'Acelerado' },
  { value: 'ease-in-out', label: 'Suave Duplo' },
  { value: 'linear', label: 'Linear' },
  { value: 'elastic', label: 'Elástico' },
];

// === Transition animation style calculator (mirrors VideoPreview) ===
function getTransitionStyle(type: TransitionType, progress: number, isExit: boolean): React.CSSProperties {
  const p = isExit ? 1 - progress : progress;
  switch (type) {
    case 'fade': return { opacity: p };
    case 'dissolve': return { opacity: p };
    case 'crossfade': return { opacity: p };
    case 'fade-blur': return { opacity: p, filter: `blur(${(1 - p) * 12}px)` };
    case 'slide-left': return { transform: `translateX(${(1 - p) * 100}%)`, opacity: Math.min(1, p * 2) };
    case 'slide-right': return { transform: `translateX(${(1 - p) * -100}%)`, opacity: Math.min(1, p * 2) };
    case 'slide-up': return { transform: `translateY(${(1 - p) * 100}%)`, opacity: Math.min(1, p * 2) };
    case 'slide-down': return { transform: `translateY(${(1 - p) * -100}%)`, opacity: Math.min(1, p * 2) };
    case 'roll-left': return { transform: `translateX(${(1 - p) * 100}%) rotate(${(1 - p) * 45}deg)`, opacity: p };
    case 'roll-right': return { transform: `translateX(${(1 - p) * -100}%) rotate(${(1 - p) * -45}deg)`, opacity: p };
    case 'zoom-in': return { transform: `scale(${0.3 + p * 0.7})`, opacity: p };
    case 'zoom-out': return { transform: `scale(${1 + (1 - p) * 0.5})`, opacity: p };
    case 'scale-up': { const b = p < 0.7 ? p / 0.7 : 1 + Math.sin((p - 0.7) / 0.3 * Math.PI) * 0.1; return { transform: `scale(${b * 0.5 + 0.5})`, opacity: Math.min(1, p * 1.5) }; }
    case 'scale-down': return { transform: `scale(${1 + (1 - p) * 0.3})`, opacity: p };
    case 'morph-scale': return { transform: `scale(${0.5 + p * 0.5}) scaleX(${0.7 + p * 0.3})`, opacity: p };
    case 'rotate-in': return { transform: `rotate(${(1 - p) * 90}deg) scale(${0.5 + p * 0.5})`, opacity: p };
    case 'rotate-out': return { transform: `rotate(${(1 - p) * -90}deg) scale(${0.5 + p * 0.5})`, opacity: p };
    case 'spiral': return { transform: `rotate(${(1 - p) * 360}deg) scale(${p})`, opacity: p };
    case 'flip-x': return { transform: `perspective(800px) rotateY(${(1 - p) * 90}deg)`, opacity: Math.min(1, p * 1.5) };
    case 'flip-y': return { transform: `perspective(800px) rotateX(${(1 - p) * 90}deg)`, opacity: Math.min(1, p * 1.5) };
    case 'bounce': { const e = p < 1 ? 1 - Math.pow(2, -10 * p) * Math.cos((p * 10 - 0.75) * (2 * Math.PI) / 3) : 1; return { transform: `scale(${e})`, opacity: Math.min(1, p * 2) }; }
    case 'elastic': { const e = p < 1 ? 1 - Math.pow(2, -8 * p) * Math.cos((p * 12 - 0.5) * (2 * Math.PI) / 3) : 1; return { transform: `scaleX(${e}) scaleY(${2 - e})`, opacity: Math.min(1, p * 2) }; }
    case 'swing': return { transform: `rotate(${Math.sin(p * Math.PI * 3) * (1 - p) * 25}deg)`, opacity: p };
    case 'wipe-left': return { clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` };
    case 'wipe-right': return { clipPath: `inset(0 0 0 ${(1 - p) * 100}%)` };
    case 'wipe-up': return { clipPath: `inset(${(1 - p) * 100}% 0 0 0)` };
    case 'wipe-down': return { clipPath: `inset(0 0 ${(1 - p) * 100}% 0)` };
    case 'wipe-circle': return { clipPath: `circle(${p * 75}% at 50% 50%)` };
    case 'wipe-diamond': return { clipPath: `polygon(50% ${50 - p * 50}%, ${50 + p * 50}% 50%, 50% ${50 + p * 50}%, ${50 - p * 50}% 50%)` };
    case 'iris-open': return { clipPath: `circle(${p * 72}% at 50% 50%)` };
    case 'iris-close': return { clipPath: `circle(${(1 - p) * 72}% at 50% 50%)` };
    case 'split-horizontal': return { clipPath: `inset(${(1 - p) * 50}% 0)` };
    case 'split-vertical': return { clipPath: `inset(0 ${(1 - p) * 50}%)` };
    case 'blur-transition': return { filter: `blur(${(1 - p) * 15}px)`, opacity: p };
    case 'flash': return { opacity: p, filter: `brightness(${1 + (1 - p) * 3})` };
    case 'glitch': { const offset = Math.sin(p * 30) * (1 - p) * 8; return { transform: `translateX(${offset}px)`, opacity: 0.6 + p * 0.4, filter: `hue-rotate(${(1 - p) * 120}deg)` }; }
    case 'pixelate': return { filter: `blur(${(1 - p) * 8}px)`, opacity: p };
    default: return {};
  }
}

// === Build CSS filter string from clip filters ===
function buildFilterCss(filters: VideoFilter[] | undefined): string {
  if (!filters?.length) return 'none';
  return filters.filter(f => f.enabled).map(f => {
    switch (f.type) {
      case 'brightness': return `brightness(${f.value / 50})`;
      case 'contrast': return `contrast(${f.value / 50})`;
      case 'saturation': return `saturate(${f.value / 50})`;
      case 'hue-rotate': return `hue-rotate(${f.value * 3.6}deg)`;
      case 'blur': return `blur(${f.value / 10}px)`;
      case 'grayscale': return `grayscale(${f.value}%)`;
      case 'sepia': return `sepia(${f.value}%)`;
      case 'invert': return `invert(${f.value}%)`;
      case 'opacity': return `opacity(${f.value}%)`;
      case 'drop-shadow': return `drop-shadow(0 ${f.value / 10}px ${f.value / 5}px rgba(0,0,0,0.5))`;
      default: return '';
    }
  }).filter(Boolean).join(' ') || 'none';
}

// === Mini Transition Preview Component ===
const MiniTransitionPreview: React.FC<{
  type: TransitionType | undefined;
  isExit: boolean;
  clipSrc?: string;
  clipType?: string;
}> = ({ type, isExit, clipSrc, clipType }) => {
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(true);
  const rafRef = useRef<number>(0);
  const startRef = useRef(performance.now());

  const restart = useCallback(() => {
    startRef.current = performance.now();
    setPlaying(true);
  }, []);

  useEffect(() => {
    restart();
  }, [type, isExit, restart]);

  useEffect(() => {
    if (!playing || !type || type === 'none') return;
    const duration = 1500; // 1.5s animation loop
    const animate = () => {
      const elapsed = performance.now() - startRef.current;
      const p = Math.min(elapsed / duration, 1);
      setProgress(p);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        // Pause 600ms at end, then loop
        setTimeout(() => {
          startRef.current = performance.now();
          rafRef.current = requestAnimationFrame(animate);
        }, 600);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, type]);

  if (!type || type === 'none') {
    return (
      <div className="w-full h-24 rounded-lg bg-muted/40 flex items-center justify-center">
        <p className="text-[10px] text-muted-foreground">Selecione uma transição para simular</p>
      </div>
    );
  }

  const style = getTransitionStyle(type, progress, isExit);
  const hasThumbnail = clipSrc && (clipType === 'image' || clipType === 'canvas');

  return (
    <div className="w-full h-28 rounded-lg bg-muted/60 overflow-hidden relative">
      {/* Background checkerboard */}
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-conic-gradient(hsl(var(--muted-foreground)) 0% 25%, transparent 0% 50%)', backgroundSize: '12px 12px' }} />

      {/* Animated element */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[85%] h-[85%] rounded-md overflow-hidden" style={style}>
          {hasThumbnail ? (
            <img src={clipSrc} alt="preview" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/80 via-primary/50 to-primary/30 flex items-center justify-center">
              <span className="text-primary-foreground/80 text-lg font-bold">{isExit ? '🎬 Saída' : '🎬 Entrada'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/40">
        <div className="h-full bg-primary/60 transition-none" style={{ width: `${progress * 100}%` }} />
      </div>

      {/* Replay button */}
      <button
        onClick={restart}
        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
        title="Repetir"
      >
        <RefreshCw className="h-3 w-3 text-muted-foreground" />
      </button>

      {/* Label */}
      <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-background/70 backdrop-blur-sm">
        <span className="text-[8px] font-medium text-muted-foreground">
          {TRANSITION_PRESETS.find(p => p.type === type)?.label} · {isExit ? 'Saída' : 'Entrada'}
        </span>
      </div>
    </div>
  );
};

// === Mini Filter Preview Component ===
const MiniFilterPreview: React.FC<{
  filters: VideoFilter[] | undefined;
  clipSrc?: string;
  clipType?: string;
}> = ({ filters, clipSrc, clipType }) => {
  const filterCss = buildFilterCss(filters);
  const hasFilters = filters && filters.length > 0;
  const hasThumbnail = clipSrc && (clipType === 'image' || clipType === 'canvas');

  const sampleContent = hasThumbnail ? (
    <img src={clipSrc} alt="preview" className="w-full h-full object-cover" />
  ) : (
    <div className="w-full h-full bg-gradient-to-br from-primary/70 via-accent/40 to-secondary/60 flex items-center justify-center">
      <div className="text-center">
        <span className="text-2xl">🎬</span>
        <p className="text-[8px] text-primary-foreground/70 font-medium mt-0.5">Exemplo</p>
      </div>
    </div>
  );

  if (!hasFilters) {
    return (
      <div className="w-full h-24 rounded-lg bg-muted/40 flex items-center justify-center">
        <p className="text-[10px] text-muted-foreground">Aplique filtros para ver a simulação</p>
      </div>
    );
  }

  return (
    <div className="w-full h-28 rounded-lg overflow-hidden relative flex">
      {/* Before */}
      <div className="flex-1 relative overflow-hidden border-r border-background/50">
        {sampleContent}
        <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-background/70 backdrop-blur-sm">
          <span className="text-[7px] font-semibold text-muted-foreground uppercase tracking-wider">Original</span>
        </div>
      </div>
      {/* After */}
      <div className="flex-1 relative overflow-hidden" style={{ filter: filterCss }}>
        {sampleContent}
        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-background/70 backdrop-blur-sm">
          <span className="text-[7px] font-semibold text-primary uppercase tracking-wider">Com Filtros</span>
        </div>
      </div>
      {/* Center divider */}
      <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-background/80 z-10" />
    </div>
  );
};

// === Main Toolbar ===
const FloatingEffectsToolbar: React.FC<Props> = ({
  selectedClip, onUpdateClip, onPreviewTransition, onToggleFilterPreview, onClose, onSimulate, isSimulating
}) => {
  const [transitionPhase, setTransitionPhase] = useState<'entrance' | 'exit'>('entrance');
  const [transitionPhase, setTransitionPhase] = useState<'entrance' | 'exit'>('entrance');

  const isVisual = ['video', 'image', 'canvas'].includes(selectedClip.type);
  const entranceTransition = selectedClip.transitions?.entrance;
  const exitTransition = selectedClip.transitions?.exit;
  const hasTransitions = (entranceTransition && entranceTransition.type !== 'none') || (exitTransition && exitTransition.type !== 'none');
  const hasFilters = (selectedClip.filters?.length ?? 0) > 0;

  const setTransition = (phase: 'entrance' | 'exit', type: TransitionType) => {
    const current = selectedClip.transitions || {};
    if (type === 'none') {
      onUpdateClip(selectedClip.id, { transitions: { ...current, [phase]: undefined } });
    } else {
      onUpdateClip(selectedClip.id, {
        transitions: { ...current, [phase]: { type, duration: current[phase]?.duration || 0.5, easing: current[phase]?.easing || 'ease-out' } },
      });
    }
  };

  const setTransitionDuration = (phase: 'entrance' | 'exit', duration: number) => {
    const current = selectedClip.transitions || {};
    if (!current[phase]) return;
    onUpdateClip(selectedClip.id, { transitions: { ...current, [phase]: { ...current[phase]!, duration } } });
  };

  const setTransitionEasing = (phase: 'entrance' | 'exit', easing: string) => {
    const current = selectedClip.transitions || {};
    if (!current[phase]) return;
    onUpdateClip(selectedClip.id, { transitions: { ...current, [phase]: { ...current[phase]!, easing } } });
  };

  const removeTransition = (phase: 'entrance' | 'exit') => {
    const current = selectedClip.transitions || {};
    onUpdateClip(selectedClip.id, { transitions: { ...current, [phase]: undefined } });
  };

  const applyPreset = (presetId: string) => {
    const preset = EFFECT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const filters: VideoFilter[] = preset.filters.map((f, i) => ({ ...f, id: `f_${Date.now()}_${i}` }));
    onUpdateClip(selectedClip.id, { filters });
  };

  const addFilter = (type: FilterType) => {
    const def = INDIVIDUAL_FILTERS.find(f => f.type === type);
    if (!def) return;
    const existing = selectedClip.filters || [];
    if (existing.some(f => f.type === type)) return;
    onUpdateClip(selectedClip.id, {
      filters: [...existing, { id: `f_${Date.now()}`, type, label: def.label, value: def.defaultValue, enabled: true }],
    });
  };

  const updateFilter = (filterId: string, updates: Partial<VideoFilter>) => {
    onUpdateClip(selectedClip.id, {
      filters: (selectedClip.filters || []).map((f) => f.id === filterId ? { ...f, ...updates } : f),
    });
  };

  const removeFilter = (filterId: string) => {
    onUpdateClip(selectedClip.id, { filters: (selectedClip.filters || []).filter((f) => f.id !== filterId) });
  };

  const resetFilters = () => {
    onUpdateClip(selectedClip.id, { filters: [] });
  };

  const clipIcon = selectedClip.type === 'video' ? '🎬' : selectedClip.type === 'image' ? '🖼️' : selectedClip.type === 'canvas' ? '🎨' : '🔊';
  const activeTransition = transitionPhase === 'entrance' ? entranceTransition : exitTransition;

  return (
    <div className="fixed bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100vw-1rem)] sm:w-auto sm:max-w-[95vw] animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 duration-200">
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-1 sm:gap-1.5 bg-background/95 backdrop-blur-xl border border-border/60 rounded-full px-2 sm:px-3 py-1.5 sm:py-2 shadow-2xl shadow-black/20 ring-1 ring-white/10 min-w-max">

          {/* Clip info */}
          <div className="flex items-center gap-1 sm:gap-1.5 pr-1.5 sm:pr-2 border-r border-border/40">
            <span className="text-xs sm:text-sm">{clipIcon}</span>
            <span className="text-[9px] sm:text-[10px] font-semibold truncate max-w-[60px] sm:max-w-[100px]">{selectedClip.name}</span>
            <span className="text-[8px] sm:text-[9px] text-muted-foreground hidden sm:inline">{selectedClip.duration.toFixed(1)}s</span>
          </div>

          {/* Transitions Popover */}
          {isVisual && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={hasTransitions ? 'default' : 'ghost'} size="sm" className="h-7 sm:h-8 px-2 sm:px-3 rounded-full gap-1 sm:gap-1.5">
                  <Zap className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
                  <span className="text-[10px] sm:text-xs">Transições</span>
                  {hasTransitions && <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[calc(100vw-1rem)] sm:w-[420px] p-0" side="top" align="center">
                {/* === LIVE SIMULATION PREVIEW === */}
                <div className="p-2 border-b bg-muted/10">
                  <MiniTransitionPreview
                    type={activeTransition?.type}
                    isExit={transitionPhase === 'exit'}
                    clipSrc={selectedClip.src}
                    clipType={selectedClip.type}
                  />
                </div>

                <div className="p-3 border-b bg-muted/20">
                  {/* Phase toggle */}
                  <div className="flex rounded-lg border overflow-hidden">
                    <button
                      onClick={() => setTransitionPhase('entrance')}
                      className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium transition-colors border-r ${
                        transitionPhase === 'entrance' ? 'bg-emerald-500/15 text-emerald-600' : 'hover:bg-muted/50'
                      }`}
                    >
                      <ArrowRightToLine className="h-3 w-3" /> Entrada
                      {entranceTransition && entranceTransition.type !== 'none' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                    </button>
                    <button
                      onClick={() => setTransitionPhase('exit')}
                      className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium transition-colors ${
                        transitionPhase === 'exit' ? 'bg-amber-500/15 text-amber-600' : 'hover:bg-muted/50'
                      }`}
                    >
                      <ArrowLeftFromLine className="h-3 w-3" /> Saída
                      {exitTransition && exitTransition.type !== 'none' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                    </button>
                  </div>

                  {/* Active transition controls */}
                  {activeTransition && activeTransition.type !== 'none' && (
                    <div className="mt-2 rounded-lg border p-2 space-y-1.5 bg-background/60">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <TransitionPreviewThumb type={activeTransition.type} isExit={transitionPhase === 'exit'} isActive size={28} />
                          <span className="text-[10px] font-semibold">{TRANSITION_PRESETS.find(p => p.type === activeTransition.type)?.label}</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onPreviewTransition?.(selectedClip.id, transitionPhase)} title="Simular no preview principal">
                            <Play className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeTransition(transitionPhase)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[9px] text-muted-foreground w-7">{activeTransition.duration.toFixed(1)}s</span>
                        <Slider value={[activeTransition.duration]} onValueChange={([v]) => setTransitionDuration(transitionPhase, v)} min={0.1} max={3} step={0.1} className="flex-1" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Zap className="h-3 w-3 text-muted-foreground" />
                        <Select value={activeTransition.easing || 'ease-out'} onValueChange={(e) => setTransitionEasing(transitionPhase, e)}>
                          <SelectTrigger className="h-6 text-[9px] flex-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {EASING_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value} className="text-[10px]">{opt.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                <ScrollArea className="max-h-[40vh] sm:max-h-[50vh]">
                  <div className="p-2 space-y-2">
                    {TRANSITION_CATEGORIES.map(cat => {
                      const presets = TRANSITION_PRESETS.filter(p => cat.types.includes(p.type));
                      const activeType = transitionPhase === 'entrance' ? entranceTransition?.type : exitTransition?.type;

                      return (
                        <div key={cat.id}>
                          <div className="flex items-center gap-1.5 px-1 mb-1">
                            <span className="text-xs">{cat.icon}</span>
                            <span className="text-[10px] font-semibold text-muted-foreground">{cat.label}</span>
                            <span className="text-[8px] text-muted-foreground/60">({presets.length})</span>
                          </div>
                          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                            {presets.map(preset => {
                              const isActive = activeType === preset.type;
                              return (
                                <button
                                  key={preset.type}
                                  onClick={() => setTransition(transitionPhase, preset.type)}
                                  className={`flex-shrink-0 flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-all w-[72px] ${
                                    isActive ? 'border-primary bg-primary/10 ring-1 ring-primary/30 shadow-sm' : 'border-border/50 hover:border-border hover:bg-muted/40'
                                  }`}
                                >
                                  <TransitionPreviewThumb type={preset.type} isExit={transitionPhase === 'exit'} isActive={isActive} size={40} />
                                  <span className="text-[8px] font-medium leading-tight text-center truncate w-full">{preset.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
          )}

          <div className="h-4 sm:h-5 w-px bg-border/40" />

          {/* Filters Popover */}
          <Popover>
              <PopoverTrigger asChild>
                <Button variant={hasFilters ? 'default' : 'ghost'} size="sm" className="h-7 sm:h-8 px-2 sm:px-3 rounded-full gap-1 sm:gap-1.5">
                  <Wand2 className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
                  <span className="text-[10px] sm:text-xs">Filtros</span>
                  {hasFilters && <span className="text-[8px] sm:text-[9px] bg-primary-foreground/20 px-1 sm:px-1.5 rounded-full">{selectedClip.filters?.length}</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[calc(100vw-1rem)] sm:w-[400px] p-0" side="top" align="center">
              {/* === LIVE FILTER SIMULATION === */}
              <div className="p-2 border-b bg-muted/10">
                <MiniFilterPreview
                  filters={selectedClip.filters}
                  clipSrc={selectedClip.src}
                  clipType={selectedClip.type}
                />
              </div>

              <div className="p-3 border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold flex items-center gap-1.5">
                    <Wand2 className="h-3.5 w-3.5 text-primary" /> Filtros & Presets
                  </p>
                  <Button size="sm" variant="ghost" className="text-[9px] h-6 gap-1" onClick={resetFilters} disabled={!hasFilters}>
                    <RotateCcw className="h-3 w-3" /> Resetar
                  </Button>
                </div>
              </div>

              <ScrollArea className="max-h-[40vh] sm:max-h-[50vh]">
                <div className="p-2 space-y-2">
                  {/* Presets by category - horizontal scroll */}
                  {FILTER_CATEGORIES.map(cat => {
                    const presets = EFFECT_PRESETS.filter(p => cat.presets.includes(p.id));
                    return (
                      <div key={cat.id}>
                        <div className="flex items-center gap-1.5 px-1 mb-1">
                          <span className="text-[10px] font-semibold text-muted-foreground">{cat.label}</span>
                          <span className="text-[8px] text-muted-foreground/60">({presets.length})</span>
                        </div>
                        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                          {presets.map(preset => (
                            <button
                              key={preset.id}
                              onClick={() => applyPreset(preset.id)}
                              className="flex-shrink-0 flex flex-col items-center gap-1 p-2 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all w-[72px]"
                              title={preset.description}
                            >
                              <span className="text-lg leading-none">{preset.icon}</span>
                              <span className="text-[8px] font-medium leading-tight text-center truncate w-full">{preset.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Add individual filter - horizontal scroll */}
                  <div>
                    <div className="flex items-center gap-1 px-1 mb-1">
                      <Plus className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] font-semibold text-muted-foreground">Filtro Individual</span>
                    </div>
                    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                      {INDIVIDUAL_FILTERS.map(f => {
                        const alreadyAdded = selectedClip.filters?.some(ef => ef.type === f.type);
                        return (
                          <button
                            key={f.type}
                            onClick={() => addFilter(f.type)}
                            disabled={alreadyAdded}
                            className={`flex-shrink-0 flex flex-col items-center gap-1 p-2 rounded-lg border transition-all w-[64px] ${
                              alreadyAdded ? 'opacity-40 cursor-not-allowed border-border/30' : 'border-border/50 hover:border-primary/50 hover:bg-primary/5 cursor-pointer'
                            }`}
                          >
                            <span className="text-lg leading-none">{f.icon}</span>
                            <span className="text-[8px] font-medium leading-tight text-center">{f.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Active filters with sliders */}
                  {hasFilters && (
                    <div className="border rounded-lg p-2">
                      <Label className="text-[10px] font-semibold mb-1.5 flex items-center gap-1">
                        <Wand2 className="h-3 w-3" /> Ativos ({selectedClip.filters?.length})
                      </Label>
                      <div className="space-y-1.5">
                        {selectedClip.filters!.map((filter) => {
                          const def = INDIVIDUAL_FILTERS.find(f => f.type === filter.type);
                          return (
                            <div key={filter.id} className="border rounded-md p-1.5 space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs">{def?.icon || '🔧'}</span>
                                  <span className="text-[9px] font-medium">{filter.label}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-[8px] text-muted-foreground tabular-nums w-6 text-right">{filter.value}%</span>
                                  <Switch checked={filter.enabled} onCheckedChange={(v) => updateFilter(filter.id, { enabled: v })} />
                                  <button onClick={() => removeFilter(filter.id)} className="text-destructive hover:text-destructive/80 transition-colors">
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                              <Slider
                                value={[filter.value]}
                                onValueChange={([v]) => updateFilter(filter.id, { value: v })}
                                min={0} max={100} step={1}
                                disabled={!filter.enabled}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>

          <div className="h-4 sm:h-5 w-px bg-border/40" />

          {/* Simulate in main preview */}
          <Button
            variant={isSimulating ? 'default' : 'outline'}
            size="sm"
            className="h-7 sm:h-8 px-2 sm:px-3 rounded-full gap-1 sm:gap-1.5"
            onClick={() => {
              onSimulate?.(!isSimulating);
              onToggleFilterPreview?.(!isSimulating);
            }}
            disabled={!hasFilters && !hasTransitions}
            title="Simular efeitos no preview principal"
          >
            {isSimulating ? <Pause className="h-3 sm:h-3.5 w-3 sm:w-3.5" /> : <Eye className="h-3 sm:h-3.5 w-3 sm:w-3.5" />}
            <span className="text-[10px] sm:text-xs">{isSimulating ? 'Simulando' : 'Preview'}</span>
          </Button>

          <div className="h-4 sm:h-5 w-px bg-border/40" />

          {/* Close */}
          <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 rounded-full hover:bg-destructive/10 hover:text-destructive" onClick={onClose}>
            <X className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FloatingEffectsToolbar;
