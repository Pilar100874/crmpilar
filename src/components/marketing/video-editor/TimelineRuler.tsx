import React, { useRef, useCallback, useState } from 'react';

interface Props {
  duration: number;
  zoom: number;
  currentTime: number;
  onSeek: (time: number) => void;
  onDurationChange?: (duration: number) => void;
}

const TimelineRuler: React.FC<Props> = ({ duration, zoom, currentTime, onSeek, onDurationChange }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [draggingEnd, setDraggingEnd] = useState(false);
  const totalWidth = duration * zoom;

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!ref.current || draggingEnd) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left + ref.current.scrollLeft;
    onSeek(x / zoom);
  }, [zoom, onSeek, draggingEnd]);

  const handleEndDragStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDraggingEnd(true);
    const startX = e.clientX;
    const startDuration = duration;

    const handleMove = (me: MouseEvent) => {
      const dx = me.clientX - startX;
      const dt = dx / zoom;
      const newDuration = Math.max(5, startDuration + dt);
      onDurationChange?.(Math.round(newDuration));
    };

    const handleUp = () => {
      setDraggingEnd(false);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [duration, zoom, onDurationChange]);

  // Generate tick marks
  const ticks: { pos: number; label: string; major: boolean }[] = [];
  const interval = zoom > 80 ? 1 : zoom > 30 ? 5 : zoom > 10 ? 10 : 30;
  
  for (let t = 0; t <= duration; t += interval) {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    ticks.push({
      pos: t * zoom,
      label: `${m}:${String(s).padStart(2, '0')}`,
      major: t % (interval * 2) === 0 || interval <= 1,
    });
  }

  return (
    <div
      ref={ref}
      className="h-7 bg-muted/40 border-b relative cursor-pointer shrink-0 overflow-hidden"
      onClick={handleClick}
      style={{ minWidth: totalWidth }}
    >
      {ticks.map((tick, i) => (
        <div
          key={i}
          className="absolute top-0 flex flex-col items-center"
          style={{ left: tick.pos }}
        >
          <div
            className={`w-px ${tick.major ? 'h-4 bg-foreground/40' : 'h-2 bg-foreground/20'}`}
            style={{ marginTop: tick.major ? 0 : 8 }}
          />
          {tick.major && (
            <span className="text-[9px] text-muted-foreground mt-0.5 select-none">{tick.label}</span>
          )}
        </div>
      ))}

      {/* Duration end handle */}
      <div
        className="absolute top-0 bottom-0 w-3 cursor-ew-resize z-30 group"
        style={{ left: totalWidth - 6 }}
        onMouseDown={handleEndDragStart}
        title={`Duração: ${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, '0')} — arraste para redimensionar`}
      >
        <div className="absolute inset-y-0 right-0 w-1 bg-primary/60 group-hover:bg-primary transition-colors rounded-r" />
        <div className="absolute top-1/2 -translate-y-1/2 right-0 w-3 h-5 bg-primary rounded-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex gap-px">
            <div className="w-px h-2.5 bg-primary-foreground/80" />
            <div className="w-px h-2.5 bg-primary-foreground/80" />
          </div>
        </div>
      </div>

      {/* Playhead */}
      <div
        className="absolute top-0 h-full w-0.5 bg-red-500 z-20 pointer-events-none"
        style={{ left: currentTime * zoom }}
      >
        <div className="absolute -top-0.5 -left-[5px] w-[11px] h-3 bg-red-500 rounded-b-sm" style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }} />
      </div>
    </div>
  );
};

export default TimelineRuler;