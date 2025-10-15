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

export const BlockLibrary = ({ onDragStart }: BlockLibraryProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
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
    return (
      <div className="absolute">
        <Button
          onClick={() => setIsExpanded(true)}
          size="icon"
          className="fixed left-6 top-[140px] z-50 h-12 w-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-80 bg-slate-800/95 backdrop-blur-sm border-r border-slate-700/50 flex flex-col h-full shadow-2xl">
      <div className="p-4 border-b border-slate-700/50 bg-gradient-to-r from-slate-800 to-slate-900">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-white">Blocos de Construção</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(false)}
            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700/50"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Input
          placeholder="Buscar por nome"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/20"
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1.5">
          {filteredCategories.map((category) => {
            const CategoryIcon = Icons[category.icon as keyof typeof Icons] as any;
            const isOpen = openCategories.includes(category.name);

            return (
              <Collapsible
                key={category.name}
                open={isOpen}
                onOpenChange={() => toggleCategory(category.name)}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-slate-700/50 transition-all duration-200 group">
                  <div className="flex items-center gap-2.5">
                    {CategoryIcon && <CategoryIcon className="w-4 h-4 text-cyan-400 group-hover:text-cyan-300" />}
                    <span className="font-medium text-sm text-slate-200 group-hover:text-white">{category.name}</span>
                  </div>
                  <ChevronDown 
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-cyan-400' : ''}`}
                  />
                </CollapsibleTrigger>

                <CollapsibleContent className="pt-1.5 space-y-1.5 animate-accordion-down">
                  {category.blocks.map((blockType) => {
                    const blockDef = BLOCK_DEFINITIONS.find(b => b.type === blockType);
                    if (!blockDef) return null;

                    const IconComponent = Icons[blockDef.icon as keyof typeof Icons] as any;
                    
                    return (
                      <Card
                        key={blockDef.type}
                        draggable
                        onDragStart={(event) => onDragStart(event, blockDef.type)}
                        className="p-3 ml-6 cursor-grab active:cursor-grabbing bg-slate-900/40 border-slate-700/50 hover:bg-slate-700/40 hover:border-cyan-500/30 transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/10 group"
                      >
                        <div className="flex items-start gap-2.5">
                          {IconComponent && (
                            <div className="p-1.5 rounded-md bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 group-hover:border-cyan-400/50 transition-colors">
                              <IconComponent className="w-3.5 h-3.5 text-cyan-400 group-hover:text-cyan-300" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <h4 className="font-medium text-sm text-slate-200 group-hover:text-white truncate transition-colors">
                              {blockDef.label}
                            </h4>
                            <p className="text-xs text-slate-500 group-hover:text-slate-400 line-clamp-2 mt-0.5 transition-colors">
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
            <div className="text-center py-8 text-slate-500">
              <p className="text-sm">Nenhum bloco encontrado</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
