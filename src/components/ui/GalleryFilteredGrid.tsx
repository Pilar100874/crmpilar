import React, { useState, useRef, useCallback } from 'react';
import { Check, Play, Pause, X } from 'lucide-react';
import { GalleryFolderTabs } from '@/components/ui/GalleryFolderTabs';
import { useGalleryFolders } from '@/hooks/useGalleryFolders';

interface GalleryItem {
  id: string;
  nome: string;
  public_url: string;
  tipo: string;
  thumbnail_url: string | null;
}

interface Props {
  items: GalleryItem[];
  galleryType: 'video' | 'image';
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}

const GalleryFilteredGrid: React.FC<Props> = ({ items, galleryType, selectedIds, onToggleSelect }) => {
  const { getFilteredItems, activeFolder, setActiveFolder } = useGalleryFolders();
  const { folders, filteredItems } = getFilteredItems(items);
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  const handlePlayPreview = useCallback((e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    setPreviewVideoId(prev => prev === itemId ? null : itemId);
  }, []);

  const handleClosePreview = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewVideoId(null);
  }, []);

  return (
    <div>
      {folders.length > 0 && (
        <div className="px-4 pt-2">
          <GalleryFolderTabs
            folders={folders}
            activeFolder={activeFolder}
            onSelectFolder={setActiveFolder}
          />
        </div>
      )}

      {/* Inline video preview player */}
      {previewVideoId && galleryType === 'video' && (() => {
        const previewItem = filteredItems.find(i => i.id === previewVideoId);
        if (!previewItem) return null;
        return (
          <div className="mx-4 mt-2 mb-1 rounded-lg overflow-hidden border bg-black relative">
            <video
              ref={previewVideoRef}
              src={previewItem.public_url}
              controls
              autoPlay
              className="w-full max-h-[240px] object-contain"
            />
            <button
              onClick={handleClosePreview}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors"
            >
              <X className="h-3.5 w-3.5 text-white" />
            </button>
            <div className="px-3 py-1.5 bg-muted/50 border-t">
              <p className="text-[11px] text-foreground truncate">{previewItem.nome}</p>
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-3 gap-2 p-4">
        {filteredItems.map((item) => {
          const isSelected = selectedIds.has(item.id);
          const isPreviewing = previewVideoId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onToggleSelect(item.id)}
              className={`relative rounded-lg border-2 overflow-hidden transition-all group aspect-video bg-muted ${
                isSelected ? 'border-primary ring-2 ring-primary/30 scale-[0.97]' : 'border-border hover:border-primary/50'
              } ${isPreviewing ? 'ring-2 ring-accent' : ''}`}
            >
              {galleryType === 'video' ? (
                <>
                  <video src={item.public_url} className="w-full h-full object-cover" muted preload="metadata" />
                  {/* Play button overlay */}
                  <div
                    onClick={(e) => handlePlayPreview(e, item.id)}
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="Reproduzir preview"
                  >
                    <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors">
                      {isPreviewing ? (
                        <Pause className="h-4 w-4 text-white" />
                      ) : (
                        <Play className="h-4 w-4 text-white ml-0.5" />
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <img src={item.thumbnail_url || item.public_url} className="w-full h-full object-cover" alt={item.nome} />
              )}
              <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                isSelected ? 'bg-primary border-primary' : 'bg-background/80 border-border'
              }`}>
                {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
                <p className="text-[10px] text-white truncate">{item.nome}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default GalleryFilteredGrid;
