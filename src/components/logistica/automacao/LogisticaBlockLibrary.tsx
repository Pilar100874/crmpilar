import { useState } from 'react';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  { id: 'gatilho', label: 'Gatilhos', icon: LucideIcons.Zap },
  { id: 'condicao', label: 'Condições', icon: LucideIcons.GitBranch },
  { id: 'acao', label: 'Ações', icon: LucideIcons.Play },
];

export function LogisticaBlockLibrary({ 
  onDragStart, 
  isExpanded, 
  onToggleExpand 
}: LogisticaBlockLibraryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['gatilho', 'condicao', 'acao']);

  const filteredBlocks = LOGISTICA_BLOCKS.filter(
    block => 
      block.type !== 'iniciar_automacao' && 
      (block.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
       block.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const getBlocksByCategory = (categoryId: string) => {
    return filteredBlocks.filter(block => block.category === categoryId);
  };

  const renderBlock = (block: LogisticaBlock) => {
    const IconComponent = iconMap[block.icon] || LucideIcons.Box;

    return (
      <div
        key={block.type}
        draggable
        onDragStart={(e) => onDragStart(e, block.type)}
        className={cn(
          'flex items-center gap-2 p-2 rounded-md cursor-grab border',
          'hover:bg-accent transition-colors',
          'bg-card border-border'
        )}
      >
        <div 
          className="p-1.5 rounded-md"
          style={{ backgroundColor: block.color }}
        >
          <IconComponent className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{block.label}</p>
          {isExpanded && (
            <p className="text-xs text-muted-foreground truncate">{block.description}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={cn(
      'h-full border-r bg-card flex flex-col transition-all duration-300',
      isExpanded ? 'w-72' : 'w-16'
    )}>
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between">
        {isExpanded && <span className="font-semibold text-sm">Blocos</span>}
        <button
          onClick={onToggleExpand}
          className="p-1.5 hover:bg-accent rounded-md transition-colors"
        >
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {isExpanded && (
        <>
          {/* Search */}
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar blocos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>

          {/* Blocks by category */}
          <ScrollArea className="flex-1 px-3 pb-3">
            {categories.map(category => {
              const blocks = getBlocksByCategory(category.id);
              if (blocks.length === 0) return null;
              const CategoryIcon = category.icon;
              const isExpanded = expandedCategories.includes(category.id);

              return (
                <div key={category.id} className="mb-3">
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="flex items-center gap-2 w-full p-2 hover:bg-accent rounded-md transition-colors"
                  >
                    <CategoryIcon className="w-4 h-4" />
                    <span className="text-sm font-medium flex-1 text-left">{category.label}</span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  
                  {isExpanded && (
                    <div className="mt-1 space-y-1.5 pl-2">
                      {blocks.map(renderBlock)}
                    </div>
                  )}
                </div>
              );
            })}
          </ScrollArea>
        </>
      )}

      {/* Collapsed state - show icons only */}
      {!isExpanded && (
        <ScrollArea className="flex-1 py-2">
          <div className="flex flex-col items-center gap-2">
            {filteredBlocks.map(block => {
              const IconComponent = iconMap[block.icon] || LucideIcons.Box;
              return (
                <div
                  key={block.type}
                  draggable
                  onDragStart={(e) => onDragStart(e, block.type)}
                  className="p-2 rounded-md cursor-grab hover:bg-accent transition-colors"
                  title={block.label}
                >
                  <div 
                    className="p-1.5 rounded-md"
                    style={{ backgroundColor: block.color }}
                  >
                    <IconComponent className="w-4 h-4 text-white" />
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
