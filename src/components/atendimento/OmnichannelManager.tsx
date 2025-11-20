import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AtendenteStatusSelector } from "./AtendenteStatusSelector";
import { ChatTagsManager } from "./ChatTagsManager";
import { TransferenciaDialog } from "./TransferenciaDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft, Tag } from "lucide-react";
import type { Atendente, Chat, AtendenteStatus } from "@/types/atendimento";

interface OmnichannelManagerProps {
  conversationId: string | null;
  estabelecimentoId: string;
  usuarioId: string;
  onUpdate?: () => void;
}

export const OmnichannelManager = ({
  conversationId,
  estabelecimentoId,
  usuarioId,
  onUpdate
}: OmnichannelManagerProps) => {
  const [atendente, setAtendente] = useState<Atendente | null>(null);
  const [chat, setChat] = useState<Chat | null>(null);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAtendente();
  }, [usuarioId, estabelecimentoId]);

  useEffect(() => {
    if (conversationId) {
      loadChat();
    }
  }, [conversationId]);

  const loadAtendente = async () => {
    try {
      const { data } = await supabase
        .from('atendentes')
        .select('*')
        .eq('usuario_id', usuarioId)
        .eq('estabelecimento_id', estabelecimentoId)
        .single();

      if (data) {
        setAtendente(data);
      }
    } catch (error) {
      console.error('Erro ao carregar atendente:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChat = async () => {
    if (!conversationId) return;
    
    try {
      const { data } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (data) {
        setChat(data as Chat);
      }
    } catch (error) {
      console.error('Erro ao carregar chat:', error);
    }
  };

  const handleStatusUpdate = () => {
    loadAtendente();
    onUpdate?.();
  };

  const handleTransferComplete = () => {
    setShowTransferDialog(false);
    loadChat();
    onUpdate?.();
  };

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-3">
      {/* Status do Atendente */}
      {atendente && (
        <div>
          <h3 className="text-xs font-semibold mb-2 text-muted-foreground uppercase">Meu Status</h3>
          <AtendenteStatusSelector
            atendenteId={atendente.id}
            currentStatus={atendente.status as AtendenteStatus}
            onStatusChange={handleStatusUpdate}
          />
        </div>
      )}

      {/* Gerenciamento do Chat Atual */}
      {conversationId && chat && (
        <div className="space-y-3 pt-3 border-t">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase">Chat Atual</h3>
            <Badge variant={chat.chat_status === 'em_atendimento' ? 'default' : 'secondary'} className="text-xs">
              {chat.chat_status?.replace('_', ' ')}
            </Badge>
          </div>

          {/* Tags */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Tag className="h-3 w-3 text-primary" />
              <span className="text-xs font-medium">Tags</span>
            </div>
            <ChatTagsManager
              chatId={conversationId}
              estabelecimentoId={estabelecimentoId}
            />
          </div>

          {/* Transferir */}
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => setShowTransferDialog(true)}
          >
            <ArrowRightLeft className="h-3 w-3 mr-2" />
            Transferir Chat
          </Button>
        </div>
      )}

      {/* Dialog de Transferência */}
      {conversationId && chat && (
        <TransferenciaDialog
          open={showTransferDialog}
          onOpenChange={setShowTransferDialog}
          chatId={conversationId}
          estabelecimentoId={estabelecimentoId}
          currentFilaId={chat.fila_id}
          currentAtendenteId={chat.atendente_atual_id}
        />
      )}
    </div>
  );
};

