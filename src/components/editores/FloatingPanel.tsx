import { useEffect, useRef, useState, type ReactNode } from "react";
import { GripVertical, X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  initialX?: number;
  initialY?: number;
}

export function FloatingPanel({ open, onClose, title = "Painel", children, initialX = 40, initialY = 40 }: Props) {
  const [pos, setPos] = useState({ x: initialX, y: initialY });
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      setPos({ x: e.clientX - dragRef.current.dx, y: e.clientY - dragRef.current.dy });
    };
    const onUp = () => { dragRef.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  if (!open) return null;

  return (
    <div
      className="absolute z-40 bg-card border rounded-lg shadow-2xl flex flex-col overflow-hidden"
      style={{ left: pos.x, top: pos.y, width: 300, maxHeight: "80%" }}
    >
      <div
        className="flex items-center justify-between gap-2 px-2 py-1.5 border-b bg-muted/50 cursor-move select-none"
        onMouseDown={(e) => {
          const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
          dragRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
        }}
      >
        <div className="flex items-center gap-1 text-xs font-medium">
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
          {title}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-6 w-6 rounded hover:bg-muted flex items-center justify-center"
          aria-label="Fechar"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">{children}</div>
    </div>
  );
}
