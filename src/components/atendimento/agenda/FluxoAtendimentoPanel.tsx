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
  Send, ChevronDown, ChevronUp, PhoneCall, PhoneOutgoing, RotateCcw, Square
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ligarPeloPabx } from "@/lib/telefonia/clickToCall";
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
  /** Quando definido, o fluxo vira discador: liga para cada contato pelo PABX. */
  discadorModo?: 'previa' | 'sequencial' | null;
}

const ALL_TIPOS_CONTATO = [
  { id: 'telefone', label: 'Telefone', icon: Phone, requiresData: 'telefone' },
  { id: 'whatsapp', label: 'Chats', icon: MessageSquare, requiresData: 'telefone' },
  { id: 'email', label: 'E-mail', icon: Mail, requiresData: 'email' },
  { id: 'presencial', label: 'Presencial', icon: Users, requiresData: null },
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
  onNavigateToItem,
  discadorModo = null
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

  // Discador integrado: liga para o contato atual pelo PABX (o ramal do
  // usuário toca primeiro; ao atender, o PABX disca o cliente).
  const [ligacaoStatus, setLigacaoStatus] = useState<'aguardando' | 'discando' | 'chamando' | 'falha' | 'sem_telefone'>('aguardando');
  const [ligacaoErro, setLigacaoErro] = useState("");
  const discadosRef = useRef<Set<string>>(new Set());
  // Só disca sozinho (modo sequencial) quando o contato foi alcançado para
  // frente: abertura do fluxo, Finalizar ou Pular. Voltar/histórico não disca.
  const avancoRef = useRef(true);
  // Controle da discagem automática no modo sequencial: "Parar" impede que a
  // próxima ligação saia sozinha; "Iniciar" retoma (e já disca o contato atual).
  const [discadorAtivo, setDiscadorAtivo] = useState(true);

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

  const discarParaAtual = async () => {
    const tarefa = tasks[currentIndex];
    const fone = tarefa?.customers?.telefone;
    if (!tarefa || !fone) {
      setLigacaoStatus('sem_telefone');
      return;
    }
    discadosRef.current.add(tarefa.id);
    setLigacaoErro("");
    setLigacaoStatus('discando');
    const resposta = await ligarPeloPabx(fone, tarefa.contact_name);
    if (resposta.error) {
      setLigacaoStatus('falha');
      setLigacaoErro(resposta.error);
    } else {
      setLigacaoStatus('chamando');
    }
  };

  // "Iniciar": retoma a discagem automática e já liga para o contato atual,
  // se ele ainda não foi discado nesta sessão.
  const handleIniciarDiscagem = () => {
    setDiscadorAtivo(true);
    const tarefa = tasks[currentIndex];
    if (tarefa?.customers?.telefone && !discadosRef.current.has(tarefa.id)) {
      void discarParaAtual();
    }
  };

  // Ao abrir/trocar o modo, o sequencial começa ativo
  useEffect(() => {
    setDiscadorAtivo(discadorModo === 'sequencial');
  }, [discadorModo]);

  // Discador: ao chegar em um contato, o modo sequencial disca na hora
  // (se estiver ativo); o modo prévia espera o "Ligar agora".
  // Nunca repete contato já discado.
  useEffect(() => {
    if (!discadorModo) return;
    const tarefa = tasks[currentIndex];
    if (!tarefa) return;
    if (!tarefa.customers?.telefone) {
      setLigacaoStatus('sem_telefone');
      return;
    }
    if (discadosRef.current.has(tarefa.id)) {
      setLigacaoStatus('chamando');
      return;
    }
    if (discadorModo === 'sequencial' && avancoRef.current && discadorAtivo) {
      void discarParaAtual();
    } else {
      setLigacaoStatus('aguardando');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, discadorModo, tasks]);

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
        avancoRef.current = true;
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
      avancoRef.current = true;
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
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Play className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-sm">Fluxo de Atendimento</h3>
              <p className="text-xs text-muted-foreground">
                Tarefa {currentIndex + 1} de {tasks.length}
                {discadorModo && (
                  <span className="text-primary font-medium">
                    {" "}• Discador {discadorModo === 'previa' ? '(aprovação uma a uma)' : '(sequencial)'}
                  </span>
                )}
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

          {/* Discador: ligação pelo PABX (o ramal toca primeiro; ao atender, o PABX disca o cliente) */}
          {discadorModo && (
            <div className={cn(
              "p-3 rounded-lg border space-y-2",
              ligacaoStatus === 'falha'
                ? "border-destructive/40 bg-destructive/5"
                : "border-primary/30 bg-primary/5"
            )}>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  <PhoneCall className="h-3.5 w-3.5 text-primary" />
                  Ligação pelo discador
                </span>
                <Badge variant="secondary" className="text-[10px] font-normal h-4">
                  {discadorModo === 'previa' ? 'Aprovação uma a uma' : 'Sequencial'}
                </Badge>
              </div>

              {/* Controle da discagem automática (modo sequencial) */}
              {discadorModo === 'sequencial' && (
                <div className="flex items-center gap-2">
                  {discadorAtivo ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-7 text-xs gap-1.5 px-3"
                      onClick={() => setDiscadorAtivo(false)}
                    >
                      <Square className="h-3 w-3" />
                      Parar
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="h-7 text-xs gap-1.5 px-3"
                      onClick={handleIniciarDiscagem}
                    >
                      <Play className="h-3 w-3" />
                      Iniciar
                    </Button>
                  )}
                  <span className="text-[10px] text-muted-foreground leading-tight">
                    {discadorAtivo
                      ? 'Discagem automática ativa — a próxima sai ao Finalizar/Pular'
                      : 'Discagem pausada — a próxima não sai sozinha'}
                  </span>
                </div>
              )}

              {ligacaoStatus === 'sem_telefone' && (
                <p className="text-xs text-muted-foreground">
                  Este contato não tem telefone cadastrado. Registre o atendimento ou use <strong>Pular</strong> para ir ao próximo.
                </p>
              )}

              {ligacaoStatus === 'aguardando' && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Próxima ligação: <strong>{currentTask.contact_name}</strong> • {currentTask.customers?.telefone}
                  </p>
                  <Button size="sm" className="w-full h-9 gap-2 rounded-lg" onClick={() => void discarParaAtual()}>
                    <Phone className="h-4 w-4" />
                    Ligar agora
                  </Button>
                </div>
              )}

              {ligacaoStatus === 'discando' && (
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Iniciando chamada pelo PABX…
                </p>
              )}

              {ligacaoStatus === 'chamando' && (
                <div className="space-y-1.5">
                  <p className="text-xs flex items-center gap-2">
                    <PhoneOutgoing className="h-3.5 w-3.5 text-primary animate-pulse flex-shrink-0" />
                    <span>Seu ramal está tocando — <strong>atenda</strong> para o PABX discar <strong>{currentTask.customers?.telefone}</strong>.</span>
                  </p>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] gap-1.5" onClick={() => void discarParaAtual()}>
                    <RotateCcw className="h-3 w-3" />
                    Ligar novamente
                  </Button>
                </div>
              )}

              {ligacaoStatus === 'falha' && (
                <div className="space-y-1.5">
                  <p className="text-xs text-destructive flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    {ligacaoErro || 'Falha na discagem'}
                  </p>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => void discarParaAtual()}>
                    <RotateCcw className="h-3 w-3" />
                    Tentar novamente
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Tipo de contato definido pela aba (Tel = Telefone, Visita = Presencial) */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium">Tipo de contato:</span>
            <span className="rounded-md bg-primary/10 px-2 py-0.5 font-semibold text-primary">
              {tipoContato === 'presencial' ? 'Visita' : 'Telefone'}
            </span>
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
        
      </Tabs>

      {/* Footer Actions - Fixo no mobile */}
      <div className="px-6 py-4 border-t border-border/50 flex items-center justify-between bg-background flex-shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { avancoRef.current = false; setCurrentIndex(prev => Math.max(0, prev - 1)); }}
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
