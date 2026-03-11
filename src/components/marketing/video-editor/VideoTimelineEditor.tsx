import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Play, Pause, SkipBack, SkipForward, Scissors, Copy, Trash2,
  ZoomIn, ZoomOut, Film,
  Music, Type, Sparkles, Layers, Maximize2, Settings2, Magnet, Upload
} from 'lucide-react';
import { useTimelineState } from './useTimelineState';
import TimelineTracks from './TimelineTracks';
import TimelineRuler from './TimelineRuler';
import TrackHeaders from './TrackHeaders';
import ClipPropertiesPanel from './ClipPropertiesPanel';
import MediaBin from './MediaBin';
import EffectsPanel from './EffectsPanel';
import VideoPreview from './VideoPreview';
import { TRACK_COLORS } from './types';

interface MediaItem {
  type: 'video' | 'audio' | 'image';
  name: string;
  src: string;
  duration?: number;
}

const VideoTimelineEditor: React.FC = () => {
  const timeline = useTimelineState();
  const { state } = timeline;
  const [rightPanel, setRightPanel] = useState<'properties' | 'effects' | 'media'>('media');
  const [previewCollapsed, setPreviewCollapsed] = useState(false);

  const selectedClip = state.selectedClipIds.length === 1
    ? state.clips.find((c) => c.id === state.selectedClipIds[0])
    : null;

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    const f = Math.floor((t % 1) * state.fps);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
  };

  const handleAddClip = useCallback((type: 'video' | 'audio' | 'image' | 'text', media?: MediaItem) => {
    const trackId = state.tracks.find((t) => {
      if (type === 'audio') return t.type === 'audio';
      if (type === 'text') return t.type === 'text';
      return t.type === 'video';
    })?.id;
    if (!trackId) return;

    const lastClip = state.clips
      .filter((c) => c.trackId === trackId)
      .sort((a, b) => (b.startTime + b.duration) - (a.startTime + a.duration))[0];

    const startTime = lastClip ? lastClip.startTime + lastClip.duration : 0;
    const color = TRACK_COLORS[type === 'image' ? 'video' : type] || TRACK_COLORS.video;
    const clipDuration = media?.duration || (type === 'text' ? 3 : type === 'audio' ? 10 : 5);

    timeline.addClip({
      trackId,
      type,
      name: media?.name || `${type === 'video' ? 'Cena' : type === 'audio' ? 'Áudio' : type === 'text' ? 'Texto' : 'Imagem'} ${state.clips.length + 1}`,
      startTime,
      duration: clipDuration,
      trimStart: 0,
      trimEnd: 0,
      color,
      volume: 1,
      opacity: 1,
      filters: [],
      src: media?.src,
      x: 0,
      y: 0,
      w: 100,
      h: 100,
    });
  }, [state.tracks, state.clips, timeline]);

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[700px] border rounded-xl overflow-hidden bg-background">
      {/* Top toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b bg-card/80 backdrop-blur">
        <div className="flex items-center gap-1 mr-4">
          <Button size="icon" variant="ghost" onClick={() => handleAddClip('video')} title="Adicionar vídeo vazio">
            <Film className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => handleAddClip('audio')} title="Adicionar áudio">
            <Music className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => handleAddClip('text')} title="Adicionar texto">
            <Type className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => handleAddClip('image')} title="Adicionar imagem">
            <Upload className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-px h-6 bg-border" />

        {/* Playback controls */}
        <div className="flex items-center gap-1 mx-4">
          <Button size="icon" variant="ghost" onClick={() => timeline.seekTo(0)} title="Início">
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant={state.isPlaying ? 'default' : 'ghost'}
            onClick={() => state.isPlaying ? timeline.pause() : timeline.play()}
            className="h-9 w-9"
          >
            {state.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button size="icon" variant="ghost" onClick={() => timeline.seekTo(state.duration)} title="Fim">
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Time display */}
        <div className="font-mono text-sm bg-muted px-3 py-1.5 rounded-md min-w-[120px] text-center">
          {formatTime(state.currentTime)}
        </div>

        <div className="w-px h-6 bg-border mx-2" />

        {/* Edit tools */}
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => selectedClip && timeline.splitClip(selectedClip.id, state.currentTime)}
            disabled={!selectedClip}
            title="Cortar no cursor (C)"
          >
            <Scissors className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => selectedClip && timeline.duplicateClip(selectedClip.id)}
            disabled={!selectedClip}
            title="Duplicar (Ctrl+D)"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => timeline.deleteClips(state.selectedClipIds)}
            disabled={state.selectedClipIds.length === 0}
            title="Excluir (Del)"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant={state.snapEnabled ? 'default' : 'ghost'}
            onClick={() => timeline.updateState({ snapEnabled: !state.snapEnabled })}
            title="Snap"
          >
            <Magnet className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1" />

        {/* Zoom */}
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" onClick={timeline.zoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(state.zoom)}x</span>
          <Button size="icon" variant="ghost" onClick={timeline.zoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-px h-6 bg-border mx-2" />

        {/* Panel toggles */}
        <div className="flex items-center gap-1">
          <Button size="sm" variant={rightPanel === 'media' ? 'default' : 'ghost'} onClick={() => setRightPanel('media')} className="text-xs gap-1">
            <Layers className="h-3 w-3" />Mídia
          </Button>
          <Button size="sm" variant={rightPanel === 'effects' ? 'default' : 'ghost'} onClick={() => setRightPanel('effects')} className="text-xs gap-1">
            <Sparkles className="h-3 w-3" />Efeitos
          </Button>
          <Button size="sm" variant={rightPanel === 'properties' ? 'default' : 'ghost'} onClick={() => setRightPanel('properties')} className="text-xs gap-1">
            <Settings2 className="h-3 w-3" />Propriedades
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Preview + Timeline (left) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Preview */}
          {!previewCollapsed && (
            <div className="h-[300px] border-b bg-black/95 flex items-center justify-center relative shrink-0">
              <VideoPreview
                clips={state.clips}
                currentTime={state.currentTime}
                tracks={state.tracks}
                isPlaying={state.isPlaying}
                selectedClipIds={state.selectedClipIds}
                onUpdateClip={timeline.updateClip}
                onSelectClip={(id) => timeline.selectClip(id)}
              />
              <Button
                size="icon"
                variant="ghost"
                className="absolute top-2 right-2 text-white/60 hover:text-white h-7 w-7"
                onClick={() => setPreviewCollapsed(true)}
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
            </div>
          )}
          {previewCollapsed && (
            <div className="border-b bg-muted/30 px-3 py-1 flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setPreviewCollapsed(false)} className="text-xs gap-1">
                <Film className="h-3 w-3" />Mostrar Preview
              </Button>
              <span className="text-xs text-muted-foreground">{formatTime(state.currentTime)} / {formatTime(state.duration)}</span>
            </div>
          )}

          {/* Timeline area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Track headers */}
            <TrackHeaders
              tracks={state.tracks}
              onUpdateTrack={timeline.updateTrack}
              onDeleteTrack={timeline.deleteTrack}
              onAddTrack={timeline.addTrack}
            />

            {/* Timeline canvas */}
            <div className="flex-1 overflow-auto relative flex flex-col">
              <TimelineRuler
                duration={state.duration}
                zoom={state.zoom}
                currentTime={state.currentTime}
                onSeek={timeline.seekTo}
              />
              <TimelineTracks
                state={state}
                onSelectClip={timeline.selectClip}
                onUpdateClip={timeline.updateClip}
                onDeselectAll={timeline.deselectAll}
                onSeek={timeline.seekTo}
              />
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="w-72 border-l bg-card shrink-0 flex flex-col overflow-hidden">
          {rightPanel === 'media' && <MediaBin onAddClip={handleAddClip} />}
          {rightPanel === 'effects' && (
            <EffectsPanel
              selectedClip={selectedClip || undefined}
              onUpdateClip={timeline.updateClip}
            />
          )}
          {rightPanel === 'properties' && (
            <ClipPropertiesPanel
              clip={selectedClip || undefined}
              onUpdateClip={timeline.updateClip}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoTimelineEditor;
