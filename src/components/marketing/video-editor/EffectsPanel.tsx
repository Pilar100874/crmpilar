import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { TimelineClip, EFFECT_PRESETS, TRANSITION_PRESETS, VideoFilter } from './types';
import { Sparkles, Wand2 } from 'lucide-react';

interface Props {
  selectedClip?: TimelineClip;
  onUpdateClip: (id: string, updates: Partial<TimelineClip>) => void;
}

const EffectsPanel: React.FC<Props> = ({ selectedClip, onUpdateClip }) => {
  if (!selectedClip) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <Sparkles className="h-10 w-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">Selecione um clipe para aplicar efeitos</p>
      </div>
    );
  }

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
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        {/* Transitions */}
        <div>
          <Label className="text-xs font-semibold">Transição de Entrada</Label>
          <Select
            value={selectedClip.transition?.type || 'none'}
            onValueChange={(v) =>
              onUpdateClip(selectedClip.id, {
                transition: { type: v as any, duration: selectedClip.transition?.duration || 1 },
              })
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRANSITION_PRESETS.map((t) => (
                <SelectItem key={t.type} value={t.type}>
                  {t.icon} {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedClip.transition && selectedClip.transition.type !== 'none' && (
            <div className="mt-2">
              <Label className="text-[10px]">Duração ({selectedClip.transition.duration}s)</Label>
              <Slider
                value={[selectedClip.transition.duration]}
                onValueChange={([v]) =>
                  onUpdateClip(selectedClip.id, {
                    transition: { ...selectedClip.transition!, duration: v },
                  })
                }
                min={0.1}
                max={3}
                step={0.1}
                className="mt-1"
              />
            </div>
          )}
        </div>

        {/* Presets */}
        <div>
          <Label className="text-xs font-semibold flex items-center gap-1">
            <Wand2 className="h-3 w-3" />
            Presets de Efeito
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
  );
};

export default EffectsPanel;
