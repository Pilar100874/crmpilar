import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { LOGISTICA_BLOCKS } from '@/types/automacaoLogistica';

interface LogisticaBlockLibraryProps {
  onDragStart: (event: React.DragEvent, nodeType: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const categories = [
  { id: 'gatilho', label: 'Gatilhos', icon: 'Zap' },
  { id: 'condicao', label: 'Condições', icon: 'GitBranch' },
  { id: 'acao', label: 'Ações', icon: 'Play' },
];

export function LogisticaBlockLibrary({ onDragStart, isExpanded, onToggleExpand }: LogisticaBlockLibraryProps) {
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
      prev.includes(categoryId) ? prev.filter(c => c !== categoryId) : [...prev, categoryId]
    );
  };

  const getBlocksByCategory = (categoryId: string) =>
    filteredBlocks.filter(block => block.category === categoryId);

  if (!isExpanded) return null;

  return (
    <div className="w-64 bg-[#E8EAED] border-r border-border/30 flex flex-col h-full relative">
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-foreground">Menu</h3>
          <Button variant="ghost" size="icon" onClick={onToggleExpand} className="h-7 w-7 rounded-md hover:bg-black/5">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Input
          placeholder="Buscar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-8 text-xs bg-white/60 border-0 shadow-sm"
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2 pb-4 space-y-0.5">
          {categories.map((category) => {
            const blocks = getBlocksByCategory(category.id);
            if (blocks.length === 0) return null;

            const CategoryIcon = LucideIcons[category.icon as keyof typeof LucideIcons] as any;
            const isOpen = openCategories.includes(category.id);

            return (
              <Collapsible key={category.id} open={isOpen} onOpenChange={() => toggleCategory(category.id)}>
                <CollapsibleTrigger
                  className={`flex items-center justify-between w-full px-3 py-2 rounded-xl transition-all duration-150 text-left ${
                    isOpen ? "bg-foreground text-background" : "hover:bg-black/5 text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {CategoryIcon && (
                      <CategoryIcon className={`w-4 h-4 ${isOpen ? "text-background" : "text-muted-foreground"}`} />
                    )}
                    <span className="text-xs font-medium">{category.label}</span>
                  </div>
                  <span className={`text-xs ${isOpen ? "text-background/70" : "text-muted-foreground"}`}>
                    {isOpen ? "−" : "+"}
                  </span>
                </CollapsibleTrigger>

                <CollapsibleContent className="animate-accordion-down">
                  <div className="relative ml-5 pl-4 pt-1 pb-1">
                    <div className="absolute left-0 top-0 bottom-0 w-px bg-border" />
                    <div className="space-y-0.5">
                      {blocks.map((block) => (
                        <Card
                          key={block.type}
                          draggable
                          onDragStart={(e) => onDragStart(e, block.type)}
                          onDoubleClick={() => window.dispatchEvent(new CustomEvent("workflow:add-block", { detail: { type: block.type } }))}
                          title="Arraste ou clique 2x para adicionar"
                          className="px-3 py-2 cursor-grab active:cursor-grabbing bg-transparent hover:bg-white border-0 shadow-none rounded-xl transition-all duration-150 select-none"
                        >
                          <h4 className="text-xs font-normal text-foreground truncate">{block.label}</h4>
                        </Card>
                      ))}
                    </div>
                  </div>
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
