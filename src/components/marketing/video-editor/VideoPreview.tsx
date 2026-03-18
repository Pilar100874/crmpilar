import React, { useRef, useEffect, useState, useCallback, useMemo, ReactNode } from 'react';
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
  previewingFilter?: boolean;
  resolution?: string;
}

const MAX_PREVIEW_W = 640;
const MAX_PREVIEW_H = 400;

function getTransitionStyle(
  type: TransitionType,
  progress: number,
  isExit: boolean
): React.CSSProperties {
  const p = isExit ? 1 - progress : progress;

  switch (type) {
    case 'fade': return { opacity: p };
    case 'dissolve': return { opacity: p };
    case 'crossfade': return { opacity: p };
    case 'fade-blur': return { opacity: p, filter: `blur(${(1 - p) * 12}px)` };
    case 'luma-fade': return { opacity: p, filter: `brightness(${0.5 + p * 0.5}) contrast(${0.8 + p * 0.2})` };
    case 'slide-left': return { transform: `translateX(${(1 - p) * 100}%)`, opacity: Math.min(1, p * 2) };
    case 'slide-right': return { transform: `translateX(${(1 - p) * -100}%)`, opacity: Math.min(1, p * 2) };
    case 'slide-up': return { transform: `translateY(${(1 - p) * 100}%)`, opacity: Math.min(1, p * 2) };
    case 'slide-down': return { transform: `translateY(${(1 - p) * -100}%)`, opacity: Math.min(1, p * 2) };
    case 'roll-left': return { transform: `translateX(${(1 - p) * 100}%) rotate(${(1 - p) * 45}deg)`, opacity: p };
    case 'roll-right': return { transform: `translateX(${(1 - p) * -100}%) rotate(${(1 - p) * -45}deg)`, opacity: p };
    case 'push-left': return { transform: `translateX(${(1 - p) * 100}%)` };
    case 'push-right': return { transform: `translateX(${(1 - p) * -100}%)` };
    case 'push-up': return { transform: `translateY(${(1 - p) * 100}%)` };
    case 'push-down': return { transform: `translateY(${(1 - p) * -100}%)` };
    case 'cover-left': return { transform: `translateX(${(1 - p) * 100}%)`, zIndex: 10 };
    case 'cover-right': return { transform: `translateX(${(1 - p) * -100}%)`, zIndex: 10 };
    case 'reveal-left': return { transform: `translateX(${-p * 100}%)` };
    case 'reveal-right': return { transform: `translateX(${p * 100}%)` };
    case 'whip-pan': return { transform: `translateX(${(1 - p) * 120}%)`, filter: `blur(${(1 - p) * 20}px)` };
    case 'zoom-in': return { transform: `scale(${0.3 + p * 0.7})`, opacity: p };
    case 'zoom-out': return { transform: `scale(${1 + (1 - p) * 0.5})`, opacity: p };
    case 'scale-up': {
      const b = p < 0.7 ? p / 0.7 : 1 + Math.sin((p - 0.7) / 0.3 * Math.PI) * 0.1;
      return { transform: `scale(${b * 0.5 + 0.5})`, opacity: Math.min(1, p * 1.5) };
    }
    case 'scale-down': return { transform: `scale(${1 + (1 - p) * 0.3})`, opacity: p };
    case 'morph-scale': return { transform: `scale(${0.5 + p * 0.5}) scaleX(${0.7 + p * 0.3})`, opacity: p };
    case 'rotate-in': return { transform: `rotate(${(1 - p) * 90}deg) scale(${0.5 + p * 0.5})`, opacity: p };
    case 'rotate-out': return { transform: `rotate(${(1 - p) * -90}deg) scale(${0.5 + p * 0.5})`, opacity: p };
    case 'spiral': return { transform: `rotate(${(1 - p) * 360}deg) scale(${p})`, opacity: p };
    case 'flip-x': return { transform: `perspective(800px) rotateY(${(1 - p) * 90}deg)`, opacity: Math.min(1, p * 1.5) };
    case 'flip-y': return { transform: `perspective(800px) rotateX(${(1 - p) * 90}deg)`, opacity: Math.min(1, p * 1.5) };
    case 'cross-zoom': return { transform: `scale(${p < 0.5 ? 1 + (0.5 - p) * 4 : 1 + (p - 0.5) * 4})`, opacity: p < 0.5 ? 1 - p * 2 : (p - 0.5) * 2, filter: `blur(${Math.abs(p - 0.5) * 16}px)` };
    case 'cross-spin': return { transform: `rotate(${(1 - p) * 180}deg) scale(${p})`, opacity: p };
    case 'bounce': {
      const e = p < 1 ? 1 - Math.pow(2, -10 * p) * Math.cos((p * 10 - 0.75) * (2 * Math.PI) / 3) : 1;
      return { transform: `scale(${e})`, opacity: Math.min(1, p * 2) };
    }
    case 'elastic': {
      const e = p < 1 ? 1 - Math.pow(2, -8 * p) * Math.cos((p * 12 - 0.5) * (2 * Math.PI) / 3) : 1;
      return { transform: `scaleX(${e}) scaleY(${2 - e})`, opacity: Math.min(1, p * 2) };
    }
    case 'swing': return { transform: `rotate(${Math.sin(p * Math.PI * 3) * (1 - p) * 25}deg)`, opacity: p };
    case 'shake': return { transform: `translateX(${Math.sin(p * 40) * (1 - p) * 15}px) translateY(${Math.cos(p * 35) * (1 - p) * 8}px)`, opacity: p };
    case 'drop': { const g = p < 0.6 ? (p / 0.6) * (p / 0.6) : 1 - Math.sin((p - 0.6) / 0.4 * Math.PI * 3) * (1 - p) * 0.3; return { transform: `translateY(${(1 - g) * -200}px)`, opacity: Math.min(1, p * 2) }; }
    case 'tumble': return { transform: `perspective(600px) rotateX(${(1 - p) * 90}deg) translateY(${(1 - p) * -50}px)`, opacity: p, transformOrigin: 'bottom center' };
    case 'wipe-left': return { clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` };
    case 'wipe-right': return { clipPath: `inset(0 0 0 ${(1 - p) * 100}%)` };
    case 'wipe-up': return { clipPath: `inset(${(1 - p) * 100}% 0 0 0)` };
    case 'wipe-down': return { clipPath: `inset(0 0 ${(1 - p) * 100}% 0)` };
    case 'wipe-circle': return { clipPath: `circle(${p * 75}% at 50% 50%)` };
    case 'wipe-diamond': return { clipPath: `polygon(50% ${50 - p * 50}%, ${50 + p * 50}% 50%, 50% ${50 + p * 50}%, ${50 - p * 50}% 50%)` };
    case 'iris-open': return { clipPath: `circle(${p * 72}% at 50% 50%)` };
    case 'iris-close': return { clipPath: `circle(${(1 - p) * 72}% at 50% 50%)` };
    case 'split-horizontal': return { clipPath: `inset(${(1 - p) * 50}% 0)` };
    case 'split-vertical': return { clipPath: `inset(0 ${(1 - p) * 50}%)` };
    case 'clock-wipe': { const angle = p * 360; return { clipPath: `polygon(50% 50%, 50% 0%, ${angle > 90 ? '100% 0%,' : `${50 + Math.tan(angle * Math.PI / 180) * 50}% 0%,`} ${angle > 90 ? (angle > 180 ? '100% 100%,' : `100% ${Math.tan((angle - 90) * Math.PI / 180) * 50}%,`) : ''} ${angle > 180 ? (angle > 270 ? '0% 100%,' : `${100 - Math.tan((angle - 180) * Math.PI / 180) * 50}% 100%,`) : ''} ${angle > 270 ? `0% ${100 - Math.tan((angle - 270) * Math.PI / 180) * 50}%` : ''})`.replace(/,\s*\)/, ')') }; }
    case 'radial-wipe': return { clipPath: `circle(${p * 100}% at 50% 50%)` };
    case 'blinds-h': return { clipPath: `inset(0 ${(1 - p) * 50}% 0 ${(1 - p) * 50}%)`, opacity: p };
    case 'blinds-v': return { clipPath: `inset(${(1 - p) * 50}% 0)`, opacity: p };
    case 'color-wipe': return { clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` };
    case 'cube-left': return { transform: `perspective(800px) rotateY(${(1 - p) * -90}deg)`, opacity: p, transformOrigin: 'right center' };
    case 'cube-right': return { transform: `perspective(800px) rotateY(${(1 - p) * 90}deg)`, opacity: p, transformOrigin: 'left center' };
    case 'page-curl': return { transform: `perspective(800px) rotateY(${(1 - p) * 90}deg) scale(${0.8 + p * 0.2})`, opacity: p, transformOrigin: 'left center' };
    case 'door-open': return { clipPath: `inset(0 ${(1 - p) * 50}%)` };
    case 'door-close': return { clipPath: `inset(0 ${p * 50}%)` };
    case 'stretch-h': return { transform: `scaleX(${p})`, opacity: p, transformOrigin: 'center' };
    case 'stretch-v': return { transform: `scaleY(${p})`, opacity: p, transformOrigin: 'center' };
    case 'fly-in': return { transform: `perspective(800px) translateZ(${(1 - p) * -500}px)`, opacity: p };
    case 'fly-out': return { transform: `perspective(800px) translateZ(${(1 - p) * 500}px)`, opacity: p };
    case 'blur-transition': return { filter: `blur(${(1 - p) * 15}px)`, opacity: p };
    case 'flash': return { opacity: p, filter: `brightness(${1 + (1 - p) * 3})` };
    case 'glitch': {
      const offset = Math.sin(p * 30) * (1 - p) * 8;
      return { transform: `translateX(${offset}px)`, opacity: 0.6 + p * 0.4, filter: `hue-rotate(${(1 - p) * 120}deg)` };
    }
    case 'pixelate': return { filter: `blur(${(1 - p) * 8}px)`, opacity: p };
    case 'light-leak': return { opacity: p, filter: `brightness(${1 + (1 - p) * 2}) saturate(${1 + (1 - p) * 1.5})` };
    case 'film-burn': return { opacity: p, filter: `brightness(${1 + (1 - p) * 4}) contrast(${1 + (1 - p)}) sepia(${(1 - p) * 80}%)` };
    case 'ripple': return { transform: `scale(${1 + Math.sin(p * Math.PI * 4) * (1 - p) * 0.1})`, opacity: p, filter: `blur(${(1 - p) * 4}px)` };
    case 'mosaic': return { filter: `blur(${(1 - p) * 10}px)`, opacity: p, transform: `scale(${1 + (1 - p) * 0.05})` };
    case 'spin-out': return { transform: `rotate(${(1 - p) * 720}deg) scale(${p})`, opacity: p };
    default: return {};
  }
}

