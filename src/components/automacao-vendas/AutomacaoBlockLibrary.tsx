import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { AUTOMACAO_VENDAS_BLOCKS, type AutomacaoVendasBlockType, type AutomacaoVendasNode } from "@/types/automacaoVendas";

interface AutomacaoBlockLibraryProps {
  onDragStart: (event: React.DragEvent, type: AutomacaoVendasBlockType) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  nodes: AutomacaoVendasNode[];
  onSelectNode: (nodeId: string) => void;
}

export const AutomacaoBlockLibrary = ({
  onDragStart,
  isExpanded,
  onToggleExpand,
  nodes,
  onSelectNode,
}: AutomacaoBlockLibraryProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBlocks = AUTOMACAO_VENDAS_BLOCKS.filter(
    (block) =>
      block.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      block.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredNodes = nodes.filter((node) =>
    node.data.label.toLowerCase().includes(searchQuery.toLowerCase())
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
          <h3 className="font-semibold">Blocos</h3>
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
          {/* Blocos existentes no fluxo */}
          {filteredNodes.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                Blocos no Fluxo
              </h4>
              <div className="space-y-2">
                {filteredNodes.map((node) => (
                  <Button
                    key={node.id}
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-2"
                    onClick={() => onSelectNode(node.id)}
                  >
                    <div>
                      <div className="font-medium text-sm">{node.data.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {node.data.type}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Blocos disponíveis por categoria */}
          {Object.entries(blocksByCategory).map(([category, blocks]) => (
            <div key={category}>
              <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                {categoryLabels[category as keyof typeof categoryLabels]}
              </h4>
              <div className="space-y-2">
                {blocks.map((block) => (
                  <div
                    key={block.type}
                    draggable
                    onDragStart={(e) => onDragStart(e, block.type)}
                    className="p-3 border rounded-lg cursor-move hover:bg-accent transition-colors"
                    style={{ borderLeftColor: block.color, borderLeftWidth: "3px" }}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: block.color + "20" }}
                      >
                        <span style={{ color: block.color }}>
                          {block.icon}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{block.label}</div>
                        <div className="text-xs text-muted-foreground">
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
