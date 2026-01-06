import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Zap, 
  Clock, 
  Globe, 
  Code, 
  GitBranch, 
  Bot, 
  Database,
  Mail,
  MessageSquare,
  Webhook,
  Filter,
  Layers,
  GitMerge,
  Send,
  Settings,
  Link,
  Brain,
  Shuffle,
  Edit,
  Play
} from 'lucide-react';
import { N8nNodeType } from './types';

interface NodeLibraryProps {
  nodeTypes: N8nNodeType[];
  onDragStart: (nodeType: N8nNodeType) => void;
}

const iconMap: Record<string, React.ElementType> = {
  webhook: Webhook,
  clock: Clock,
  globe: Globe,
  'git-branch': GitBranch,
  shuffle: Shuffle,
  edit: Edit,
  code: Code,
  'git-merge': GitMerge,
  layers: Layers,
  bot: Bot,
  send: Send,
  hash: MessageSquare,
  mail: Mail,
  database: Database,
  reply: Send,
  brain: Brain,
  link: Link,
  filter: Filter,
  play: Play,
};

const categoryLabels: Record<string, string> = {
  trigger: 'Triggers',
  action: 'Ações',
  logic: 'Lógica',
  transform: 'Transformação',
  ai: 'IA / LLM',
  communication: 'Comunicação',
  data: 'Dados',
};

const categoryOrder = ['trigger', 'action', 'logic', 'transform', 'ai', 'communication', 'data'];

const NodeLibrary: React.FC<NodeLibraryProps> = ({ nodeTypes, onDragStart }) => {
  const [search, setSearch] = useState('');

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

  return (
    <div className="h-full flex flex-col border-r bg-background">
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar nós..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-4">
          {categoryOrder.map((category) => {
            const nodes = groupedNodes[category];
            if (!nodes || nodes.length === 0) return null;

            return (
              <div key={category}>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
                  {categoryLabels[category] || category}
                </h3>
                <div className="space-y-1">
                  {nodes.map((node) => {
                    const IconComponent = iconMap[node.icone || ''] || Zap;
                    const color = node.cor || '#64748b';

                    return (
                      <div
                        key={node.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, node)}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted cursor-grab active:cursor-grabbing transition-colors group"
                      >
                        <div
                          className="p-1.5 rounded text-white flex-shrink-0"
                          style={{ backgroundColor: color }}
                        >
                          <IconComponent className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {node.nome_display}
                          </div>
                          {node.credential_type_id && (
                            <Badge variant="outline" className="text-[10px] h-4 mt-0.5">
                              Requer credencial
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default NodeLibrary;
