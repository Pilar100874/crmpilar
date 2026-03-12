import React, { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TimelineClip, EFFECT_PRESETS, TRANSITION_PRESETS, VideoFilter, TransitionType, ClipTransition } from './types';
import { Sparkles, Wand2, X, ArrowRightToLine, ArrowLeftFromLine, Eye, ChevronDown, ChevronRight, Zap, Clock } from 'lucide-react';
import TransitionPreviewThumb from './TransitionPreviewThumb';

interface Props {
  selectedClip?: TimelineClip;
  onUpdateClip: (id: string, updates: Partial<TimelineClip>) => void;
  onPreviewTransition?: (clipId: string, phase: 'entrance' | 'exit') => void;
}

// Categories for transitions
const TRANSITION_CATEGORIES = [
  {
    id: 'basic',
    label: 'Básicas',
    icon: '✨',
    types: ['fade', 'dissolve', 'crossfade'] as TransitionType[],
  },
  {
    id: 'movement',
    label: 'Movimento',
    icon: '🔀',
    types: ['slide-left', 'slide-right', 'slide-up', 'slide-down'] as TransitionType[],
  },
  {
    id: 'scale',
    label: 'Escala',
    icon: '🔍',
    types: ['zoom-in', 'zoom-out', 'scale-up', 'scale-down'] as TransitionType[],
  },
  {
    id: 'dramatic',
    label: 'Dramáticas',
    icon: '⚡',
    types: ['blur-transition', 'flash', 'bounce', 'rotate-in'] as TransitionType[],
  },
  {
    id: 'reveal',
    label: 'Revelação',
    icon: '🎭',
    types: ['wipe-left', 'wipe-right'] as TransitionType[],
  },
];

const EASING_OPTIONS = [
  { value: 'ease-out', label: 'Suave (Ease Out)', desc: 'Desacelera no final' },
  { value: 'ease-in', label: 'Acelerado (Ease In)', desc: 'Acelera no início' },
  { value: 'ease-in-out', label: 'Suave Duplo', desc: 'Suaviza início e fim' },
  { value: 'linear', label: 'Linear', desc: 'Velocidade constante' },
  { value: 'elastic', label: 'Elástico', desc: 'Quica no final' },
];

