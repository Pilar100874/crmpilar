import { AUTOMACAO_VENDAS_BLOCKS, AutomacaoVendasBlockType } from "@/types/automacaoVendas";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, X, Settings, Search, Zap, Calendar } from "lucide-react";
import * as Icons from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AutomacaoBlockLibraryProps {
  onDragStart: (event: React.DragEvent, nodeType: string) => void;
  isExpanded: boolean;
  onToggleExpanded: (expanded: boolean) => void;
}

// Organizar blocos por categoria
const blockCategories = [
  {
    name: "Sistema",
    icon: "Settings",
    color: "purple",
    gradient: "from-purple-500/10 to-violet-500/10",
    border: "border-purple-500/20",
    borderHover: "hover:border-purple-500/40",
    iconColor: "text-purple-600",
    blocks: AUTOMACAO_VENDAS_BLOCKS.filter(b => b.category === "sistema" && b.type !== "iniciar_validacao"),
  },
  {
    name: "Condições",
    icon: "Search",
    color: "blue",
    gradient: "from-blue-500/10 to-cyan-500/10",
    border: "border-blue-500/20",
    borderHover: "hover:border-blue-500/40",
    iconColor: "text-blue-600",
    blocks: AUTOMACAO_VENDAS_BLOCKS.filter(b => b.category === "condicao"),
  },
  {
    name: "Ações",
    icon: "Zap",
    color: "orange",
    gradient: "from-orange-500/10 to-amber-500/10",
    border: "border-orange-500/20",
    borderHover: "hover:border-orange-500/40",
    iconColor: "text-orange-600",
    blocks: AUTOMACAO_VENDAS_BLOCKS.filter(b => b.category === "acao"),
  },
  {
    name: "Datas Especiais",
    icon: "Calendar",
    color: "rose",
    gradient: "from-rose-500/10 to-pink-500/10",
    border: "border-rose-500/20",
    borderHover: "hover:border-rose-500/40",
    iconColor: "text-rose-600",
    blocks: AUTOMACAO_VENDAS_BLOCKS.filter(b => b.category === "data"),
  },
];

export const AutomacaoBlockLibrary = ({ onDragStart, isExpanded, onToggleExpanded }: AutomacaoBlockLibraryProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [openCategories, setOpenCategories] = useState<string[]>(["Sistema", "Condições"]);

  const toggleCategory = (categoryName: string) => {
    setOpenCategories(prev => 
      prev.includes(categoryName) 
        ? prev.filter(c => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  const filteredCategories = blockCategories.map(category => ({
    ...category,
    blocks: category.blocks.filter(block => {
      const query = searchQuery.toLowerCase();
      return block.label.toLowerCase().includes(query) ||
             block.description.toLowerCase().includes(query);
    })
  })).filter(category => category.blocks.length > 0);

  if (!isExpanded) {
    return null;
  }

  return (
    <div className="w-80 bg-card border-r border-border flex flex-col h-full shadow-lg">
      {/* Header */}
      <div className="p-3 border-b border-border bg-gradient-to-r from-primary/20 to-primary/10">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-sm text-foreground">Blocos</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onToggleExpanded(false)}
            className="h-7 w-7"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Search */}
        <Input
          placeholder="Buscar..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8 text-xs"
        />
      </div>

      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-1 pb-4">
          {filteredCategories.map((category) => {
            const isOpen = openCategories.includes(category.name);
            const CategoryIcon = Icons[category.icon as keyof typeof Icons] as any;

            return (
              <Collapsible
                key={category.name}
                open={isOpen}
                onOpenChange={() => toggleCategory(category.name)}
                className="group"
              >
                <CollapsibleTrigger className={`flex items-center justify-between w-full px-2 py-1.5 rounded-lg hover:bg-muted transition-all duration-150 group border border-transparent ${category.borderHover}`}>
                  <div className="flex items-center gap-2">
                    {CategoryIcon && (
                      <div className={`p-1 rounded-md bg-gradient-to-br ${category.gradient} border ${category.border} transition-all`}>
                        <CategoryIcon className={`w-3 h-3 ${category.iconColor}`} />
                      </div>
                    )}
                    <span className="font-semibold text-xs text-foreground transition-colors">{category.name}</span>
                  </div>
                  <ChevronDown 
                    className={`w-3 h-3 text-muted-foreground transition-all duration-150 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </CollapsibleTrigger>

                <CollapsibleContent className="pt-1 pb-1 space-y-1">
                  {category.blocks.map((block) => {
                    const BlockIcon = Icons[block.icon as keyof typeof Icons] as any;
                    
                    return (
                      <Card
                        key={block.type}
                        draggable
                        onDragStart={(event) => onDragStart(event, block.type)}
                        onDoubleClick={() => window.dispatchEvent(new CustomEvent("workflow:add-block", { detail: { type: block.type } }))}
                        title="Arraste ou clique 2x para adicionar"
                        className="p-2 ml-5 cursor-grab active:cursor-grabbing bg-muted/50 hover:bg-muted hover:border-primary/40 transition-all duration-150 hover:shadow-md group rounded-2xl select-none"
                      >
                        <div className="flex items-center gap-2">
                          {BlockIcon && (
                            <div className="p-1 rounded-md bg-gradient-to-br from-primary/15 to-primary/10 border border-primary/25 group-hover:border-primary/50 transition-all flex-shrink-0">
                              <BlockIcon className="w-3 h-3 text-primary" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                              {block.label}
                            </h4>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
          {filteredCategories.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <div className="p-3 rounded-full bg-muted w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <span className="text-2xl">🔍</span>
              </div>
              <p className="text-xs font-medium">Nenhum bloco encontrado</p>
              <p className="text-[10px] mt-1">Tente outra busca</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
