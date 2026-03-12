import React, { useCallback, useRef, useState } from 'react';
import { TimelineState, TimelineClip, TRACK_COLORS } from './types';

interface MediaItem {
  type: 'video' | 'audio' | 'image';
  name: string;
  src: string;
  duration?: number;
}

// Which media types are allowed on which track types
const TRACK_ACCEPTS: Record<string, string[]> = {
  video: ['video'],
  image: ['image'],
  canvas: ['canvas', 'image'],
  audio: ['audio', 'video'], // video on audio = extract audio only
  effect: ['effect'],
  text: ['text'],
};

function isCompatible(trackType: string, clipType: string): boolean {
  return TRACK_ACCEPTS[trackType]?.includes(clipType) ?? false;
}

interface Props {
  state: TimelineState;
  onSelectClip: (id: string, multi?: boolean) => void;
  onUpdateClip: (id: string, updates: Partial<TimelineClip>) => void;
  onDeselectAll: () => void;
  onSeek: (time: number) => void;
  onDoubleClickClip?: (clip: TimelineClip) => void;
  onAddClip?: (type: 'video' | 'audio' | 'image' | 'text', media?: MediaItem, trackId?: string) => void;
}

const TimelineTracks: React.FC<Props> = ({ state, onSelectClip, onUpdateClip, onDeselectAll, onSeek, onDoubleClickClip, onAddClip }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dropTargetTrackId, setDropTargetTrackId] = useState<string | null>(null);
  const [dragMediaType, setDragMediaType] = useState<string | null>(null);
  const draggingRef = useRef<{
    clipId: string;
    type: 'move' | 'resize-start' | 'resize-end';
    startX: number;
    startY: number;
    originalStart: number;
    originalDuration: number;
    originalTrimStart: number;
    originalTrackId: string;
  } | null>(null);

  const totalWidth = state.duration * state.zoom;

  const handleTrackClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.timeline-clip')) return;
    onDeselectAll();
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + containerRef.current.scrollLeft;
      onSeek(x / state.zoom);
    }
  }, [onDeselectAll, onSeek, state.zoom]);

  // Find which track the mouse Y is over
  const getTrackAtY = useCallback((clientY: number): string | null => {
    if (!containerRef.current) return null;
    const container = containerRef.current;
    const trackElements = container.querySelectorAll('[data-track-id]');
    for (const el of trackElements) {
      const rect = el.getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) {
        return el.getAttribute('data-track-id');
      }
    }
    return null;
  }, []);

  const handleClipMouseDown = useCallback((e: React.MouseEvent, clip: TimelineClip, type: 'move' | 'resize-start' | 'resize-end') => {
    if (clip.locked) return;
    e.stopPropagation();
    e.preventDefault();
    onSelectClip(clip.id, e.ctrlKey || e.metaKey);

    const startX = e.clientX;
    const startY = e.clientY;
    const originalStart = clip.startTime;
    const originalDuration = clip.duration;
    const originalTrimStart = clip.trimStart;
    const originalTrackId = clip.trackId;

    draggingRef.current = { clipId: clip.id, type, startX, startY, originalStart, originalDuration, originalTrimStart, originalTrackId };

    const handleMouseMove = (me: MouseEvent) => {
      const dx = me.clientX - startX;
      const dt = dx / state.zoom;

      if (type === 'move') {
        onUpdateClip(clip.id, { startTime: Math.max(0, originalStart + dt) });

        // Check vertical movement for track switching
        const hoverTrackId = getTrackAtY(me.clientY);
        if (hoverTrackId && hoverTrackId !== clip.trackId) {
          const hoverTrack = state.tracks.find(t => t.id === hoverTrackId);
          if (hoverTrack) {
            // Check compatibility
            if (isCompatible(hoverTrack.type, clip.type)) {
              onUpdateClip(clip.id, { trackId: hoverTrackId, startTime: Math.max(0, originalStart + dt) });
            } else if (clip.type === 'video' && hoverTrack.type === 'audio') {
              // Video → audio track: convert to audio-only
              onUpdateClip(clip.id, {
                trackId: hoverTrackId,
                type: 'audio',
                name: `🔊 ${clip.name}`,
                startTime: Math.max(0, originalStart + dt),
                color: TRACK_COLORS.audio,
              });
            }
          }
        }
      } else if (type === 'resize-end') {
        onUpdateClip(clip.id, { duration: Math.max(0.5, originalDuration + dt) });
      } else if (type === 'resize-start') {
        const newDt = Math.min(dt, originalDuration - 0.5);
        const clampedDt = Math.max(-originalStart, newDt);
        onUpdateClip(clip.id, {
          startTime: originalStart + clampedDt,
          duration: originalDuration - clampedDt,
          trimStart: Math.max(0, originalTrimStart + clampedDt),
        });
      }
    };

    const handleMouseUp = () => {
      draggingRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [state.zoom, state.tracks, onSelectClip, onUpdateClip, getTrackAtY]);

  // Memoize waveform bars to prevent re-render flicker
  const renderWaveform = useCallback((clip: TimelineClip, width: number, trackColor: string) => {
    if (clip.type === 'audio') {
      const barCount = Math.min(Math.floor(width / 3), 80);
      return (
        <div className="flex items-end gap-px h-full w-full py-1">
          {Array.from({ length: barCount }).map((_, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm"
              style={{
                backgroundColor: `${clip.color || trackColor}60`,
                height: `${20 + Math.sin(i * 0.7 + clip.startTime) * 30 + Math.sin(i * 1.5) * 20}%`,
                minWidth: 1,
              }}
            />
          ))}
        </div>
      );
    }
    if (clip.type === 'video') {
      const thumbCount = Math.min(Math.floor(width / 30), 12);
      return (
        <div className="flex gap-0.5 h-full w-full py-1 overflow-hidden">
          {Array.from({ length: thumbCount }).map((_, i) => (
            <div
              key={i}
              className="h-full rounded-sm shrink-0"
              style={{
                width: 28,
                backgroundColor: `${clip.color || trackColor}${30 + (i % 3) * 10}`,
              }}
            />
          ))}
        </div>
      );
    }
    if (clip.type === 'image') {
      return clip.src ? (
        <div className="flex items-center gap-1 h-full w-full py-1 overflow-hidden">
          <img src={clip.src} className="h-full rounded-sm object-cover" alt="" draggable={false} style={{ maxWidth: 40 }} />
          <span className="text-[9px] text-muted-foreground truncate">{clip.name}</span>
        </div>
      ) : (
        <span className="text-[9px] text-muted-foreground truncate">🖼️ {clip.name}</span>
      );
    }
    if (clip.type === 'text') {
      return <span className="text-[9px] text-muted-foreground italic truncate">{clip.name}</span>;
    }
    return null;
  }, []);

  // Handle external drag (from MediaBin) compatibility
  const handleExternalDragOver = useCallback((e: React.DragEvent, track: typeof state.tracks[0]) => {
    if (!e.dataTransfer.types.includes('application/timeline-media')) return;
    e.preventDefault();

    // Try to detect media type from custom type hint
    const typeHint = e.dataTransfer.types.find(t => t.startsWith('mediatype/'));
    const mediaType = typeHint ? typeHint.replace('mediatype/', '') : null;
    
    if (mediaType) {
      setDragMediaType(mediaType);
      const canAccept = isCompatible(track.type, mediaType) || (mediaType === 'video' && track.type === 'audio');
      if (!canAccept) {
        e.dataTransfer.dropEffect = 'none';
        return;
      }
    }
    
    e.dataTransfer.dropEffect = 'copy';
    setDropTargetTrackId(track.id);
  }, []);

  const handleExternalDrop = useCallback((e: React.DragEvent, track: typeof state.tracks[0]) => {
    e.preventDefault();
    setDropTargetTrackId(null);
    setDragMediaType(null);
    const raw = e.dataTransfer.getData('application/timeline-media');
    if (!raw || !onAddClip) return;
    try {
      const media = JSON.parse(raw) as MediaItem;
      if (isCompatible(track.type, media.type)) {
        onAddClip(media.type, media, track.id);
      } else if (media.type === 'video' && track.type === 'audio') {
        onAddClip('audio', { ...media, type: 'audio', name: `🔊 ${media.name}` }, track.id);
      }
    } catch {}
  }, [onAddClip]);

  const handleDragLeave = useCallback(() => {
    setDropTargetTrackId(null);
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto relative"
      onClick={handleTrackClick}
    >
      <div style={{ minWidth: totalWidth, position: 'relative' }}>
        {state.tracks.map((track) => {
          const trackClips = state.clips.filter((c) => c.trackId === track.id);
          const canAccept = dragMediaType ? (isCompatible(track.type, dragMediaType) || (dragMediaType === 'video' && track.type === 'audio')) : true;
          const isDropTarget = dropTargetTrackId === track.id;
          const isDimmed = dragMediaType && !canAccept;
          
          return (
            <div
              key={track.id}
              data-track-id={track.id}
              className={`relative border-b transition-all ${isDropTarget ? 'ring-2 ring-inset ring-primary/60' : ''}`}
              style={{
                height: track.height,
                opacity: isDimmed ? 0.15 : (track.visible ? 1 : 0.3),
                backgroundColor: isDropTarget && canAccept
                  ? `${TRACK_COLORS[track.type] || TRACK_COLORS.video}30`
                  : `${TRACK_COLORS[track.type] || TRACK_COLORS.video}12`,
              }}
              onDragOver={(e) => handleExternalDragOver(e, track)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleExternalDrop(e, track)}
            >
              {/* Left color indicator */}
              <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: `${TRACK_COLORS[track.type] || TRACK_COLORS.video}60` }} />

              {trackClips.map((clip) => {
                const left = clip.startTime * state.zoom;
                const width = clip.duration * state.zoom;
                const isSelected = state.selectedClipIds.includes(clip.id);
                const trackColor = TRACK_COLORS[track.type] || TRACK_COLORS.video;

                return (
                  <div
                    key={clip.id}
                    className={`
                      timeline-clip absolute top-1 bottom-1 rounded-md cursor-pointer
                      border-2 transition-shadow overflow-hidden group
                      ${isSelected ? 'ring-2 ring-primary shadow-lg z-10' : 'hover:shadow-md'}
                      ${clip.locked ? 'opacity-60 cursor-not-allowed' : ''}
                    `}
                    style={{
                      left,
                      width: Math.max(width, 20),
                      backgroundColor: `${clip.color || trackColor}20`,
                      borderColor: isSelected ? 'hsl(var(--primary))' : `${clip.color || trackColor}80`,
                    }}
                    onMouseDown={(e) => handleClipMouseDown(e, clip, 'move')}
                    onDoubleClick={(e) => { e.stopPropagation(); onDoubleClickClip?.(clip); }}
                  >
                    <div
                      className="px-1.5 py-0.5 text-[10px] font-medium truncate flex items-center gap-1"
                      style={{ backgroundColor: `${clip.color || trackColor}40`, color: 'hsl(var(--foreground))' }}
                    >
                      {clip.type === 'video' && '🎬'}
                      {clip.type === 'audio' && '🔊'}
                      {clip.type === 'image' && '🖼️'}
                      {clip.type === 'text' && '✏️'}
                      {clip.type === 'effect' && '✨'}
                      {clip.type === 'canvas' && '🎨'}
                      <span className="truncate">{clip.name}</span>
                      {clip.muted && <span className="text-destructive">🔇</span>}
                    </div>

                    <div className="flex-1 px-1 flex items-center">
                      {renderWaveform(clip, width, trackColor)}
                    </div>

                    {clip.transition && clip.transition.type !== 'none' && (
                      <div
                        className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-yellow-500/30 to-transparent flex items-center pl-1"
                        style={{ width: clip.transition.duration * state.zoom }}
                      >
                        <span className="text-[8px]">⚡</span>
                      </div>
                    )}

                    {!clip.locked && (
                      <>
                        <div
                          className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover:opacity-100 bg-foreground/20 rounded-l"
                          onMouseDown={(e) => handleClipMouseDown(e, clip, 'resize-start')}
                        />
                        <div
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover:opacity-100 bg-foreground/20 rounded-r"
                          onMouseDown={(e) => handleClipMouseDown(e, clip, 'resize-end')}
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        <div
          className="absolute top-0 bottom-0 w-0.5 bg-destructive z-30 pointer-events-none"
          style={{ left: state.currentTime * state.zoom }}
        />
      </div>
    </div>
  );
};

export default TimelineTracks;
