import React from 'react';
import { Button } from '@/components/ui/button';
import { TimelineTrack, TRACK_COLORS } from './types';
import { Eye, EyeOff, Volume2, VolumeX, Lock, Unlock, Plus, Trash2 } from 'lucide-react';

interface Props {
  tracks: TimelineTrack[];
  onUpdateTrack: (id: string, updates: Partial<TimelineTrack>) => void;
  onDeleteTrack: (id: string) => void;
  onAddTrack: (track: Omit<TimelineTrack, 'id'>) => void;
}

const TrackHeaders: React.FC<Props> = ({ tracks, onUpdateTrack, onDeleteTrack, onAddTrack }) => {
  return (
    <div className="w-44 border-r bg-card/80 shrink-0 flex flex-col">
      {/* Ruler spacer */}
      <div className="h-7 border-b bg-muted/40 flex items-center justify-center">
        <Button
          size="icon"
          variant="ghost"
          className="h-5 w-5"
          onClick={() => onAddTrack({
            name: `Trilha ${tracks.length + 1}`,
            type: 'video',
            height: 60,
            muted: false,
            locked: false,
            visible: true,
            volume: 1,
            solo: false,
          })}
          title="Adicionar trilha"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* Track headers */}
      {tracks.map((track) => (
        <div
          key={track.id}
          className="border-b flex items-center gap-1 px-2 group"
          style={{ height: track.height }}
        >
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
