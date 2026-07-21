import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import * as Icons from "lucide-react";
import { X, Plus, Sparkles } from "lucide-react";
import { setBlockDragPreview } from "@/lib/blockDragPreview";
import { TV_BLOCK_DEFINITIONS, CATEGORY_LABELS, TvBlockCategory } from "@/types/tvWorkflow";

interface Props {
  onDragStart: (event: React.DragEvent, nodeType: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const CATEGORY_ORDER: { key: TvBlockCategory; icon: string }[] = [
  { key: "gatilho", icon: "Zap" },
  { key: "condicao", icon: "GitBranch" },
  { key: "acao", icon: "Play" },
];

export function TvBlockLibrary({ onDragStart, isExpanded, onToggleExpand }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [openCategories, setOpenCategories] = useState<TvBlockCategory[]>([
    "gatilho",
    "condicao",
    "acao",
  ]);

  const toggle = (c: TvBlockCategory) =>
    setOpenCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const filteredCategories = CATEGORY_ORDER.map((cat) => ({
    ...cat,
    blocks: TV_BLOCK_DEFINITIONS.filter((b) => {
      if (b.category !== cat.key) return false;
      const q = searchQuery.toLowerCase();
      return b.label.toLowerCase().includes(q) || b.description.toLowerCase().includes(q);
    }),
  })).filter((c) => c.blocks.length > 0);

  if (!isExpanded) return null;

  return (
    <div className="w-60 flex flex-col h-[calc(100%-1rem)] m-2 rounded-2xl shadow-lg border-2 border-white dark:border-white/10 bg-gradient-to-b from-background to-border relative overflow-hidden animate-slide-in">
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-foreground text-background flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <h3 className="font-bold text-base text-foreground tracking-tight">Menu</h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleExpand}
            className="h-7 w-7 rounded-md hover:bg-black/5"
          >
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
        <div className="w-[240px] max-w-full px-2 pb-4 space-y-0.5">
          {filteredCategories.map((cat) => {
            const CategoryIcon = Icons[cat.icon as keyof typeof Icons] as any;
            const isOpen = openCategories.includes(cat.key);

            return (
              <Collapsible key={cat.key} open={isOpen} onOpenChange={() => toggle(cat.key)}>
                <CollapsibleTrigger
                  className={`flex items-center justify-between w-full px-3 py-2 rounded-xl transition-colors duration-100 text-left ${
                    isOpen ? "bg-foreground text-background" : "hover:bg-black/5 text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {CategoryIcon && (
                      <CategoryIcon
                        className={`w-4 h-4 ${isOpen ? "text-background" : "text-muted-foreground"}`}
                      />
                    )}
                    <span className="text-xs font-medium">{CATEGORY_LABELS[cat.key]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-semibold flex items-center justify-center ${
                        isOpen ? "bg-background/20 text-background" : "bg-foreground text-background"
                      }`}
                    >
                      {cat.blocks.length}
                    </span>
                    <span
                      className={`text-xs ${isOpen ? "text-background/70" : "text-muted-foreground"}`}
                    >
                      {isOpen ? "−" : "+"}
                    </span>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent className="animate-accordion-down">
                  <div className="relative ml-5 pl-4 pt-1 pb-1">
                    <div className="absolute left-0 top-0 bottom-0 w-px bg-foreground/40" />
                    <div className="space-y-0.5">
                      {cat.blocks.map((b) => {
                        const Icon = b.icon;
                        return (
                          <Card
                            key={b.type}
                            draggable
                            onDragStart={(e) => {
                              setBlockDragPreview(e, b.label, b.color);
                              onDragStart(e, b.type);
                            }}
                            onDoubleClick={() =>
                              window.dispatchEvent(
                                new CustomEvent("tv-workflow:add-block", {
                                  detail: { type: b.type },
                                }),
                              )
                            }
                            title="Arraste ou clique 2x para adicionar"
                            className="px-3 py-2 cursor-grab active:cursor-grabbing bg-transparent hover:bg-muted/60 border-0 shadow-none rounded-xl transition-colors duration-100 select-none"
                          >
                            <div className="flex items-center gap-2">
                              <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                              <h4 className="text-xs font-normal text-foreground truncate">
                                {b.label}
                              </h4>
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
}
