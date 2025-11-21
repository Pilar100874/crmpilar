import { useState } from "react";
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
  AlertCircle,
  ArrowRightLeft,
  Tag,
  PauseCircle
} from "lucide-react";
import type { ChatStatus, ChatPrioridade } from "@/types/atendimento";
import { TransferenciaDialog } from "./TransferenciaDialog";
import { EncerrarChatDialog } from "./EncerrarChatDialog";
import { ChatTagsManager } from "./ChatTagsManager";
import { useChatStatus } from "@/hooks/useChatStatus";

interface ChatStatusManagerProps {
  chatId: string;
  currentStatus: ChatStatus;
  currentPrioridade: ChatPrioridade | null;
  estabelecimentoId: string;
  filaId?: string | null;
  atendenteId?: string | null;
  onRefresh?: () => void;
}

export const ChatStatusManager = ({
  chatId,
  currentStatus,
  currentPrioridade,
  estabelecimentoId,
  filaId,
  atendenteId,
  onRefresh
}: ChatStatusManagerProps) => {
  const [showTransferenciaDialog, setShowTransferenciaDialog] = useState(false);
  const [showEncerrarDialog, setShowEncerrarDialog] = useState(false);
  const [showTagsManager, setShowTagsManager] = useState(false);
  const { mudarPrioridade, colocarEmEspera, reabrirChat, loading } = useChatStatus();
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

  const handleChangePrioridade = async (prioridade: ChatPrioridade) => {
    await mudarPrioridade(chatId, prioridade);
    onRefresh?.();
  };

  const handleColocarEmEspera = async () => {
    await colocarEmEspera(chatId);
    onRefresh?.();
  };

  const handleReabrirChat = async () => {
    await reabrirChat(chatId);
    onRefresh?.();
  };

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            {getStatusIcon(currentStatus)}
            {getStatusLabel(currentStatus)}
          </Badge>
        </div>

        <Select
          value={currentPrioridade || "normal"}
          onValueChange={(value) => handleChangePrioridade(value as ChatPrioridade)}
          disabled={loading}
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

        {currentStatus !== "encerrado" && (
          <>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setShowTransferenciaDialog(true)}
              disabled={loading}
            >
              <ArrowRightLeft className="h-3 w-3 mr-1" />
              Transferir
            </Button>

            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setShowTagsManager(true)}
              disabled={loading}
            >
              <Tag className="h-3 w-3 mr-1" />
              Tags
            </Button>

            {currentStatus === "em_atendimento" && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleColocarEmEspera}
                disabled={loading}
              >
                <PauseCircle className="h-3 w-3 mr-1" />
                Em Espera
              </Button>
            )}

            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setShowEncerrarDialog(true)}
              disabled={loading}
            >
              <XCircle className="h-3 w-3 mr-1" />
              Encerrar
            </Button>
          </>
        )}

        {currentStatus === "encerrado" && (
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleReabrirChat}
            disabled={loading}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reabrir
          </Button>
        )}
      </div>

      <TransferenciaDialog
        open={showTransferenciaDialog}
        onOpenChange={setShowTransferenciaDialog}
        chatId={chatId}
        estabelecimentoId={estabelecimentoId}
        currentFilaId={filaId}
        currentAtendenteId={atendenteId}
      />

      <EncerrarChatDialog
        open={showEncerrarDialog}
        onOpenChange={setShowEncerrarDialog}
        chatId={chatId}
        onSuccess={onRefresh}
      />

      {showTagsManager && (
        <div className="mt-2">
          <ChatTagsManager
            chatId={chatId}
            estabelecimentoId={estabelecimentoId}
          />
        </div>
      )}
    </>
  );
};
