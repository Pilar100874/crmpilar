import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";

interface FlyToAnimationProps {
  startRect: DOMRect;
  targetSelector: string; // CSS selector for the target icon
  imageUrl?: string;
  icon?: "heart" | "cart";
  onComplete: () => void;
}

export default function FlyToAnimation({ startRect, targetSelector, imageUrl, icon, onComplete }: FlyToAnimationProps) {
  const [targetPos, setTargetPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const target = document.querySelector(targetSelector);
    if (target) {
      const rect = target.getBoundingClientRect();
      setTargetPos({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    } else {
      onComplete();
    }
  }, [targetSelector, onComplete]);

  if (!targetPos) return null;

  const startX = startRect.left + startRect.width / 2;
  const startY = startRect.top + startRect.height / 2;

  return createPortal(
    <motion.div
      className="fixed z-[9999] pointer-events-none"
      initial={{ x: startX - 20, y: startY - 20, scale: 1, opacity: 1 }}
      animate={{ x: targetPos.x - 20, y: targetPos.y - 20, scale: 0.3, opacity: 0.4 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      onAnimationComplete={onComplete}
    >
      {imageUrl ? (
        <div className="w-10 h-10 rounded-lg overflow-hidden shadow-lg border bg-white">
          <img src={imageUrl} alt="" className="w-full h-full object-contain" />
        </div>
      ) : icon === "heart" ? (
        <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
          <svg className="w-5 h-5 text-white fill-white" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </div>
      ) : (
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg">
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        </div>
      )}
    </motion.div>,
    document.body
  );
}
