import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { TimelineClip, TimelineTrack, TransitionType } from './types';

interface Props {
  clips: TimelineClip[];
  currentTime: number;
  tracks: TimelineTrack[];
  isPlaying?: boolean;
  selectedClipIds?: string[];
  onUpdateClip?: (id: string, updates: Partial<TimelineClip>) => void;
  onSelectClip?: (id: string) => void;
  previewingTransition?: { clipId: string; phase: 'entrance' | 'exit' } | null;
}

const CANVAS_W = 480;
const CANVAS_H = 270;

// Compute CSS transform/opacity/filter for a transition at a given progress (0→1)
function getTransitionStyle(
  type: TransitionType,
  progress: number, // 0 = fully hidden, 1 = fully visible
  isExit: boolean
): React.CSSProperties {
  // For exit, we invert the progress so 0=visible, 1=hidden
  const p = isExit ? 1 - progress : progress;

  switch (type) {
    case 'fade':
      return { opacity: p };
    case 'slide-left':
      return { transform: `translateX(${(1 - p) * 100}%)`, opacity: Math.min(1, p * 2) };
    case 'slide-right':
      return { transform: `translateX(${(1 - p) * -100}%)`, opacity: Math.min(1, p * 2) };
    case 'slide-up':
      return { transform: `translateY(${(1 - p) * 100}%)`, opacity: Math.min(1, p * 2) };
    case 'slide-down':
      return { transform: `translateY(${(1 - p) * -100}%)`, opacity: Math.min(1, p * 2) };
    case 'zoom-in':
      return { transform: `scale(${0.3 + p * 0.7})`, opacity: p };
    case 'zoom-out':
      return { transform: `scale(${1 + (1 - p) * 0.5})`, opacity: p };
    case 'scale-up':
      // Bounce-like pop
      const bounce = p < 0.7 ? p / 0.7 : 1 + Math.sin((p - 0.7) / 0.3 * Math.PI) * 0.1;
      return { transform: `scale(${bounce * 0.5 + 0.5})`, opacity: Math.min(1, p * 1.5) };
    case 'scale-down':
      return { transform: `scale(${1 + (1 - p) * 0.3})`, opacity: p };
    case 'blur-transition':
      return { filter: `blur(${(1 - p) * 15}px)`, opacity: p };
    case 'flash':
      return { opacity: p, filter: `brightness(${1 + (1 - p) * 3})` };
    case 'bounce': {
      const elasticP = p < 1
        ? 1 - Math.pow(2, -10 * p) * Math.cos((p * 10 - 0.75) * (2 * Math.PI) / 3)
        : 1;
      return { transform: `scale(${elasticP})`, opacity: Math.min(1, p * 2) };
    }
    case 'rotate-in':
      return { transform: `rotate(${(1 - p) * 90}deg) scale(${0.5 + p * 0.5})`, opacity: p };
    case 'dissolve':
      return { opacity: p };
    case 'wipe-left':
      return { clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` };
    case 'wipe-right':
      return { clipPath: `inset(0 0 0 ${(1 - p) * 100}%)` };
    default:
      return {};
  }
}

const VideoPreview: React.FC<Props> = ({
  clips, currentTime, tracks, isPlaying,
  selectedClipIds = [], onUpdateClip, onSelectClip,
  previewingTransition,
}) => {
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const [dragging, setDragging] = useState<{ clipId: string; mode: 'move' | 'resize'; startX: number; startY: number; origX: number; origY: number; origW: number; origH: number } | null>(null);
  const [previewAnim, setPreviewAnim] = useState<{ clipId: string; phase: 'entrance' | 'exit'; startTime: number } | null>(null);

  // Handle preview trigger from EffectsPanel
  useEffect(() => {
    if (previewingTransition) {
      setPreviewAnim({
        clipId: previewingTransition.clipId,
        phase: previewingTransition.phase,
        startTime: performance.now(),
      });
    }
  }, [previewingTransition]);

  // Animate the preview
  const [previewProgress, setPreviewProgress] = useState<number | null>(null);

  useEffect(() => {
    if (!previewAnim) {
      setPreviewProgress(null);
      return;
    }
    const clip = clips.find(c => c.id === previewAnim.clipId);
    const trans = previewAnim.phase === 'entrance'
      ? clip?.transitions?.entrance
      : clip?.transitions?.exit;
    if (!trans) {
      setPreviewAnim(null);
      return;
    }
    const durationMs = trans.duration * 1000;
    let raf: number;
    const animate = () => {
      const elapsed = performance.now() - previewAnim.startTime;
      const p = Math.min(elapsed / durationMs, 1);
      setPreviewProgress(p);
      if (p < 1) {
        raf = requestAnimationFrame(animate);
      } else {
        setTimeout(() => {
          setPreviewAnim(null);
          setPreviewProgress(null);
        }, 300);
      }
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [previewAnim, clips]);

  const activeClipIds = useMemo(() => {
    return clips
      .filter((c) => {
        const track = tracks.find((t) => t.id === c.trackId);
        if (!track || !track.visible) return false;
        if (track.muted && (c.type === 'audio')) return false;
        return currentTime >= c.startTime && currentTime < c.startTime + c.duration;
      })
      .map(c => c.id);
  }, [clips, tracks, currentTime]);

  const activeClips = useMemo(() => clips.filter(c => activeClipIds.includes(c.id)), [clips, activeClipIds]);

  const sortedActiveClips = useMemo(() => {
    const trackIndexMap = new Map(tracks.map((t, i) => [t.id, i]));
    return [...activeClips].sort((a, b) => {
      const idxA = trackIndexMap.get(a.trackId) ?? 0;
      const idxB = trackIndexMap.get(b.trackId) ?? 0;
      return idxB - idxA;
    });
  }, [activeClips, tracks]);

  const activeVisuals = useMemo(() => sortedActiveClips.filter((c) => c.type === 'video' || c.type === 'image' || c.type === 'canvas'), [sortedActiveClips]);
  const activeTexts = useMemo(() => sortedActiveClips.filter((c) => c.type === 'text'), [sortedActiveClips]);

  const activeVideoIds = useMemo(() => activeVisuals.filter(c => c.type === 'video' && c.src).map(c => c.id).join(','), [activeVisuals]);

  const clipsRef = useRef(clips);
  clipsRef.current = clips;

  useEffect(() => {
    const ids = activeVideoIds.split(',').filter(Boolean);
    ids.forEach((clipId) => {
      const vid = videoRefs.current[clipId];
      const clip = clipsRef.current.find(c => c.id === clipId);
      if (vid && clip?.src) {
        const clipTime = currentTime - clip.startTime + (clip.trimStart || 0);
        if (Math.abs(vid.currentTime - clipTime) > 0.5) {
          vid.currentTime = clipTime;
        }
      }
    });
  }, [currentTime, activeVideoIds]);

  useEffect(() => {
    const ids = activeVideoIds.split(',').filter(Boolean);
    ids.forEach((clipId) => {
      const vid = videoRefs.current[clipId];
      if (!vid) return;
      if (isPlaying && vid.paused) {
        vid.play().catch(() => {});
      } else if (!isPlaying && !vid.paused) {
        vid.pause();
      }
    });
  }, [isPlaying, activeVideoIds]);

  const buildFilter = useCallback((clip?: TimelineClip) => {
    if (!clip?.filters?.length) return 'none';
    return clip.filters
      .filter((f) => f.enabled)
      .map((f) => {
        switch (f.type) {
          case 'brightness': return `brightness(${f.value / 50})`;
          case 'contrast': return `contrast(${f.value / 50})`;
          case 'saturation': return `saturate(${f.value / 50})`;
          case 'hue-rotate': return `hue-rotate(${(f.value / 100) * 360}deg)`;
          case 'blur': return `blur(${(f.value / 100) * 10}px)`;
          case 'grayscale': return `grayscale(${f.value}%)`;
          case 'sepia': return `sepia(${f.value}%)`;
          case 'invert': return `invert(${f.value}%)`;
          default: return '';
        }
      })
      .join(' ');
  }, []);

  // Compute transition style for a clip at the current time
  const getClipTransitionStyle = useCallback((clip: TimelineClip): React.CSSProperties => {
    // Preview animation override
    if (previewAnim && previewAnim.clipId === clip.id && previewProgress !== null) {
      const trans = previewAnim.phase === 'entrance'
        ? clip.transitions?.entrance
        : clip.transitions?.exit;
      if (trans) {
        return getTransitionStyle(trans.type, previewProgress, previewAnim.phase === 'exit');
      }
    }

    const transitions = clip.transitions;
    if (!transitions) return {};

    const clipElapsed = currentTime - clip.startTime;
    const clipRemaining = (clip.startTime + clip.duration) - currentTime;

    // Entrance
    if (transitions.entrance && transitions.entrance.type !== 'none') {
      const dur = transitions.entrance.duration;
      if (clipElapsed < dur) {
        const progress = clipElapsed / dur;
        return getTransitionStyle(transitions.entrance.type, progress, false);
      }
    }

    // Exit
    if (transitions.exit && transitions.exit.type !== 'none') {
      const dur = transitions.exit.duration;
      if (clipRemaining < dur) {
        const progress = clipRemaining / dur;
        return getTransitionStyle(transitions.exit.type, progress, true);
      }
    }

    return {};
  }, [currentTime, previewAnim, previewProgress]);

  const handlePointerDown = useCallback((e: React.PointerEvent, clipId: string, mode: 'move' | 'resize') => {
    e.stopPropagation();
    e.preventDefault();
    const clip = clipsRef.current.find(c => c.id === clipId);
    if (!clip || clip.locked) return;
    onSelectClip?.(clipId);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging({
      clipId,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      origX: clip.x ?? 0,
      origY: clip.y ?? 0,
      origW: clip.w ?? 100,
      origH: clip.h ?? 100,
    });
  }, [onSelectClip]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging || !onUpdateClip) return;
    const dx = ((e.clientX - dragging.startX) / CANVAS_W) * 100;
    const dy = ((e.clientY - dragging.startY) / CANVAS_H) * 100;

    if (dragging.mode === 'move') {
      onUpdateClip(dragging.clipId, {
        x: Math.max(-50, Math.min(150, dragging.origX + dx)),
        y: Math.max(-50, Math.min(150, dragging.origY + dy)),
      });
    } else {
      onUpdateClip(dragging.clipId, {
        w: Math.max(10, Math.min(200, dragging.origW + dx)),
        h: Math.max(10, Math.min(200, dragging.origH + dy)),
      });
    }
  }, [dragging, onUpdateClip]);

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  return (
    <div className="w-full h-full flex items-center justify-center"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div
        className="relative rounded-md overflow-hidden"
        style={{ width: CANVAS_W, height: CANVAS_H }}
      >
        <div className="absolute inset-0 bg-black" />

        {/* Safe zone border */}
        <div className="absolute inset-0 pointer-events-none z-30">
          <div className="absolute inset-[5%] border border-dashed border-white/20 rounded-sm" />
          <span className="absolute top-[3%] left-[5%] text-[8px] text-white/25 font-mono">ÁREA SEGURA</span>
        </div>

        <div className="absolute inset-0 pointer-events-none z-30 border-2 border-primary/40 rounded-md" />

        {activeVisuals.length > 0 ? (
          activeVisuals.map((clip, layerIdx) => {
            const cx = clip.x ?? 0;
            const cy = clip.y ?? 0;
            const cw = clip.w ?? 100;
            const ch = clip.h ?? 100;
            const isSelected = selectedClipIds.includes(clip.id);
            const zIndex = 10 + layerIdx;
            const transitionStyle = getClipTransitionStyle(clip);

            return (
              <div
                key={clip.id}
                className="absolute cursor-move"
                style={{
                  left: `${cx}%`,
                  top: `${cy}%`,
                  width: `${cw}%`,
                  height: `${ch}%`,
                  filter: buildFilter(clip),
                  opacity: clip.opacity ?? 1,
                  outline: isSelected ? '2px solid hsl(var(--primary))' : 'none',
                  outlineOffset: '-1px',
                  zIndex,
                  transition: 'none',
                  ...transitionStyle,
                  // Merge opacity
                  ...(transitionStyle.opacity !== undefined
                    ? { opacity: (clip.opacity ?? 1) * (transitionStyle.opacity as number) }
                    : {}),
                  // Merge filter
                  ...(transitionStyle.filter
                    ? { filter: [buildFilter(clip), transitionStyle.filter].filter(f => f && f !== 'none').join(' ') || 'none' }
                    : {}),
                }}
                onPointerDown={(e) => handlePointerDown(e, clip.id, 'move')}
              >
                {clip.src ? (
                  clip.type === 'video' ? (
                    <video
                      ref={(el) => { videoRefs.current[clip.id] = el; }}
                      src={clip.src}
                      className="w-full h-full object-contain pointer-events-none"
                      muted={clip.muted}
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <img src={clip.src} className="w-full h-full object-contain pointer-events-none" alt="" draggable={false} />
                  )
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${clip.color}40, ${clip.color}20)` }}
                  >
                    <div className="text-center">
                      <span className="text-4xl">🎬</span>
                      <p className="text-white/60 text-sm mt-2">{clip.name}</p>
                    </div>
                  </div>
                )}

                {isSelected && (
                  <div
                    className="absolute bottom-0 right-0 w-4 h-4 bg-primary rounded-tl-md cursor-se-resize z-20"
                    onPointerDown={(e) => handlePointerDown(e, clip.id, 'resize')}
                  >
                    <svg viewBox="0 0 16 16" className="w-full h-full text-primary-foreground p-0.5">
                      <path d="M14 2v12H2" fill="none" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-center">
              <span className="text-3xl">📽️</span>
              <p className="text-white/40 text-xs mt-2">Sem conteúdo neste ponto</p>
            </div>
          </div>
        )}

        {activeTexts.map((clip) => (
          <div key={clip.id} className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <p className="text-white text-2xl font-bold drop-shadow-lg px-4 text-center">
              {clip.name}
            </p>
          </div>
        ))}

        <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-0.5 rounded text-white/80 text-[10px] font-mono z-40">
          {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}
        </div>

        <div className="absolute top-2 left-2 bg-black/50 px-1.5 py-0.5 rounded text-white/50 text-[8px] font-mono z-40">
          1920×1080
        </div>
      </div>
    </div>
  );
};

export default React.memo(VideoPreview);
