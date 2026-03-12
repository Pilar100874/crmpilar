import React, { useEffect, useState, useRef } from 'react';
import { TransitionType } from './types';

interface Props {
  type: TransitionType;
  isExit?: boolean;
  isActive?: boolean;
  size?: number;
}

/**
 * Animated thumbnail that continuously loops a transition preview.
 * Uses a small colored rectangle that animates according to the transition type.
 */
const TransitionPreviewThumb: React.FC<Props> = ({ type, isExit = false, isActive = false, size = 48 }) => {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef(0);

  useEffect(() => {
    startRef.current = performance.now();
    const CYCLE = 1500; // ms for one loop
    const PAUSE = 600; // ms pause between loops

    const animate = () => {
      const elapsed = (performance.now() - startRef.current) % (CYCLE + PAUSE);
      if (elapsed < CYCLE) {
        setProgress(elapsed / CYCLE);
      } else {
        setProgress(1);
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [type]);

  const p = isExit ? 1 - progress : progress;
  const s = size;
  const rectW = s * 0.6;
  const rectH = s * 0.4;
  const cx = (s - rectW) / 2;
  const cy = (s - rectH) / 2;

  let transform = '';
  let opacity = 1;
  let clipPath = '';
  let filter = '';

  switch (type) {
    case 'fade':
      opacity = p;
      break;
    case 'slide-left':
      transform = `translateX(${(1 - p) * s * 0.5}px)`;
      opacity = Math.min(1, p * 2);
      break;
    case 'slide-right':
      transform = `translateX(${(1 - p) * -s * 0.5}px)`;
      opacity = Math.min(1, p * 2);
      break;
    case 'slide-up':
      transform = `translateY(${(1 - p) * s * 0.5}px)`;
      opacity = Math.min(1, p * 2);
      break;
    case 'slide-down':
      transform = `translateY(${(1 - p) * -s * 0.5}px)`;
      opacity = Math.min(1, p * 2);
      break;
    case 'zoom-in':
      transform = `scale(${0.3 + p * 0.7})`;
      opacity = p;
      break;
    case 'zoom-out':
      transform = `scale(${1 + (1 - p) * 0.5})`;
      opacity = p;
      break;
    case 'scale-up': {
      const bounce = p < 0.7 ? p / 0.7 : 1 + Math.sin((p - 0.7) / 0.3 * Math.PI) * 0.1;
      transform = `scale(${bounce * 0.5 + 0.5})`;
      opacity = Math.min(1, p * 1.5);
      break;
    }
    case 'scale-down':
      transform = `scale(${1 + (1 - p) * 0.3})`;
      opacity = p;
      break;
    case 'blur-transition':
      filter = `blur(${(1 - p) * 4}px)`;
      opacity = p;
      break;
    case 'flash':
      opacity = p;
      filter = `brightness(${1 + (1 - p) * 2})`;
      break;
    case 'bounce': {
      const elasticP = p < 1
        ? 1 - Math.pow(2, -10 * p) * Math.cos((p * 10 - 0.75) * (2 * Math.PI) / 3)
        : 1;
      transform = `scale(${elasticP})`;
      opacity = Math.min(1, p * 2);
      break;
    }
    case 'rotate-in':
      transform = `rotate(${(1 - p) * 90}deg) scale(${0.5 + p * 0.5})`;
      opacity = p;
      break;
    case 'dissolve':
      opacity = p;
      break;
    case 'wipe-left':
      clipPath = `inset(0 ${(1 - p) * 100}% 0 0)`;
      break;
    case 'wipe-right':
      clipPath = `inset(0 0 0 ${(1 - p) * 100}%)`;
      break;
    case 'crossfade':
      opacity = p;
      break;
    default:
      break;
  }

  const borderColor = isActive ? 'hsl(var(--primary))' : 'hsl(var(--border))';
  const bgActive = isActive ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--muted) / 0.3)';

  return (
    <div
      className="relative rounded-md overflow-hidden"
      style={{
        width: s,
        height: s,
        border: `2px solid ${borderColor}`,
        background: bgActive,
      }}
    >
      {/* Background grid pattern */}
      <svg width={s} height={s} className="absolute inset-0 opacity-10">
        <defs>
          <pattern id={`grid-${type}`} width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M 8 0 L 0 0 0 8" fill="none" stroke="currentColor" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width={s} height={s} fill={`url(#grid-${type})`} />
      </svg>

      {/* Animated preview rectangle */}
      <div
        className="absolute rounded-sm"
        style={{
          left: cx,
          top: cy,
          width: rectW,
          height: rectH,
          background: isActive
            ? 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))'
            : 'linear-gradient(135deg, hsl(var(--foreground) / 0.6), hsl(var(--foreground) / 0.3))',
          transform,
          opacity,
          clipPath: clipPath || undefined,
          filter: filter || undefined,
          transformOrigin: 'center center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
      />
    </div>
  );
};

export default React.memo(TransitionPreviewThumb);
