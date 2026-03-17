import React from 'react';
import { Folder } from 'lucide-react';

interface GalleryFolderTabsProps {
  folders: string[];
  activeFolder: string | null;
  onSelectFolder: (folder: string | null) => void;
  className?: string;
}

const GalleryFolderTabs: React.FC<GalleryFolderTabsProps> = ({
  folders,
  activeFolder,
  onSelectFolder,
  className = '',
}) => {
  if (folders.length === 0) return null;

  return (
    <div className={`flex gap-1 overflow-x-auto pb-1 nodrag nowheel ${className}`}>
      <button
        onClick={(e) => { e.stopPropagation(); onSelectFolder(null); }}
        onMouseDown={(e) => e.stopPropagation()}
        className={`shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-medium transition-all border ${
          activeFolder === null
            ? 'bg-primary/10 border-primary/30 text-primary'
            : 'bg-muted/30 border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/50'
        }`}
      >
        Todos
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onSelectFolder('__root__'); }}
        onMouseDown={(e) => e.stopPropagation()}
        className={`shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-medium transition-all border ${
          activeFolder === '__root__'
            ? 'bg-primary/10 border-primary/30 text-primary'
            : 'bg-muted/30 border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/50'
        }`}
      >
        Raiz
      </button>
      {folders.map((folder) => (
        <button
          key={folder}
          onClick={(e) => { e.stopPropagation(); onSelectFolder(folder); }}
          onMouseDown={(e) => e.stopPropagation()}
          className={`shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-medium transition-all border ${
            activeFolder === folder
              ? 'bg-primary/10 border-primary/30 text-primary'
              : 'bg-muted/30 border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <Folder className="h-2.5 w-2.5" />
          <span className="truncate max-w-[60px]">{folder}</span>
        </button>
      ))}
    </div>
  );
};

export { GalleryFolderTabs };
export default GalleryFolderTabs;
