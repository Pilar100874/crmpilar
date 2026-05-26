import { useEffect, useState } from 'react';
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

  // Swipe da borda direita para abrir o chat interno (mobile/tablet)
  useEffect(() => {
    if (window.innerWidth > 1024) return;
    let startX = 0;
    let startY = 0;
    let tracking = false;
    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      if (window.innerWidth - t.clientX <= 24 && !chatOpen) {
        startX = t.clientX;
        startY = t.clientY;
        tracking = true;
      }
    };
    const onMove = (e: TouchEvent) => {
      if (!tracking) return;
      const t = e.touches[0];
      if (!t) return;
      const dx = startX - t.clientX;
      const dy = Math.abs(t.clientY - startY);
      if (dx > 50 && dy < 40) {
        setChatOpen(true);
        tracking = false;
      }
    };
    const onEnd = () => { tracking = false; };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [chatOpen]);

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
