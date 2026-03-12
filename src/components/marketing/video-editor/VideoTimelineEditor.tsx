import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Play, Pause, SkipBack, SkipForward, Scissors, Copy, Trash2,
  ZoomIn, ZoomOut, Film, Maximize2, Minimize2, Settings2, Magnet, Sparkles, FolderOpen
} from 'lucide-react';
import { useTimelineState } from './useTimelineState';
import TimelineTracks from './TimelineTracks';
import TimelineRuler from './TimelineRuler';
import TrackHeaders from './TrackHeaders';
import ClipPropertiesPanel from './ClipPropertiesPanel';
import ResourcePanel from './ResourcePanel';
import EffectsPanel from './EffectsPanel';
import VideoPreview from './VideoPreview';
import CanvasComposerDialog from './CanvasComposerDialog';
import VideoConfigPanel, { VideoConfig } from './VideoConfigPanel';
import { TRACK_COLORS, TimelineClip } from './types';

interface MediaItem {
  type: 'video' | 'audio' | 'image';
  name: string;
  src: string;
  duration?: number;
}

const VideoTimelineEditor: React.FC = () => {
  const timeline = useTimelineState();
  const { state } = timeline;
  const [rightPanel, setRightPanel] = useState<'resources' | 'effects' | 'config' | 'properties'>('resources');
  const [previewCollapsed, setPreviewCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canvasDialogOpen, setCanvasDialogOpen] = useState(false);
  const [canvasEditClipId, setCanvasEditClipId] = useState<string | null>(null);
  const [canvasEditJson, setCanvasEditJson] = useState<string | undefined>(undefined);
  const [videoConfig, setVideoConfig] = useState<VideoConfig>({
    backgroundColor: '#000000',
    resolution: '1920x1080',
    fps: 30,
    destination: 'youtube',
    format: 'mp4',
  });
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedClip = state.selectedClipIds.length === 1
    ? state.clips.find((c) => c.id === state.selectedClipIds[0])
    : null;

  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        const ids = stateRef.current.selectedClipIds;
        if (ids.length > 0) timeline.deleteClips(ids);
      }
      if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [timeline, isFullscreen]);

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    const f = Math.floor((t % 1) * state.fps);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
  };

  const tracksRef = useRef(state.tracks);
  tracksRef.current = state.tracks;
  const clipsRef = useRef(state.clips);
  clipsRef.current = state.clips;

  const handleAddClip = useCallback((type: 'video' | 'audio' | 'image' | 'text', media?: MediaItem, targetTrackId?: string) => {
    const tracks = tracksRef.current;
    const clips = clipsRef.current;
    let trackId = targetTrackId;
    if (!trackId || !tracks.find(t => t.id === trackId)) {
      trackId = tracks.find((t) => {
        if (type === 'audio') return t.type === 'audio';
        if (type === 'image') return t.type === 'image';
        if (type === 'text') return t.type === 'text';
        return t.type === 'video';
      })?.id;
    }
    if (!trackId) return;

    const lastClip = clips
      .filter((c) => c.trackId === trackId)
      .sort((a, b) => (b.startTime + b.duration) - (a.startTime + a.duration))[0];
    const startTime = lastClip ? lastClip.startTime + lastClip.duration : 0;
    const targetTrack = tracks.find(t => t.id === trackId);
    const trackType = targetTrack?.type || (type === 'image' ? 'video' : type);
    const color = TRACK_COLORS[trackType] || TRACK_COLORS.video;
    const clipDuration = media?.duration || (type === 'text' ? 3 : type === 'audio' ? 10 : 5);

    timeline.addClip({
      trackId,
      type,
      name: media?.name || `${type === 'video' ? 'Cena' : type === 'audio' ? 'Áudio' : type === 'text' ? 'Texto' : 'Imagem'} ${clips.length + 1}`,
      startTime,
      duration: clipDuration,
      trimStart: 0,
      trimEnd: 0,
      color,
      volume: 1,
      opacity: 1,
      filters: [],
      src: media?.src,
      canvasJson: (media as any)?.canvasJson,
      x: 0, y: 0, w: 100, h: 100,
    });
  }, [timeline]);

  const handleOpenCanvasFromToolbar = useCallback(() => {
    setCanvasEditClipId(null);
    setCanvasEditJson(undefined);
    setCanvasDialogOpen(true);
  }, []);

  const handleDoubleClickClip = useCallback((clip: TimelineClip) => {
    if (clip.canvasJson) {
      setCanvasEditClipId(clip.id);
      setCanvasEditJson(clip.canvasJson);
      setCanvasDialogOpen(true);
    }
  }, []);

  const handleCanvasEditConfirm = useCallback((imageDataUrl: string, canvasJson: string) => {
    setCanvasDialogOpen(false);
    if (canvasEditClipId) {
      timeline.updateClip(canvasEditClipId, { src: imageDataUrl, canvasJson });
    } else {
      const tracks = tracksRef.current;
      const clips = clipsRef.current;
      const canvasTrackId = tracks.find(t => t.type === 'canvas')?.id;
      const trackId = canvasTrackId || tracks.find(t => t.type === 'video')?.id;
      if (trackId) {
        const lastClip = clips
          .filter((c) => c.trackId === trackId)
          .sort((a, b) => (b.startTime + b.duration) - (a.startTime + a.duration))[0];
        const startTime = lastClip ? lastClip.startTime + lastClip.duration : 0;
        const targetTrack = tracks.find(t => t.id === trackId);
        const color = TRACK_COLORS[targetTrack?.type || 'canvas'] || TRACK_COLORS.video;

        timeline.addClip({
          trackId, type: 'image',
          name: `Canvas ${clips.filter(c => c.canvasJson).length + 1}`,
          startTime, duration: 5, trimStart: 0, trimEnd: 0,
          color, volume: 1, opacity: 1, filters: [],
          src: imageDataUrl, canvasJson,
          x: 0, y: 0, w: 100, h: 100,
        });
      }
    }
    setCanvasEditClipId(null);
    setCanvasEditJson(undefined);
  }, [canvasEditClipId, timeline]);

  return (
    <div
      ref={containerRef}
      className={`flex flex-col border rounded-xl overflow-hidden bg-background ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'h-[calc(100vh-200px)] min-h-[700px]'
      }`}
      tabIndex={0}
    >
      {/* Top toolbar — only controls */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b bg-card/80 backdrop-blur">
        {/* Playback */}
        <div className="flex items-center gap-0.5">
          <Button size="icon" variant="ghost" onClick={() => timeline.seekTo(0)} title="Início" className="h-8 w-8">
            <SkipBack className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant={state.isPlaying ? 'default' : 'ghost'}
            onClick={() => state.isPlaying ? timeline.pause() : timeline.play()}
            className="h-9 w-9"
          >
            {state.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button size="icon" variant="ghost" onClick={() => timeline.seekTo(state.duration)} title="Fim" className="h-8 w-8">
            <SkipForward className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Time */}
        <div className="font-mono text-xs bg-muted px-2.5 py-1 rounded-md min-w-[100px] text-center">
          {formatTime(state.currentTime)}
        </div>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Edit tools */}
        <div className="flex items-center gap-0.5">
          <Button size="icon" variant="ghost" className="h-8 w-8"
            onClick={() => selectedClip && timeline.splitClip(selectedClip.id, state.currentTime)}
            disabled={!selectedClip} title="Cortar (C)">
            <Scissors className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8"
            onClick={() => selectedClip && timeline.duplicateClip(selectedClip.id)}
            disabled={!selectedClip} title="Duplicar">
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8"
            onClick={() => timeline.deleteClips(state.selectedClipIds)}
            disabled={state.selectedClipIds.length === 0} title="Excluir (Del)">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant={state.snapEnabled ? 'default' : 'ghost'} className="h-8 w-8"
            onClick={() => timeline.updateState({ snapEnabled: !state.snapEnabled })} title="Snap">
            <Magnet className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex-1" />

        {/* Zoom */}
        <div className="flex items-center gap-0.5">
          <Button size="icon" variant="ghost" onClick={timeline.zoomOut} className="h-8 w-8">
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="text-[10px] text-muted-foreground w-8 text-center">{Math.round(state.zoom)}x</span>
          <Button size="icon" variant="ghost" onClick={timeline.zoomIn} className="h-8 w-8">
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="w-px h-5 bg-border mx-1" />

        <Button size="icon" variant="ghost" className="h-8 w-8"
          onClick={() => setIsFullscreen(!isFullscreen)}
          title={isFullscreen ? 'Sair (Esc)' : 'Tela cheia'}>
          {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Preview + Timeline */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!previewCollapsed && (
            <div className="h-[300px] border-b flex items-center justify-center relative shrink-0"
              style={{ backgroundColor: videoConfig.backgroundColor === '#transparent' ? 'transparent' : videoConfig.backgroundColor }}>
              <VideoPreview
                clips={state.clips} currentTime={state.currentTime} tracks={state.tracks}
                isPlaying={state.isPlaying} selectedClipIds={state.selectedClipIds}
                onUpdateClip={timeline.updateClip} onSelectClip={(id) => timeline.selectClip(id)}
              />
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

          {/* Timeline */}
          <div className="flex-1 flex overflow-hidden">
            <TrackHeaders
              tracks={state.tracks} onUpdateTrack={timeline.updateTrack}
              onDeleteTrack={timeline.deleteTrack} onAddTrack={timeline.addTrack}
              onMoveTrack={timeline.moveTrack} onReorderTrack={timeline.reorderTrack}
            />
            <div className="flex-1 overflow-auto relative flex flex-col">
              <TimelineRuler
                duration={state.duration} zoom={state.zoom}
                currentTime={state.currentTime} onSeek={timeline.seekTo}
                onDurationChange={(d) => timeline.updateState({ duration: d })}
              />
              <TimelineTracks
                state={state} onSelectClip={timeline.selectClip}
                onUpdateClip={timeline.updateClip} onDeselectAll={timeline.deselectAll}
                onSeek={timeline.seekTo} onDoubleClickClip={handleDoubleClickClip}
                onAddClip={handleAddClip}
              />
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="w-72 border-l bg-card shrink-0 flex flex-col overflow-hidden">
          {/* Panel selector */}
          <div className="flex items-center border-b px-1 py-1 gap-0.5 shrink-0">
            <Button size="sm" variant={rightPanel === 'resources' ? 'default' : 'ghost'} onClick={() => setRightPanel('resources')} className="text-[10px] gap-1 flex-1 h-7 px-1">
              <FolderOpen className="h-3 w-3" />Recursos
            </Button>
            <Button size="sm" variant={rightPanel === 'effects' ? 'default' : 'ghost'} onClick={() => setRightPanel('effects')} className="text-[10px] gap-1 flex-1 h-7 px-1">
              <Sparkles className="h-3 w-3" />Efeitos
            </Button>
            <Button size="sm" variant={rightPanel === 'config' ? 'default' : 'ghost'} onClick={() => setRightPanel('config')} className="text-[10px] gap-1 flex-1 h-7 px-1">
              <Settings2 className="h-3 w-3" />Config
            </Button>
            <Button size="sm" variant={rightPanel === 'properties' ? 'default' : 'ghost'} onClick={() => setRightPanel('properties')} className="text-[10px] gap-1 flex-1 h-7 px-1">
              <Settings2 className="h-3 w-3" />Props
            </Button>
          </div>
          <div className="flex-1 overflow-hidden">
            {rightPanel === 'resources' && (
              <ResourcePanel onAddClip={handleAddClip} tracks={state.tracks} onOpenCanvas={handleOpenCanvasFromToolbar} />
            )}
            {rightPanel === 'config' && <VideoConfigPanel config={videoConfig} onChange={setVideoConfig} />}
            {rightPanel === 'effects' && <EffectsPanel selectedClip={selectedClip || undefined} onUpdateClip={timeline.updateClip} />}
            {rightPanel === 'properties' && <ClipPropertiesPanel clip={selectedClip || undefined} onUpdateClip={timeline.updateClip} />}
          </div>
        </div>
      </div>

      <CanvasComposerDialog
        open={canvasDialogOpen}
        onClose={() => { setCanvasDialogOpen(false); setCanvasEditClipId(null); setCanvasEditJson(undefined); }}
        onConfirm={handleCanvasEditConfirm}
        initialCanvasJson={canvasEditJson}
      />
    </div>
  );
};

export default VideoTimelineEditor;
