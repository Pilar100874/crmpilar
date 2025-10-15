import { BLOCK_DEFINITIONS } from "@/types/flow";
import { Card } from "@/components/ui/card";
import * as Icons from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BlockLibraryProps {
  onDragStart: (event: React.DragEvent, nodeType: string) => void;
}

export const BlockLibrary = ({ onDragStart }: BlockLibraryProps) => {
  return (
    <div className="w-64 border-r bg-card flex flex-col h-full">
      <div className="p-4 border-b">
        <h3 className="font-medium text-sm">Biblioteca de Blocos</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Arraste para o canvas
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {BLOCK_DEFINITIONS.map((block) => {
            const IconComponent = Icons[block.icon as keyof typeof Icons] as any;
            
            return (
              <Card
                key={block.type}
                draggable
                onDragStart={(event) => onDragStart(event, block.type)}
                className="p-3 cursor-grab active:cursor-grabbing hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start gap-2">
                  {IconComponent && (
                    <IconComponent className={`w-4 h-4 mt-0.5 ${block.color} flex-shrink-0`} />
                  )}
                  <div className="min-w-0">
                    <h4 className="font-medium text-sm truncate">{block.label}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {block.description}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
