import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { 
  Phone, MessageSquare, Mail, Users, CalendarIcon, 
  Send, Loader2, CheckSquare, Square, AlertCircle, X, Search
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

interface EnvioMassaPanelProps {
  tasks: Task[];
  estabelecimentoId: string;
  usuarioId: string;
  onComplete: () => void;
  onClose: () => void;
}

const TIPOS_CONTATO = [
  { id: 'telefone', label: 'Telefone', icon: Phone },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { id: 'email', label: 'E-mail', icon: Mail },
  { id: 'presencial', label: 'Presencial', icon: Users },
];

export function EnvioMassaPanel({
  tasks,
  estabelecimentoId,
  usuarioId,
  onComplete,
  onClose
}: EnvioMassaPanelProps) {
  const [step, setStep] = useState<'select' | 'compose' | 'sending'>('select');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [flags, setFlags] = useState<AtendimentoFlag[]>([]);
  const [selectedFlag, setSelectedFlag] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [tipoContato, setTipoContato] = useState<string>("whatsapp");
  const [proximaData, setProximaData] = useState<Date>(addDays(new Date(), 3));
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);

  useEffect(() => {
    if (estabelecimentoId) {
      loadFlags();
    }
  }, [estabelecimentoId]);

  const loadFlags = async () => {
    const { data } = await supabase
      .from('atendimento_flags')
      .select('*')
      .eq('estabelecimento_id', estabelecimentoId)
      .eq('ativo', true)
      .order('ordem');
    
    if (data) setFlags(data);
  };

  const toggleTask = (taskId: string) => {
    setSelectedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedTasks(new Set(tasks.map(t => t.id)));
  };

  const deselectAll = () => {
    setSelectedTasks(new Set());
  };

  const handleSendMassa = async () => {
    if (!selectedFlag || selectedTasks.size === 0) return;

    setIsSending(true);
    setStep('sending');
    setSendProgress(0);

    const tasksArray = tasks.filter(t => selectedTasks.has(t.id));
    let completed = 0;

    try {
      for (const task of tasksArray) {
        const { error: registroError } = await supabase
          .from('atendimento_registros')
          .insert({
            tarefa_id: task.id,
            estabelecimento_id: estabelecimentoId,
            usuario_id: usuarioId,
            tipo_contato: tipoContato,
            flag_id: selectedFlag,
            observacao: mensagem || null,
            data_proximo_contato: format(proximaData, 'yyyy-MM-dd'),
            envio_massa: true
          });

        if (registroError) throw registroError;

        await supabase
          .from('calendario_tarefas')
          .update({ 
            status: 'concluido',
            updated_at: new Date().toISOString()
          })
          .eq('id', task.id);

        await supabase
          .from('calendario_tarefas')
          .insert({
            user_id: usuarioId,
            estabelecimento_id: estabelecimentoId,
            contact_id: task.contact_id,
            contact_name: task.contact_name,
            title: `Retorno: ${task.title}`,
            description: `Envio em massa: ${format(new Date(), 'dd/MM/yyyy')} - ${flags.find(f => f.id === selectedFlag)?.nome || ''}${mensagem ? ` - ${mensagem}` : ''}`,
            date: format(proximaData, 'yyyy-MM-dd'),
            origem: task.origem,
            status: 'pendente',
            data_original: task.date
          });

        completed++;
        setSendProgress((completed / tasksArray.length) * 100);
      }

      toast.success(`${completed} atendimentos registrados com sucesso!`);
      onComplete();
      onClose();
    } catch (err) {
      console.error('Erro ao enviar em massa:', err);
      toast.error('Erro ao processar envio em massa');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-card">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-gradient-to-r from-orange-50 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Envio em Massa</h3>
              <p className="text-xs text-muted-foreground">
                {step === 'select' ? 'Selecione os contatos' : 
                 step === 'compose' ? 'Configure a mensagem' : 
                 'Processando...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {step !== 'sending' && (
              <Badge variant="outline">
                {selectedTasks.size} selecionados
              </Badge>
            )}
            <Button size="sm" variant="ghost" onClick={onClose} disabled={step === 'sending'}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {step === 'select' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Selecione os contatos para enviar a mesma mensagem
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  <CheckSquare className="h-4 w-4 mr-1" />
                  Todos
                </Button>
                <Button variant="ghost" size="sm" onClick={deselectAll}>
                  <Square className="h-4 w-4 mr-1" />
                  Nenhum
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[calc(100vh-350px)] border rounded-lg p-2">
              <div className="space-y-2">
                {tasks.map(task => (
                  <div
                    key={task.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                      selectedTasks.has(task.id) 
                        ? "bg-primary/10 border border-primary/30" 
                        : "bg-muted/50 hover:bg-muted"
                    )}
                    onClick={() => toggleTask(task.id)}
                  >
                    <Checkbox 
                      checked={selectedTasks.has(task.id)}
                      onCheckedChange={() => toggleTask(task.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{task.contact_name}</p>
                      <p className="text-sm text-muted-foreground truncate">{task.title}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {task.origem}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {step === 'compose' && (
          <div className="space-y-6">
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

            {/* Resultado/Flag */}
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
                    {flag.nome}
                  </Button>
                ))}
              </div>
            </div>

            {/* Mensagem */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Mensagem Enviada</label>
              <Textarea
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                placeholder="Texto da mensagem enviada para todos..."
                rows={4}
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
          </div>
        )}

        {step === 'sending' && (
          <div className="py-8 space-y-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-lg font-medium">Processando envio em massa...</p>
              <p className="text-sm text-muted-foreground">
                {Math.round(sendProgress)}% concluído
              </p>
            </div>
            <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${sendProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {step !== 'sending' && (
        <div className="px-4 py-3 border-t bg-muted/30 flex justify-between">
          {step === 'select' ? (
            <>
              <Button variant="outline" size="sm" onClick={onClose}>
                Cancelar
              </Button>
              <Button 
                size="sm"
                onClick={() => setStep('compose')}
                disabled={selectedTasks.size === 0}
              >
                Continuar ({selectedTasks.size})
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setStep('select')}>
                Voltar
              </Button>
              <Button 
                size="sm"
                onClick={handleSendMassa}
                disabled={!selectedFlag}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                Enviar para {selectedTasks.size} contatos
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
