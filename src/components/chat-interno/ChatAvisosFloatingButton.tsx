import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
      {/* Floating Button */}
      <div className="fixed bottom-4 right-4 z-40">
        <Button
          size="lg"
          className={cn(
            'h-12 w-12 rounded-full shadow-lg',
            chatOpen && 'bg-primary/80'
          )}
          onClick={handleChatClick}
        >
          {chatOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <MessageCircle className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Panel */}
      <ChatInternoPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}
