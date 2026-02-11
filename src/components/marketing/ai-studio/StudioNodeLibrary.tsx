import React from 'react';
import { NODE_CATEGORIES } from './types';
import { ScrollArea } from '@/components/ui/scroll-area';

const StudioNodeLibrary: React.FC = () => {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/studioNodeType', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-56 border-r border-border bg-card flex flex-col shrink-0">
      <div className="p-3 border-b border-border">
        <h3 className="font-semibold text-sm text-foreground">🧩 Blocos</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Arraste para o canvas</p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-3">
          {NODE_CATEGORIES.map((cat) => (
            <div key={cat.id}>
              <p className="text-xs font-medium text-muted-foreground px-2 mb-1.5 uppercase tracking-wider">
                {cat.icon} {cat.label}
              </p>
              <div className="space-y-1">
                {cat.nodes.map((node) => (
                  <div
                    key={node.type}
                    draggable
                    onDragStart={(e) => onDragStart(e, node.type)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/30 cursor-grab active:cursor-grabbing hover:border-primary/30 hover:bg-accent hover:shadow-sm transition-all text-sm group"
                    style={{ borderLeftColor: node.color, borderLeftWidth: 3 }}
                  >
                    <span className="text-base">{node.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-xs truncate text-foreground/70 group-hover:text-foreground">{node.label}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{node.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default StudioNodeLibrary;
