import { ECOMMERCE_RULE_BLOCKS } from "@/types/ecommerceRules";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { X, Plus } from "lucide-react";
import * as Icons from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface EcommerceBlockLibraryProps {
  onDragStart: (event: React.DragEvent, nodeType: string) => void;
  isExpanded: boolean;
  onToggleExpanded: (expanded: boolean) => void;
}

const blockCategories = [
  { name: "Condições - Carrinho", icon: "ShoppingCart", blocks: ECOMMERCE_RULE_BLOCKS.filter(b => b.category === "condicao_carrinho") },
  { name: "Condições - Cliente", icon: "Users", blocks: ECOMMERCE_RULE_BLOCKS.filter(b => b.category === "condicao_cliente") },
  { name: "Condições - Temporal", icon: "Calendar", blocks: ECOMMERCE_RULE_BLOCKS.filter(b => b.category === "condicao_temporal" || b.category === "condicao_cupom") },
  { name: "Lógica", icon: "GitBranch", blocks: ECOMMERCE_RULE_BLOCKS.filter(b => b.category === "logica") },
  { name: "Descontos", icon: "Percent", blocks: ECOMMERCE_RULE_BLOCKS.filter(b => b.category === "acao_desconto") },
  { name: "Frete", icon: "Truck", blocks: ECOMMERCE_RULE_BLOCKS.filter(b => b.category === "acao_frete") },
  { name: "Propaganda & Brindes", icon: "Megaphone", blocks: ECOMMERCE_RULE_BLOCKS.filter(b => b.category === "acao_propaganda") },
  { name: "Pagamento", icon: "CreditCard", blocks: ECOMMERCE_RULE_BLOCKS.filter(b => b.category === "acao_pagamento") },
  { name: "Mapa de Calor", icon: "Flame", blocks: ECOMMERCE_RULE_BLOCKS.filter(b => b.category === "gatilho_comportamento") },
  { name: "Ações ao Visitante", icon: "Zap", blocks: ECOMMERCE_RULE_BLOCKS.filter(b => b.category === "acao_recuperacao") },
];

export const EcommerceBlockLibrary = ({ onDragStart, isExpanded, onToggleExpanded }: EcommerceBlockLibraryProps) => {
  const [search, setSearch] = useState("");
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(
    Object.fromEntries(blockCategories.map(c => [c.name, true]))
  );

  const toggleCategory = (name: string) => setOpenCategories(prev => ({ ...prev, [name]: !prev[name] }));

  const filteredCategories = blockCategories.map(cat => ({
    ...cat,
    blocks: cat.blocks.filter(b =>
      b.label.toLowerCase().includes(search.toLowerCase()) ||
      b.description.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(cat => cat.blocks.length > 0);

  if (!isExpanded) {
    return (
      <Button variant="outline" size="sm" onClick={() => onToggleExpanded(true)} className="absolute left-4 top-20 z-10">
        <Icons.Plus className="h-4 w-4 mr-2" />
        Blocos
      </Button>
    );
  }

  return (
    <div className="w-64 flex flex-col h-[calc(100%-1rem)] m-2 rounded-2xl shadow-lg border-2 border-white dark:border-white/10 bg-gradient-to-b from-background to-muted/90 relative">
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-foreground">Menu</h3>
          <Button variant="ghost" size="icon" onClick={() => onToggleExpanded(false)} className="h-7 w-7 rounded-md hover:bg-black/5">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Input
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-xs bg-muted/40 border-0 shadow-sm"
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2 pb-4 space-y-0.5">
          {filteredCategories.map((cat) => {
            const CatIcon = Icons[cat.icon as keyof typeof Icons] as any;
            const isOpen = !!openCategories[cat.name];
            return (
              <Collapsible key={cat.name} open={isOpen} onOpenChange={() => toggleCategory(cat.name)}>
                <CollapsibleTrigger
                  className={`flex items-center justify-between w-full px-3 py-2 rounded-xl transition-all duration-150 text-left ${
                    isOpen ? "bg-foreground text-background" : "hover:bg-black/5 text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {CatIcon && (
                      <CatIcon className={`w-4 h-4 flex-shrink-0 ${isOpen ? "text-background" : "text-muted-foreground"}`} />
                    )}
                    <span className="text-xs font-medium truncate">{cat.name}</span>
                  </div>
                  <span className={`text-xs ${isOpen ? "text-background/70" : "text-muted-foreground"}`}>
                    {isOpen ? "−" : "+"}
                  </span>
                </CollapsibleTrigger>

                <CollapsibleContent className="animate-accordion-down">
                  <div className="relative ml-5 pl-4 pt-1 pb-1">
                    <div className="absolute left-0 top-0 bottom-0 w-px bg-border" />
                    <div className="space-y-0.5">
                      {cat.blocks.map((block) => (
                        <Card
                          key={block.type}
                          draggable
                          onDragStart={(e) => onDragStart(e, block.type)}
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
