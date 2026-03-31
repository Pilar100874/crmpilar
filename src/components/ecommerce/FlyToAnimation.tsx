import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";

interface FlyToAnimationProps {
  startRect: DOMRect;
  targetSelector: string;
  targetPos?: { x: number; y: number };
  imageUrl?: string;
  icon?: "heart" | "cart";
  onComplete: () => void;
}

export default function FlyToAnimation({ startRect, targetSelector, targetPos: initialTargetPos, imageUrl, icon, onComplete }: FlyToAnimationProps) {
  const [targetPos, setTargetPos] = useState<{ x: number; y: number } | null>(initialTargetPos || null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (initialTargetPos) return; // Already have position

    const findTarget = () => {
      const target = document.querySelector<HTMLElement>(targetSelector);
      if (!target) return null;
      const rect = target.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    };

    const pos = findTarget();
    if (pos) {
      setTargetPos(pos);
    } else {
      // Retry a few times in case of re-render
      let attempts = 0;
      const interval = setInterval(() => {
        const p = findTarget();
        if (p || attempts > 5) {
          clearInterval(interval);
          if (p) setTargetPos(p);
          else onCompleteRef.current();
        }
        attempts++;
      }, 50);
      return () => clearInterval(interval);
    }
  }, [targetSelector, initialTargetPos]);

  const handleComplete = useCallback(() => {
    const target = document.querySelector<HTMLElement>(targetSelector);
    target?.animate(
      [
        { transform: "scale(1)", filter: "brightness(1)" },
        { transform: "scale(1.18)", filter: "brightness(1.12)" },
        { transform: "scale(1)", filter: "brightness(1)" },
      ],
      { duration: 280, easing: "ease-out" }
    );
    onCompleteRef.current();
  }, [targetSelector]);

  if (!targetPos) return null;

  const size = imageUrl ? 64 : 56;
  const halfSize = size / 2;
  const startX = startRect.left + startRect.width / 2;
  const startY = startRect.top + startRect.height / 2;
  const midX = (startX + targetPos.x) / 2;
  const midY = Math.min(startY, targetPos.y) - 96;

  return createPortal(
    <motion.div
      aria-hidden="true"
      className="fixed left-0 top-0 z-[99999] pointer-events-none transform-gpu will-change-transform"
      initial={{
        x: startX - halfSize,
        y: startY - halfSize,
        scale: 0.92,
        opacity: 0.15,
        rotate: 0,
      }}
      animate={{
        x: [startX - halfSize, midX - halfSize, targetPos.x - halfSize],
        y: [startY - halfSize, midY - halfSize, targetPos.y - halfSize],
        scale: [0.92, 1.08, 0.34],
        opacity: [0.25, 1, 0],
        rotate: [0, -8, 8],
      }}
      transition={{
        duration: 1.1,
        times: [0, 0.62, 1],
        ease: [0.22, 1, 0.36, 1],
      }}
      onAnimationComplete={handleComplete}
    >
      {imageUrl ? (
        <div className="h-16 w-16 overflow-hidden rounded-2xl border border-primary/25 bg-background shadow-2xl ring-2 ring-primary/20">
          <img src={imageUrl} alt="" className="h-full w-full object-contain" />
        </div>
      ) : icon === "heart" ? (
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-2xl ring-4 ring-destructive/20">
          <svg className="h-7 w-7 fill-current" viewBox="0 0 24 24">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </div>
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/25 bg-primary text-primary-foreground shadow-2xl ring-4 ring-primary/20">
          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
        </div>
      )}
    </motion.div>,
    document.body
  );
}
