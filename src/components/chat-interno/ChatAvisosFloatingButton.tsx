import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { ChatInternoPanel } from './ChatInternoPanel';
import { useChatInternoContext } from '@/contexts/ChatInternoContext';
import { cn } from '@/lib/utils';

export function ChatAvisosFloatingButton() {
  const [chatOpen, setChatOpen] = useState(false);
  const { totalNaoLidas } = useChatInternoContext();

  const handleChatClick = () => {
    setChatOpen(!chatOpen);
  };

  // Determina se deve pulsar: tem mensagens não lidas e chat está fechado
  const shouldPulse = totalNaoLidas > 0 && !chatOpen;

  return (
    <>
      {/* Aba lateral estilo menu - laranja */}
      <div 
        className={cn(
          "chat-tab", 
          chatOpen && "chat-open",
          shouldPulse && "chat-tab-pulse"
        )}
        onClick={handleChatClick}
      >
        <MessageCircle className="w-3 h-3" />
        {shouldPulse && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full" />
        )}
      </div>

      {/* Panel - abre como menu lateral do lado direito */}
      <ChatInternoPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}
