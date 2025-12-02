import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Bell, X } from 'lucide-react';
import { ChatInternoPanel } from './ChatInternoPanel';
import { AvisosPanel } from '../avisos/AvisosPanel';
import { useAvisosSistema } from '@/hooks/useAvisosSistema';
import { cn } from '@/lib/utils';

export function ChatAvisosFloatingButton() {
  const [chatOpen, setChatOpen] = useState(false);
  const [avisosOpen, setAvisosOpen] = useState(false);
  const { avisosPendentes } = useAvisosSistema();

  const handleChatClick = () => {
    setChatOpen(!chatOpen);
    if (avisosOpen) setAvisosOpen(false);
  };

  const handleAvisosClick = () => {
    setAvisosOpen(!avisosOpen);
    if (chatOpen) setChatOpen(false);
  };

  return (
    <>
      {/* Floating Buttons */}
      <div className="fixed bottom-4 right-4 flex items-center gap-2 z-40">
        {/* Chat Button */}
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

        {/* Avisos Button */}
        <Button
          size="lg"
          variant="secondary"
          className={cn(
            'h-12 w-12 rounded-full shadow-lg relative',
            avisosOpen && 'bg-secondary/80'
          )}
          onClick={handleAvisosClick}
        >
          {avisosOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <>
              <Bell className="h-5 w-5" />
              {avisosPendentes > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {avisosPendentes > 9 ? '9+' : avisosPendentes}
                </Badge>
              )}
            </>
          )}
        </Button>
      </div>

      {/* Panels */}
      <ChatInternoPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} />
      <AvisosPanel isOpen={avisosOpen} onClose={() => setAvisosOpen(false)} />
    </>
  );
}
