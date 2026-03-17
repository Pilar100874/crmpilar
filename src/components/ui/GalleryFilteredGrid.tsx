import React, { useState, useMemo } from 'react';
import { Check, Film, Image as ImageIcon } from 'lucide-react';
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
  const { getFilteredItems } = useGalleryFolders();
  const { folders, filteredItems } = getFilteredItems(items);

  return (
    <div>
      {folders.length > 0 && (
        <div className="px-4 pt-2">
          <GalleryFolderTabs
            folders={folders}
            activeFolder={getFilteredItems(items).activeFolder}
            onSelectFolder={getFilteredItems(items).setActiveFolder}
          />
        </div>
      )}
      <div className="grid grid-cols-3 gap-2 p-4">
        {filteredItems.map((item) => {
          const isSelected = selectedIds.has(item.id);
          return (
            <button
              key={item.id}
              onClick={() => onToggleSelect(item.id)}
              className={`relative rounded-lg border-2 overflow-hidden transition-all group aspect-video bg-muted ${
                isSelected ? 'border-primary ring-2 ring-primary/30 scale-[0.97]' : 'border-border hover:border-primary/50'
              }`}
            >
              {galleryType === 'video' ? (
                <video src={item.public_url} className="w-full h-full object-cover" muted preload="metadata" />
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
