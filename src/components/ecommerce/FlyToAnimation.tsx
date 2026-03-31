import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";

interface FlyToAnimationProps {
  startRect: DOMRect;
  targetSelector: string;
  imageUrl?: string;
  icon?: "heart" | "cart";
  onComplete: () => void;
}

export default function FlyToAnimation({ startRect, targetSelector, imageUrl, icon, onComplete }: FlyToAnimationProps) {
  const [targetPos, setTargetPos] = useState<{ x: number; y: number } | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const target = document.querySelector(targetSelector);
    if (target) {
      const rect = target.getBoundingClientRect();
      setTargetPos({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    } else {
      onCompleteRef.current();
    }
  }, [targetSelector]);

  const handleComplete = useCallback(() => {
    onCompleteRef.current();
  }, []);

  if (!targetPos) return null;

  const startX = startRect.left + startRect.width / 2;
  const startY = startRect.top + startRect.height / 2;

  // Calculate a curved path using a midpoint
  const midX = (startX + targetPos.x) / 2;
  const midY = Math.min(startY, targetPos.y) - 80;

  return createPortal(
    <motion.div
      className="fixed z-[9999] pointer-events-none"
      initial={{ x: startX - 24, y: startY - 24, scale: 1, opacity: 1 }}
      animate={{ x: targetPos.x - 24, y: targetPos.y - 24, scale: 0.2, opacity: 0 }}
      transition={{
        duration: 0.7,
        ease: [0.22, 1, 0.36, 1],
        opacity: { duration: 0.7, ease: "easeIn" },
      }}
      onAnimationComplete={handleComplete}
    >
      {imageUrl ? (
        <div className="w-12 h-12 rounded-xl overflow-hidden shadow-2xl border-2 border-primary/30 bg-white ring-2 ring-primary/20">
          <img src={imageUrl} alt="" className="w-full h-full object-contain" />
        </div>
      ) : icon === "heart" ? (
        <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center shadow-2xl">
          <svg className="w-6 h-6 text-white fill-white" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </div>
      ) : (
        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-2xl">
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        </div>
      )}
    </motion.div>,
    document.body
  );
}
