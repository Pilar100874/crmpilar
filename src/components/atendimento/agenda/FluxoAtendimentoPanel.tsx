import { useState, useEffect } from "react";
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
  onToggleDetails
}: FluxoAtendimentoPanelProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flags, setFlags] = useState<AtendimentoFlag[]>([]);
  const [configDatas, setConfigDatas] = useState<ConfigProximaData[]>([]);
  const [selectedFlag, setSelectedFlag] = useState<string | null>(null);
  const [observacao, setObservacao] = useState("");
  const [tipoContato, setTipoContato] = useState<string>("telefone");
  const [proximaData, setProximaData] = useState<Date>(addDays(new Date(), 3));
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const currentTask = tasks[currentIndex];
  const isLastTask = currentIndex === tasks.length - 1;
  const progress = tasks.length > 0 ? ((currentIndex + 1) / tasks.length) * 100 : 0;

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

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1];
          try {
            const { data, error } = await supabase.functions.invoke('voice-to-text', {
              body: { audio: base64 }
            });
            if (data?.text) {
              setObservacao(prev => prev ? `${prev} ${data.text}` : data.text);
            }
          } catch (err) {
            console.error('Erro na transcrição:', err);
          }
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      toast.error('Não foi possível acessar o microfone');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setMediaRecorder(null);
      setIsRecording(false);
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
      <div className="flex-1 flex flex-col h-full min-h-0 bg-card">
        <div className="px-4 py-3 border-b bg-gradient-to-r from-orange-50 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <Play className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Fluxo de Atendimento</h3>
              <p className="text-xs text-muted-foreground">Nenhuma tarefa disponível</p>
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground/20" />
            <p className="text-lg font-medium mb-2">Nenhuma tarefa para hoje</p>
            <p className="text-sm text-muted-foreground">Todas as tarefas foram concluídas</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentTask) return null;

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-card">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-gradient-to-r from-orange-50 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <Play className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Fluxo de Atendimento</h3>
              <p className="text-xs text-muted-foreground">
                {currentIndex + 1} de {tasks.length} tarefas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {Math.round(progress)}%
            </Badge>
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
            {onToggleDetails && (
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={onToggleDetails}
                className="h-8 w-8 p-0"
                title={showDetails ? "Ocultar detalhes" : "Mostrar detalhes"}
              >
                {showDetails ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>
        {/* Progress bar */}
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-3">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Content with Tabs */}
      <Tabs defaultValue="atendimento" className="flex-1 flex flex-col min-h-0">
        <div className="px-4 pt-2">
          <TabsList className="w-full grid grid-cols-2 h-9">
            <TabsTrigger value="atendimento" className="gap-1.5 text-xs">
              <FileText className="h-3.5 w-3.5" />
              Atendimento
            </TabsTrigger>
            <TabsTrigger value="historico" className="gap-1.5 text-xs">
              <Clock className="h-3.5 w-3.5" />
              Histórico
            </TabsTrigger>
          </TabsList>
        </div>
        
        {/* Tab Atendimento */}
        <TabsContent value="atendimento" className="flex-1 overflow-y-auto mt-0 p-4 space-y-4">
          {/* Info da tarefa atual */}
          <Card className="p-4 bg-muted/50">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="font-semibold text-lg">{currentTask.contact_name}</span>
            </div>
            <p className="text-sm text-muted-foreground">{currentTask.title}</p>
            {currentTask.description && (
              <p className="text-sm mt-2">{currentTask.description}</p>
            )}
            <div className="flex gap-2 text-xs text-muted-foreground mt-2">
              <Badge variant="secondary">{currentTask.origem}</Badge>
              {currentTask.time && <span>{currentTask.time}</span>}
            </div>
          </Card>

          {/* Tipo de contato */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo de Contato</label>
            <div className="flex flex-wrap gap-2">
              {TIPOS_CONTATO.map(tipo => (
                <Button
                  key={tipo.id}
                  variant={tipoContato === tipo.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTipoContato(tipo.id)}
                  className="gap-2"
                >
                  <tipo.icon className="h-4 w-4" />
                  {tipo.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Flags de resultado */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              Resultado do Contato
              {!selectedFlag && (
                <span className="text-destructive text-xs flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Obrigatório
                </span>
              )}
            </label>
            <div className="flex flex-wrap gap-2">
              {flags.map(flag => (
                <Button
                  key={flag.id}
                  variant={selectedFlag === flag.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedFlag(flag.id)}
                  style={{
                    backgroundColor: selectedFlag === flag.id ? flag.cor : undefined,
                    borderColor: flag.cor,
                    color: selectedFlag === flag.id ? 'white' : flag.cor
                  }}
                >
                  {selectedFlag === flag.id && <Check className="h-3 w-3 mr-1" />}
                  {flag.nome}
                </Button>
              ))}
            </div>
          </div>

          {/* Observação */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center justify-between">
              Observação (opcional)
              <Button
                variant="ghost"
                size="sm"
                onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                className={cn(
                  "gap-1",
                  isRecording && "text-destructive animate-pulse"
                )}
              >
                {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {isRecording ? "Parar" : "Gravar"}
              </Button>
            </label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Detalhes do atendimento..."
              rows={3}
            />
          </div>

          {/* Data próximo contato */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              Data do Próximo Contato
              <AlertCircle className="h-3 w-3 text-destructive" />
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <CalendarIcon className="h-4 w-4" />
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
        <TabsContent value="historico" className="flex-1 overflow-hidden mt-0 p-4">
          <CustomerHistoryTimeline
            contactId={currentTask.contact_id}
            contactName={currentTask.contact_name}
            estabelecimentoId={estabelecimentoId}
            isFullView={true}
          />
        </TabsContent>
      </Tabs>

      {/* Footer Actions */}
      <div className="px-4 py-3 border-t bg-muted/30 flex justify-between">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          <Button variant="ghost" size="sm" onClick={handleSkip}>
            Pular
          </Button>
        </div>
        <Button 
          size="sm"
          onClick={handleSaveAndNext}
          disabled={!canProceed || isSaving}
          className="gap-2"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Check className="h-4 w-4" />
              {isLastTask ? "Finalizar" : "Salvar e Próximo"}
              {!isLastTask && <ChevronRight className="h-4 w-4" />}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
