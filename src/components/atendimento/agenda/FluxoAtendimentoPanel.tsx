import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Phone, MessageSquare, Mail, Users, CalendarIcon, 
  ChevronLeft, ChevronRight, Check, Mic, MicOff, 
  Loader2, AlertCircle, X, Play, Clock, FileText, Building2,
  Send, ChevronDown, ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CustomerHistoryTimeline } from "./CustomerHistoryTimeline";
import { EmbeddedChatPanel } from "./EmbeddedChatPanel";
import { EmbeddedEmailPanel } from "./EmbeddedEmailPanel";

interface Task {
  id: string;
  contact_name: string;
  title: string;
  description?: string;
  date: string;
  time?: string;
  origem: string;
  status: string;
  contact_id?: string;
  customers?: {
    id?: string;
    nome?: string;
    email?: string;
    telefone?: string;
  };
}

interface AtendimentoFlag {
  id: string;
  nome: string;
  cor: string;
}

interface ConfigProximaData {
  tipo_contato: string;
  dias_padrao: number;
}

interface FluxoAtendimentoPanelProps {
  tasks: Task[];
  estabelecimentoId: string;
  usuarioId: string;
  onTaskCompleted: () => void;
  onClose: () => void;
  onCurrentTaskChange?: (task: Task | null) => void;
  showDetails?: boolean;
  onToggleDetails?: () => void;
  initialTaskIndex?: number;
  onNavigateToItem?: (type: 'chat' | 'orcamento' | 'email', id: string) => void;
}

const TIPOS_CONTATO = [
  { id: 'telefone', label: 'Telefone', icon: Phone },
  { id: 'whatsapp', label: 'Chats', icon: MessageSquare },
  { id: 'email', label: 'E-mail', icon: Mail },
  { id: 'presencial', label: 'Presencial', icon: Users },
];

