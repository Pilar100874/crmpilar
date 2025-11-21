import { Users, User, Award, GitBranch, Clock, Webhook, Timer, PlayCircle, BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { OmnichannelBlockType } from "@/types/omnichannelFlow";

interface BlockLibraryProps {
  onDragStart: (type: OmnichannelBlockType) => void;
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
    type: "simulador",
    label: "Simulador de Teste",
    icon: <PlayCircle className="h-5 w-5" />,
    description: "Testa o fluxo de roteamento",
    color: "text-indigo-500"
  },
  {
    type: "analytics",
    label: "Analytics",
    icon: <BarChart3 className="h-5 w-5" />,
    description: "Visualiza métricas do fluxo",
    color: "text-emerald-500"
  },
];

export const BlockLibrary = ({ onDragStart }: BlockLibraryProps) => {
  const handleDragStart = (e: React.DragEvent, type: OmnichannelBlockType) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/reactflow", type);
    onDragStart(type);
  };

  return (
    <Card className="h-full">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Biblioteca de Blocos</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Arraste blocos para o canvas
        </p>
      </div>
      
      <ScrollArea className="h-[calc(100%-80px)]">
        <div className="p-4 space-y-2">
          {blocks.map((block) => (
            <div
              key={block.type}
              draggable
              onDragStart={(e) => handleDragStart(e, block.type)}
              className="flex items-start gap-3 p-3 border rounded-lg cursor-grab active:cursor-grabbing hover:bg-accent hover:border-primary transition-colors"
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
      </ScrollArea>
    </Card>
  );
};
