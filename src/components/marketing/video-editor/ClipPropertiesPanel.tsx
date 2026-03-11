import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { TimelineClip } from './types';
import { Settings2 } from 'lucide-react';

interface Props {
  clip?: TimelineClip;
  onUpdateClip: (id: string, updates: Partial<TimelineClip>) => void;
}

const ClipPropertiesPanel: React.FC<Props> = ({ clip, onUpdateClip }) => {
  if (!clip) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <Settings2 className="h-10 w-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">Selecione um clipe para ver suas propriedades</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: clip.color }} />
          <span className="text-sm font-semibold">{clip.name}</span>
        </div>

        {/* Name */}
        <div>
          <Label className="text-xs">Nome</Label>
          <Input
            value={clip.name}
            onChange={(e) => onUpdateClip(clip.id, { name: e.target.value })}
            className="mt-1 text-xs h-8"
          />
        </div>

        {/* Timing */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px]">Início (s)</Label>
            <Input
              type="number"
              value={clip.startTime.toFixed(2)}
              onChange={(e) => onUpdateClip(clip.id, { startTime: Number(e.target.value) })}
              className="mt-1 text-xs h-8"
              step={0.1}
              min={0}
            />
          </div>
          <div>
            <Label className="text-[10px]">Duração (s)</Label>
            <Input
              type="number"
              value={clip.duration.toFixed(2)}
              onChange={(e) => onUpdateClip(clip.id, { duration: Number(e.target.value) })}
              className="mt-1 text-xs h-8"
              step={0.1}
              min={0.1}
            />
          </div>
        </div>

        {/* Volume */}
        {(clip.type === 'video' || clip.type === 'audio') && (
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Volume ({Math.round((clip.volume ?? 1) * 100)}%)</Label>
              <Switch
                checked={!clip.muted}
                onCheckedChange={(v) => onUpdateClip(clip.id, { muted: !v })}
              />
            </div>
            <Slider
              value={[clip.volume ?? 1]}
              onValueChange={([v]) => onUpdateClip(clip.id, { volume: v })}
              min={0}
              max={1}
              step={0.01}
              disabled={clip.muted}
              className="mt-2"
            />
          </div>
        )}

        {/* Opacity */}
        <div>
          <Label className="text-xs">Opacidade ({Math.round((clip.opacity ?? 1) * 100)}%)</Label>
          <Slider
            value={[clip.opacity ?? 1]}
            onValueChange={([v]) => onUpdateClip(clip.id, { opacity: v })}
            min={0}
            max={1}
            step={0.01}
            className="mt-2"
          />
        </div>

        {/* Position & Size */}
        {(clip.type === 'video' || clip.type === 'image') && (
          <div>
            <Label className="text-xs font-semibold">Posição e Tamanho</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div>
                <Label className="text-[10px]">X (%)</Label>
                <Input
                  type="number"
                  value={(clip.x ?? 0).toFixed(0)}
                  onChange={(e) => onUpdateClip(clip.id, { x: Number(e.target.value) })}
                  className="mt-1 text-xs h-8"
                  step={1}
                />
              </div>
              <div>
                <Label className="text-[10px]">Y (%)</Label>
                <Input
                  type="number"
                  value={(clip.y ?? 0).toFixed(0)}
                  onChange={(e) => onUpdateClip(clip.id, { y: Number(e.target.value) })}
                  className="mt-1 text-xs h-8"
                  step={1}
                />
              </div>
              <div>
                <Label className="text-[10px]">Largura (%)</Label>
                <Input
                  type="number"
                  value={(clip.w ?? 100).toFixed(0)}
                  onChange={(e) => onUpdateClip(clip.id, { w: Number(e.target.value) })}
                  className="mt-1 text-xs h-8"
                  step={1}
                  min={10}
                />
              </div>
              <div>
                <Label className="text-[10px]">Altura (%)</Label>
                <Input
                  type="number"
                  value={(clip.h ?? 100).toFixed(0)}
                  onChange={(e) => onUpdateClip(clip.id, { h: Number(e.target.value) })}
                  className="mt-1 text-xs h-8"
                  step={1}
                  min={10}
                />
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2 text-xs"
              onClick={() => onUpdateClip(clip.id, { x: 0, y: 0, w: 100, h: 100 })}
            >
              Resetar para tela cheia
            </Button>
          </div>
        )}

        {/* Trim */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px]">Trim Início (s)</Label>
            <Input
              type="number"
              value={clip.trimStart.toFixed(2)}
              onChange={(e) => onUpdateClip(clip.id, { trimStart: Number(e.target.value) })}
              className="mt-1 text-xs h-8"
              step={0.1}
              min={0}
            />
          </div>
          <div>
            <Label className="text-[10px]">Trim Fim (s)</Label>
            <Input
              type="number"
              value={clip.trimEnd.toFixed(2)}
              onChange={(e) => onUpdateClip(clip.id, { trimEnd: Number(e.target.value) })}
              className="mt-1 text-xs h-8"
              step={0.1}
              min={0}
            />
          </div>
        </div>

        {/* Color */}
        <div>
          <Label className="text-xs">Cor do Clipe</Label>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="color"
              value={clip.color}
              onChange={(e) => onUpdateClip(clip.id, { color: e.target.value })}
              className="h-8 w-8 rounded cursor-pointer"
            />
            <Input
              value={clip.color}
              onChange={(e) => onUpdateClip(clip.id, { color: e.target.value })}
              className="text-xs h-8 flex-1"
            />
          </div>
        </div>

        {/* Lock */}
        <div className="flex items-center justify-between">
          <Label className="text-xs">Bloquear clipe</Label>
          <Switch
            checked={clip.locked || false}
            onCheckedChange={(v) => onUpdateClip(clip.id, { locked: v })}
          />
        </div>

        {/* Source */}
        <div>
          <Label className="text-xs">URL da mídia (opcional)</Label>
          <Input
            value={clip.src || ''}
            onChange={(e) => onUpdateClip(clip.id, { src: e.target.value })}
            className="mt-1 text-xs h-8"
            placeholder="https://..."
          />
        </div>
      </div>
    </ScrollArea>
  );
};

export default ClipPropertiesPanel;
