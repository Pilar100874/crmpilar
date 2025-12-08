import { useState, useEffect, useRef } from 'react';
import { MessageCircle } from 'lucide-react';
import { ChatInternoPanel } from './ChatInternoPanel';
import { useChatInterno } from '@/hooks/useChatInterno';
import { cn } from '@/lib/utils';

export function ChatAvisosFloatingButton() {
  const [chatOpen, setChatOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const { conversas, mensagens } = useChatInterno();
  const lastMessageCountRef = useRef(0);
  const lastReadTimestampRef = useRef<string | null>(null);

  // Detecta novas mensagens quando o chat está fechado
  useEffect(() => {
    if (mensagens.length > 0) {
      const ultimaMensagem = mensagens[mensagens.length - 1];
      
      // Se o chat está fechado e temos uma nova mensagem
      if (!chatOpen) {
        // Verifica se é uma mensagem nova (comparando timestamp ou contagem)
        if (mensagens.length > lastMessageCountRef.current) {
          // Nova mensagem recebida enquanto chat fechado
          setHasUnread(true);
        } else if (lastReadTimestampRef.current && ultimaMensagem.created_at > lastReadTimestampRef.current) {
          // Mensagem mais recente que a última leitura
          setHasUnread(true);
        }
      }
      
      lastMessageCountRef.current = mensagens.length;
    }
  }, [mensagens, chatOpen]);

  // Limpa notificação ao abrir o chat e marca timestamp de leitura
  useEffect(() => {
    if (chatOpen) {
      setHasUnread(false);
      if (mensagens.length > 0) {
        const ultimaMensagem = mensagens[mensagens.length - 1];
        lastReadTimestampRef.current = ultimaMensagem.created_at;
      }
    }
  }, [chatOpen, mensagens]);

  const handleChatClick = () => {
    setChatOpen(!chatOpen);
  };

  return (
    <>
      {/* Aba lateral estilo menu - laranja */}
      <div 
        className={cn(
          "chat-tab", 
          chatOpen && "chat-open",
          hasUnread && !chatOpen && "chat-tab-pulse"
        )}
        onClick={handleChatClick}
      >
        <MessageCircle className="w-3 h-3" />
      </div>

      {/* Panel - abre como menu lateral do lado direito */}
      <ChatInternoPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}
