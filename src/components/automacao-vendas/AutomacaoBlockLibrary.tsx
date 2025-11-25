import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { AUTOMACAO_VENDAS_BLOCKS, type AutomacaoVendasBlockType } from "@/types/automacaoVendas";

interface BlockData {
  id: string;
  type: AutomacaoVendasBlockType;
  label: string;
  config: any;
  note?: string;
}

interface AutomacaoBlockLibraryProps {
  onDragStart: (event: React.DragEvent, type: AutomacaoVendasBlockType) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  blocks: BlockData[];
  onSelectBlock: (blockId: string) => void;
}

export const AutomacaoBlockLibrary = ({
  onDragStart,
  isExpanded,
  onToggleExpand,
  blocks,
  onSelectBlock,
}: AutomacaoBlockLibraryProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBlocks = AUTOMACAO_VENDAS_BLOCKS.filter(
    (block) =>
      block.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      block.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredWorkspaceBlocks = blocks.filter((block) =>
    block.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const blocksByCategory = filteredBlocks.reduce((acc, block) => {
    if (!acc[block.category]) {
      acc[block.category] = [];
    }
    acc[block.category].push(block);
    return acc;
  }, {} as Record<string, typeof AUTOMACAO_VENDAS_BLOCKS>);

  const categoryLabels = {
    sistema: "Sistema",
    condicao: "Condições",
    acao: "Ações",
    data: "Datas Especiais",
  };

  if (!isExpanded) {
    return (
      <div className="w-12 border-r flex flex-col items-center py-2 bg-muted/20">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleExpand}
          className="mb-2"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-80 border-r flex flex-col bg-background">
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Blocos Disponíveis</h3>
          <Button variant="ghost" size="icon" onClick={onToggleExpand}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar blocos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Blocos no workspace */}
          {filteredWorkspaceBlocks.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                Blocos no Workspace
              </h4>
              <div className="space-y-2">
                {filteredWorkspaceBlocks.map((block) => (
                  <Button
                    key={block.id}
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-2"
                    onClick={() => onSelectBlock(block.id)}
                  >
                    <div>
                      <div className="font-medium text-sm">{block.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {block.type}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Blocos disponíveis por categoria */}
          {Object.entries(blocksByCategory).map(([category, categoryBlocks]) => (
            <div key={category}>
              <h4 className="text-sm font-medium mb-3 text-muted-foreground">
                {categoryLabels[category as keyof typeof categoryLabels]}
              </h4>
              <div className="space-y-2">
                {categoryBlocks.map((block) => (
                  <div
                    key={block.type}
                    draggable
                    onDragStart={(e) => onDragStart(e, block.type)}
                    className="p-3 border rounded-lg cursor-move hover:bg-accent transition-all hover:shadow-md active:scale-95"
                    style={{ 
                      borderLeftColor: block.color, 
                      borderLeftWidth: "4px",
                      backgroundColor: block.color + "10"
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: block.color + "30" }}
                      >
                        <span style={{ color: block.color, fontSize: "1.25rem" }}>
                          {block.icon}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm mb-1">{block.label}</div>
                        <div className="text-xs text-muted-foreground leading-snug">
                          {block.description}
                        </div>
                      </div>
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
