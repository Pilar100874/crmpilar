import { useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, ChevronLeft, ChevronRight, Package, Wrench } from "lucide-react";

interface KitTool {
  id: string;
  name: string;
  photo_url: string | null;
  type: string;
}

interface KitGalleryZoomProps {
  kitName: string;
  tools: KitTool[];
  trigger: React.ReactNode;
}

export function KitGalleryZoom({ kitName, tools, trigger }: KitGalleryZoomProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? tools.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === tools.length - 1 ? 0 : prev + 1));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") handlePrevious();
    if (e.key === "ArrowRight") handleNext();
  };

  const currentTool = tools[currentIndex];

  if (tools.length === 0) return trigger;

  return (
    <>
      <div
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
          setCurrentIndex(0);
        }}
      >
        {trigger}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent 
          className="max-w-[95vw] sm:max-w-2xl max-h-[95vh] p-0 border-0 bg-background/95 backdrop-blur-sm overflow-hidden"
          onKeyDown={handleKeyDown}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{kitName}</h3>
                <p className="text-sm text-muted-foreground">
                  {currentIndex + 1} de {tools.length} itens
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Image area */}
          <div className="relative flex items-center justify-center min-h-[300px] sm:min-h-[400px] bg-muted/30 p-4">
            {/* Previous button */}
            {tools.length > 1 && (
              <Button
                variant="secondary"
                size="icon"
                className="absolute left-2 sm:left-4 z-10 rounded-full h-10 w-10 sm:h-12 sm:w-12 shadow-lg"
                onClick={handlePrevious}
              >
                <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
            )}

            {/* Current image */}
            <div className="flex flex-col items-center gap-4 max-w-full">
              {currentTool?.photo_url ? (
                <img
                  src={currentTool.photo_url}
                  alt={currentTool.name}
                  className="max-w-full max-h-[50vh] object-contain rounded-lg shadow-lg animate-fade-in"
                />
              ) : (
                <div className="flex h-48 w-48 items-center justify-center rounded-xl bg-muted">
                  <Wrench className="h-20 w-20 text-muted-foreground/50" />
                </div>
              )}
              <div className="text-center">
                <p className="font-medium text-lg">{currentTool?.name}</p>
                <Badge variant="secondary" className="mt-1 capitalize">
                  {currentTool?.type}
                </Badge>
              </div>
            </div>

            {/* Next button */}
            {tools.length > 1 && (
              <Button
                variant="secondary"
                size="icon"
                className="absolute right-2 sm:right-4 z-10 rounded-full h-10 w-10 sm:h-12 sm:w-12 shadow-lg"
                onClick={handleNext}
              >
                <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
            )}
          </div>

          {/* Thumbnails */}
          {tools.length > 1 && (
            <div className="p-4 border-t bg-muted/30">
              <div className="flex gap-2 justify-center overflow-x-auto pb-1">
                {tools.map((tool, index) => (
                  <button
                    key={tool.id}
                    onClick={() => setCurrentIndex(index)}
                    className={`shrink-0 rounded-lg overflow-hidden transition-all ${
                      index === currentIndex
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105"
                        : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    {tool.photo_url ? (
                      <img
                        src={tool.photo_url}
                        alt={tool.name}
                        className="h-14 w-14 sm:h-16 sm:w-16 object-cover"
                      />
                    ) : (
                      <div className="h-14 w-14 sm:h-16 sm:w-16 flex items-center justify-center bg-muted">
                        <Wrench className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
