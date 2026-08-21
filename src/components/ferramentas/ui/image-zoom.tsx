import { useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { X, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageZoomProps {
  src: string;
  alt?: string;
  className?: string;
  thumbnailClassName?: string;
  onLoad?: () => void;
}

export function ImageZoom({
  src,
  alt = "Imagem",
  className,
  thumbnailClassName,
  onLoad,
}: ImageZoomProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div
        className={`relative cursor-zoom-in group ${className || ""}`}
        onClick={() => setIsOpen(true)}
      >
        <img
          src={src}
          alt={alt}
          className={`transition-transform duration-200 ${thumbnailClassName || ""}`}
          onLoad={onLoad}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg">
          <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-0 bg-transparent shadow-none">
          <div className="relative flex items-center justify-center">
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-2 top-2 z-10 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-[90vh] object-contain rounded-lg animate-scale-in"
              onClick={() => setIsOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
