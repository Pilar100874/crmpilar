import { BLOCK_DEFINITIONS, NodeType } from "@/types/flow";
import { Card } from "@/components/ui/card";
import * as Icons from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface BlockLibraryProps {
  onDragStart: (event: React.DragEvent, nodeType: string) => void;
}

// Organizar blocos por categoria
const blockCategories = [
  {
    name: "AI",
    icon: "Sparkles",
    blocks: ["ai_agent"] as NodeType[],
  },
  {
    name: "Messages",
    icon: "MessageSquare",
    blocks: ["send_message", "media", "goodbye"] as NodeType[],
  },
  {
    name: "WhatsApp Essential",
    icon: "MessageCircle",
    blocks: ["reply_buttons", "list_buttons", "keyword_options", "message_template", "opt_in_out", "opt_in_check", "audience"] as NodeType[],
  },
  {
    name: "Questions",
    icon: "HelpCircle",
    blocks: ["ask_name", "ask_question", "ask_email", "ask_number", "ask_phone", "ask_date", "ask_file", "ask_address", "ask_url"] as NodeType[],
  },
  {
    name: "Logic",
    icon: "GitBranch",
    blocks: ["condition", "set_field", "keyword_jump", "global_keywords", "formulas", "jump_to", "lead_scoring", "goal"] as NodeType[],
  },
  {
    name: "Low code",
    icon: "Code",
    blocks: ["webhook", "n8n", "trigger_automation", "dynamic_data"] as NodeType[],
  },
];

export const BlockLibrary = ({ onDragStart }: BlockLibraryProps) => {
  const [openCategories, setOpenCategories] = useState<string[]>(["Messages", "Questions"]);

  const toggleCategory = (categoryName: string) => {
    setOpenCategories(prev => 
      prev.includes(categoryName) 
        ? prev.filter(c => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  return (
    <div className="w-64 border-r bg-card flex flex-col h-full">
      <div className="p-4 border-b">
        <h3 className="font-medium text-sm">Biblioteca de Blocos</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Arraste para o canvas
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {blockCategories.map((category) => {
            const CategoryIcon = Icons[category.icon as keyof typeof Icons] as any;
            const isOpen = openCategories.includes(category.name);

            return (
              <Collapsible
                key={category.name}
                open={isOpen}
                onOpenChange={() => toggleCategory(category.name)}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-2">
                    {CategoryIcon && <CategoryIcon className="w-4 h-4" />}
                    <span className="font-medium text-sm">{category.name}</span>
                  </div>
                  <ChevronDown 
                    className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </CollapsibleTrigger>

                <CollapsibleContent className="pt-2 space-y-2">
                  {category.blocks.map((blockType) => {
                    const blockDef = BLOCK_DEFINITIONS.find(b => b.type === blockType);
                    if (!blockDef) return null;

                    const IconComponent = Icons[blockDef.icon as keyof typeof Icons] as any;
                    
                    return (
                      <Card
                        key={blockDef.type}
                        draggable
                        onDragStart={(event) => onDragStart(event, blockDef.type)}
                        className="p-3 cursor-grab active:cursor-grabbing hover:bg-accent/50 transition-colors ml-2"
                      >
                        <div className="flex items-start gap-2">
                          {IconComponent && (
                            <IconComponent className={`w-4 h-4 mt-0.5 ${blockDef.color} flex-shrink-0`} />
                          )}
                          <div className="min-w-0">
                            <h4 className="font-medium text-sm truncate">{blockDef.label}</h4>
                            <p className="text-xs text-muted-foreground line-clamp-2">
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
        </div>
      </ScrollArea>
    </div>
  );
};
