import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Send, Loader2, Wand2, Check, RotateCcw, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RulesAssistantChatProps {
  currentRules: string;
  onApplyRules: (rules: string) => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function RulesAssistantChat({ currentRules, onApplyRules }: RulesAssistantChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [extractedRules, setExtractedRules] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (messages.length === 0) {
      // Initial greeting
      setMessages([{
        role: 'assistant',
        content: currentRules
          ? 'Olá! Vejo que já existem regras configuradas. Posso ajudar a **modificar**, **adicionar novas regras** ou **criar do zero**. O que prefere?'
          : 'Olá! Vou te ajudar a criar as **regras de busca** para este agente. Me conte: qual é o tipo de produto que seus clientes costumam buscar? (ex: papéis, bobinas, tecidos, peças, etc.)'
      }]);
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const extractRulesFromResponse = (text: string): string | null => {
    const match = text.match(/<!--RULES_START-->([\s\S]*?)<!--RULES_END-->/);
    return match ? match[1].trim() : null;
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-agent-search-rules', {
        body: {
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          regras_atuais: currentRules || null,
        },
      });

      if (error) throw error;

      const resposta = data?.resposta || 'Erro ao processar.';
      const rules = extractRulesFromResponse(resposta);
      
      if (rules) {
        setExtractedRules(rules);
      }

      // Clean the response for display (remove rule tags)
      const displayContent = resposta
        .replace(/<!--RULES_START-->[\s\S]*?<!--RULES_END-->/, '')
        .trim();

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: displayContent || 'Regras geradas! Clique em "Aplicar Regras" para salvar.',
      }]);
    } catch (err: any) {
      console.error('Erro:', err);
      toast.error('Erro ao comunicar com a IA');
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleApplyRules = () => {
    if (extractedRules) {
      onApplyRules(extractedRules);
      toast.success('Regras aplicadas! Não esqueça de salvar o agente.');
      setExtractedRules(null);
    }
  };

  const handleReset = () => {
    setMessages([{
      role: 'assistant',
      content: 'Conversa reiniciada. Me conte sobre seu negócio e os produtos que seus clientes buscam.'
    }]);
    setExtractedRules(null);
  };

  return (
    <div className="flex flex-col h-[400px] border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Assistente de Regras</span>
        </div>
        <div className="flex gap-1">
          {extractedRules && (
            <Button size="sm" variant="default" onClick={handleApplyRules} className="h-7 text-xs gap-1">
              <Check className="h-3 w-3" />
              Aplicar Regras
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={handleReset} className="h-7 text-xs gap-1">
            <RotateCcw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={cn(
              "flex",
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            )}>
              <div className={cn(
                "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              )}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Extracted rules preview */}
      {extractedRules && (
        <div className="px-3 py-2 border-t bg-green-500/5">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-3 w-3 text-green-600" />
            <span className="text-xs font-medium text-green-600">Regras prontas para aplicar</span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{extractedRules.substring(0, 150)}...</p>
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 p-3 border-t">
        <Input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Descreva seu negócio e regras..."
          disabled={loading}
          className="text-sm"
        />
        <Button size="icon" onClick={sendMessage} disabled={loading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