// Overlay effects that render BETWEEN clips during transitions
function getOverlayStyle(
  type: TransitionType,
  progress: number // 0 = start of transition, 1 = end
): { style: React.CSSProperties; elements: ReactNode } | null {
  // Bell curve for intensity: peaks at 0.5
  const bell = Math.sin(progress * Math.PI);
  // Quick flash curve: peaks at 0.3
  const flash = progress < 0.3 ? progress / 0.3 : (1 - progress) / 0.7;
  const flashI = Math.pow(flash, 0.5);

  const noOverlay = { style: {} as React.CSSProperties, elements: null as ReactNode };

  switch (type) {
    // Light flash for fades
    case 'fade':
    case 'dissolve':
    case 'crossfade':
      return {
        style: { background: `radial-gradient(ellipse at center, rgba(255,255,255,${bell * 0.35}), transparent 70%)` },
        elements: null,
      };

    case 'flash':
    case 'light-leak':
      return {
        style: { background: `radial-gradient(ellipse at 40% 40%, rgba(255,240,200,${bell * 0.7}), rgba(255,180,100,${bell * 0.3}) 50%, transparent 80%)`, mixBlendMode: 'screen' },
        elements: null,
      };

    case 'film-burn':
      return {
        style: {
          background: `radial-gradient(ellipse at 60% 30%, rgba(255,120,40,${bell * 0.6}), rgba(255,60,10,${bell * 0.3}) 40%, transparent 70%)`,
          mixBlendMode: 'screen',
        },
        elements: (
          <>
            <div style={{
              position: 'absolute', inset: 0,
              background: `radial-gradient(ellipse at 20% 70%, rgba(255,200,50,${bell * 0.4}), transparent 60%)`,
              mixBlendMode: 'screen',
            }} />
          </>
        ),
      };

    case 'fade-blur':
    case 'blur-transition':
      return {
        style: { background: `rgba(255,255,255,${bell * 0.15})`, backdropFilter: `blur(${bell * 4}px)` },
        elements: null,
      };

    case 'luma-fade':
      return {
        style: { background: `linear-gradient(to bottom, rgba(255,255,255,${bell * 0.3}), rgba(0,0,0,${bell * 0.2}))`, mixBlendMode: 'overlay' },
        elements: null,
      };

    case 'glitch':
      const r = Math.sin(progress * 50) * bell * 6;
      return {
        style: {},
        elements: (
          <>
            <div style={{ position: 'absolute', inset: 0, background: `rgba(255,0,0,${bell * 0.2})`, transform: `translateX(${r}px)`, mixBlendMode: 'screen' }} />
            <div style={{ position: 'absolute', inset: 0, background: `rgba(0,255,255,${bell * 0.2})`, transform: `translateX(${-r}px)`, mixBlendMode: 'screen' }} />
            {bell > 0.3 && (
              <div style={{
                position: 'absolute', left: 0, right: 0,
                top: `${30 + Math.sin(progress * 80) * 20}%`, height: `${2 + bell * 4}%`,
                background: `rgba(255,255,255,${bell * 0.5})`, mixBlendMode: 'overlay',
              }} />
            )}
          </>
        ),
      };

    case 'whip-pan':
      return {
        style: { background: `linear-gradient(90deg, transparent, rgba(255,255,255,${bell * 0.3}), transparent)`, backdropFilter: `blur(${bell * 8}px)` },
        elements: null,
      };

    case 'cross-zoom':
      return {
        style: { background: `radial-gradient(circle at center, transparent 20%, rgba(255,255,255,${bell * 0.4}) 60%, transparent 90%)`, mixBlendMode: 'screen' },
        elements: null,
      };

    case 'zoom-in':
    case 'zoom-out':
    case 'scale-up':
    case 'scale-down':
      return {
        style: { background: `radial-gradient(circle at center, rgba(255,255,255,${flashI * 0.2}), transparent 60%)` },
        elements: null,
      };

    case 'wipe-left':
    case 'wipe-right':
    case 'wipe-up':
    case 'wipe-down':
    case 'color-wipe': {
      const isH = type === 'wipe-left' || type === 'wipe-right' || type === 'color-wipe';
      const dir = isH ? '90deg' : '180deg';
      const pos = progress * 100;
      return {
        style: {
          background: `linear-gradient(${dir}, transparent ${pos - 5}%, rgba(255,255,255,${0.6}) ${pos}%, transparent ${pos + 5}%)`,
          mixBlendMode: 'screen',
        },
        elements: null,
      };
    }

    case 'wipe-circle':
    case 'iris-open':
    case 'iris-close':
    case 'radial-wipe': {
      const radius = progress * 75;
      return {
        style: {},
        elements: (
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(circle ${radius + 3}% at 50% 50%, transparent ${radius - 2}%, rgba(255,255,255,0.5) ${radius}%, transparent ${radius + 4}%)`,
            mixBlendMode: 'screen',
          }} />
        ),
      };
    }

    case 'cube-left':
    case 'cube-right':
    case 'page-curl':
    case 'flip-x':
    case 'flip-y':
      return {
        style: { background: `linear-gradient(135deg, rgba(255,255,255,${bell * 0.15}), transparent 50%, rgba(0,0,0,${bell * 0.2}))`, mixBlendMode: 'overlay' },
        elements: null,
      };

    case 'spin-out':
    case 'spiral':
    case 'cross-spin':
      return {
        style: { background: `conic-gradient(from ${progress * 360}deg, transparent, rgba(255,255,255,${bell * 0.2}), transparent)`, mixBlendMode: 'screen' },
        elements: null,
      };

    case 'ripple':
      return {
        style: {},
        elements: (
          <>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                position: 'absolute', inset: 0,
                border: `2px solid rgba(255,255,255,${bell * 0.3 * (1 - i * 0.3)})`,
                borderRadius: '50%',
                transform: `scale(${0.3 + progress * 0.7 + i * 0.15})`,
              }} />
            ))}
          </>
        ),
      };

    case 'bounce':
    case 'elastic':
    case 'drop':
      return {
        style: { background: `radial-gradient(ellipse at 50% 80%, rgba(255,255,255,${flashI * 0.25}), transparent 60%)` },
        elements: null,
      };

    case 'pixelate':
    case 'mosaic':
      return {
        style: { background: `rgba(255,255,255,${bell * 0.1})`, backdropFilter: `blur(${bell * 3}px)` },
        elements: null,
      };

    default:
      // Subtle light for any other transition
      if (bell > 0.05) {
        return {
          style: { background: `radial-gradient(ellipse at center, rgba(255,255,255,${bell * 0.15}), transparent 65%)` },
          elements: null,
        };
      }
      return null;
  }
}

const VideoPreview: React.FC<Props> = ({
  clips, currentTime, tracks, isPlaying,
  selectedClipIds = [], onUpdateClip, onSelectClip,
  previewingTransition, previewingFilter, resolution = '1920x1080',
}) => {
  const [resW, resH] = resolution.split('x').map(Number);
  const aspectRatio = resW / resH;
  const CANVAS_W = aspectRatio >= 1 ? Math.min(MAX_PREVIEW_W, MAX_PREVIEW_H * aspectRatio) : Math.min(MAX_PREVIEW_W, MAX_PREVIEW_H * aspectRatio);
  const CANVAS_H = CANVAS_W / aspectRatio;

  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const [dragging, setDragging] = useState<{ clipId: string; mode: 'move' | 'resize' | 'rotate'; startX: number; startY: number; origX: number; origY: number; origW: number; origH: number; origRotation?: number; centerX?: number; centerY?: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [previewAnim, setPreviewAnim] = useState<{ clipId: string; phase: 'entrance' | 'exit'; startTime: number } | null>(null);

  useEffect(() => {
    if (previewingTransition) {
      setPreviewAnim({
        clipId: previewingTransition.clipId,
        phase: previewingTransition.phase,
        startTime: performance.now(),
      });
    }
  }, [previewingTransition]);

  const [previewProgress, setPreviewProgress] = useState<number | null>(null);

  useEffect(() => {
    if (!previewAnim) { setPreviewProgress(null); return; }
    const clip = clips.find(c => c.id === previewAnim.clipId);
    const trans = previewAnim.phase === 'entrance' ? clip?.transitions?.entrance : clip?.transitions?.exit;
    if (!trans) { setPreviewAnim(null); return; }
    const durationMs = trans.duration * 1000;
    let raf: number;
    const animate = () => {
      const elapsed = performance.now() - previewAnim.startTime;
      const p = Math.min(elapsed / durationMs, 1);
      setPreviewProgress(p);
      if (p < 1) { raf = requestAnimationFrame(animate); }
      else { setTimeout(() => { setPreviewAnim(null); setPreviewProgress(null); }, 300); }
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
    return [...activeClips].sort((a, b) => (trackIndexMap.get(b.trackId) ?? 0) - (trackIndexMap.get(a.trackId) ?? 0));
  }, [activeClips, tracks]);

  const activeVisuals = useMemo(() => sortedActiveClips.filter((c) => c.type === 'video' || c.type === 'image' || c.type === 'canvas'), [sortedActiveClips]);
  const activeTexts = useMemo(() => sortedActiveClips.filter((c) => c.type === 'text'), [sortedActiveClips]);
  const activeVideoIds = useMemo(() => activeVisuals.filter(c => c.type === 'video' && c.src).map(c => c.id).join(','), [activeVisuals]);

  const clipsRef = useRef(clips);
  clipsRef.current = clips;

  useEffect(() => {
    activeVideoIds.split(',').filter(Boolean).forEach((clipId) => {
      const vid = videoRefs.current[clipId];
      const clip = clipsRef.current.find(c => c.id === clipId);
      if (vid && clip?.src) {
        const clipTime = currentTime - clip.startTime + (clip.trimStart || 0);
        if (Math.abs(vid.currentTime - clipTime) > 0.5) vid.currentTime = clipTime;
      }
    });
  }, [currentTime, activeVideoIds]);

  useEffect(() => {
    activeVideoIds.split(',').filter(Boolean).forEach((clipId) => {
      const vid = videoRefs.current[clipId];
      if (!vid) return;
      if (isPlaying && vid.paused) vid.play().catch(() => {});
      else if (!isPlaying && !vid.paused) vid.pause();
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
          case 'drop-shadow': return `drop-shadow(0 ${f.value / 10}px ${f.value / 5}px rgba(0,0,0,0.5))`;
          default: return '';
        }
      })
      .join(' ');
  }, []);

  const getClipTransitionStyle = useCallback((clip: TimelineClip): React.CSSProperties => {
    if (previewAnim && previewAnim.clipId === clip.id && previewProgress !== null) {
      const trans = previewAnim.phase === 'entrance' ? clip.transitions?.entrance : clip.transitions?.exit;
      if (trans) return getTransitionStyle(trans.type, previewProgress, previewAnim.phase === 'exit');
    }
    const transitions = clip.transitions;
    if (!transitions) return {};
    const clipElapsed = currentTime - clip.startTime;
    const clipRemaining = (clip.startTime + clip.duration) - currentTime;
    if (transitions.entrance && transitions.entrance.type !== 'none') {
      const dur = transitions.entrance.duration;
      if (clipElapsed < dur) return getTransitionStyle(transitions.entrance.type, clipElapsed / dur, false);
    }
    if (transitions.exit && transitions.exit.type !== 'none') {
      const dur = transitions.exit.duration;
      if (clipRemaining < dur) return getTransitionStyle(transitions.exit.type, clipRemaining / dur, true);
    }
    return {};
  }, [currentTime, previewAnim, previewProgress]);

  const handlePointerDown = useCallback((e: React.PointerEvent, clipId: string, mode: 'move' | 'resize' | 'rotate') => {
    e.stopPropagation(); e.preventDefault();
    const clip = clipsRef.current.find(c => c.id === clipId);
    if (!clip || clip.locked) return;
    onSelectClip?.(clipId);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    if (mode === 'rotate' && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const cx = clip.x ?? 0;
      const cy = clip.y ?? 0;
      const cw = clip.w ?? 100;
      const ch = clip.h ?? 100;
      const centerX = rect.left + ((cx + cw / 2) / 100) * rect.width;
      const centerY = rect.top + ((cy + ch / 2) / 100) * rect.height;
      setDragging({ clipId, mode, startX: e.clientX, startY: e.clientY, origX: cx, origY: cy, origW: cw, origH: ch, origRotation: clip.rotation ?? 0, centerX, centerY });
    } else {
      setDragging({ clipId, mode, startX: e.clientX, startY: e.clientY, origX: clip.x ?? 0, origY: clip.y ?? 0, origW: clip.w ?? 100, origH: clip.h ?? 100 });
    }
  }, [onSelectClip]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging || !onUpdateClip) return;
    if (dragging.mode === 'rotate' && dragging.centerX !== undefined && dragging.centerY !== undefined) {
      const startAngle = Math.atan2(dragging.startY - dragging.centerY, dragging.startX - dragging.centerX);
      const currentAngle = Math.atan2(e.clientY - dragging.centerY, e.clientX - dragging.centerX);
      let deltaDeg = ((currentAngle - startAngle) * 180) / Math.PI;
      let newRotation = ((dragging.origRotation ?? 0) + deltaDeg) % 360;
      if (newRotation < 0) newRotation += 360;
      // Snap to 0/90/180/270 when close
      for (const snap of [0, 90, 180, 270, 360]) {
        if (Math.abs(newRotation - snap) < 5) { newRotation = snap % 360; break; }
      }
      onUpdateClip(dragging.clipId, { rotation: Math.round(newRotation) });
    } else {
      const dx = ((e.clientX - dragging.startX) / CANVAS_W) * 100;
      const dy = ((e.clientY - dragging.startY) / CANVAS_H) * 100;
      if (dragging.mode === 'move') {
        onUpdateClip(dragging.clipId, { x: Math.max(-50, Math.min(150, dragging.origX + dx)), y: Math.max(-50, Math.min(150, dragging.origY + dy)) });
      } else {
        onUpdateClip(dragging.clipId, { w: Math.max(10, Math.min(200, dragging.origW + dx)), h: Math.max(10, Math.min(200, dragging.origH + dy)) });
      }
    }
  }, [dragging, onUpdateClip]);

  const handlePointerUp = useCallback(() => { setDragging(null); }, []);

  // Filter preview indicator
  const showFilterBadge = previewingFilter && selectedClipIds.length > 0;

  // Detect transition overlays between clips
  const transitionOverlay = useMemo(() => {
    for (const clip of activeVisuals) {
      const transitions = clip.transitions;
      if (!transitions) continue;
      const clipElapsed = currentTime - clip.startTime;
      const clipRemaining = (clip.startTime + clip.duration) - currentTime;

      if (transitions.entrance && transitions.entrance.type !== 'none') {
        const dur = transitions.entrance.duration;
        if (clipElapsed >= 0 && clipElapsed < dur) {
          const p = clipElapsed / dur;
          return getOverlayStyle(transitions.entrance.type, p);
        }
      }
      if (transitions.exit && transitions.exit.type !== 'none') {
        const dur = transitions.exit.duration;
        if (clipRemaining >= 0 && clipRemaining < dur) {
          const p = clipRemaining / dur;
          return getOverlayStyle(transitions.exit.type, 1 - p);
        }
      }
    }
    // preview animation overlay
    if (previewAnim && previewProgress !== null) {
      const clip = clips.find(c => c.id === previewAnim.clipId);
      const trans = previewAnim.phase === 'entrance' ? clip?.transitions?.entrance : clip?.transitions?.exit;
      if (trans) {
        const p = previewAnim.phase === 'exit' ? 1 - previewProgress : previewProgress;
        return getOverlayStyle(trans.type, previewAnim.phase === 'exit' ? 1 - previewProgress : previewProgress);
      }
    }
    return null;
  }, [activeVisuals, currentTime, previewAnim, previewProgress, clips]);

  // Effect track clips — standalone overlays independent from media clips
  const effectTrackOverlays = useMemo(() => {
    const effectTracks = tracks.filter(t => t.type === 'effect' && t.visible);
    const effectTrackIds = new Set(effectTracks.map(t => t.id));
    const activeEffects = clips.filter(c =>
      c.type === 'effect' &&
      effectTrackIds.has(c.trackId) &&
      c.effectType &&
      c.effectType !== 'none' &&
      currentTime >= c.startTime &&
      currentTime < c.startTime + c.duration
    );
    return activeEffects.map(clip => {
      const elapsed = currentTime - clip.startTime;
      const progress = Math.min(Math.max(elapsed / clip.duration, 0), 1);
      const overlay = getOverlayStyle(clip.effectType!, progress);
      return overlay ? { id: clip.id, ...overlay } : null;
    }).filter(Boolean) as { id: string; style: React.CSSProperties; elements: React.ReactNode }[];
  }, [clips, tracks, currentTime]);

  return (
    <div className="w-full h-full flex items-center justify-center"
      onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}
    >
      <div ref={containerRef} className="relative rounded-md overflow-hidden" style={{ width: CANVAS_W, height: CANVAS_H }}>
        <div className="absolute inset-0 bg-black" />

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
                  left: `${cx}%`, top: `${cy}%`, width: `${cw}%`, height: `${ch}%`,
                  filter: buildFilter(clip),
                  opacity: clip.opacity ?? 1,
                  outline: isSelected ? '2px solid hsl(var(--primary))' : 'none',
                  outlineOffset: '-1px', zIndex, transition: 'none',
                  transform: [
                    `rotate(${clip.rotation ?? 0}deg)`,
                    `skewX(${clip.skewX ?? 0}deg)`,
                    `skewY(${clip.skewY ?? 0}deg)`,
                    `scaleX(${clip.scaleX ?? 1})`,
                    `scaleY(${clip.scaleY ?? 1})`,
                    transitionStyle.transform || '',
                  ].filter(Boolean).join(' '),
                  ...transitionStyle,
                  // Override transform with our combined one
                  ...((() => {
                    const combinedTransform = [
                      `rotate(${clip.rotation ?? 0}deg)`,
                      `skewX(${clip.skewX ?? 0}deg)`,
                      `skewY(${clip.skewY ?? 0}deg)`,
                      `scaleX(${clip.scaleX ?? 1})`,
                      `scaleY(${clip.scaleY ?? 1})`,
                      transitionStyle.transform || '',
                    ].filter(Boolean).join(' ');
                    return { transform: combinedTransform };
                  })()),
                  ...(transitionStyle.opacity !== undefined ? { opacity: (clip.opacity ?? 1) * (transitionStyle.opacity as number) } : {}),
                  ...(transitionStyle.filter ? { filter: [buildFilter(clip), transitionStyle.filter].filter(f => f && f !== 'none').join(' ') || 'none' } : {}),
                }}
                onPointerDown={(e) => handlePointerDown(e, clip.id, 'move')}
              >
                {clip.src ? (
                  clip.type === 'video' ? (
                    <video ref={(el) => { videoRefs.current[clip.id] = el; }} src={clip.src} className="w-full h-full object-contain pointer-events-none" muted={clip.muted} playsInline preload="metadata" />
                  ) : (
                    <img src={clip.src} className="w-full h-full object-contain pointer-events-none" alt="" draggable={false} />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${clip.color}40, ${clip.color}20)` }}>
                    <div className="text-center">
                      <span className="text-4xl">🎬</span>
                      <p className="text-white/60 text-sm mt-2">{clip.name}</p>
                    </div>
                  </div>
                )}

                {isSelected && (
                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-primary rounded-tl-md cursor-se-resize z-20" onPointerDown={(e) => handlePointerDown(e, clip.id, 'resize')}>
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

        {/* Transition overlay effects (light flash, lens flare, etc.) */}
        {transitionOverlay && (
          <div className="absolute inset-0 pointer-events-none z-50" style={transitionOverlay.style}>
            {transitionOverlay.elements}
          </div>
        )}

        {/* Effect track overlays — standalone effects independent of clips */}
        {effectTrackOverlays.map(eo => (
          <div key={eo.id} className="absolute inset-0 pointer-events-none z-50" style={eo.style}>
            {eo.elements}
          </div>
        ))}

        {activeTexts.map((clip) => (
          <div key={clip.id} className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <p className="text-white text-2xl font-bold drop-shadow-lg px-4 text-center">{clip.name}</p>
          </div>
        ))}

        {/* Filter preview badge */}
        {showFilterBadge && (
          <div className="absolute top-2 right-2 bg-primary/80 px-2 py-0.5 rounded text-primary-foreground text-[9px] font-semibold z-40 animate-pulse">
            🎨 FILTRO AO VIVO
          </div>
        )}

        <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-0.5 rounded text-white/80 text-[10px] font-mono z-40">
          {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}
        </div>

        <div className="absolute top-2 left-2 bg-black/50 px-1.5 py-0.5 rounded text-white/50 text-[8px] font-mono z-40">
          {resW}×{resH}
        </div>
      </div>
    </div>
  );
};

export default React.memo(VideoPreview);
