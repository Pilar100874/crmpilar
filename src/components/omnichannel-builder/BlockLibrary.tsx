import { Users, User, Award, GitBranch, Clock, Webhook, Timer, PlayCircle, BarChart3, X, Search, Share2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import type { OmnichannelBlockType, OmnichannelNode } from "@/types/omnichannelFlow";

interface BlockLibraryProps {
  onDragStart: (type: OmnichannelBlockType) => void;
  isExpanded: boolean;
  onToggleExpanded: (expanded: boolean) => void;
  nodes: OmnichannelNode[];
  onNodeSelect: (nodeId: string) => void;
}

interface BlockItem {
  type: OmnichannelBlockType;
  label: string;
  icon: React.ReactNode;
  description: string;
  color: string;
}

const blocks: BlockItem[] = [
  {
    type: "fila",
    label: "Fila de Atendimento",
    icon: <Users className="h-5 w-5" />,
    description: "Cria uma fila de distribuição de chats",
    color: "text-blue-500"
  },
  {
    type: "atendente",
    label: "Atendente",
    icon: <User className="h-5 w-5" />,
    description: "Define um atendente no fluxo",
    color: "text-green-500"
  },
  {
    type: "skill",
    label: "Skill Requerida",
    icon: <Award className="h-5 w-5" />,
    description: "Adiciona requisito de habilidade",
    color: "text-yellow-500"
  },
  {
    type: "regra_roteamento",
    label: "Regra de Roteamento",
    icon: <GitBranch className="h-5 w-5" />,
    description: "Define condições de distribuição",
    color: "text-purple-500"
  },
  {
    type: "horario",
    label: "Horário de Funcionamento",
    icon: <Clock className="h-5 w-5" />,
    description: "Define horários de atendimento",
    color: "text-orange-500"
  },
  {
    type: "webhook",
    label: "Webhook",
    icon: <Webhook className="h-5 w-5" />,
    description: "Integra com sistemas externos",
    color: "text-cyan-500"
  },
  {
    type: "aguardar",
    label: "Aguardar",
    icon: <Timer className="h-5 w-5" />,
    description: "Adiciona delay no fluxo",
    color: "text-pink-500"
  },
  {
    type: "analytics",
    label: "Analytics",
    icon: <BarChart3 className="h-5 w-5" />,
    description: "Visualiza métricas do fluxo",
    color: "text-emerald-500"
  },
  {
    type: "publicar_rede_social",
    label: "Publicar em Redes Sociais",
    icon: <Share2 className="h-5 w-5" />,
    description: "Publica conteúdo nas redes sociais configuradas",
    color: "text-pink-500"
  },
];

export const BlockLibrary = ({ 
  onDragStart, 
  isExpanded, 
  onToggleExpanded,
  nodes,
  onNodeSelect 
}: BlockLibraryProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const handleDragStart = (e: React.DragEvent, type: OmnichannelBlockType) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/reactflow", type);
    onDragStart(type);
  };

  // Filtrar nós pela busca
  const filteredNodes = nodes.filter(node => {
    const query = searchQuery.toLowerCase();
    const nodeData = node.data as any;
    const label = nodeData?.label || "";
    const type = nodeData?.type || "";
    const description = nodeData?.description || "";
    
    return label.toLowerCase().includes(query) ||
           type.toLowerCase().includes(query) ||
           description.toLowerCase().includes(query);
  });

  // Filtrar blocos pela busca
  const filteredBlocks = blocks.filter(block => {
    const query = searchQuery.toLowerCase();
    return block.label.toLowerCase().includes(query) ||
           block.description.toLowerCase().includes(query);
  });

  const handleSelect = (nodeId: string) => {
    onNodeSelect(nodeId);
    setSearchQuery("");
  };

  if (!isExpanded) {
    return null;
  }

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col h-full shadow-lg">
      {/* Header com busca */}
      <div className="p-3 border-b border-border bg-gradient-to-r from-primary/20 to-primary/10">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-sm text-foreground">Blocos</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onToggleExpanded(false)}
            className="h-7 w-7 rounded-md"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Buscar blocos ou nós..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 text-xs pl-7"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {/* Resultados da busca de nós */}
        {searchQuery && filteredNodes.length > 0 && (
          <div className="p-2 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground mb-2 px-2">
              Nós no Fluxo ({filteredNodes.length})
            </p>
            <div className="space-y-1">
              {filteredNodes.map((node) => {
                const nodeData = node.data as any;
                return (
                  <button
                    key={node.id}
                    onClick={() => handleSelect(node.id)}
                    className="w-full text-left p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <p className="text-xs font-medium text-foreground">
                      {nodeData?.label || "Sem nome"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {nodeData?.type || "Sem tipo"}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Blocos disponíveis */}
        <div className="p-2">
          <p className="text-xs font-semibold text-muted-foreground mb-2 px-2">
            {searchQuery ? `Blocos Disponíveis (${filteredBlocks.length})` : "Blocos de Atendimento"}
          </p>
          
          <div className="space-y-2">
            {filteredBlocks.map((block) => (
              <div
                key={block.type}
                draggable
                onDragStart={(e) => handleDragStart(e, block.type)}
                onDoubleClick={() => window.dispatchEvent(new CustomEvent("workflow:add-block", { detail: { type: block.type } }))}
                title="Arraste ou clique 2x para adicionar"
                className="flex items-start gap-3 p-3 border rounded-2xl cursor-grab active:cursor-grabbing hover:bg-accent hover:border-primary transition-all select-none"
              >
                <div className={`flex-shrink-0 mt-0.5 ${block.color}`}>
                  {block.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{block.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {block.description}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredBlocks.length === 0 && searchQuery && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-xs font-medium">Nenhum bloco encontrado</p>
              <p className="text-[10px] mt-1">Tente outra busca</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
