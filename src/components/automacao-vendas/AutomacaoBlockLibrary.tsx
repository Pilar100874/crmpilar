import { AUTOMACAO_VENDAS_BLOCKS } from "@/types/automacaoVendas";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { X, Plus } from "lucide-react";
import * as Icons from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AutomacaoBlockLibraryProps {
  onDragStart: (event: React.DragEvent, nodeType: string) => void;
  isExpanded: boolean;
  onToggleExpanded: (expanded: boolean) => void;
}

const blockCategories = [
  { name: "Sistema", icon: "Settings", blocks: AUTOMACAO_VENDAS_BLOCKS.filter(b => b.category === "sistema" && b.type !== "iniciar_validacao") },
  { name: "Condições", icon: "Search", blocks: AUTOMACAO_VENDAS_BLOCKS.filter(b => b.category === "condicao") },
  { name: "Ações", icon: "Zap", blocks: AUTOMACAO_VENDAS_BLOCKS.filter(b => b.category === "acao") },
  { name: "Datas Especiais", icon: "Calendar", blocks: AUTOMACAO_VENDAS_BLOCKS.filter(b => b.category === "data") },
];

export const AutomacaoBlockLibrary = ({ onDragStart, isExpanded, onToggleExpanded }: AutomacaoBlockLibraryProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [openCategories, setOpenCategories] = useState<string[]>(["Sistema", "Condições"]);

  const toggleCategory = (categoryName: string) => {
    setOpenCategories(prev =>
      prev.includes(categoryName) ? prev.filter(c => c !== categoryName) : [...prev, categoryName]
    );
  };

  const filteredCategories = blockCategories.map(category => ({
    ...category,
    blocks: category.blocks.filter(block => {
      const query = searchQuery.toLowerCase();
      return block.label.toLowerCase().includes(query) || block.description.toLowerCase().includes(query);
    })
  })).filter(category => category.blocks.length > 0);

  if (!isExpanded) return null;

  return (
    <div className="w-64 bg-white border-r border-border/30 flex flex-col h-full relative">
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-foreground">Menu</h3>
          <Button variant="ghost" size="icon" onClick={() => onToggleExpanded(false)} className="h-7 w-7 rounded-md hover:bg-black/5">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Input
          placeholder="Buscar..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8 text-xs bg-muted/40 border-0 shadow-sm"
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2 pb-4 space-y-0.5">
          {filteredCategories.map((category) => {
            const CategoryIcon = Icons[category.icon as keyof typeof Icons] as any;
            const isOpen = openCategories.includes(category.name);

            return (
              <Collapsible key={category.name} open={isOpen} onOpenChange={() => toggleCategory(category.name)}>
                <CollapsibleTrigger
                  className={`flex items-center justify-between w-full px-3 py-2 rounded-xl transition-all duration-150 text-left ${
                    isOpen ? "bg-foreground text-background" : "hover:bg-black/5 text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {CategoryIcon && (
                      <CategoryIcon className={`w-4 h-4 ${isOpen ? "text-background" : "text-muted-foreground"}`} />
                    )}
                    <span className="text-xs font-medium">{category.name}</span>
                  </div>
                  <span className={`text-xs ${isOpen ? "text-background/70" : "text-muted-foreground"}`}>
                    {isOpen ? "−" : "+"}
                  </span>
                </CollapsibleTrigger>

                <CollapsibleContent className="animate-accordion-down">
                  <div className="relative ml-5 pl-4 pt-1 pb-1">
                    <div className="absolute left-0 top-0 bottom-0 w-px bg-border" />
                    <div className="space-y-0.5">
                      {category.blocks.map((block) => (
                        <Card
                          key={block.type}
                          draggable
                          onDragStart={(event) => onDragStart(event, block.type)}
                          onDoubleClick={() => window.dispatchEvent(new CustomEvent("workflow:add-block", { detail: { type: block.type } }))}
                          title="Arraste ou clique 2x para adicionar"
                          className="px-3 py-2 cursor-grab active:cursor-grabbing bg-transparent hover:bg-muted/60 border-0 shadow-none rounded-xl transition-all duration-150 select-none"
                        >
                          <h4 className="text-xs font-normal text-foreground truncate">{block.label}</h4>
                        </Card>
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}

          {filteredCategories.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <div className="p-3 rounded-full bg-muted w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <Plus className="w-6 h-6" />
              </div>
              <p className="text-xs font-medium">Nenhum bloco encontrado</p>
              <p className="text-[10px] mt-1">Tente outra busca</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
