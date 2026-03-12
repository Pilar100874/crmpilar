import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TimelineTrack, TRACK_COLORS } from './types';
import {
  Eye, EyeOff, Volume2, VolumeX, Lock, Unlock, Plus, Trash2,
  GripVertical, Film, Music, Type, Sparkles, Palette, Image as ImageIcon
} from 'lucide-react';

interface Props {
  tracks: TimelineTrack[];
  onUpdateTrack: (id: string, updates: Partial<TimelineTrack>) => void;
  onDeleteTrack: (id: string) => void;
  onAddTrack: (track: Omit<TimelineTrack, 'id'>) => void;
  onMoveTrack: (id: string, direction: 'up' | 'down') => void;
  onReorderTrack?: (id: string, toIndex: number) => void;
}

const TRACK_TYPE_OPTIONS: { type: TimelineTrack['type']; label: string; icon: React.ReactNode; defaultHeight: number }[] = [
  { type: 'video', label: 'Vídeo', icon: <Film className="h-3.5 w-3.5" />, defaultHeight: 50 },
  { type: 'image', label: 'Imagem', icon: <ImageIcon className="h-3.5 w-3.5" />, defaultHeight: 50 },
  { type: 'canvas', label: 'Canvas', icon: <Palette className="h-3.5 w-3.5" />, defaultHeight: 50 },
  { type: 'audio', label: 'Áudio', icon: <Music className="h-3.5 w-3.5" />, defaultHeight: 50 },
  { type: 'effect', label: 'Efeitos', icon: <Sparkles className="h-3.5 w-3.5" />, defaultHeight: 50 },
];

const TrackHeaders: React.FC<Props> = ({ tracks, onUpdateTrack, onDeleteTrack, onAddTrack, onMoveTrack }) => {
  const [addPopoverOpen, setAddPopoverOpen] = useState(false);

  const handleAddTrack = (opt: typeof TRACK_TYPE_OPTIONS[0]) => {
    const count = tracks.filter(t => t.type === opt.type).length + 1;
    onAddTrack({
      name: `${opt.label} ${count}`,
      type: opt.type,
      height: opt.defaultHeight,
      muted: false,
      locked: false,
      visible: true,
      volume: opt.type === 'audio' ? 0.7 : 1,
      solo: false,
    });
    setAddPopoverOpen(false);
  };

  return (
    <div className="w-44 border-r bg-card/80 shrink-0 flex flex-col">
      {/* Ruler spacer */}
      <div className="h-7 border-b bg-muted/40 flex items-center justify-center">
        <Popover open={addPopoverOpen} onOpenChange={setAddPopoverOpen}>
          <PopoverTrigger asChild>
            <Button size="icon" variant="ghost" className="h-5 w-5" title="Adicionar trilha">
              <Plus className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="start" className="w-44 p-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground px-2 py-1">Tipo de trilha</p>
            {TRACK_TYPE_OPTIONS.map(opt => (
              <button
                key={opt.type}
                onClick={() => handleAddTrack(opt)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted text-xs transition-colors text-left"
              >
                <div
                  className="w-5 h-5 rounded flex items-center justify-center"
                  style={{ backgroundColor: `${TRACK_COLORS[opt.type]}25`, color: TRACK_COLORS[opt.type] }}
                >
                  {opt.icon}
                </div>
                {opt.label}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </div>

      {/* Track headers */}
      {tracks.map((track, index) => (
        <div
          key={track.id}
          className="border-b flex items-center gap-1 px-1.5 group"
          style={{ height: track.height }}
        >
          {/* Move buttons */}
          <div className="flex flex-col gap-0 shrink-0 opacity-0 group-hover:opacity-70 transition-opacity">
            <button
              onClick={() => onMoveTrack(track.id, 'up')}
              disabled={index === 0}
              className="p-0 rounded hover:bg-muted disabled:opacity-20"
              title="Mover para cima (camada superior)"
            >
              <ChevronUp className="h-3 w-3" />
            </button>
            <button
              onClick={() => onMoveTrack(track.id, 'down')}
              disabled={index === tracks.length - 1}
              className="p-0 rounded hover:bg-muted disabled:opacity-20"
              title="Mover para baixo (camada inferior)"
            >
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>

          <div
            className="w-1.5 h-4 rounded-full shrink-0"
            style={{ backgroundColor: TRACK_COLORS[track.type] }}
          />
          <span className="text-xs font-medium flex-1 truncate">{track.name}</span>
          <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100">
            <button
              onClick={() => onUpdateTrack(track.id, { muted: !track.muted })}
              className="p-0.5 rounded hover:bg-muted"
              title={track.muted ? 'Ativar som' : 'Silenciar'}
            >
              {track.muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
            </button>
            <button
              onClick={() => onUpdateTrack(track.id, { visible: !track.visible })}
              className="p-0.5 rounded hover:bg-muted"
              title={track.visible ? 'Ocultar' : 'Mostrar'}
            >
              {track.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            </button>
            <button
              onClick={() => onUpdateTrack(track.id, { locked: !track.locked })}
              className="p-0.5 rounded hover:bg-muted"
              title={track.locked ? 'Desbloquear' : 'Bloquear'}
            >
              {track.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
            </button>
            <button
              onClick={() => onDeleteTrack(track.id)}
              className="p-0.5 rounded hover:bg-destructive/20 opacity-0 group-hover:opacity-100"
              title="Remover trilha"
            >
              <Trash2 className="h-3 w-3 text-destructive" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TrackHeaders;
