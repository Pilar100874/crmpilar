import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Send, X, Copy, MessageSquare, Eye, BotMessageSquare, Pause, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/lib/toast-config';
import type { ChatAgent } from '@/hooks/useChatAgents';
import { parseAgentTableData, AgentTableRenderer } from '@/components/chat/AgentTableRenderer';

interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

interface AgentChatPanelProps {
  agent: ChatAgent;
  messages: AgentMessage[];
  onSendMessage: (text: string) => void;
  onSendToClient: (text: string) => void;
  onClose: () => void;
  isLoading: boolean;
  clientMessages?: Array<{ sender: string; text: string; created_at: string }>;
  isClientAgentActive?: boolean;
  onActivateClientAgent?: () => void;
  onDeactivateClientAgent?: () => void;
  onInsertToClientChat?: (text: string) => void;
  onSendFileToClient?: (fileUrl: string, fileName: string) => void;
  lastClientMessage?: string;
}

export function AgentChatPanel({
  agent,
  messages,
  onSendMessage,
  onSendToClient,
  onClose,
  isLoading,
  clientMessages = [],
  isClientAgentActive = false,
  onActivateClientAgent,
  onDeactivateClientAgent,
  onInsertToClientChat,
  onSendFileToClient,
  lastClientMessage,
}: AgentChatPanelProps) {
  const [input, setInput] = useState('');
  const [showClientContext, setShowClientContext] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Resposta copiada!");
  };

  const agentColor = agent.cor || '#6366f1';
  const lastClientMessages = clientMessages.slice(-10);

  return (
    <Card
      className="mb-3 rounded-2xl overflow-hidden border"
      style={{ borderColor: agentColor + '40', background: agentColor + '05' }}
    >
      {/* Header */}
      <div
        className="px-4 py-2.5 border-b flex items-center justify-between"
        style={{ borderColor: agentColor + '20', background: agentColor + '10' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-base"
            style={{ backgroundColor: agentColor + '25' }}
          >
            {agent.icone}
          </div>
          <div>
            <span className="text-sm font-semibold" style={{ color: agentColor }}>
              {agent.nome}
            </span>
            <Badge variant="outline" className="ml-2 text-[9px] py-0" style={{ borderColor: agentColor + '40', color: agentColor }}>
              Agente IA
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Activate/Deactivate client agent button */}
          {agent.permite_cliente && (
            isClientAgentActive ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={onDeactivateClientAgent}
                className="h-7 text-xs gap-1 rounded-full flex-shrink-0 bg-destructive/10 text-destructive hover:bg-destructive/20"
              >
                <Pause className="h-3 w-3" />
                Suspender auto-resposta
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={onActivateClientAgent}
                className="h-7 text-xs gap-1 rounded-full flex-shrink-0 text-white hover:opacity-90"
                style={{ backgroundColor: agentColor }}
              >
                <BotMessageSquare className="h-3 w-3" />
                Ativar para cliente
              </Button>
            )
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowClientContext(!showClientContext)}
            className="h-7 text-xs gap-1 rounded-full flex-shrink-0"
            style={{ color: agentColor }}
          >
            <Eye className="h-3 w-3" />
            {showClientContext ? "Ocultar" : "Ver cliente"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="h-7 w-7 p-0 rounded-full hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Active agent indicator */}
      {isClientAgentActive && (
        <div className="px-4 py-1.5 text-[11px] font-medium flex items-center gap-1.5" style={{ backgroundColor: agentColor + '15', color: agentColor }}>
          <div className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: agentColor }} />
          Respondendo automaticamente ao cliente
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Client context panel */}
        {showClientContext && lastClientMessages.length > 0 && (
          <div className="p-3 bg-muted/50 rounded-xl border border-border/50 space-y-2 max-h-40 overflow-y-auto">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              💬 Últimas mensagens do cliente
            </p>
            {lastClientMessages.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  "text-xs px-2 py-1 rounded-lg max-w-[90%]",
                  msg.sender === 'customer'
                    ? 'bg-blue-50 text-blue-800 border border-blue-100'
                    : 'bg-gray-50 text-gray-700 border border-gray-100 ml-auto'
                )}
              >
                <span className="font-medium text-[10px]">
                  {msg.sender === 'customer' ? '👤 Cliente' : '🧑‍💼 Atendente'}:
                </span>{' '}
                {msg.text.length > 200 ? msg.text.slice(0, 200) + '...' : msg.text}
              </div>
            ))}
          </div>
        )}

        {/* Agent Messages */}
        <div
          ref={scrollRef}
          className="max-h-64 overflow-y-auto overscroll-contain space-y-2 px-1"
        >
          {messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="text-3xl mb-2">{agent.icone}</div>
              <p className="text-xs">Converse com <strong>{agent.nome}</strong></p>
              <p className="text-[10px] mt-1 opacity-70">
                O contexto da conversa do cliente será incluído automaticamente.
              </p>
              {agent.permite_cliente && (
                <p className="text-[10px] mt-1 opacity-50">
                  Use "Ativar para cliente" para respostas automáticas.
                </p>
              )}
            </div>
          ) : (
            messages.map((msg, idx) => {
              const parsed = msg.role === 'assistant' ? parseAgentTableData(msg.content) : null;
              return (
              <div
                key={idx}
                className={cn("group relative flex gap-2", msg.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {msg.role === 'assistant' && (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-sm"
                    style={{ backgroundColor: agentColor + '20' }}
                  >
                    {agent.icone}
                  </div>
                )}

                <div
                  className={cn(
                    "relative max-w-[85%] px-3 py-2 rounded-2xl transition-all",
                    msg.role === 'user'
                      ? 'text-white shadow-sm'
                      : 'bg-card border border-border shadow-sm'
                  )}
                  style={msg.role === 'user' ? { backgroundColor: agentColor } : undefined}
                >
                  <p className="whitespace-pre-wrap break-words text-[13px] leading-snug">
                    {parsed ? parsed.text : msg.content}
                  </p>
                  {parsed?.tableData && (
                    <AgentTableRenderer
                      data={parsed.tableData}
                      onSendToClient={agent.permite_cliente ? onSendToClient : undefined}
                      onInsertToClientChat={onInsertToClientChat}
                    />
                  )}

                  {msg.role === 'assistant' && (
                    <div className="flex gap-1 mt-2 pt-1 border-t border-border/30">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 text-[10px] px-1.5 gap-1"
                        onClick={() => handleCopy(msg.content)}
                      >
                        <Copy className="h-3 w-3" /> Copiar
                      </Button>
                      {onInsertToClientChat && (
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 text-[10px] px-1.5 gap-1"
                                style={{ color: agentColor }}
                                onClick={() => onInsertToClientChat(msg.content)}
                              >
                                <ArrowUp className="h-3 w-3" /> Chat
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Inserir no chat do cliente</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {agent.permite_cliente && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 text-[10px] px-1.5 gap-1 text-white hover:text-white"
                          style={{ backgroundColor: agentColor }}
                          onClick={() => onSendToClient(msg.content)}
                        >
                          <Send className="h-3 w-3" /> Enviar ao cliente
                        </Button>
                      )}
                    </div>
                  )}

                  <span className={cn("text-[10px] mt-1 block", msg.role === 'user' ? 'text-white/70' : 'text-muted-foreground')}>
                    {format(msg.timestamp || new Date(), "HH:mm", { locale: ptBR })}
                  </span>
                </div>

                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <MessageSquare className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
              </div>
              );
            })
          )}
          {isLoading && (
            <div className="flex justify-start gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-sm"
                style={{ backgroundColor: agentColor + '20' }}
              >
                {agent.icone}
              </div>
              <div className="bg-muted rounded-2xl px-3 py-2 text-sm flex items-center gap-2 text-muted-foreground">
                <div className="h-3 w-3 border-2 rounded-full animate-spin" style={{ borderColor: agentColor, borderTopColor: 'transparent' }} />
                Pensando...
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex items-center gap-1.5">
          {lastClientMessage && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-9 w-9 shrink-0 rounded-full border-border/50"
                    onClick={() => setInput(prev => prev ? prev + '\n' + lastClientMessage : lastClientMessage)}
                  >
                    <ArrowDown className="h-4 w-4" style={{ color: agentColor }} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Puxar última msg do cliente</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={`Pergunte ao ${agent.nome}...`}
            className="flex-1 min-h-[44px] max-h-[120px] text-sm resize-none rounded-full px-4"
            style={{ paddingTop: '12px', paddingBottom: '12px' }}
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-11 w-11 shrink-0 rounded-full"
            style={{ backgroundColor: agentColor }}
          >
            {isLoading ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="h-4 w-4 text-white" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
