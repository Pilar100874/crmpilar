import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  RotateCcw, 
  Users,
  AlertCircle
} from "lucide-react";
import type { ChatStatus, ChatPrioridade } from "@/types/atendimento";

interface ChatStatusManagerProps {
  chatId: string;
  currentStatus: ChatStatus;
  currentPrioridade: ChatPrioridade | null;
  onChangeStatus: (status: ChatStatus) => void;
  onChangePrioridade: (prioridade: ChatPrioridade) => void;
  onEncerrarChat: () => void;
  onReabrirChat: () => void;
}

export const ChatStatusManager = ({
  chatId,
  currentStatus,
  currentPrioridade,
  onChangeStatus,
  onChangePrioridade,
  onEncerrarChat,
  onReabrirChat
}: ChatStatusManagerProps) => {
  const getStatusIcon = (status: ChatStatus) => {
    const icons = {
      novo: AlertCircle,
      em_fila: Clock,
      em_atendimento: Users,
      transferido: RotateCcw,
      aguardando_cliente: Clock,
      encerrado: CheckCircle,
      reaberto: RotateCcw
    };
    const Icon = icons[status];
    return Icon ? <Icon className="h-4 w-4" /> : null;
  };

  const getStatusLabel = (status: ChatStatus) => {
    const labels = {
      novo: "Novo",
      em_fila: "Em Fila",
      em_atendimento: "Em Atendimento",
      transferido: "Transferido",
      aguardando_cliente: "Aguardando Cliente",
      encerrado: "Encerrado",
      reaberto: "Reaberto"
    };
    return labels[status] || status;
  };

  const getPrioridadeVariant = (prioridade: ChatPrioridade | null) => {
    const variants = {
      baixa: "secondary",
      normal: "outline",
      alta: "default",
      urgente: "destructive"
    } as const;
    return variants[prioridade || "normal"];
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="flex items-center gap-1">
          {getStatusIcon(currentStatus)}
          {getStatusLabel(currentStatus)}
        </Badge>
      </div>

      <Select
        value={currentPrioridade || "normal"}
        onValueChange={(value) => onChangePrioridade(value as ChatPrioridade)}
      >
        <SelectTrigger className="w-[140px] h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="baixa">🟢 Baixa</SelectItem>
          <SelectItem value="normal">🟡 Normal</SelectItem>
          <SelectItem value="alta">🟠 Alta</SelectItem>
          <SelectItem value="urgente">🔴 Urgente</SelectItem>
        </SelectContent>
      </Select>

      {currentStatus === "encerrado" ? (
        <Button size="sm" variant="outline" onClick={onReabrirChat}>
          <RotateCcw className="h-3 w-3 mr-1" />
          Reabrir
        </Button>
      ) : (
        <Button size="sm" variant="outline" onClick={onEncerrarChat}>
          <XCircle className="h-3 w-3 mr-1" />
          Encerrar
        </Button>
      )}
    </div>
  );
};