export function FluxoAtendimentoPanel({
  tasks,
  estabelecimentoId,
  usuarioId,
  onTaskCompleted,
  onClose,
  onCurrentTaskChange,
  showDetails,
  onToggleDetails,
  initialTaskIndex = 0,
  onNavigateToItem
}: FluxoAtendimentoPanelProps) {
  const [currentIndex, setCurrentIndex] = useState(initialTaskIndex);
  const [flags, setFlags] = useState<AtendimentoFlag[]>([]);
  const [configDatas, setConfigDatas] = useState<ConfigProximaData[]>([]);
  const [selectedFlag, setSelectedFlag] = useState<string | null>(null);
  const [observacao, setObservacao] = useState("");
  const [tipoContato, setTipoContato] = useState<string>("telefone");
  const [proximaData, setProximaData] = useState<Date>(addDays(new Date(), 3));
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Estados para área de contato expandida
  const [showContactArea, setShowContactArea] = useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [isSendingContact, setIsSendingContact] = useState(false);

  const currentTask = tasks[currentIndex];
  const isLastTask = currentIndex === tasks.length - 1;
  const progress = tasks.length > 0 ? ((currentIndex + 1) / tasks.length) * 100 : 0;

  // Reset to initialTaskIndex when it changes
  useEffect(() => {
    setCurrentIndex(initialTaskIndex);
  }, [initialTaskIndex]);

  useEffect(() => {
    if (estabelecimentoId) {
      loadFlags();
      loadConfigDatas();
    }
  }, [estabelecimentoId]);

  useEffect(() => {
    const config = configDatas.find(c => c.tipo_contato === tipoContato);
    if (config) {
      setProximaData(addDays(new Date(), config.dias_padrao));
    }
  }, [tipoContato, configDatas]);

  useEffect(() => {
    setSelectedFlag(null);
    setObservacao("");
    setShowContactArea(false);
    setContactMessage("");
    setEmailSubject("");
  }, [currentIndex]);

  // Notify parent of current task changes
  useEffect(() => {
    onCurrentTaskChange?.(currentTask || null);
  }, [currentTask, onCurrentTaskChange]);

  const loadFlags = async () => {
    const { data } = await supabase
      .from('atendimento_flags')
      .select('*')
      .eq('estabelecimento_id', estabelecimentoId)
      .eq('ativo', true)
      .order('ordem');
    
    if (data) setFlags(data);
  };

  const loadConfigDatas = async () => {
    const { data } = await supabase
      .from('atendimento_config_proxima_data')
      .select('tipo_contato, dias_padrao')
      .eq('estabelecimento_id', estabelecimentoId);
    
    if (data) setConfigDatas(data);
  };

  const recognitionRef = useRef<any>(null);

  const startVoiceRecording = async () => {
    try {
      // Check for Web Speech API support
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        toast.error('Reconhecimento de voz não suportado neste navegador');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = true;
      recognition.interimResults = true;

      let finalTranscript = '';

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Update observation with final transcript
        if (finalTranscript) {
          setObservacao(prev => prev ? `${prev} ${finalTranscript.trim()}` : finalTranscript.trim());
          finalTranscript = '';
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          toast.error('Permissão de microfone negada');
        } else {
          toast.error('Erro no reconhecimento de voz');
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
      toast.success('Gravação iniciada - fale agora');
    } catch (err) {
      console.error('Error starting voice recording:', err);
      toast.error('Não foi possível iniciar o reconhecimento de voz');
    }
  };

  const stopVoiceRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsRecording(false);
      toast.success('Gravação finalizada');
    }
  };

  // Função para enviar mensagem/email via recurso correspondente
  const handleSendContact = async () => {
    if (!currentTask || !contactMessage.trim()) {
      toast.error("Digite uma mensagem");
      return;
    }

    const customerEmail = currentTask.customers?.email;
    const customerPhone = currentTask.customers?.telefone;

    if (tipoContato === 'email' && !customerEmail) {
      toast.error("Este contato não possui email cadastrado");
      return;
    }

    if (tipoContato === 'whatsapp' && !customerPhone) {
      toast.error("Este contato não possui telefone cadastrado");
      return;
    }

    setIsSendingContact(true);
    try {
      if (tipoContato === 'email') {
        // Simular envio de email - pode ser substituído por integração real
        console.log('Enviando email para:', customerEmail, 'Assunto:', emailSubject, 'Mensagem:', contactMessage);
        toast.success(`Email enviado para ${customerEmail}`);
      } else if (tipoContato === 'whatsapp') {
        // Abrir WhatsApp com mensagem pré-preenchida
        const whatsappUrl = `https://wa.me/${customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(contactMessage)}`;
        window.open(whatsappUrl, '_blank');
        toast.success(`WhatsApp aberto para ${customerPhone}`);
      }

      // Limpar campos após envio
      setContactMessage("");
      setEmailSubject("");
      setShowContactArea(false);
    } catch (error) {
      console.error('Erro ao enviar:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setIsSendingContact(false);
    }
  };

  // Verificar se o tipo de contato tem recurso disponível
  const hasContactResource = (tipo: string) => {
    if (tipo === 'email') return !!currentTask?.customers?.email;
    if (tipo === 'whatsapp') return !!currentTask?.customers?.telefone;
    return false;
  };

  const canProceed = selectedFlag !== null && proximaData !== null;

  const handleSaveAndNext = async () => {
    if (!canProceed || !currentTask) return;

    setIsSaving(true);
    try {
      const { error: registroError } = await supabase
        .from('atendimento_registros')
        .insert({
          tarefa_id: currentTask.id,
          estabelecimento_id: estabelecimentoId,
          usuario_id: usuarioId,
          tipo_contato: tipoContato,
          flag_id: selectedFlag,
          observacao: observacao || null,
          data_proximo_contato: format(proximaData, 'yyyy-MM-dd'),
          envio_massa: false
        });

      if (registroError) throw registroError;

      const { error: tarefaError } = await supabase
        .from('calendario_tarefas')
        .update({ 
          status: 'concluido',
          updated_at: new Date().toISOString()
        })
        .eq('id', currentTask.id);

      if (tarefaError) throw tarefaError;

      const { error: novaTarefaError } = await supabase
        .from('calendario_tarefas')
        .insert({
          user_id: usuarioId,
          estabelecimento_id: estabelecimentoId,
          contact_id: currentTask.contact_id,
          contact_name: currentTask.contact_name,
          title: `Retorno: ${currentTask.title}`,
          description: `Último contato: ${format(new Date(), 'dd/MM/yyyy')} - ${flags.find(f => f.id === selectedFlag)?.nome || ''}${observacao ? ` - ${observacao}` : ''}`,
          date: format(proximaData, 'yyyy-MM-dd'),
          origem: currentTask.origem,
          status: 'pendente',
          data_original: currentTask.date
        });

      if (novaTarefaError) throw novaTarefaError;

      onTaskCompleted();

      if (isLastTask) {
        toast.success('Fluxo de atendimento concluído!');
        onClose();
      } else {
        setCurrentIndex(prev => prev + 1);
        toast.success('Atendimento registrado');
      }
    } catch (err) {
      console.error('Erro ao salvar:', err);
      toast.error('Erro ao salvar atendimento');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    if (isLastTask) {
      toast.info('Fluxo finalizado');
      onClose();
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col bg-background h-full max-h-[100dvh] md:max-h-full">
        <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Play className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-sm">Fluxo de Atendimento</h3>
              <p className="text-xs text-muted-foreground">Nenhuma tarefa disponível</p>
            </div>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} className="h-8 w-8 rounded-lg">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto">
              <CalendarIcon className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <div>
              <p className="font-medium text-foreground/80">Nenhuma tarefa para hoje</p>
              <p className="text-sm text-muted-foreground mt-1">Todas as tarefas foram concluídas</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentTask) return null;

  return (
    <div className="flex flex-col bg-background h-full max-h-[100dvh] md:max-h-full">
      {/* Header Minimalista - Fixo */}
      <div className="px-3 py-2.5 border-b border-border/50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={onClose} className="h-8 w-8 p-0 rounded-full">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Play className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-sm">Fluxo de Atendimento</h3>
              <p className="text-xs text-muted-foreground">
                Tarefa {currentIndex + 1} de {tasks.length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              {Math.round(progress)}%
            </span>
            {onToggleDetails && (
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={onToggleDetails}
                className="h-8 w-8 rounded-full"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
        {/* Progress bar elegante */}
        <div className="w-full h-1 bg-muted rounded-full overflow-hidden mt-4">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Content with Tabs */}
      <Tabs defaultValue="atendimento" className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="px-6 pt-4 flex-shrink-0">
          <TabsList className="w-full grid grid-cols-2 h-10 bg-muted/50 p-1 rounded-lg">
            <TabsTrigger 
              value="atendimento" 
              className="gap-2 text-xs rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <FileText className="h-3.5 w-3.5" />
              Atendimento
            </TabsTrigger>
            <TabsTrigger 
              value="historico" 
              className="gap-2 text-xs rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Clock className="h-3.5 w-3.5" />
              Histórico
            </TabsTrigger>
          </TabsList>
        </div>
        
        {/* Tab Atendimento */}
        <TabsContent value="atendimento" className="flex-1 overflow-y-auto mt-0 px-4 py-3 space-y-3">
          {/* Info da tarefa atual - compacto */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{currentTask.contact_name}</span>
                  <Badge variant="secondary" className="text-[10px] font-normal h-4">{currentTask.origem}</Badge>
                  {currentTask.time && (
                    <span className="text-[10px] text-muted-foreground">{currentTask.time}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{currentTask.title}</p>
              </div>
            </div>
          </div>

          {/* Tipo de contato - compacto inline */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Tipo de contato</label>
            <div className="flex gap-1.5">
              {TIPOS_CONTATO.map(tipo => {
                const isSelected = tipoContato === tipo.id;
                const IconComponent = tipo.icon;
                const hasResource = hasContactResource(tipo.id);
                return (
                  <button
                    key={tipo.id}
                    onClick={() => {
                      setTipoContato(tipo.id);
                      // Abrir área de contato automaticamente se tiver recurso
                      if (hasResource) {
                        setShowContactArea(true);
                      } else {
                        setShowContactArea(false);
                      }
                    }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all relative",
                      isSelected 
                        ? "bg-primary text-primary-foreground shadow-sm" 
                        : "bg-muted/50 border border-border/60 hover:border-primary/40 hover:bg-primary/5"
                    )}
                  >
                    <IconComponent className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{tipo.label}</span>
                    {/* Indicador de recurso disponível */}
                    {hasResource && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Área de contato expandível - Email/WhatsApp com componentes completos */}
          {(tipoContato === 'email' || tipoContato === 'whatsapp') && (
            <Collapsible open={showContactArea} onOpenChange={setShowContactArea}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "w-full justify-between h-8 text-xs rounded-lg transition-all",
                    showContactArea 
                      ? "bg-primary/10 text-primary border border-primary/20" 
                      : "bg-muted/50 border border-border/60 hover:border-primary/40"
                  )}
                  disabled={!hasContactResource(tipoContato)}
                >
                  <span className="flex items-center gap-1.5">
                    {tipoContato === 'email' ? (
                      <>
                        <Mail className="h-3.5 w-3.5" />
                        {currentTask.customers?.email ? (
                          <span className="truncate max-w-[150px]">{currentTask.customers.email}</span>
                        ) : (
                          <span className="text-muted-foreground">Email não disponível</span>
                        )}
                      </>
                    ) : (
                      <>
                        <MessageSquare className="h-3.5 w-3.5" />
                        {currentTask.customers?.telefone ? (
                          <span className="truncate max-w-[150px]">{currentTask.customers.telefone}</span>
                        ) : (
                          <span className="text-muted-foreground">Telefone não disponível</span>
                        )}
                      </>
                    )}
                  </span>
                  {hasContactResource(tipoContato) && (
                    showContactArea ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="pt-2">
                {tipoContato === 'whatsapp' && currentTask.customers?.telefone && (
                  <EmbeddedChatPanel
                    customerPhone={currentTask.customers.telefone}
                    customerName={currentTask.contact_name}
                    customerId={currentTask.contact_id}
                    estabelecimentoId={estabelecimentoId}
                  />
                )}
                {tipoContato === 'email' && currentTask.customers?.email && (
                  <EmbeddedEmailPanel
                    customerEmail={currentTask.customers.email}
                    customerName={currentTask.contact_name}
                    customerId={currentTask.contact_id}
                    estabelecimentoId={estabelecimentoId}
                    userId={usuarioId}
                  />
                )}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Flags de resultado - grid compacto */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Resultado</label>
              {!selectedFlag && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Obrigatório
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {flags.map(flag => {
                const isSelected = selectedFlag === flag.id;
                return (
                  <button
                    key={flag.id}
                    onClick={() => setSelectedFlag(flag.id)}
                    className={cn(
                      "flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium transition-all",
                      isSelected 
                        ? "text-white shadow-sm" 
                        : "bg-muted/50 border hover:shadow-sm"
                    )}
                    style={{
                      backgroundColor: isSelected ? flag.cor : undefined,
                      borderColor: isSelected ? flag.cor : flag.cor + '40',
                      color: isSelected ? 'white' : flag.cor,
                    }}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                    <span className="truncate">{flag.nome}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Observação - linha separada */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Observação</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                className={cn(
                  "h-6 px-2 gap-1 text-[10px] rounded",
                  isRecording && "text-destructive bg-destructive/10"
                )}
              >
                {isRecording ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                {isRecording ? "Parar" : "Voz"}
              </Button>
            </div>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Detalhes..."
              rows={2}
              className="resize-none rounded-lg text-xs min-h-[60px]"
            />
          </div>

          {/* Data próximo contato */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Próximo Contato</label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="flex-1 justify-start gap-2 h-9 rounded-lg text-xs font-normal"
                  >
                    <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    {format(proximaData, "dd/MM/yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={proximaData}
                    onSelect={(date) => date && setProximaData(date)}
                    disabled={(date) => date < new Date()}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
              {/* Atalhos de data inline */}
              <div className="flex gap-1">
                {[1, 3, 7, 15].map(days => (
                  <Button
                    key={days}
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 text-[10px] px-0"
                    onClick={() => setProximaData(addDays(new Date(), days))}
                  >
                    {days}d
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
        
        {/* Tab Histórico */}
        <TabsContent value="historico" className="flex-1 overflow-hidden mt-0 px-6 py-4">
          <CustomerHistoryTimeline
            contactId={currentTask.contact_id}
            contactName={currentTask.contact_name}
            estabelecimentoId={estabelecimentoId}
            isFullView={true}
            onEventClick={(event) => {
              // Navegar para o item correspondente
              if (event.type === 'tarefa' || event.type === 'atendimento') {
                // Encontrar a tarefa na lista e navegar para ela
                const taskIndex = tasks.findIndex(t => t.id === event.originalId);
                if (taskIndex !== -1) {
                  setCurrentIndex(taskIndex);
                  toast.success(`Navegando para: ${tasks[taskIndex].title}`);
                } else {
                  toast.info("Esta tarefa não está na lista atual");
                }
              } else if (event.type === 'orcamento' && event.originalId) {
                if (onNavigateToItem) {
                  onNavigateToItem('orcamento', event.originalId);
                }
              } else if (event.type === 'chat' && event.originalId) {
                if (onNavigateToItem) {
                  onNavigateToItem('chat', event.originalId);
                }
              } else if (event.type === 'email' && event.originalId) {
                if (onNavigateToItem) {
                  onNavigateToItem('email', event.originalId);
                }
              }
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Footer Actions - Fixo no mobile */}
      <div className="px-6 py-4 border-t border-border/50 flex items-center justify-between bg-background flex-shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="h-9 rounded-lg"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSkip}
            className="h-9 rounded-lg text-muted-foreground hover:text-foreground"
          >
            Pular
          </Button>
        </div>
        <Button 
          size="sm"
          onClick={handleSaveAndNext}
          disabled={!canProceed || isSaving}
          className="h-9 gap-2 rounded-lg shadow-sm"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Check className="h-4 w-4" />
              {isLastTask ? "Finalizar" : "Próximo"}
              {!isLastTask && <ChevronRight className="h-4 w-4" />}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
