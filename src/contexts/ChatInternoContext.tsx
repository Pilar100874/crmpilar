import { createContext, useContext, ReactNode } from 'react';
import { useChatInterno } from '@/hooks/useChatInterno';

type ChatInternoContextType = ReturnType<typeof useChatInterno>;

const ChatInternoContext = createContext<ChatInternoContextType | null>(null);

export function ChatInternoProvider({ children }: { children: ReactNode }) {
  const chatInterno = useChatInterno();
  
  return (
    <ChatInternoContext.Provider value={chatInterno}>
      {children}
    </ChatInternoContext.Provider>
  );
}

export function useChatInternoContext() {
  const context = useContext(ChatInternoContext);
  if (!context) {
    throw new Error('useChatInternoContext must be used within a ChatInternoProvider');
  }
  return context;
}
