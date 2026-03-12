import React, { useEffect, useState, useRef } from 'react';
import { TransitionType } from './types';

interface Props {
  type: TransitionType;
  isExit?: boolean;
  isActive?: boolean;
  size?: number;
}

const TransitionPreviewThumb: React.FC<Props> = ({ type, isExit = false, isActive = false, size = 48 }) => {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef(0);

  useEffect(() => {
    startRef.current = performance.now();
    const CYCLE = 1400;
    const PAUSE = 500;
    const animate = () => {
      const elapsed = (performance.now() - startRef.current) % (CYCLE + PAUSE);
      setProgress(elapsed < CYCLE ? elapsed / CYCLE : 1);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [type]);

  const p = isExit ? 1 - progress : progress;
  const s = size;
  const rectW = s * 0.55;
  const rectH = s * 0.38;
  const cx = (s - rectW) / 2;
  const cy = (s - rectH) / 2;

  let transform = '';
  let opacity = 1;
  let clipPath = '';
  let filter = '';

  switch (type) {
    case 'fade': opacity = p; break;
    case 'dissolve': opacity = p; break;
    case 'crossfade': opacity = p; break;
    case 'fade-blur': opacity = p; filter = `blur(${(1 - p) * 3}px)`; break;
    case 'slide-left': transform = `translateX(${(1 - p) * s * 0.5}px)`; opacity = Math.min(1, p * 2); break;
    case 'slide-right': transform = `translateX(${(1 - p) * -s * 0.5}px)`; opacity = Math.min(1, p * 2); break;
    case 'slide-up': transform = `translateY(${(1 - p) * s * 0.5}px)`; opacity = Math.min(1, p * 2); break;
    case 'slide-down': transform = `translateY(${(1 - p) * -s * 0.5}px)`; opacity = Math.min(1, p * 2); break;
    case 'roll-left': transform = `translateX(${(1 - p) * s * 0.5}px) rotate(${(1 - p) * 30}deg)`; opacity = p; break;
    case 'roll-right': transform = `translateX(${(1 - p) * -s * 0.5}px) rotate(${(1 - p) * -30}deg)`; opacity = p; break;
    case 'zoom-in': transform = `scale(${0.3 + p * 0.7})`; opacity = p; break;
    case 'zoom-out': transform = `scale(${1 + (1 - p) * 0.5})`; opacity = p; break;
    case 'scale-up': {
      const b = p < 0.7 ? p / 0.7 : 1 + Math.sin((p - 0.7) / 0.3 * Math.PI) * 0.1;
      transform = `scale(${b * 0.5 + 0.5})`; opacity = Math.min(1, p * 1.5); break;
    }
    case 'scale-down': transform = `scale(${1 + (1 - p) * 0.3})`; opacity = p; break;
    case 'morph-scale': transform = `scale(${0.5 + p * 0.5}) scaleX(${0.8 + p * 0.2})`; opacity = p; break;
    case 'rotate-in': transform = `rotate(${(1 - p) * 90}deg) scale(${0.5 + p * 0.5})`; opacity = p; break;
    case 'rotate-out': transform = `rotate(${(1 - p) * -90}deg) scale(${0.5 + p * 0.5})`; opacity = p; break;
    case 'spiral': transform = `rotate(${(1 - p) * 360}deg) scale(${p})`; opacity = p; break;
    case 'flip-x': transform = `perspective(${s}px) rotateY(${(1 - p) * 90}deg)`; opacity = Math.min(1, p * 1.5); break;
    case 'flip-y': transform = `perspective(${s}px) rotateX(${(1 - p) * 90}deg)`; opacity = Math.min(1, p * 1.5); break;
    case 'bounce': {
      const e = p < 1 ? 1 - Math.pow(2, -10 * p) * Math.cos((p * 10 - 0.75) * (2 * Math.PI) / 3) : 1;
      transform = `scale(${e})`; opacity = Math.min(1, p * 2); break;
    }
    case 'elastic': {
      const e = p < 1 ? 1 - Math.pow(2, -8 * p) * Math.cos((p * 12 - 0.5) * (2 * Math.PI) / 3) : 1;
      transform = `scaleX(${e}) scaleY(${2 - e})`; opacity = Math.min(1, p * 2); break;
    }
    case 'swing': transform = `rotate(${Math.sin(p * Math.PI * 3) * (1 - p) * 20}deg)`; opacity = p; break;
    case 'wipe-left': clipPath = `inset(0 ${(1 - p) * 100}% 0 0)`; break;
    case 'wipe-right': clipPath = `inset(0 0 0 ${(1 - p) * 100}%)`; break;
    case 'wipe-up': clipPath = `inset(${(1 - p) * 100}% 0 0 0)`; break;
    case 'wipe-down': clipPath = `inset(0 0 ${(1 - p) * 100}% 0)`; break;
    case 'wipe-circle': clipPath = `circle(${p * 75}% at 50% 50%)`; break;
    case 'wipe-diamond': clipPath = `polygon(50% ${50 - p * 50}%, ${50 + p * 50}% 50%, 50% ${50 + p * 50}%, ${50 - p * 50}% 50%)`; break;
    case 'iris-open': clipPath = `circle(${p * 72}% at 50% 50%)`; break;
    case 'iris-close': clipPath = `circle(${(1 - p) * 72}% at 50% 50%)`; break;
    case 'split-horizontal': clipPath = `inset(${(1 - p) * 50}% 0)`; break;
    case 'split-vertical': clipPath = `inset(0 ${(1 - p) * 50}%)`; break;
    case 'blur-transition': filter = `blur(${(1 - p) * 4}px)`; opacity = p; break;
    case 'flash': opacity = p; filter = `brightness(${1 + (1 - p) * 2})`; break;
    case 'glitch': {
      const offset = Math.sin(p * 20) * (1 - p) * 3;
      transform = `translateX(${offset}px)`; opacity = 0.7 + p * 0.3;
      filter = `hue-rotate(${(1 - p) * 90}deg)`; break;
    }
    case 'pixelate': filter = `blur(${(1 - p) * 5}px)`; opacity = p; break;
    default: break;
  }

  const borderColor = isActive ? 'hsl(var(--primary))' : 'hsl(var(--border))';
  const bgActive = isActive ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--muted) / 0.3)';

  return (
    <div
      className="relative rounded-md overflow-hidden"
      style={{ width: s, height: s, border: `1.5px solid ${borderColor}`, background: bgActive }}
    >
      <svg width={s} height={s} className="absolute inset-0 opacity-[0.06]">
        <defs>
          <pattern id={`g-${type}-${isExit ? 'e' : 'i'}`} width="6" height="6" patternUnits="userSpaceOnUse">
            <path d="M 6 0 L 0 0 0 6" fill="none" stroke="currentColor" strokeWidth="0.4" />
          </pattern>
        </defs>
        <rect width={s} height={s} fill={`url(#g-${type}-${isExit ? 'e' : 'i'})`} />
      </svg>
      <div
        className="absolute rounded-[2px]"
        style={{
          left: cx, top: cy, width: rectW, height: rectH,
          background: isActive
            ? 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.6))'
            : 'linear-gradient(135deg, hsl(var(--foreground) / 0.5), hsl(var(--foreground) / 0.25))',
          transform, opacity,
          clipPath: clipPath || undefined,
          filter: filter || undefined,
          transformOrigin: 'center center',
          boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
        }}
      />
    </div>
  );
};

export default React.memo(TransitionPreviewThumb);
