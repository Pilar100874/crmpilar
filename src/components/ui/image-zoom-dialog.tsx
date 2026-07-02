import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw, X } from "lucide-react";

interface Props {
  src: string | null;
  onClose: () => void;
  alt?: string;
}

export function ImageZoomDialog({ src, onClose, alt = "Imagem" }: Props) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    if (src) {
      setScale(1);
      setPos({ x: 0, y: 0 });
    }
  }, [src]);

  const zoomIn = () => setScale((s) => Math.min(6, +(s + 0.5).toFixed(2)));
  const zoomOut = () => setScale((s) => Math.max(1, +(s - 0.5).toFixed(2)));
  const reset = () => { setScale(1); setPos({ x: 0, y: 0 }); };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.3 : 0.3;
    setScale((s) => Math.min(6, Math.max(1, +(s + delta).toFixed(2))));
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    dragRef.current = { x: e.clientX, y: e.clientY, ox: pos.x, oy: pos.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    setPos({
      x: dragRef.current.ox + (e.clientX - dragRef.current.x),
      y: dragRef.current.oy + (e.clientY - dragRef.current.y),
    });
  };
  const onMouseUp = () => { dragRef.current = null; };

  return (
    <Dialog open={!!src} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-6xl p-0 overflow-hidden">
        <div className="relative bg-black/90 h-[80vh] flex items-center justify-center select-none">
          <div
            className="absolute inset-0 overflow-hidden flex items-center justify-center"
            onWheel={onWheel}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            style={{ cursor: scale > 1 ? (dragRef.current ? "grabbing" : "grab") : "default" }}
          >
            {src && (
              <img
                src={src}
                alt={alt}
                draggable={false}
                className="max-h-full max-w-full transition-transform"
                style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})` }}
              />
            )}
          </div>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 bg-background/90 backdrop-blur rounded-full px-2 py-1 shadow">
            <Button size="icon" variant="ghost" onClick={zoomOut} disabled={scale <= 1}><ZoomOut className="h-4 w-4" /></Button>
            <span className="text-xs self-center w-12 text-center">{Math.round(scale * 100)}%</span>
            <Button size="icon" variant="ghost" onClick={zoomIn} disabled={scale >= 6}><ZoomIn className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" onClick={reset}><RotateCcw className="h-4 w-4" /></Button>
          </div>
          <Button size="icon" variant="secondary" className="absolute top-2 right-2" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
