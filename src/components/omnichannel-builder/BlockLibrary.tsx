import { setBlockDragPreview } from "@/lib/blockDragPreview";
import { X, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import * as Icons from "lucide-react";
import { useState } from "react";
import type { OmnichannelBlockType, OmnichannelNode } from "@/types/omnichannelFlow";

interface BlockLibraryProps {
  onDragStart: (type: OmnichannelBlockType) => void;
  isExpanded: boolean;
  onToggleExpanded: (expanded: boolean) => void;
  nodes: OmnichannelNode[];
  onNodeSelect: (nodeId: string) => void;
}

interface BlockItem {
  type: OmnichannelBlockType;
  label: string;
  description: string;
  category: string;
  icon: string;
}

const blocks: BlockItem[] = [
  { type: "fila", label: "Fila de Atendimento", description: "Cria uma fila de distribuição de chats", category: "Distribuição", icon: "Users" },
  { type: "atendente", label: "Atendente", description: "Define um atendente no fluxo", category: "Distribuição", icon: "User" },
  { type: "skill", label: "Skill Requerida", description: "Adiciona requisito de habilidade", category: "Distribuição", icon: "Award" },
  { type: "regra_roteamento", label: "Regra de Roteamento", description: "Define condições de distribuição", category: "Lógica", icon: "GitBranch" },
  { type: "horario", label: "Horário de Funcionamento", description: "Define horários de atendimento", category: "Lógica", icon: "Clock" },
  { type: "webhook", label: "Webhook", description: "Integra com sistemas externos", category: "Integrações", icon: "Webhook" },
  { type: "aguardar", label: "Aguardar", description: "Adiciona delay no fluxo", category: "Fluxo", icon: "Timer" },
  { type: "analytics", label: "Analytics", description: "Visualiza métricas do fluxo", category: "Fluxo", icon: "BarChart3" },
  { type: "return_response", label: "Retornar Resposta", description: "Devolve payload ao workflow chamador", category: "Integrações", icon: "ArrowLeft" },
  { type: "disparar_push", label: "Disparar Push", description: "Envia notificação push para usuários ou clientes", category: "Integrações", icon: "Bell" },
  { type: "enviar_sms", label: "Enviar SMS", description: "Dispara SMS para um ou mais números via gateway", category: "Integrações", icon: "MessageSquareText" },
];

const blockCategories = [
  { name: "Distribuição", icon: "Users" },
  { name: "Lógica", icon: "GitBranch" },
  { name: "Integrações", icon: "Webhook" },
  { name: "Fluxo", icon: "Zap" },
];

export const BlockLibrary = ({
  onDragStart,
  isExpanded,
  onToggleExpanded,
  nodes,
  onNodeSelect,
}: BlockLibraryProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [openCategories, setOpenCategories] = useState<string[]>(["Distribuição", "Lógica"]);

  const handleDragStart = (e: React.DragEvent, type: OmnichannelBlockType, label: string) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/reactflow", type);
    setBlockDragPreview(e, label);
    onDragStart(type);
  };

  const toggleCategory = (categoryName: string) => {
    setOpenCategories(prev =>
      prev.includes(categoryName) ? prev.filter(c => c !== categoryName) : [...prev, categoryName]
    );
  };

  const filteredNodes = nodes.filter(node => {
    const q = searchQuery.toLowerCase();
    const d = node.data as any;
    return (d?.label || "").toLowerCase().includes(q) ||
      (d?.type || "").toLowerCase().includes(q) ||
      (d?.description || "").toLowerCase().includes(q);
  });

  const filteredBlocks = blocks.filter(b => {
    const q = searchQuery.toLowerCase();
    return b.label.toLowerCase().includes(q) || b.description.toLowerCase().includes(q);
  });

  const handleSelect = (nodeId: string) => {
    onNodeSelect(nodeId);
    setSearchQuery("");
  };

  if (!isExpanded) return null;

  return (
    <div className="w-60 flex flex-col h-[calc(100%-1rem)] m-2 rounded-2xl shadow-lg border-2 border-white dark:border-white/10 bg-gradient-to-b from-background to-border relative overflow-hidden animate-slide-in">
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-foreground text-background flex items-center justify-center">
              <Icons.Sparkles className="h-3.5 w-3.5" />
            </div>
            <h3 className="font-bold text-base text-foreground tracking-tight">Menu</h3>
          </div>
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
        {searchQuery && filteredNodes.length > 0 && (
          <div className="px-2 pb-2">
            <p className="text-[10px] font-semibold text-muted-foreground mb-1 px-3 uppercase tracking-wide">
              Nós no fluxo ({filteredNodes.length})
            </p>
            <div className="space-y-0.5">
              {filteredNodes.map((node) => {
                const d = node.data as any;
                return (
                  <button
                    key={node.id}
                    onClick={() => handleSelect(node.id)}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-muted/60 transition-colors duration-100"
                  >
                    <p className="text-xs font-normal text-foreground truncate">{d?.label || "Sem nome"}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="w-[240px] max-w-full px-2 pb-4 space-y-0.5">
          {blockCategories.map((category) => {
            const CategoryIcon = Icons[category.icon as keyof typeof Icons] as any;
            const isOpen = openCategories.includes(category.name);
            const categoryBlocks = filteredBlocks.filter(b => b.category === category.name);
            if (categoryBlocks.length === 0 && searchQuery) return null;

            return (
              <Collapsible key={category.name} open={isOpen} onOpenChange={() => toggleCategory(category.name)}>
                <CollapsibleTrigger
                  className={`flex items-center justify-between w-full px-3 py-2 rounded-xl transition-colors duration-100 text-left ${
                    isOpen ? "bg-foreground text-background" : "hover:bg-black/5 text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {CategoryIcon && (
                      <CategoryIcon className={`w-4 h-4 ${isOpen ? "text-background" : "text-muted-foreground"}`} />
                    )}
                    <span className="text-xs font-medium">{category.name}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-semibold flex items-center justify-center ${isOpen ? "bg-background/20 text-background" : "bg-foreground text-background"}`}>
                      {categoryBlocks.length}
                    </span>
                    <span className={`text-xs ${isOpen ? "text-background/70" : "text-muted-foreground"}`}>
                      {isOpen ? "−" : "+"}
                    </span>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent className="animate-accordion-down">
                  <div className="relative ml-5 pl-4 pt-1 pb-1">
                    <div className="absolute left-0 top-0 bottom-0 w-px bg-foreground/40" />
                    <div className="space-y-0.5">
                      {categoryBlocks.map((block) => {
                        const BlockIcon = Icons[block.icon as keyof typeof Icons] as any;
                        return (
                        <Card
                          key={block.type}
                          draggable
                          onDragStart={(e) => handleDragStart(e, block.type, block.label)}
                          onDoubleClick={() => window.dispatchEvent(new CustomEvent("workflow:add-block", { detail: { type: block.type } }))}
                          title="Arraste ou clique 2x para adicionar"
                          className="px-3 py-2 cursor-grab active:cursor-grabbing bg-transparent hover:bg-muted/60 border-0 shadow-none rounded-xl transition-colors duration-100 select-none"
                        >
                          <div className="flex items-center gap-2">
                            {BlockIcon && <BlockIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                            <h4 className="text-xs font-normal text-foreground truncate">{block.label}</h4>
                          </div>
                        </Card>
                        );
                      })}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}

          {filteredBlocks.length === 0 && searchQuery && (
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
