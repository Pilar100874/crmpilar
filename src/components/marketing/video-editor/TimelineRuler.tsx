import React, { useRef, useCallback } from 'react';

interface Props {
  duration: number;
  zoom: number;
  currentTime: number;
  onSeek: (time: number) => void;
}

const TimelineRuler: React.FC<Props> = ({ duration, zoom, currentTime, onSeek }) => {
  const ref = useRef<HTMLDivElement>(null);
  const totalWidth = duration * zoom;

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left + ref.current.scrollLeft;
    onSeek(x / zoom);
  }, [zoom, onSeek]);

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
