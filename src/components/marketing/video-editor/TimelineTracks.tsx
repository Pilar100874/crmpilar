import React, { useCallback, useRef, useState } from 'react';
import { TimelineState, TimelineClip, TRACK_COLORS } from './types';
import { Scissors } from 'lucide-react';

interface Props {
  state: TimelineState;
  onSelectClip: (id: string, multi?: boolean) => void;
  onUpdateClip: (id: string, updates: Partial<TimelineClip>) => void;
  onDeselectAll: () => void;
  onSeek: (time: number) => void;
}

const TimelineTracks: React.FC<Props> = ({ state, onSelectClip, onUpdateClip, onDeselectAll, onSeek }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{ clipId: string; type: 'move' | 'resize-start' | 'resize-end'; startX: number; originalStart: number; originalDuration: number } | null>(null);

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

  const handleClipMouseDown = useCallback((e: React.MouseEvent, clip: TimelineClip, type: 'move' | 'resize-start' | 'resize-end') => {
    if (clip.locked) return;
    e.stopPropagation();
    onSelectClip(clip.id, e.ctrlKey || e.metaKey);

    setDragging({
      clipId: clip.id,
      type,
      startX: e.clientX,
      originalStart: clip.startTime,
      originalDuration: clip.duration,
    });

    const handleMouseMove = (me: MouseEvent) => {
      const dx = me.clientX - e.clientX;
      const dt = dx / state.zoom;

      if (type === 'move') {
        const newStart = Math.max(0, clip.startTime + dt);
        onUpdateClip(clip.id, { startTime: newStart });
      } else if (type === 'resize-end') {
        const newDuration = Math.max(0.5, clip.duration + dt);
        onUpdateClip(clip.id, { duration: newDuration });
      } else if (type === 'resize-start') {
        const newStart = Math.max(0, clip.startTime + dt);
        const newDuration = Math.max(0.5, clip.duration - dt);
        onUpdateClip(clip.id, { startTime: newStart, duration: newDuration, trimStart: clip.trimStart + dt });
      }
    };

    const handleMouseUp = () => {
      setDragging(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [state.zoom, onSelectClip, onUpdateClip]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto relative"
      onClick={handleTrackClick}
    >
      <div style={{ minWidth: totalWidth, position: 'relative' }}>
        {state.tracks.map((track) => {
          const trackClips = state.clips.filter((c) => c.trackId === track.id);
          
          return (
            <div
              key={track.id}
              className="relative border-b"
              style={{ height: track.height, opacity: track.visible ? 1 : 0.3 }}
            >
              {/* Track background pattern */}
              <div className="absolute inset-0 bg-muted/10" />

              {/* Clips */}
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
                  >
                    {/* Clip header */}
                    <div
                      className="px-1.5 py-0.5 text-[10px] font-medium truncate flex items-center gap-1"
                      style={{ backgroundColor: `${clip.color || trackColor}40`, color: 'hsl(var(--foreground))' }}
                    >
                      {clip.type === 'video' && '🎬'}
                      {clip.type === 'audio' && '🔊'}
                      {clip.type === 'image' && '🖼️'}
                      {clip.type === 'text' && '✏️'}
                      {clip.type === 'effect' && '✨'}
                      <span className="truncate">{clip.name}</span>
                      {clip.muted && <span className="text-destructive">🔇</span>}
                    </div>

                    {/* Waveform / content preview */}
                    <div className="flex-1 px-1 flex items-center">
                      {clip.type === 'audio' && (
                        <div className="flex items-end gap-px h-full w-full py-1">
                          {Array.from({ length: Math.min(Math.floor(width / 3), 80) }).map((_, i) => (
                            <div
                              key={i}
                              className="flex-1 rounded-sm"
                              style={{
                                backgroundColor: `${clip.color || trackColor}60`,
                                height: `${20 + Math.random() * 60}%`,
                                minWidth: 1,
                              }}
                            />
                          ))}
                        </div>
                      )}
                      {clip.type === 'video' && (
                        <div className="flex gap-0.5 h-full w-full py-1 overflow-hidden">
                          {Array.from({ length: Math.min(Math.floor(width / 30), 12) }).map((_, i) => (
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
                      )}
                      {clip.type === 'text' && (
                        <span className="text-[9px] text-muted-foreground italic truncate">{clip.name}</span>
                      )}
                    </div>

                    {/* Transition indicator */}
                    {clip.transition && clip.transition.type !== 'none' && (
                      <div
                        className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-yellow-500/30 to-transparent flex items-center pl-1"
                        style={{ width: clip.transition.duration * state.zoom }}
                      >
                        <span className="text-[8px]">⚡</span>
                      </div>
                    )}

                    {/* Resize handles */}
                    {!clip.locked && (
                      <>
                        <div
                          className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover:opacity-100 bg-white/30 rounded-l"
                          onMouseDown={(e) => handleClipMouseDown(e, clip, 'resize-start')}
                        />
                        <div
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover:opacity-100 bg-white/30 rounded-r"
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

        {/* Playhead line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none"
          style={{ left: state.currentTime * state.zoom }}
        />
      </div>
    </div>
  );
};

export default TimelineTracks;
