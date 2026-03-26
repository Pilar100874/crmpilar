import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Send, Loader2, Wand2, Check, RotateCcw, FileText, Play, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { parseAgentTableData, AgentTableRenderer } from '@/components/chat/AgentTableRenderer';

interface RulesAssistantChatProps {
  currentRules: string;
  onApplyRules: (rules: string) => void;
  agentSystemPrompt?: string;
  agentName?: string;
  agentId?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  type?: 'normal' | 'feedback' | 'simulation';
}

export default function RulesAssistantChat({ currentRules, onApplyRules, agentSystemPrompt, agentName, agentId }: RulesAssistantChatProps) {
  const [activeTab, setActiveTab] = useState<string>('criar');
  
  const [createMessages, setCreateMessages] = useState<ChatMessage[]>([]);
  const [createInput, setCreateInput] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [extractedRules, setExtractedRules] = useState<string | null>(null);
  
  const [simMessages, setSimMessages] = useState<ChatMessage[]>([]);
  const [simInput, setSimInput] = useState('');
  const [simLoading, setSimLoading] = useState(false);
  const [feedbackMode, setFeedbackMode] = useState(false);
  const [simExtractedRules, setSimExtractedRules] = useState<string | null>(null);
  
  const scrollCreateRef = useRef<HTMLDivElement>(null);
  const scrollSimRef = useRef<HTMLDivElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);
  const simInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (createMessages.length === 0) {
      setCreateMessages([{
        role: 'assistant',
        content: currentRules
          ? 'Olá! Vejo que já existem regras configuradas. Posso ajudar a **modificar**, **adicionar novas regras** ou **criar do zero**. O que prefere?'
          : 'Olá! Vou te ajudar a criar as **regras de busca** para este agente. Me conte: qual é o tipo de produto que seus clientes costumam buscar?'
      }]);
    }
  }, []);

  useEffect(() => {
    if (simMessages.length === 0) {
      setSimMessages([{
        role: 'assistant',
        content: `🧪 **Modo Simulação**\n\nAqui você testa o agente${agentName ? ` "${agentName}"` : ''} com dados reais e as regras atuais.\n\n1. **Simule** uma pergunta como seu cliente faria\n2. Veja a resposta com dados reais do estoque/catálogo\n3. Se algo não estiver certo, clique em **⚠️ Reportar Problema**\n4. As regras serão atualizadas automaticamente!\n\n${!agentId ? '⚠️ **Salve o agente primeiro** para poder simular com dados reais.' : '💬 Faça uma pergunta para começar...'}`
      }]);
    }
  }, []);

  useEffect(() => {
    scrollCreateRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [createMessages]);

  useEffect(() => {
    scrollSimRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [simMessages]);

  const extractRulesFromResponse = (text: string): string | null => {
    const match = text.match(/<!--RULES_START-->([\s\S]*?)<!--RULES_END-->/);
    return match ? match[1].trim() : null;
  };

  const cleanDisplayContent = (text: string): string => {
    return text.replace(/<!--RULES_START-->[\s\S]*?<!--RULES_END-->/, '').trim();
  };

  // === CREATE MODE ===
  const sendCreateMessage = async () => {
    if (!createInput.trim() || createLoading) return;
    const userMsg: ChatMessage = { role: 'user', content: createInput.trim() };
    const newMessages = [...createMessages, userMsg];
    setCreateMessages(newMessages);
    setCreateInput('');
    setCreateLoading(true);

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
      if (rules) setExtractedRules(rules);
      const displayContent = cleanDisplayContent(resposta);
      setCreateMessages(prev => [...prev, { role: 'assistant', content: displayContent || 'Regras geradas! Clique em "Aplicar Regras" para salvar.' }]);
    } catch (err) {
      console.error('Erro:', err);
      toast.error('Erro ao comunicar com a IA');
    } finally {
      setCreateLoading(false);
      createInputRef.current?.focus();
    }
  };

  // === SIMULATE MODE ===
  const sendSimMessage = async () => {
    if (!simInput.trim() || simLoading) return;
    const inputText = simInput.trim();
    setSimInput('');
    setSimLoading(true);

    if (feedbackMode) {
      // Feedback mode: send problem description to rules generator for correction
      const feedbackMsg: ChatMessage = { role: 'user', content: `⚠️ **Problema reportado:** ${inputText}`, type: 'feedback' };
      setSimMessages(prev => [...prev, feedbackMsg]);
      setFeedbackMode(false);

      try {
        const lastSimExchanges = simMessages.filter(m => m.type === 'simulation').slice(-6);
        const simulationContext = lastSimExchanges.map(m => `${m.role === 'user' ? 'Cliente' : 'Agente'}: ${m.content}`).join('\n');

        const { data, error } = await supabase.functions.invoke('generate-agent-search-rules', {
          body: {
            messages: [{
              role: 'user',
              content: `Analise a seguinte simulação de atendimento e o problema reportado. Atualize as regras para corrigir o comportamento.

REGRAS ATUAIS:
${currentRules || '(nenhuma)'}

SIMULAÇÃO (dados reais do estoque):
${simulationContext}

PROBLEMA REPORTADO PELO USUÁRIO:
${inputText}

Gere as regras corrigidas COMPLETAS entre <!--RULES_START--> e <!--RULES_END-->. Explique brevemente o que mudou.`
            }],
            regras_atuais: currentRules || null,
            modo: 'refinar',
          },
        });

        if (error) throw error;
        const resposta = data?.resposta || 'Erro ao processar.';
        const rules = extractRulesFromResponse(resposta);
        if (rules) setSimExtractedRules(rules);
        const displayContent = cleanDisplayContent(resposta);
        setSimMessages(prev => [...prev, {
          role: 'assistant',
          content: displayContent || '✅ Regras atualizadas! Clique em "Aplicar Regras" para salvar.',
          type: 'feedback'
        }]);
      } catch (err) {
        console.error('Erro:', err);
        toast.error('Erro ao gerar correção das regras');
      } finally {
        setSimLoading(false);
        simInputRef.current?.focus();
      }
      return;
    }

    // Normal simulation: use chat-agent-execute with REAL data
    if (!agentId) {
      toast.error('Salve o agente primeiro para simular com dados reais');
      setSimLoading(false);
      return;
    }

    const userMsg: ChatMessage = { role: 'user', content: inputText, type: 'simulation' };
    const newSimMessages = [...simMessages, userMsg];
    setSimMessages(newSimMessages);

    try {
      // Build history for the agent execute function
      const simHistory = newSimMessages
        .filter(m => m.type === 'simulation')
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }));

      const { data, error } = await supabase.functions.invoke('chat-agent-execute', {
        body: {
          agent_id: agentId,
          mensagem_cliente: inputText,
          historico_chat: simHistory.slice(0, -1), // exclude current message
          modo_privado: true,
        },
      });

      if (error) throw error;
      const resposta = data?.resposta || 'Erro ao processar simulação.';
      setSimMessages(prev => [...prev, { role: 'assistant', content: resposta, type: 'simulation' }]);
    } catch (err) {
      console.error('Erro simulação:', err);
      toast.error('Erro na simulação');
    } finally {
      setSimLoading(false);
      simInputRef.current?.focus();
    }
  };

  const handleApplyRules = (rules: string, setter: (v: string | null) => void) => {
    onApplyRules(rules);
    toast.success('Regras aplicadas! Não esqueça de salvar o agente.');
    setter(null);
  };

  const handleResetCreate = () => {
    setCreateMessages([{
      role: 'assistant',
      content: 'Conversa reiniciada. Me conte sobre seu negócio e os produtos que seus clientes buscam.'
    }]);
    setExtractedRules(null);
  };

  const handleResetSim = () => {
    setSimMessages([{
      role: 'assistant',
      content: `🧪 **Simulação reiniciada**\n\nFaça uma pergunta como seu cliente faria para testar as regras atuais com dados reais.`
    }]);
    setSimExtractedRules(null);
    setFeedbackMode(false);
  };

  const renderMessageContent = (msg: ChatMessage) => {
    // For simulation assistant messages, try to parse table data like the real chat
    if (msg.role === 'assistant' && msg.type === 'simulation') {
      const parsed = parseAgentTableData(msg.content);
      if (parsed) {
        return (
          <>
            {parsed.text && (
              <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5">
                <ReactMarkdown>{parsed.text}</ReactMarkdown>
              </div>
            )}
            {parsed.tableData && <AgentTableRenderer data={parsed.tableData} />}
          </>
        );
      }
    }

    return (
      <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5">
        <ReactMarkdown>{msg.content}</ReactMarkdown>
      </div>
    );
  };

  const renderMessages = (messages: ChatMessage[], scrollRef: React.RefObject<HTMLDivElement>, loading: boolean) => (
    <ScrollArea className="flex-1 p-3">
      <div className="space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn(
              "max-w-[90%] rounded-lg px-3 py-2 text-sm",
              msg.role === 'user'
                ? msg.type === 'feedback'
                  ? 'bg-orange-500 text-white'
                  : 'bg-primary text-primary-foreground'
                : msg.type === 'feedback'
                  ? 'bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800'
                  : 'bg-muted'
            )}>
              {renderMessageContent(msg)}
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
  );

  const renderRulesPreview = (rules: string | null, onApply: () => void) => {
    if (!rules) return null;
    return (
      <div className="px-3 py-2 border-t bg-green-500/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-3 w-3 text-green-600" />
            <span className="text-xs font-medium text-green-600">Regras prontas para aplicar</span>
          </div>
          <Button size="sm" variant="default" onClick={onApply} className="h-7 text-xs gap-1">
            <Check className="h-3 w-3" />
            Aplicar Regras
          </Button>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{rules.substring(0, 150)}...</p>
      </div>
    );
  };

  return (
    <div className="flex flex-col border rounded-lg overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col">
        <div className="flex items-center justify-between px-3 py-1 border-b bg-muted/30">
          <TabsList className="h-8">
            <TabsTrigger value="criar" className="text-xs gap-1.5 h-7 px-3">
              <Wand2 className="h-3.5 w-3.5" />
              Criar Regras
            </TabsTrigger>
            <TabsTrigger value="simular" className="text-xs gap-1.5 h-7 px-3">
              <Play className="h-3.5 w-3.5" />
              Simular & Refinar
            </TabsTrigger>
          </TabsList>
          <Button size="sm" variant="ghost" onClick={activeTab === 'criar' ? handleResetCreate : handleResetSim} className="h-7 text-xs gap-1">
            <RotateCcw className="h-3 w-3" />
          </Button>
        </div>

        <TabsContent value="criar" className="mt-0 flex flex-col h-[400px]">
          {renderMessages(createMessages, scrollCreateRef, createLoading)}
          {renderRulesPreview(extractedRules, () => handleApplyRules(extractedRules!, setExtractedRules))}
          <div className="flex gap-2 p-3 border-t">
            <Input
              ref={createInputRef}
              value={createInput}
              onChange={e => setCreateInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendCreateMessage()}
              placeholder="Descreva seu negócio e regras..."
              disabled={createLoading}
              className="text-sm"
            />
            <Button size="icon" onClick={sendCreateMessage} disabled={createLoading || !createInput.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="simular" className="mt-0 flex flex-col h-[450px]">
          {renderMessages(simMessages, scrollSimRef, simLoading)}
          {renderRulesPreview(simExtractedRules, () => handleApplyRules(simExtractedRules!, setSimExtractedRules))}
          
          <div className="relative flex gap-2 p-3 border-t">
            {feedbackMode && (
              <div className="absolute -top-8 left-0 right-0 px-3">
                <div className="bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 text-xs px-3 py-1.5 rounded-t-lg flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3" />
                  Descreva o que deveria ser diferente na resposta acima
                  <Button size="sm" variant="ghost" className="h-5 text-xs ml-auto px-2" onClick={() => setFeedbackMode(false)}>✕</Button>
                </div>
              </div>
            )}
            <Input
              ref={simInputRef}
              value={simInput}
              onChange={e => setSimInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendSimMessage()}
              placeholder={feedbackMode ? "Ex: Deveria manter os filtros anteriores..." : "Simule uma pergunta do cliente..."}
              disabled={simLoading || (!agentId && !feedbackMode)}
              className={cn("text-sm", feedbackMode && "border-orange-300 focus-visible:ring-orange-400")}
            />
            {!feedbackMode && simMessages.some(m => m.type === 'simulation' && m.role === 'assistant') && (
              <Button
                size="icon"
                variant="outline"
                onClick={() => setFeedbackMode(true)}
                className="shrink-0 text-orange-500 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                title="Reportar problema na resposta"
              >
                <AlertTriangle className="h-4 w-4" />
              </Button>
            )}
            <Button size="icon" onClick={sendSimMessage} disabled={simLoading || !simInput.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