const EffectsPanel: React.FC<Props> = ({ selectedClip, onUpdateClip, onPreviewTransition }) => {
  const [activeTab, setActiveTab] = useState<'transitions' | 'filters'>('transitions');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    basic: true, movement: true, scale: true, dramatic: true, reveal: true,
  });

  if (!selectedClip) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <Sparkles className="h-10 w-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">Selecione um clipe para aplicar efeitos</p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">Clique em um item na timeline</p>
      </div>
    );
  }

  const isVisual = ['video', 'image', 'canvas'].includes(selectedClip.type);
  const entranceTransition = selectedClip.transitions?.entrance;
  const exitTransition = selectedClip.transitions?.exit;

  const setTransition = (phase: 'entrance' | 'exit', type: TransitionType) => {
    const current = selectedClip.transitions || {};
    if (type === 'none') {
      onUpdateClip(selectedClip.id, { transitions: { ...current, [phase]: undefined } });
    } else {
      onUpdateClip(selectedClip.id, {
        transitions: {
          ...current,
          [phase]: { type, duration: current[phase]?.duration || 0.5, easing: current[phase]?.easing || 'ease-out' },
        },
      });
    }
  };

  const setTransitionDuration = (phase: 'entrance' | 'exit', duration: number) => {
    const current = selectedClip.transitions || {};
    if (!current[phase]) return;
    onUpdateClip(selectedClip.id, {
      transitions: { ...current, [phase]: { ...current[phase]!, duration } },
    });
  };

  const setTransitionEasing = (phase: 'entrance' | 'exit', easing: string) => {
    const current = selectedClip.transitions || {};
    if (!current[phase]) return;
    onUpdateClip(selectedClip.id, {
      transitions: { ...current, [phase]: { ...current[phase]!, easing } },
    });
  };

  const removeTransition = (phase: 'entrance' | 'exit') => {
    const current = selectedClip.transitions || {};
    onUpdateClip(selectedClip.id, { transitions: { ...current, [phase]: undefined } });
  };

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const applyPreset = (presetId: string) => {
    const preset = EFFECT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const filters: VideoFilter[] = preset.filters.map((f, i) => ({
      ...f, id: `f_${Date.now()}_${i}`,
    }));
    onUpdateClip(selectedClip.id, { filters });
  };

  const updateFilter = (filterId: string, updates: Partial<VideoFilter>) => {
    onUpdateClip(selectedClip.id, {
      filters: (selectedClip.filters || []).map((f) => f.id === filterId ? { ...f, ...updates } : f),
    });
  };

  const removeFilter = (filterId: string) => {
    onUpdateClip(selectedClip.id, {
      filters: (selectedClip.filters || []).filter((f) => f.id !== filterId),
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Clip info */}
      <div className="px-3 py-2 border-b bg-muted/30 shrink-0">
        <p className="text-[11px] font-medium truncate">{selectedClip.name}</p>
        <p className="text-[9px] text-muted-foreground">
          {selectedClip.type === 'video' ? '🎬' : selectedClip.type === 'image' ? '🖼️' : selectedClip.type === 'canvas' ? '🎨' : '🔊'}
          {' '}{selectedClip.duration.toFixed(1)}s
          {entranceTransition && entranceTransition.type !== 'none' && (
            <span className="ml-1.5 text-emerald-500">▶ IN</span>
          )}
          {exitTransition && exitTransition.type !== 'none' && (
            <span className="ml-1.5 text-amber-500">OUT ◀</span>
          )}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full shrink-0 h-8 rounded-none border-b">
          <TabsTrigger value="transitions" className="text-[10px] gap-1 flex-1 h-7">
            <Zap className="h-3 w-3" />
            Transições
          </TabsTrigger>
          <TabsTrigger value="filters" className="text-[10px] gap-1 flex-1 h-7">
            <Wand2 className="h-3 w-3" />
            Filtros
          </TabsTrigger>
        </TabsList>

        {/* TRANSITIONS TAB */}
        <TabsContent value="transitions" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-3">
              {!isVisual ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-xs">Transições visuais apenas para vídeo, imagem e canvas</p>
                </div>
              ) : (
                <>
                  {/* Active transitions summary */}
                  <ActiveTransitionBar
                    label="Entrada"
                    icon={<ArrowRightToLine className="h-3 w-3 text-emerald-500" />}
                    transition={entranceTransition}
                    color="emerald"
                    onDurationChange={(d) => setTransitionDuration('entrance', d)}
                    onEasingChange={(e) => setTransitionEasing('entrance', e)}
                    onRemove={() => removeTransition('entrance')}
                    onPreview={() => onPreviewTransition?.(selectedClip.id, 'entrance')}
                  />
                  <ActiveTransitionBar
                    label="Saída"
                    icon={<ArrowLeftFromLine className="h-3 w-3 text-amber-500" />}
                    transition={exitTransition}
                    color="amber"
                    onDurationChange={(d) => setTransitionDuration('exit', d)}
                    onEasingChange={(e) => setTransitionEasing('exit', e)}
                    onRemove={() => removeTransition('exit')}
                    onPreview={() => onPreviewTransition?.(selectedClip.id, 'exit')}
                    isExit
                  />

                  {/* Phase selector tabs */}
                  <TransitionPhasePicker
                    entranceType={entranceTransition?.type}
                    exitType={exitTransition?.type}
                    expandedCategories={expandedCategories}
                    onToggleCategory={toggleCategory}
                    onSelectEntrance={(t) => setTransition('entrance', t)}
                    onSelectExit={(t) => setTransition('exit', t)}
                  />
                </>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* FILTERS TAB */}
        <TabsContent value="filters" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-4">
              <div>
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <Wand2 className="h-3 w-3" /> Presets
                </Label>
                <div className="grid grid-cols-2 gap-1.5 mt-2">
                  {EFFECT_PRESETS.map((preset) => (
                    <Button key={preset.id} variant="outline" size="sm" className="text-[10px] h-8 justify-start gap-1" onClick={() => applyPreset(preset.id)}>
                      <span>{preset.icon}</span> {preset.name}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold">Filtros Ativos</Label>
                {(!selectedClip.filters || selectedClip.filters.length === 0) ? (
                  <p className="text-[10px] text-muted-foreground mt-1">Nenhum filtro. Use os presets acima.</p>
                ) : (
                  <div className="space-y-2 mt-2">
                    {selectedClip.filters.map((filter) => (
                      <div key={filter.id} className="border rounded-lg p-2 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">{filter.label}</span>
                          <div className="flex items-center gap-2">
                            <Switch checked={filter.enabled} onCheckedChange={(v) => updateFilter(filter.id, { enabled: v })} />
                            <button onClick={() => removeFilter(filter.id)} className="text-[10px] text-destructive hover:underline">×</button>
                          </div>
                        </div>
                        <Slider value={[filter.value]} onValueChange={([v]) => updateFilter(filter.id, { value: v })} min={0} max={100} step={1} disabled={!filter.enabled} />
                        <span className="text-[9px] text-muted-foreground">{filter.value}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

/* =================== Active Transition Bar =================== */

interface ActiveTransitionBarProps {
  label: string;
  icon: React.ReactNode;
  transition?: ClipTransition;
  color: 'emerald' | 'amber';
  onDurationChange: (d: number) => void;
  onEasingChange: (e: string) => void;
  onRemove: () => void;
  onPreview: () => void;
  isExit?: boolean;
}

const ActiveTransitionBar: React.FC<ActiveTransitionBarProps> = ({
  label, icon, transition, color, onDurationChange, onEasingChange, onRemove, onPreview, isExit,
}) => {
  if (!transition || transition.type === 'none') {
    return (
      <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-dashed border-border/60 bg-muted/20">
        {icon}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
          <p className="text-[8px] text-muted-foreground/60">Nenhuma transição — selecione abaixo</p>
        </div>
      </div>
    );
  }

  const preset = TRANSITION_PRESETS.find(p => p.type === transition.type);
  const borderClass = color === 'emerald' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5';

  return (
    <div className={`rounded-lg border p-2.5 space-y-2 ${borderClass}`}>
      <div className="flex items-center gap-2">
        {icon}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <TransitionPreviewThumb type={transition.type} isExit={isExit} isActive size={32} />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold">{preset?.label || transition.type}</p>
            <p className="text-[8px] text-muted-foreground">{preset?.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onPreview} title="Pré-visualizar">
            <Eye className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" onClick={onRemove} title="Remover">
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Duration */}
      <div className="flex items-center gap-2">
        <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="text-[9px] text-muted-foreground shrink-0 w-7">{transition.duration.toFixed(1)}s</span>
        <Slider
          value={[transition.duration]}
          onValueChange={([v]) => onDurationChange(v)}
          min={0.1}
          max={3}
          step={0.1}
          className="flex-1"
        />
      </div>

      {/* Easing */}
      <div className="flex items-center gap-2">
        <Zap className="h-3 w-3 text-muted-foreground shrink-0" />
        <Select value={(transition as any).easing || 'ease-out'} onValueChange={onEasingChange}>
          <SelectTrigger className="h-6 text-[9px] flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EASING_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value} className="text-[10px]">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

/* =================== Transition Phase Picker =================== */

interface TransitionPhasePickerProps {
  entranceType?: TransitionType;
  exitType?: TransitionType;
  expandedCategories: Record<string, boolean>;
  onToggleCategory: (id: string) => void;
  onSelectEntrance: (type: TransitionType) => void;
  onSelectExit: (type: TransitionType) => void;
}

const TransitionPhasePicker: React.FC<TransitionPhasePickerProps> = ({
  entranceType, exitType, expandedCategories, onToggleCategory, onSelectEntrance, onSelectExit,
}) => {
  const [phase, setPhase] = useState<'entrance' | 'exit'>('entrance');
  const activeType = phase === 'entrance' ? entranceType : exitType;
  const onSelect = phase === 'entrance' ? onSelectEntrance : onSelectExit;

  return (
    <div className="space-y-2">
      {/* Phase toggle */}
      <div className="flex rounded-lg border overflow-hidden">
        <button
          onClick={() => setPhase('entrance')}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium transition-colors ${
            phase === 'entrance' ? 'bg-emerald-500/15 text-emerald-600 border-r' : 'hover:bg-muted/50 border-r'
          }`}
        >
          <ArrowRightToLine className="h-3 w-3" />
          Entrada
          {entranceType && entranceType !== 'none' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
        </button>
        <button
          onClick={() => setPhase('exit')}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium transition-colors ${
            phase === 'exit' ? 'bg-amber-500/15 text-amber-600' : 'hover:bg-muted/50'
          }`}
        >
          <ArrowLeftFromLine className="h-3 w-3" />
          Saída
          {exitType && exitType !== 'none' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
        </button>
      </div>

      {/* Categories */}
      {TRANSITION_CATEGORIES.map(cat => {
        const isExpanded = expandedCategories[cat.id] !== false;
        const presets = TRANSITION_PRESETS.filter(p => cat.types.includes(p.type));

        return (
          <div key={cat.id} className="border rounded-lg overflow-hidden">
            <button
              onClick={() => onToggleCategory(cat.id)}
              className="w-full flex items-center gap-1.5 px-2.5 py-1.5 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
            >
              {isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
              <span className="text-xs">{cat.icon}</span>
              <span className="text-[10px] font-semibold flex-1">{cat.label}</span>
              <span className="text-[8px] text-muted-foreground">{presets.length}</span>
            </button>

            {isExpanded && (
              <div className="grid grid-cols-2 gap-1.5 p-2">
                {presets.map(preset => {
                  const isActive = activeType === preset.type;
                  return (
                    <button
                      key={preset.type}
                      onClick={() => onSelect(preset.type)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-md border transition-all hover:shadow-sm ${
                        isActive
                          ? 'border-primary bg-primary/10 ring-1 ring-primary/30 shadow-sm'
                          : 'border-border/50 hover:border-border hover:bg-muted/40'
                      }`}
                    >
                      <TransitionPreviewThumb
                        type={preset.type}
                        isExit={phase === 'exit'}
                        isActive={isActive}
                        size={44}
                      />
                      <span className="text-[9px] font-medium leading-tight">{preset.label}</span>
                      <span className="text-[7px] text-muted-foreground leading-tight">{preset.description}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default EffectsPanel;
