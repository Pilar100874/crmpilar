import { BLOCK_DEFINITIONS, NodeType } from "@/types/flow";
import { Card } from "@/components/ui/card";
import * as Icons from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface BlockLibraryProps {
  onDragStart: (event: React.DragEvent, nodeType: string) => void;
  isExpanded: boolean;
  onToggleExpanded: (expanded: boolean) => void;
}

// Organizar blocos por categoria
const blockCategories = [
  {
    name: "IA",
    icon: "Sparkles",
    blocks: ["ai_agent"] as NodeType[],
  },
  {
    name: "Mensagens",
    icon: "MessageSquare",
    blocks: ["send_message", "media", "goodbye"] as NodeType[],
  },
  {
    name: "WhatsApp Essencial",
    icon: "MessageCircle",
    blocks: ["reply_buttons", "list_buttons", "keyword_options", "message_template", "opt_in_out", "opt_in_check", "audience"] as NodeType[],
  },
  {
    name: "Perguntas",
    icon: "HelpCircle",
    blocks: ["ask_name", "ask_question", "ask_email", "ask_number", "ask_phone", "ask_date", "ask_file", "ask_address", "ask_url"] as NodeType[],
  },
  {
    name: "Lógica",
    icon: "GitBranch",
    blocks: ["condition", "set_field", "keyword_jump", "global_keywords", "formulas", "jump_to", "lead_scoring", "goal"] as NodeType[],
  },
  {
    name: "Código",
    icon: "Code",
    blocks: ["webhook", "n8n", "trigger_automation", "dynamic_data"] as NodeType[],
  },
];

export const BlockLibrary = ({ onDragStart, isExpanded, onToggleExpanded }: BlockLibraryProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [openCategories, setOpenCategories] = useState<string[]>(["Mensagens", "Perguntas"]);

  const toggleCategory = (categoryName: string) => {
    setOpenCategories(prev => 
      prev.includes(categoryName) 
        ? prev.filter(c => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  const filteredCategories = blockCategories.map(category => ({
    ...category,
    blocks: category.blocks.filter(blockType => {
      const blockDef = BLOCK_DEFINITIONS.find(b => b.type === blockType);
      if (!blockDef) return false;
      const query = searchQuery.toLowerCase();
      return blockDef.label.toLowerCase().includes(query) ||
             blockDef.description.toLowerCase().includes(query);
    })
  })).filter(category => category.blocks.length > 0);

  if (!isExpanded) {
    return null;
  }

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col h-full shadow-lg relative">
      {/* Header compacto */}
      <div className="p-3 border-b border-border bg-muted relative overflow-hidden">
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30">
                <Plus className="h-3.5 w-3.5 text-cyan-600" />
              </div>
              <h3 className="font-bold text-sm text-foreground">Blocos</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggleExpanded(false)}
              className="h-7 w-7 rounded-md transition-all"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Search bar compacta */}
          <div className="relative">
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredCategories.map((category) => {
            const CategoryIcon = Icons[category.icon as keyof typeof Icons] as any;
            const isOpen = openCategories.includes(category.name);

            return (
              <Collapsible
                key={category.name}
                open={isOpen}
                onOpenChange={() => toggleCategory(category.name)}
                className="group"
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1.5 rounded-lg hover:bg-muted transition-all duration-150 group border border-transparent hover:border-cyan-500/20">
                  <div className="flex items-center gap-2">
                    {CategoryIcon && (
                      <div className="p-1 rounded-md bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 group-hover:border-cyan-500/40 transition-all">
                        <CategoryIcon className="w-3 h-3 text-cyan-600 group-hover:text-cyan-700" />
                      </div>
                    )}
                    <span className="font-semibold text-xs text-foreground group-hover:text-cyan-700 transition-colors">{category.name}</span>
                  </div>
                  <ChevronDown 
                    className={`w-3 h-3 text-muted-foreground transition-all duration-150 ${isOpen ? 'rotate-180 text-cyan-600' : 'group-hover:text-cyan-700'}`}
                  />
                </CollapsibleTrigger>

                <CollapsibleContent className="pt-1 space-y-1 animate-accordion-down">
                  {category.blocks.map((blockType) => {
                    const blockDef = BLOCK_DEFINITIONS.find(b => b.type === blockType);
                    if (!blockDef) return null;

                    const IconComponent = Icons[blockDef.icon as keyof typeof Icons] as any;
                    
                    return (
                      <Card
                        key={blockDef.type}
                        draggable
                        onDragStart={(event) => onDragStart(event, blockDef.type)}
                        className="p-2 ml-5 cursor-grab active:cursor-grabbing bg-muted/50 hover:bg-muted hover:border-cyan-500/40 transition-all duration-150 hover:shadow-md group rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          {IconComponent && (
                            <div className="p-1 rounded-md bg-gradient-to-br from-cyan-500/15 to-blue-500/15 border border-cyan-500/25 group-hover:border-cyan-400/50 transition-all flex-shrink-0">
                              <IconComponent className="w-3 h-3 text-cyan-600 group-hover:text-cyan-700" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-xs text-foreground group-hover:text-cyan-700 transition-colors truncate">
                              {blockDef.label}
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
