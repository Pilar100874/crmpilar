import { useState } from 'react';
import { MessageCircle, Video } from 'lucide-react';
import { ChatInternoPanel } from './ChatInternoPanel';
import { useChatInternoContext } from '@/contexts/ChatInternoContext';
import { cn } from '@/lib/utils';

export function ChatAvisosFloatingButton() {
  const [chatOpen, setChatOpen] = useState(false);
  const { totalNaoLidas, videoChamadaPendente } = useChatInternoContext();

  const handleChatClick = () => {
    setChatOpen(!chatOpen);
  };

  // Determina se deve pulsar: tem mensagens não lidas e chat está fechado
  const shouldPulse = totalNaoLidas > 0 && !chatOpen;
  
  // Determina se há videochamada pendente
  const hasVideoChamada = !!videoChamadaPendente && !chatOpen;

  return (
    <>
      {/* Aba lateral estilo menu - laranja */}
      <div 
        className={cn(
          "chat-tab", 
          chatOpen && "chat-open",
          (shouldPulse || hasVideoChamada) && "chat-tab-pulse"
        )}
        onClick={handleChatClick}
      >
        {hasVideoChamada ? (
          <Video className="w-3 h-3 text-green-400 animate-pulse" />
        ) : (
          <MessageCircle className="w-3 h-3" />
        )}
        {(shouldPulse || hasVideoChamada) && (
          <span className={cn(
            "absolute -top-1 -right-1 w-2 h-2 rounded-full",
            hasVideoChamada ? "bg-green-500 animate-ping" : "bg-destructive"
          )} />
        )}
      </div>

      {/* Panel - abre como menu lateral do lado direito */}
      <ChatInternoPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}
