import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Phone, MessageSquare, Mail, Users, CalendarIcon, 
  ChevronLeft, ChevronRight, Check, Mic, MicOff, 
  Loader2, AlertCircle, X, Play, Clock, FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CustomerHistoryTimeline } from "./CustomerHistoryTimeline";

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
}

const TIPOS_CONTATO = [
  { id: 'telefone', label: 'Telefone', icon: Phone },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
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
  initialTaskIndex = 0
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
      <div className="px-6 py-4 border-b border-border/50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
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
            <Button size="icon" variant="ghost" onClick={onClose} className="h-8 w-8 rounded-lg">
              <X className="h-4 w-4" />
            </Button>
            {onToggleDetails && (
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={onToggleDetails}
                className="h-8 w-8 rounded-lg"
                title={showDetails ? "Ocultar detalhes" : "Mostrar detalhes"}
              >
                {showDetails ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
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
        <TabsContent value="atendimento" className="flex-1 overflow-y-auto mt-0 px-6 py-4 space-y-5">
          {/* Info da tarefa atual */}
          <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-base">{currentTask.contact_name}</span>
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{currentTask.title}</p>
                {currentTask.description && (
                  <p className="text-sm text-foreground/70 mt-2">{currentTask.description}</p>
                )}
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="secondary" className="text-xs font-normal">{currentTask.origem}</Badge>
                  {currentTask.time && (
                    <span className="text-xs text-muted-foreground">{currentTask.time}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tipo de contato */}
          <div className="space-y-3">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Tipo de Contato
            </label>
            <div className="flex flex-wrap gap-2">
              {TIPOS_CONTATO.map(tipo => (
                <Button
                  key={tipo.id}
                  variant={tipoContato === tipo.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTipoContato(tipo.id)}
                  className={cn(
                    "gap-2 h-9 rounded-lg transition-all",
                    tipoContato === tipo.id 
                      ? "shadow-sm" 
                      : "border-border/60 hover:border-border hover:bg-muted/50"
                  )}
                >
                  <tipo.icon className="h-4 w-4" />
                  {tipo.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Flags de resultado */}
          <div className="space-y-3">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              Resultado do Contato
              {!selectedFlag && (
                <span className="text-destructive text-[10px] flex items-center gap-1 normal-case tracking-normal">
                  <AlertCircle className="h-3 w-3" /> Obrigatório
                </span>
              )}
            </label>
            <div className="flex flex-wrap gap-2">
              {flags.map(flag => (
                <Button
                  key={flag.id}
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedFlag(flag.id)}
                  className={cn(
                    "h-9 rounded-lg transition-all border-2",
                    selectedFlag === flag.id && "ring-2 ring-offset-2 ring-offset-background"
                  )}
                  style={{
                    backgroundColor: selectedFlag === flag.id ? flag.cor : 'transparent',
                    borderColor: flag.cor,
                    color: selectedFlag === flag.id ? 'white' : flag.cor,
                    ['--tw-ring-color' as any]: flag.cor,
                  }}
                >
                  {selectedFlag === flag.id && <Check className="h-3.5 w-3.5 mr-1.5" />}
                  {flag.nome}
                </Button>
              ))}
            </div>
          </div>

          {/* Observação */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Observação
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                className={cn(
                  "h-8 gap-1.5 text-xs rounded-lg",
                  isRecording && "text-destructive bg-destructive/10"
                )}
              >
                {isRecording ? (
                  <>
                    <MicOff className="h-3.5 w-3.5" />
                    <span className="animate-pulse">Gravando...</span>
                  </>
                ) : (
                  <>
                    <Mic className="h-3.5 w-3.5" />
                    Gravar
                  </>
                )}
              </Button>
            </div>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Detalhes do atendimento..."
              rows={3}
              className="resize-none rounded-lg border-border/60 focus:border-primary/50 bg-background"
            />
          </div>

          {/* Data próximo contato */}
          <div className="space-y-3 pb-4">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Próximo Contato
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2 h-10 rounded-lg border-border/60 hover:border-border font-normal"
                >
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  {format(proximaData, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
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
              } else if (event.type === 'orcamento') {
                window.open(`/orcamentos?id=${event.originalId}`, '_blank');
              } else if (event.type === 'chat') {
                window.open(`/chat?conversation=${event.originalId}`, '_blank');
              } else if (event.type === 'email') {
                window.open(`/email?id=${event.originalId}`, '_blank');
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
