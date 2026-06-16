import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card } from '@/components/ui/card';
import { Zap, Play, GitBranch, Shuffle, Sparkles, MessageCircle, HardDrive, Workflow, Cpu } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { N8nNodeType } from './types';

interface NodeLibraryProps {
  nodeTypes: N8nNodeType[];
  onDragStart: (nodeType: N8nNodeType) => void;
}

const categoryConfig: Record<string, { label: string; icon: React.ElementType }> = {
  trigger: { label: 'Triggers', icon: Zap },
  action: { label: 'Ações', icon: Play },
  logic: { label: 'Lógica', icon: GitBranch },
  transform: { label: 'Transformação', icon: Shuffle },
  ai: { label: 'IA / LLM', icon: Sparkles },
  communication: { label: 'Comunicação', icon: MessageCircle },
  data: { label: 'Dados', icon: HardDrive },
  other: { label: 'Outros', icon: Workflow },
};

const categoryOrder = ['trigger', 'action', 'logic', 'transform', 'ai', 'communication', 'data', 'other'];

const NodeLibrary: React.FC<NodeLibraryProps> = ({ nodeTypes, onDragStart }) => {
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(categoryOrder));

  const filteredNodes = useMemo(() => {
    if (!search.trim()) return nodeTypes;
    const term = search.toLowerCase();
    return nodeTypes.filter(
      (node) =>
        node.nome_display.toLowerCase().includes(term) ||
        node.descricao?.toLowerCase().includes(term) ||
        node.tipo.toLowerCase().includes(term)
    );
  }, [nodeTypes, search]);

  const groupedNodes = useMemo(() => {
    const groups: Record<string, N8nNodeType[]> = {};
    filteredNodes.forEach((node) => {
      const cat = node.categoria || 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(node);
    });
    return groups;
  }, [filteredNodes]);

  const handleDragStart = (e: React.DragEvent, nodeType: N8nNodeType) => {
    e.dataTransfer.setData('application/json', JSON.stringify(nodeType));
    e.dataTransfer.effectAllowed = 'copy';
    onDragStart(nodeType);
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col bg-white border-r border-border/30">
      <div className="p-4 pb-2">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-6 w-6 rounded-lg bg-foreground text-background flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <h3 className="font-bold text-base text-foreground tracking-tight">Menu</h3>
        </div>
        <Input
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-xs bg-muted/40 border-0 shadow-sm"
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2 pb-4 space-y-0.5">
          {categoryOrder.map((category) => {
            const nodes = groupedNodes[category];
            if (!nodes || nodes.length === 0) return null;

            const config = categoryConfig[category] || categoryConfig.other;
            const CategoryIcon = config.icon;
            const isOpen = expandedCategories.has(category);

            return (
              <Collapsible key={category} open={isOpen} onOpenChange={() => toggleCategory(category)}>
                <CollapsibleTrigger
                  className={`flex items-center justify-between w-full px-3 py-2 rounded-xl transition-colors duration-100 text-left ${
                    isOpen ? 'bg-foreground text-background' : 'hover:bg-black/5 text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <CategoryIcon className={`w-4 h-4 ${isOpen ? 'text-background' : 'text-muted-foreground'}`} />
                    <span className="text-xs font-medium">{config.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-semibold flex items-center justify-center ${isOpen ? 'bg-background/20 text-background' : 'bg-foreground text-background'}`}>
                      {nodes.length}
                    </span>
                    <span className={`text-xs ${isOpen ? 'text-background/70' : 'text-muted-foreground'}`}>
                      {isOpen ? '−' : '+'}
                    </span>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent className="animate-accordion-down">
                  <div className="relative ml-5 pl-4 pt-1 pb-1">
                    <div className="absolute left-0 top-0 bottom-0 w-px bg-foreground/40" />
                    <div className="space-y-0.5">
                      {nodes.map((node) => {
                        const NodeIcon = node.icone ? (LucideIcons[node.icone as keyof typeof LucideIcons] as any) : null;
                        return (
                        <Card
                          key={node.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, node)}
                          className="px-3 py-2 cursor-grab active:cursor-grabbing bg-transparent hover:bg-muted/60 border-0 shadow-none rounded-xl transition-colors duration-100 select-none"
                        >
                          <div className="flex items-center gap-2">
                            {NodeIcon && <NodeIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                            <h4 className="text-xs font-normal text-foreground truncate">{node.nome_display}</h4>
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

          {Object.keys(groupedNodes).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Cpu className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-medium">Nenhum nó encontrado</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default NodeLibrary;
