import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { X, Plus, Sparkles } from "lucide-react";
import { setBlockDragPreview } from "@/lib/blockDragPreview";
import { TV_BLOCK_DEFINITIONS, CATEGORY_LABELS, TvBlockCategory } from "@/types/tvWorkflow";

interface Props {
  onDragStart: (event: React.DragEvent, nodeType: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const CATEGORIES: TvBlockCategory[] = ["gatilho", "condicao", "acao"];

export function TvBlockLibrary({ onDragStart, isExpanded, onToggleExpand }: Props) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<TvBlockCategory[]>(["gatilho", "condicao", "acao"]);

  const filtered = TV_BLOCK_DEFINITIONS.filter(
    (b) =>
      b.label.toLowerCase().includes(q.toLowerCase()) ||
      b.description.toLowerCase().includes(q.toLowerCase()),
  );

  const toggle = (c: TvBlockCategory) =>
    setOpen((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  if (!isExpanded) return null;

  return (
    <div className="w-64 flex flex-col h-[calc(100%-1rem)] m-2 rounded-2xl shadow-lg border-2 border-border bg-gradient-to-b from-background to-muted/40 overflow-hidden">
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-foreground text-background flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <h3 className="font-bold text-base text-foreground">Blocos</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onToggleExpand} className="h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Input
          placeholder="Buscar…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-8 text-xs bg-muted/40 border-0 shadow-sm"
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2 pb-4 space-y-1">
          {CATEGORIES.map((cat) => {
            const blocks = filtered.filter((b) => b.category === cat);
            if (blocks.length === 0) return null;
            const isOpen = open.includes(cat);

            return (
              <Collapsible key={cat} open={isOpen} onOpenChange={() => toggle(cat)}>
                <CollapsibleTrigger
                  className={`flex items-center justify-between w-full px-3 py-2 rounded-xl transition-colors text-left ${
                    isOpen ? "bg-foreground text-background" : "hover:bg-muted text-foreground"
                  }`}
                >
                  <span className="text-xs font-semibold">{CATEGORY_LABELS[cat]}</span>
                  <span
                    className={`min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-semibold flex items-center justify-center ${
                      isOpen ? "bg-background/20 text-background" : "bg-foreground text-background"
                    }`}
                  >
                    {blocks.length}
                  </span>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="relative ml-3 pl-3 pt-1 pb-1">
                    <div className="absolute left-0 top-0 bottom-0 w-px bg-border" />
                    <div className="space-y-1">
                      {blocks.map((b) => {
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
                              window.dispatchEvent(new CustomEvent("tv-workflow:add-block", { detail: { type: b.type } }))
                            }
                            title="Arraste ou clique 2x para adicionar"
                            className={`px-3 py-2 cursor-grab active:cursor-grabbing bg-transparent hover:bg-muted/60 border-0 shadow-none rounded-lg transition-colors`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-6 h-6 rounded-md flex items-center justify-center border ${b.color}`}>
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-xs font-medium text-foreground truncate">{b.label}</h4>
                                <p className="text-[10px] text-muted-foreground truncate">{b.description}</p>
                              </div>
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

          {filtered.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Plus className="w-6 h-6 mx-auto mb-2" />
              <p className="text-xs">Nenhum bloco encontrado</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
