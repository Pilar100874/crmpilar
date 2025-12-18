import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Phone, MessageSquare, Mail, Users, CalendarIcon, 
  ChevronLeft, ChevronRight, Check, Mic, MicOff, 
  Loader2, AlertCircle, X
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  onClose
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
  const progress = ((currentIndex + 1) / tasks.length) * 100;

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

  if (!currentTask) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p>Nenhuma tarefa disponível</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/20 dark:to-background">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Fluxo de Atendimento</h2>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {currentIndex + 1} de {tasks.length}
            </Badge>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {/* Progress bar */}
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Info da tarefa atual */}
        <div className="p-3 bg-muted/50 rounded-lg space-y-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="font-semibold">{currentTask.contact_name}</span>
          </div>
          <p className="text-sm text-muted-foreground">{currentTask.title}</p>
          {currentTask.description && (
            <p className="text-xs">{currentTask.description}</p>
          )}
          <div className="flex gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="text-[10px]">{currentTask.origem}</Badge>
            {currentTask.time && <span>{currentTask.time}</span>}
          </div>
        </div>

        {/* Tipo de contato */}
        <div className="space-y-2">
          <label className="text-xs font-medium">Tipo de Contato</label>
          <div className="flex flex-wrap gap-1.5">
            {TIPOS_CONTATO.map(tipo => (
              <Button
                key={tipo.id}
                variant={tipoContato === tipo.id ? "default" : "outline"}
                size="sm"
                onClick={() => setTipoContato(tipo.id)}
                className="gap-1 h-7 text-xs"
              >
                <tipo.icon className="h-3 w-3" />
                {tipo.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Flags de resultado */}
        <div className="space-y-2">
          <label className="text-xs font-medium flex items-center gap-2">
            Resultado
            {!selectedFlag && (
              <span className="text-destructive text-[10px] flex items-center gap-0.5">
                <AlertCircle className="h-2.5 w-2.5" /> Obrigatório
              </span>
            )}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {flags.map(flag => (
              <Button
                key={flag.id}
                variant={selectedFlag === flag.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedFlag(flag.id)}
                className="h-7 text-xs"
                style={{
                  backgroundColor: selectedFlag === flag.id ? flag.cor : undefined,
                  borderColor: flag.cor,
                  color: selectedFlag === flag.id ? 'white' : flag.cor
                }}
              >
                {selectedFlag === flag.id && <Check className="h-2.5 w-2.5 mr-0.5" />}
                {flag.nome}
              </Button>
            ))}
          </div>
        </div>

        {/* Observação */}
        <div className="space-y-2">
          <label className="text-xs font-medium flex items-center justify-between">
            Observação
            <Button
              variant="ghost"
              size="sm"
              onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
              className={cn(
                "gap-1 h-6 text-xs",
                isRecording && "text-destructive animate-pulse"
              )}
            >
              {isRecording ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
              {isRecording ? "Parar" : "Gravar"}
            </Button>
          </label>
          <Textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Detalhes do atendimento..."
            rows={2}
            className="text-sm"
          />
        </div>

        {/* Data próximo contato */}
        <div className="space-y-2">
          <label className="text-xs font-medium">Próximo Contato</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start gap-2 h-9 text-sm">
                <CalendarIcon className="h-3.5 w-3.5" />
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
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 p-3 border-t bg-muted/30 flex justify-between gap-2">
        <div className="flex gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="h-8"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleSkip} className="h-8 text-xs">
            Pular
          </Button>
        </div>
        <Button 
          size="sm"
          onClick={handleSaveAndNext}
          disabled={!canProceed || isSaving}
          className="gap-1.5 h-8"
        >
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              <Check className="h-3.5 w-3.5" />
              {isLastTask ? "Finalizar" : "Próximo"}
              {!isLastTask && <ChevronRight className="h-3.5 w-3.5" />}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}