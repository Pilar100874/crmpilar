import { useState } from 'react';
import { ChevronDown, Plus, X } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { LOGISTICA_BLOCKS, LogisticaBlock } from '@/types/automacaoLogistica';

interface LogisticaBlockLibraryProps {
  onDragStart: (event: React.DragEvent, nodeType: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const iconMap: Record<string, any> = {
  Play: LucideIcons.Play,
  Pause: LucideIcons.Pause,
  Gauge: LucideIcons.Gauge,
  MapPin: LucideIcons.MapPin,
  MapPinOff: LucideIcons.MapPinOff,
  Clock: LucideIcons.Clock,
  MessageCircle: LucideIcons.MessageCircle,
  Bell: LucideIcons.Bell,
  Mail: LucideIcons.Mail,
};

const categories = [
  { 
    id: 'gatilho', 
    label: 'Gatilhos', 
    icon: 'Zap',
    gradient: "from-amber-500/10 to-orange-500/10",
    border: "border-amber-500/20",
    borderHover: "hover:border-amber-500/40",
    iconColor: "text-amber-600",
    iconHover: "group-hover:text-amber-700",
    textHover: "group-hover:text-amber-700",
  },
  { 
    id: 'condicao', 
    label: 'Condições', 
    icon: 'GitBranch',
    gradient: "from-blue-500/10 to-cyan-500/10",
    border: "border-blue-500/20",
    borderHover: "hover:border-blue-500/40",
    iconColor: "text-blue-600",
    iconHover: "group-hover:text-blue-700",
    textHover: "group-hover:text-blue-700",
  },
  { 
    id: 'acao', 
    label: 'Ações', 
    icon: 'Play',
    gradient: "from-green-500/10 to-emerald-500/10",
    border: "border-green-500/20",
    borderHover: "hover:border-green-500/40",
    iconColor: "text-green-600",
    iconHover: "group-hover:text-green-700",
    textHover: "group-hover:text-green-700",
  },
];

export function LogisticaBlockLibrary({ 
  onDragStart, 
  isExpanded, 
  onToggleExpand 
}: LogisticaBlockLibraryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [openCategories, setOpenCategories] = useState<string[]>(['gatilho', 'condicao', 'acao']);

  const filteredBlocks = LOGISTICA_BLOCKS.filter(
    block => 
      block.type !== 'iniciar_automacao' && 
      (block.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
       block.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const toggleCategory = (categoryId: string) => {
    setOpenCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const getBlocksByCategory = (categoryId: string) => {
    return filteredBlocks.filter(block => block.category === categoryId);
  };

  if (!isExpanded) {
    return null;
  }

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col h-full shadow-lg relative">
      {/* Header compacto */}
      <div className="p-3 border-b border-border bg-gradient-to-r from-primary/20 to-primary/10 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-foreground">Blocos</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleExpand}
              className="h-7 w-7 rounded-md transition-all"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Search bar compacta */}
          <div className="relative">
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {categories.map((category) => {
            const blocks = getBlocksByCategory(category.id);
            if (blocks.length === 0) return null;
            
            const CategoryIcon = LucideIcons[category.icon as keyof typeof LucideIcons] as any;
            const isOpen = openCategories.includes(category.id);

            return (
              <Collapsible
                key={category.id}
                open={isOpen}
                onOpenChange={() => toggleCategory(category.id)}
                className="group"
              >
                <CollapsibleTrigger className={cn(
                  "flex items-center justify-between w-full px-2 py-1.5 rounded-lg hover:bg-muted transition-all duration-150 group border border-transparent",
                  category.borderHover
                )}>
                  <div className="flex items-center gap-2">
                    {CategoryIcon && (
                      <div className={cn(
                        "p-1 rounded-md bg-gradient-to-br border transition-all",
                        category.gradient,
                        category.border
                      )}>
                        <CategoryIcon className={cn("w-3 h-3", category.iconColor, category.iconHover)} />
                      </div>
                    )}
                    <span className={cn(
                      "font-semibold text-xs text-foreground transition-colors",
                      category.textHover
                    )}>
                      {category.label}
                    </span>
                  </div>
                  <ChevronDown 
                    className={cn(
                      "w-3 h-3 text-muted-foreground transition-all duration-150",
                      isOpen ? `rotate-180 ${category.iconColor}` : category.iconHover
                    )}
                  />
                </CollapsibleTrigger>

                <CollapsibleContent className="pt-1 space-y-1 animate-accordion-down">
                  {blocks.map((block) => {
                    const IconComponent = iconMap[block.icon] || LucideIcons.Box;
                    
                    return (
                      <Card
                        key={block.type}
                        draggable
                        onDragStart={(e) => onDragStart(e, block.type)}
                        onDoubleClick={() => window.dispatchEvent(new CustomEvent("workflow:add-block", { detail: { type: block.type } }))}
                        title="Arraste ou clique 2x para adicionar"
                        className="p-2 ml-5 cursor-grab active:cursor-grabbing bg-muted/50 hover:bg-muted hover:border-primary/40 transition-all duration-150 hover:shadow-md group rounded-2xl select-none"
                      >
                        <div className="flex items-center gap-2">
                          <div 
                            className="p-1.5 rounded-md flex-shrink-0"
                            style={{ backgroundColor: block.color }}
                          >
                            <IconComponent className="w-3 h-3 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                              {block.label}
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
          
          {filteredBlocks.length === 0 && (
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
