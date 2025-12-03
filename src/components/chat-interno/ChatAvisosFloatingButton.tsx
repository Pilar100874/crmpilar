import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { ChatInternoPanel } from './ChatInternoPanel';

export function ChatAvisosFloatingButton() {
  const [chatOpen, setChatOpen] = useState(false);

  const handleChatClick = () => {
    setChatOpen(!chatOpen);
  };

  return (
    <>
      {/* Aba lateral estilo menu - laranja */}
      <div 
        className="chat-tab"
        onClick={handleChatClick}
      >
        <MessageCircle className="w-3 h-3" />
      </div>

      {/* Panel - abre como menu lateral */}
      <ChatInternoPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}
