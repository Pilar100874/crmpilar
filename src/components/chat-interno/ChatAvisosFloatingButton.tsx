import { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { ChatInternoPanel } from './ChatInternoPanel';
import { useChatInterno } from '@/hooks/useChatInterno';
import { cn } from '@/lib/utils';

export function ChatAvisosFloatingButton() {
  const [chatOpen, setChatOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const { conversas, mensagens } = useChatInterno();

  // Detecta novas mensagens quando o chat está fechado
  useEffect(() => {
    if (!chatOpen && mensagens.length > 0) {
      // Verifica se há mensagens não lidas (simplificado)
      const ultimaMensagem = mensagens[mensagens.length - 1];
      if (ultimaMensagem) {
        setHasUnread(true);
      }
    }
  }, [mensagens, chatOpen]);

  // Limpa notificação ao abrir o chat
  useEffect(() => {
    if (chatOpen) {
      setHasUnread(false);
    }
  }, [chatOpen]);

  const handleChatClick = () => {
    setChatOpen(!chatOpen);
  };

  return (
    <>
      {/* Aba lateral estilo menu - laranja */}
      <div 
        className={cn("chat-tab", hasUnread && !chatOpen && "chat-tab-pulse")}
        onClick={handleChatClick}
      >
        <MessageCircle className="w-3 h-3" />
      </div>

      {/* Panel - abre como menu lateral do lado direito */}
      <ChatInternoPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}
