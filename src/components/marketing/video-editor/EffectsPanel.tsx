import React, { useState, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TimelineClip, EFFECT_PRESETS, TRANSITION_PRESETS, VideoFilter, TransitionType, ClipTransition } from './types';
import { Sparkles, Wand2, Play, X, ArrowRightToLine, ArrowLeftFromLine, Eye } from 'lucide-react';

interface Props {
  selectedClip?: TimelineClip;
  onUpdateClip: (id: string, updates: Partial<TimelineClip>) => void;
  onPreviewTransition?: (clipId: string, phase: 'entrance' | 'exit') => void;
}

const EffectsPanel: React.FC<Props> = ({ selectedClip, onUpdateClip, onPreviewTransition }) => {
  const [activeTab, setActiveTab] = useState<'transitions' | 'filters'>('transitions');

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
      onUpdateClip(selectedClip.id, {
        transitions: { ...current, [phase]: undefined },
      });
    } else {
      onUpdateClip(selectedClip.id, {
        transitions: {
          ...current,
          [phase]: { type, duration: current[phase]?.duration || 0.5 },
        },
      });
    }
  };

  const setTransitionDuration = (phase: 'entrance' | 'exit', duration: number) => {
    const current = selectedClip.transitions || {};
    if (!current[phase]) return;
    onUpdateClip(selectedClip.id, {
      transitions: {
        ...current,
        [phase]: { ...current[phase]!, duration },
      },
    });
  };

  const removeTransition = (phase: 'entrance' | 'exit') => {
    const current = selectedClip.transitions || {};
    onUpdateClip(selectedClip.id, {
      transitions: { ...current, [phase]: undefined },
    });
  };

  const addFilter = (filter: Omit<VideoFilter, 'id'>) => {
    const newFilter: VideoFilter = { ...filter, id: `f_${Date.now()}` };
    onUpdateClip(selectedClip.id, {
      filters: [...(selectedClip.filters || []), newFilter],
    });
  };

  const updateFilter = (filterId: string, updates: Partial<VideoFilter>) => {
    onUpdateClip(selectedClip.id, {
      filters: (selectedClip.filters || []).map((f) =>
        f.id === filterId ? { ...f, ...updates } : f
      ),
    });
  };

  const removeFilter = (filterId: string) => {
    onUpdateClip(selectedClip.id, {
      filters: (selectedClip.filters || []).filter((f) => f.id !== filterId),
    });
  };

  const applyPreset = (presetId: string) => {
    const preset = EFFECT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const filters: VideoFilter[] = preset.filters.map((f, i) => ({
      ...f,
      id: `f_${Date.now()}_${i}`,
    }));
    onUpdateClip(selectedClip.id, { filters });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Clip info bar */}
      <div className="px-3 py-2 border-b bg-muted/30 shrink-0">
        <p className="text-[11px] font-medium truncate">{selectedClip.name}</p>
        <p className="text-[9px] text-muted-foreground">
          {selectedClip.type === 'video' ? '🎬' : selectedClip.type === 'image' ? '🖼️' : selectedClip.type === 'canvas' ? '🎨' : '🔊'}
          {' '}{selectedClip.duration.toFixed(1)}s
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full shrink-0 h-8 rounded-none border-b">
          <TabsTrigger value="transitions" className="text-[10px] gap-1 flex-1 h-7">
            <ArrowRightToLine className="h-3 w-3" />
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
            <div className="p-3 space-y-4">
              {!isVisual ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-xs">Transições visuais disponíveis apenas para vídeo, imagem e canvas</p>
                </div>
              ) : (
                <>
                  {/* ENTRANCE */}
                  <TransitionSection
                    title="Entrada"
                    icon={<ArrowRightToLine className="h-3.5 w-3.5" />}
                    description="Como o clipe aparece"
                    activeTransition={entranceTransition}
                    onSelect={(type) => setTransition('entrance', type)}
                    onDurationChange={(d) => setTransitionDuration('entrance', d)}
                    onRemove={() => removeTransition('entrance')}
                    onPreview={() => onPreviewTransition?.(selectedClip.id, 'entrance')}
                  />

                  {/* EXIT */}
                  <TransitionSection
                    title="Saída"
                    icon={<ArrowLeftFromLine className="h-3.5 w-3.5" />}
                    description="Como o clipe desaparece"
                    activeTransition={exitTransition}
                    onSelect={(type) => setTransition('exit', type)}
                    onDurationChange={(d) => setTransitionDuration('exit', d)}
                    onRemove={() => removeTransition('exit')}
                    onPreview={() => onPreviewTransition?.(selectedClip.id, 'exit')}
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
              {/* Presets */}
              <div>
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <Wand2 className="h-3 w-3" />
                  Presets
                </Label>
                <div className="grid grid-cols-2 gap-1.5 mt-2">
                  {EFFECT_PRESETS.map((preset) => (
                    <Button
                      key={preset.id}
                      variant="outline"
                      size="sm"
                      className="text-[10px] h-8 justify-start gap-1"
                      onClick={() => applyPreset(preset.id)}
                    >
                      <span>{preset.icon}</span>
                      {preset.name}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Active Filters */}
              <div>
                <Label className="text-xs font-semibold">Filtros Ativos</Label>
                {(!selectedClip.filters || selectedClip.filters.length === 0) ? (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Nenhum filtro aplicado. Use os presets acima.
                  </p>
                ) : (
                  <div className="space-y-2 mt-2">
                    {selectedClip.filters.map((filter) => (
                      <div key={filter.id} className="border rounded-lg p-2 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">{filter.label}</span>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={filter.enabled}
                              onCheckedChange={(v) => updateFilter(filter.id, { enabled: v })}
                            />
                            <button
                              onClick={() => removeFilter(filter.id)}
                              className="text-[10px] text-destructive hover:underline"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                        <Slider
                          value={[filter.value]}
                          onValueChange={([v]) => updateFilter(filter.id, { value: v })}
                          min={0}
                          max={100}
                          step={1}
                          disabled={!filter.enabled}
                        />
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

// --- TransitionSection subcomponent ---

interface TransitionSectionProps {
  title: string;
  icon: React.ReactNode;
  description: string;
  activeTransition?: ClipTransition;
  onSelect: (type: TransitionType) => void;
  onDurationChange: (d: number) => void;
  onRemove: () => void;
  onPreview: () => void;
}

const TransitionSection: React.FC<TransitionSectionProps> = ({
  title, icon, description, activeTransition, onSelect, onDurationChange, onRemove, onPreview,
}) => {
  const [expanded, setExpanded] = useState(true);
  const activePreset = TRANSITION_PRESETS.find(p => p.type === activeTransition?.type);

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
      >
        {icon}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold">{title}</p>
          <p className="text-[9px] text-muted-foreground">{description}</p>
        </div>
        {activeTransition && activeTransition.type !== 'none' && (
          <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-medium">
            {activePreset?.icon} {activePreset?.label}
          </span>
        )}
      </button>

      {expanded && (
        <div className="p-2 space-y-2">
          {/* Active transition controls */}
          {activeTransition && activeTransition.type !== 'none' && (
            <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-md border border-primary/20">
              <span className="text-lg">{activePreset?.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium">{activePreset?.label}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] text-muted-foreground shrink-0">{activeTransition.duration.toFixed(1)}s</span>
                  <Slider
                    value={[activeTransition.duration]}
                    onValueChange={([v]) => onDurationChange(v)}
                    min={0.1}
                    max={3}
                    step={0.1}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={(e) => { e.stopPropagation(); onPreview(); }}
                  title="Pré-visualizar"
                >
                  <Eye className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); onRemove(); }}
                  title="Remover"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Transition grid */}
          <div className="grid grid-cols-3 gap-1">
            {TRANSITION_PRESETS.filter(p => p.type !== 'none').map((preset) => {
              const isActive = activeTransition?.type === preset.type;
              return (
                <button
                  key={preset.type}
                  onClick={() => onSelect(preset.type)}
                  className={`flex flex-col items-center gap-0.5 p-1.5 rounded-md border text-center transition-all hover:bg-muted/60 ${
                    isActive
                      ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                      : 'border-border/50 hover:border-border'
                  }`}
                >
                  <span className="text-base leading-none">{preset.icon}</span>
                  <span className="text-[8px] font-medium leading-tight">{preset.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default EffectsPanel;
