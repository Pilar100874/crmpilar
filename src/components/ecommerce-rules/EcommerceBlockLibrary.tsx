import { ECOMMERCE_RULE_BLOCKS } from "@/types/ecommerceRules";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, X, Search } from "lucide-react";
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
  {
    name: "Condições - Carrinho",
    icon: "ShoppingCart",
    gradient: "from-blue-500/10 to-cyan-500/10",
    border: "border-blue-500/20",
    borderHover: "hover:border-blue-500/40",
    iconColor: "text-blue-600",
    blocks: ECOMMERCE_RULE_BLOCKS.filter(b => b.category === "condicao_carrinho"),
  },
  {
    name: "Condições - Cliente",
    icon: "Users",
    gradient: "from-violet-500/10 to-purple-500/10",
    border: "border-violet-500/20",
    borderHover: "hover:border-violet-500/40",
    iconColor: "text-violet-600",
    blocks: ECOMMERCE_RULE_BLOCKS.filter(b => b.category === "condicao_cliente"),
  },
  {
    name: "Condições - Temporal",
    icon: "Calendar",
    gradient: "from-pink-500/10 to-rose-500/10",
    border: "border-pink-500/20",
    borderHover: "hover:border-pink-500/40",
    iconColor: "text-pink-600",
    blocks: ECOMMERCE_RULE_BLOCKS.filter(b => b.category === "condicao_temporal" || b.category === "condicao_cupom"),
  },
  {
    name: "Lógica",
    icon: "GitBranch",
    gradient: "from-indigo-500/10 to-blue-500/10",
    border: "border-indigo-500/20",
    borderHover: "hover:border-indigo-500/40",
    iconColor: "text-indigo-600",
    blocks: ECOMMERCE_RULE_BLOCKS.filter(b => b.category === "logica"),
  },
  {
    name: "Descontos",
    icon: "Percent",
    gradient: "from-emerald-500/10 to-green-500/10",
    border: "border-emerald-500/20",
    borderHover: "hover:border-emerald-500/40",
    iconColor: "text-emerald-600",
    blocks: ECOMMERCE_RULE_BLOCKS.filter(b => b.category === "acao_desconto"),
  },
  {
    name: "Frete",
    icon: "Truck",
    gradient: "from-cyan-500/10 to-teal-500/10",
    border: "border-cyan-500/20",
    borderHover: "hover:border-cyan-500/40",
    iconColor: "text-cyan-600",
    blocks: ECOMMERCE_RULE_BLOCKS.filter(b => b.category === "acao_frete"),
  },
  {
    name: "Propaganda & Brindes",
    icon: "Megaphone",
    gradient: "from-amber-500/10 to-orange-500/10",
    border: "border-amber-500/20",
    borderHover: "hover:border-amber-500/40",
    iconColor: "text-amber-600",
    blocks: ECOMMERCE_RULE_BLOCKS.filter(b => b.category === "acao_propaganda"),
  },
  {
    name: "Pagamento",
    icon: "CreditCard",
    gradient: "from-red-500/10 to-rose-500/10",
    border: "border-red-500/20",
    borderHover: "hover:border-red-500/40",
    iconColor: "text-red-600",
    blocks: ECOMMERCE_RULE_BLOCKS.filter(b => b.category === "acao_pagamento"),
  },
  {
    name: "Mapa de Calor (gatilhos por visitante)",
    icon: "Flame",
    gradient: "from-orange-500/10 to-red-500/10",
    border: "border-orange-500/20",
    borderHover: "hover:border-orange-500/40",
    iconColor: "text-orange-600",
    blocks: ECOMMERCE_RULE_BLOCKS.filter(b => b.category === "gatilho_comportamento"),
  },
  {
    name: "Ações ao visitante (tempo real)",
    icon: "Zap",
    gradient: "from-emerald-500/10 to-lime-500/10",
    border: "border-emerald-500/20",
    borderHover: "hover:border-emerald-500/40",
    iconColor: "text-emerald-600",
    blocks: ECOMMERCE_RULE_BLOCKS.filter(b => b.category === "acao_recuperacao"),
  },
];

export const EcommerceBlockLibrary = ({ onDragStart, isExpanded, onToggleExpanded }: EcommerceBlockLibraryProps) => {
  const [search, setSearch] = useState("");
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(
    Object.fromEntries(blockCategories.map(c => [c.name, true]))
  );

  const toggleCategory = (name: string) => {
    setOpenCategories(prev => ({ ...prev, [name]: !prev[name] }));
  };

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
    <Card className="w-72 flex flex-col h-full border-r border-border rounded-none shadow-none bg-card">
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-semibold text-sm">Blocos</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onToggleExpanded(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar blocos..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-3 pb-3 space-y-2">
          {filteredCategories.map((cat) => {
            const CatIcon = Icons[cat.icon as keyof typeof Icons] as any;
            return (
              <Collapsible key={cat.name} open={openCategories[cat.name]} onOpenChange={() => toggleCategory(cat.name)}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-2">
                    {CatIcon && <CatIcon className={`h-4 w-4 ${cat.iconColor}`} />}
                    <span className="text-sm font-medium">{cat.name}</span>
                    <span className="text-xs text-muted-foreground">({cat.blocks.length})</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-transform ${openCategories[cat.name] ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 mt-1">
                  {cat.blocks.map((block) => {
                    const BlockIcon = Icons[block.icon as keyof typeof Icons] as any;
                    return (
                      <div
                        key={block.type}
                        draggable
                        onDragStart={(e) => onDragStart(e, block.type)}
                        onDoubleClick={() => window.dispatchEvent(new CustomEvent("workflow:add-block", { detail: { type: block.type } }))}
                        title="Arraste ou clique 2x para adicionar"
                        className={`flex items-center gap-3 p-2.5 rounded-lg cursor-grab active:cursor-grabbing bg-gradient-to-r ${cat.gradient} border ${cat.border} ${cat.borderHover} transition-all hover:shadow-sm select-none`}
                      >
                        <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: block.color + '20' }}>
                          {BlockIcon && <BlockIcon className="w-3.5 h-3.5" style={{ color: block.color }} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium block truncate">{block.label}</span>
                          <span className="text-[10px] text-muted-foreground block truncate">{block.description}</span>
                        </div>
                      </div>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>
    </Card>
  );
};
