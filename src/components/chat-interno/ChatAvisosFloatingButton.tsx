import { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { ChatInternoPanel } from './ChatInternoPanel';
import { cn } from '@/lib/utils';

export function ChatAvisosFloatingButton() {
  const [chatOpen, setChatOpen] = useState(false);

  const handleChatClick = () => {
    setChatOpen(!chatOpen);
  };

  return (
    <>
      {/* Floating Button - estilo similar ao menu recolhível, lado esquerdo */}
      <div className="fixed bottom-20 left-0 z-40">
        <button
          onClick={handleChatClick}
          className={cn(
            'flex items-center justify-center',
            'w-10 h-10 rounded-r-lg',
            'bg-sidebar border border-l-0 border-sidebar-border',
            'shadow-lg hover:bg-sidebar-accent transition-colors',
            'text-sidebar-foreground/70 hover:text-sidebar-foreground',
            chatOpen && 'bg-sidebar-accent text-sidebar-foreground'
          )}
          title="Chat Interno"
        >
          {chatOpen ? (
            <X className="h-4 w-4" />
          ) : (
            <MessageCircle className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Panel */}
      <ChatInternoPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}
