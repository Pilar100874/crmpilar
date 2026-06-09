import { ADS_BLOCK_DEFINITIONS, AdsBlockType } from "@/types/adsFlow";
import { Card } from "@/components/ui/card";
import * as Icons from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AdsBlockLibraryProps {
  onDragStart: (event: React.DragEvent, nodeType: string) => void;
  isExpanded: boolean;
  onToggleExpanded: (expanded: boolean) => void;
}

const blockCategories = [
  {
    name: "Gatilhos",
    icon: "Zap",
    color: "orange",
    gradient: "from-orange-500/10 to-amber-500/10",
    border: "border-orange-500/20",
    borderHover: "hover:border-orange-500/40",
    iconColor: "text-orange-600",
    blocks: ['trigger_roas', 'trigger_spend', 'trigger_cpc', 'trigger_ctr', 'trigger_conversions', 'trigger_impressions', 'trigger_schedule', 'trigger_frequency', 'trigger_quality_score', 'trigger_budget_depleted', 'trigger_position'] as AdsBlockType[],
  },
  {
    name: "Condições",
    icon: "GitBranch",
    color: "violet",
    gradient: "from-violet-500/10 to-purple-500/10",
    border: "border-violet-500/20",
    borderHover: "hover:border-violet-500/40",
    iconColor: "text-violet-600",
    blocks: ['condition_platform', 'condition_campaign', 'condition_time', 'condition_metric', 'condition_day_of_week', 'condition_budget_remaining', 'condition_device', 'condition_location'] as AdsBlockType[],
  },
  {
    name: "Ações",
    icon: "Play",
    color: "green",
    gradient: "from-green-500/10 to-emerald-500/10",
    border: "border-green-500/20",
    borderHover: "hover:border-green-500/40",
    iconColor: "text-green-600",
    blocks: ['action_pause', 'action_resume', 'action_activate', 'action_archive', 'action_budget_decrease', 'action_budget_increase', 'action_bid_adjust', 'action_bid_device', 'action_duplicate', 'action_schedule_change', 'action_notify', 'action_email', 'action_webhook', 'action_slack', 'action_create_report', 'return_response'] as AdsBlockType[],
  },
];

export const AdsBlockLibrary = ({ onDragStart, isExpanded, onToggleExpanded }: AdsBlockLibraryProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [openCategories, setOpenCategories] = useState<string[]>(["Gatilhos", "Ações"]);

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
      const blockDef = ADS_BLOCK_DEFINITIONS.find(b => b.type === blockType);
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
      <div className="p-3 border-b border-border bg-gradient-to-r from-primary/20 to-primary/10 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
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
          
          <div className="relative">
            <Input
              placeholder="Buscar blocos..."
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
                    className={`w-3 h-3 text-muted-foreground transition-all duration-150 ${isOpen ? `rotate-180 ${category.iconColor}` : ''}`}
                  />
                </CollapsibleTrigger>

                <CollapsibleContent className="pt-1 space-y-1 animate-accordion-down">
                  {category.blocks.map((blockType) => {
                    const blockDef = ADS_BLOCK_DEFINITIONS.find(b => b.type === blockType);
                    if (!blockDef) return null;

                    const IconComponent = Icons[blockDef.icon as keyof typeof Icons] as any;
                    
                    return (
                      <Card
                        key={blockDef.type}
                        draggable
                        onDragStart={(event) => onDragStart(event, blockDef.type)}
                        onDoubleClick={() => window.dispatchEvent(new CustomEvent("workflow:add-block", { detail: { type: blockDef.type } }))}
                        title="Arraste ou clique 2x para adicionar"
                        className="p-2 ml-5 cursor-grab active:cursor-grabbing bg-muted/50 hover:bg-muted hover:border-primary/40 transition-all duration-150 hover:shadow-md group rounded-lg select-none"
                      >
                        <div className="flex items-center gap-2">
                          {IconComponent && (
                            <div className={`p-1 rounded-md bg-gradient-to-br ${category.gradient} border ${category.border} transition-all flex-shrink-0`}>
                              <IconComponent className={`w-3 h-3 ${category.iconColor}`} />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors leading-tight break-words">
                              {blockDef.label}
                            </h4>
                            <p className="text-[10px] text-muted-foreground leading-snug break-words">{blockDef.description}</p>
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
