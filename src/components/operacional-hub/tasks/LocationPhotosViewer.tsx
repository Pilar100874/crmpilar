import { useState } from "react";
import { MapPin, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface LocationPhotosViewerProps {
  photos: string[];
  title?: string;
}

export function LocationPhotosViewer({ photos, title = "Local do Serviço" }: LocationPhotosViewerProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!photos || photos.length === 0) return null;

  const handlePrevious = () => {
    if (selectedIndex !== null) {
      setSelectedIndex(selectedIndex === 0 ? photos.length - 1 : selectedIndex - 1);
    }
  };

  const handleNext = () => {
    if (selectedIndex !== null) {
      setSelectedIndex(selectedIndex === photos.length - 1 ? 0 : selectedIndex + 1);
    }
  };

  return (
    <>
      <div className="bg-card rounded-2xl border border-border p-6">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          {title}
          <span className="text-xs text-muted-foreground ml-auto">
            {photos.length} foto{photos.length !== 1 ? "s" : ""}
          </span>
        </h3>

        {/* Single photo layout */}
        {photos.length === 1 && (
          <img
            src={photos[0]}
            alt={title}
            className="w-full rounded-xl border border-border cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => setSelectedIndex(0)}
          />
        )}

        {/* Two photos layout */}
        {photos.length === 2 && (
          <div className="grid grid-cols-2 gap-2">
            {photos.map((url, index) => (
              <img
                key={index}
                src={url}
                alt={`${title} ${index + 1}`}
                className="w-full aspect-square object-cover rounded-xl border border-border cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setSelectedIndex(index)}
              />
            ))}
          </div>
        )}

        {/* Three photos layout */}
        {photos.length === 3 && (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((url, index) => (
              <img
                key={index}
                src={url}
                alt={`${title} ${index + 1}`}
                className="w-full aspect-square object-cover rounded-xl border border-border cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setSelectedIndex(index)}
              />
            ))}
          </div>
        )}

        <p className="text-sm text-muted-foreground mt-3 text-center">
          Toque nas fotos para ampliar
        </p>
      </div>

      {/* Fullscreen viewer */}
      <Dialog open={selectedIndex !== null} onOpenChange={() => setSelectedIndex(null)}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
          <div className="relative flex items-center justify-center min-h-[60vh]">
            {/* Close button */}
            <button
              onClick={() => setSelectedIndex(null)}
              className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="h-6 w-6 text-white" />
            </button>

            {/* Navigation buttons */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={handlePrevious}
                  className="absolute left-4 z-10 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="h-8 w-8 text-white" />
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-4 z-10 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="h-8 w-8 text-white" />
                </button>
              </>
            )}

            {/* Image */}
            {selectedIndex !== null && (
              <img
                src={photos[selectedIndex]}
                alt={`${title} ${selectedIndex + 1}`}
                className="max-w-full max-h-[80vh] object-contain"
              />
            )}

            {/* Indicators */}
            {photos.length > 1 && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                {photos.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedIndex(index)}
                    className={cn(
                      "h-2 w-2 rounded-full transition-all",
                      index === selectedIndex
                        ? "bg-white w-6"
                        : "bg-white/50 hover:bg-white/75"
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
