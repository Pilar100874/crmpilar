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
    <div className="w-80 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 border-r border-cyan-500/20 flex flex-col h-full shadow-2xl relative">
      {/* Header com gradiente */}
      <div className="p-6 border-b border-cyan-500/30 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        {/* Efeito de brilho de fundo */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-blue-500/5 to-cyan-500/5 animate-pulse"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30">
                <Plus className="h-5 w-5 text-cyan-400" />
              </div>
              <h3 className="font-bold text-lg text-white">Blocos</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggleExpanded(false)}
              className="h-9 w-9 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-all"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Search bar moderna */}
          <div className="relative">
            <Input
              placeholder="Buscar blocos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 pl-4 rounded-lg backdrop-blur-sm"
            />
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 dark-scrollbar">
        <div className="p-4 space-y-2">
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
                <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 rounded-xl hover:bg-gradient-to-r hover:from-slate-800/80 hover:to-slate-800/40 transition-all duration-200 group border border-transparent hover:border-cyan-500/20">
                  <div className="flex items-center gap-3">
                    {CategoryIcon && (
                      <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 group-hover:border-cyan-500/40 transition-all">
                        <CategoryIcon className="w-4 h-4 text-cyan-400 group-hover:text-cyan-300" />
                      </div>
                    )}
                    <span className="font-semibold text-sm text-white group-hover:text-cyan-300 transition-colors">{category.name}</span>
                  </div>
                  <ChevronDown 
                    className={`w-4 h-4 text-slate-400 transition-all duration-200 ${isOpen ? 'rotate-180 text-cyan-400' : 'group-hover:text-cyan-300'}`}
                  />
                </CollapsibleTrigger>

                <CollapsibleContent className="pt-2 space-y-2 animate-accordion-down">
                  {category.blocks.map((blockType) => {
                    const blockDef = BLOCK_DEFINITIONS.find(b => b.type === blockType);
                    if (!blockDef) return null;

                    const IconComponent = Icons[blockDef.icon as keyof typeof Icons] as any;
                    
                    return (
                      <Card
                        key={blockDef.type}
                        draggable
                        onDragStart={(event) => onDragStart(event, blockDef.type)}
                        className="p-4 ml-8 cursor-grab active:cursor-grabbing bg-slate-800/40 border-slate-700/30 hover:bg-gradient-to-r hover:from-slate-700/60 hover:to-slate-800/60 hover:border-cyan-500/40 transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/10 group backdrop-blur-sm rounded-xl"
                      >
                        <div className="flex items-start gap-3">
                          {IconComponent && (
                            <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/15 to-blue-500/15 border border-cyan-500/25 group-hover:border-cyan-400/50 group-hover:shadow-lg group-hover:shadow-cyan-500/20 transition-all">
                              <IconComponent className="w-4 h-4 text-cyan-400 group-hover:text-cyan-300" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-sm text-white group-hover:text-cyan-300 transition-colors mb-1">
                              {blockDef.label}
                            </h4>
                            <p className="text-xs text-slate-400 group-hover:text-slate-300 line-clamp-2 transition-colors">
                              {blockDef.description}
                            </p>
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
            <div className="text-center py-12 text-slate-500">
              <div className="p-4 rounded-full bg-slate-800/50 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Plus className="w-8 h-8 text-slate-600" />
              </div>
              <p className="text-sm font-medium">Nenhum bloco encontrado</p>
              <p className="text-xs mt-1">Tente outra busca</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
