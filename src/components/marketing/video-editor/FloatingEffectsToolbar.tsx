import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sparkles, Wand2, Zap, Eye, X, ArrowRightToLine, ArrowLeftFromLine, Clock,
  RotateCcw, Plus, ChevronDown, ChevronRight, Play, Pause
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

const FloatingEffectsToolbar: React.FC<Props> = ({
  selectedClip, onUpdateClip, onPreviewTransition, onToggleFilterPreview, onClose, onSimulate, isSimulating
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({ basic: true });
  const [expandedFilterCats, setExpandedFilterCats] = useState<Record<string, boolean>>({ cor: true, estilo: true, especial: true });
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
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] max-w-[95vw] animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 duration-200">
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-1.5 bg-background/95 backdrop-blur-xl border border-border/60 rounded-full px-3 py-2 shadow-2xl shadow-black/20 ring-1 ring-white/10 min-w-max">

          {/* Clip info */}
          <div className="flex items-center gap-1.5 pr-2 border-r border-border/40">
            <span className="text-sm">{clipIcon}</span>
            <span className="text-[10px] font-semibold truncate max-w-[100px]">{selectedClip.name}</span>
            <span className="text-[9px] text-muted-foreground">{selectedClip.duration.toFixed(1)}s</span>
          </div>

          {/* Transitions Popover */}
          {isVisual && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={hasTransitions ? 'default' : 'ghost'} size="sm" className="h-8 px-3 rounded-full gap-1.5">
                  <Zap className="h-3.5 w-3.5" />
                  <span className="text-xs">Transições</span>
                  {hasTransitions && <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" side="top" align="center">
                <div className="p-3 border-b bg-muted/20">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-primary" /> Transições
                    </p>
                  </div>
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
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onPreviewTransition?.(selectedClip.id, transitionPhase)} title="Simular">
                            <Eye className="h-3 w-3" />
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

                <ScrollArea className="max-h-[320px]">
                  <div className="p-2 space-y-1.5">
                    {TRANSITION_CATEGORIES.map(cat => {
                      const isExpanded = expandedCategories[cat.id] !== false;
                      const presets = TRANSITION_PRESETS.filter(p => cat.types.includes(p.type));
                      const activeType = transitionPhase === 'entrance' ? entranceTransition?.type : exitTransition?.type;
                      const hasActive = presets.some(p => p.type === activeType);

                      return (
                        <div key={cat.id} className={`border rounded-lg overflow-hidden ${hasActive ? 'border-primary/30' : ''}`}>
                          <button
                            onClick={() => setExpandedCategories(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))}
                            className="w-full flex items-center gap-1.5 px-2.5 py-1.5 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                          >
                            {isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                            <span className="text-xs">{cat.icon}</span>
                            <span className="text-[10px] font-semibold flex-1">{cat.label}</span>
                            {hasActive && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                            <span className="text-[8px] text-muted-foreground">{presets.length}</span>
                          </button>
                          {isExpanded && (
                            <div className="grid grid-cols-4 gap-1 p-1.5">
                              {presets.map(preset => {
                                const isActive = activeType === preset.type;
                                return (
                                  <button
                                    key={preset.type}
                                    onClick={() => setTransition(transitionPhase, preset.type)}
                                    className={`flex flex-col items-center gap-0.5 p-1.5 rounded-md border transition-all ${
                                      isActive ? 'border-primary bg-primary/10 ring-1 ring-primary/30 shadow-sm' : 'border-border/50 hover:border-border hover:bg-muted/40'
                                    }`}
                                  >
                                    <TransitionPreviewThumb type={preset.type} isExit={transitionPhase === 'exit'} isActive={isActive} size={36} />
                                    <span className="text-[7px] font-medium leading-tight">{preset.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
          )}

          <div className="h-5 w-px bg-border/40" />

          {/* Filters Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={hasFilters ? 'default' : 'ghost'} size="sm" className="h-8 px-3 rounded-full gap-1.5">
                <Wand2 className="h-3.5 w-3.5" />
                <span className="text-xs">Filtros</span>
                {hasFilters && <span className="text-[9px] bg-primary-foreground/20 px-1.5 rounded-full">{selectedClip.filters?.length}</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[380px] p-0" side="top" align="center">
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

              <ScrollArea className="max-h-[380px]">
                <div className="p-2 space-y-2">
                  {/* Presets by category */}
                  {FILTER_CATEGORIES.map(cat => {
                    const isExpanded = expandedFilterCats[cat.id] !== false;
                    const presets = EFFECT_PRESETS.filter(p => cat.presets.includes(p.id));
                    return (
                      <div key={cat.id} className="border rounded-lg overflow-hidden">
                        <button
                          onClick={() => setExpandedFilterCats(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))}
                          className="w-full flex items-center gap-1.5 px-2.5 py-1.5 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                        >
                          {isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                          <span className="text-[10px] font-semibold flex-1">{cat.label}</span>
                          <span className="text-[8px] text-muted-foreground">{presets.length}</span>
                        </button>
                        {isExpanded && (
                          <div className="grid grid-cols-3 gap-1 p-1.5">
                            {presets.map(preset => (
                              <button
                                key={preset.id}
                                onClick={() => applyPreset(preset.id)}
                                className="flex flex-col items-center gap-0.5 p-1.5 rounded-md border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all text-center"
                                title={preset.description}
                              >
                                <span className="text-sm leading-none">{preset.icon}</span>
                                <span className="text-[8px] font-medium leading-tight">{preset.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Add individual filter */}
                  <div className="border rounded-lg p-2">
                    <Label className="text-[10px] font-semibold flex items-center gap-1 mb-1.5">
                      <Plus className="h-3 w-3" /> Filtro Individual
                    </Label>
                    <div className="grid grid-cols-2 gap-1">
                      {INDIVIDUAL_FILTERS.map(f => {
                        const alreadyAdded = selectedClip.filters?.some(ef => ef.type === f.type);
                        return (
                          <button
                            key={f.type}
                            onClick={() => addFilter(f.type)}
                            disabled={alreadyAdded}
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-medium border transition-all ${
                              alreadyAdded ? 'opacity-40 cursor-not-allowed border-border/30' : 'border-border/50 hover:border-primary/50 hover:bg-primary/5 cursor-pointer'
                            }`}
                          >
                            <span className="text-xs">{f.icon}</span>
                            {f.label}
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

          <div className="h-5 w-px bg-border/40" />

          {/* Simulate button */}
          <Button
            variant={isSimulating ? 'default' : 'outline'}
            size="sm"
            className={`h-8 px-3 rounded-full gap-1.5 ${isSimulating ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
            onClick={() => {
              onSimulate?.(!isSimulating);
              onToggleFilterPreview?.(!isSimulating);
            }}
            disabled={!hasFilters && !hasTransitions}
            title="Simular efeitos no preview em tempo real"
          >
            {isSimulating ? <Pause className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            <span className="text-xs">{isSimulating ? 'Simulando' : 'Simular'}</span>
          </Button>

          <div className="h-5 w-px bg-border/40" />

          {/* Close */}
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FloatingEffectsToolbar;
