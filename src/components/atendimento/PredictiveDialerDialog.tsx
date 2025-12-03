import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Phone, Play, Square, CheckCircle2, XCircle, Clock, Filter, Calendar, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "@/lib/toast-config";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PredictiveDialerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TaskWithCustomer {
  id: string;
  contact_id: string | null;
  contact_name: string;
  title: string;
  date: string;
  time: string | null;
  status: string;
  origem: string;
  customer?: {
    id: string;
    nome: string;
    telefone: string;
    email: string;
  } | null;
}

interface DialerResult {
  taskId: string;
  contactName: string;
  phone: string;
  status: 'pending' | 'dialing' | 'success' | 'failed' | 'skipped';
  error?: string;
}

export function PredictiveDialerDialog({ open, onOpenChange }: PredictiveDialerDialogProps) {
  const [tasks, setTasks] = useState<TaskWithCustomer[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<TaskWithCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialing, setIsDialing] = useState(false);
  const [dialerResults, setDialerResults] = useState<DialerResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userExtension, setUserExtension] = useState<string>("");
  const [estabelecimentoId, setEstabelecimentoId] = useState<string>("");
  
  // Filters
  const [filterNoWhatsApp, setFilterNoWhatsApp] = useState(false);
  const [filterNoEmail, setFilterNoEmail] = useState(false);
  const [filterNotContacted, setFilterNotContacted] = useState(false);
  const [filterByStatus, setFilterByStatus] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  
  // Available statuses from tasks
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      loadTasks();
      loadUserExtension();
    }
  }, [open, selectedDate]);

  useEffect(() => {
    applyFilters();
  }, [tasks, filterNoWhatsApp, filterNoEmail, filterNotContacted, filterByStatus]);

  const loadUserExtension = async () => {
    try {
      const estabId = await getEstabelecimentoId();
      if (!estabId) return;
      setEstabelecimentoId(estabId);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('usuarios')
        .select('ramal')
        .eq('auth_user_id', user.id)
        .eq('estabelecimento_id', estabId)
        .single();

      if (userData?.ramal) {
        setUserExtension(userData.ramal);
      }
    } catch (error) {
      console.error("Erro ao carregar ramal:", error);
    }
  };

  const loadTasks = async () => {
    setLoading(true);
    try {
      const estabId = await getEstabelecimentoId();
      if (!estabId) return;

      const { data: tasksData, error } = await supabase
        .from('calendario_tarefas')
        .select('*')
        .eq('estabelecimento_id', estabId)
        .eq('date', selectedDate)
        .order('time', { ascending: true });

      if (error) throw error;

      // Load customer data for each task
      const tasksWithCustomers: TaskWithCustomer[] = [];
      const statusSet = new Set<string>();

      for (const task of tasksData || []) {
        statusSet.add(task.status);
        let customer = null;

        if (task.contact_id) {
          const { data: customerData } = await supabase
            .from('customers')
            .select('id, nome, telefone, email')
            .eq('id', task.contact_id)
            .single();
          customer = customerData;
        }

        tasksWithCustomers.push({
          ...task,
          customer
        });
      }

      setTasks(tasksWithCustomers);
      setAvailableStatuses(Array.from(statusSet));
    } catch (error) {
      console.error("Erro ao carregar tarefas:", error);
      toast.error("Erro ao carregar agendamentos");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...tasks];

    // Filter tasks with phone numbers only
    filtered = filtered.filter(task => task.customer?.telefone);

    if (filterNoWhatsApp) {
      // Assume users without email are likely without WhatsApp too (heuristic)
      // In a real scenario, you'd have a whatsapp field
      filtered = filtered.filter(task => !task.customer?.telefone?.includes('+'));
    }

    if (filterNoEmail) {
      filtered = filtered.filter(task => !task.customer?.email);
    }

    if (filterNotContacted) {
      filtered = filtered.filter(task => task.status === 'pendente');
    }

    if (filterByStatus && filterByStatus !== 'all') {
      filtered = filtered.filter(task => task.status === filterByStatus);
    }

    setFilteredTasks(filtered);
  };

  const startDialer = async () => {
    if (filteredTasks.length === 0) {
      toast.error("Nenhuma tarefa para discar");
      return;
    }

    if (!userExtension) {
      toast.error("Configure seu ramal no perfil antes de usar o discador");
      return;
    }

    setIsDialing(true);
    setCurrentIndex(0);
    setDialerResults(filteredTasks.map(task => ({
      taskId: task.id,
      contactName: task.contact_name,
      phone: task.customer?.telefone || '',
      status: 'pending'
    })));

    // Start dialing sequence
    await dialNextNumber(0);
  };

  const dialNextNumber = async (index: number) => {
    if (index >= filteredTasks.length) {
      setIsDialing(false);
      toast.success("Discagem concluída");
      return;
    }

    const task = filteredTasks[index];
    const phone = task.customer?.telefone;

    if (!phone) {
      setDialerResults(prev => prev.map((r, i) => 
        i === index ? { ...r, status: 'skipped', error: 'Sem telefone' } : r
      ));
      setCurrentIndex(index + 1);
      // Wait a bit then continue
      setTimeout(() => dialNextNumber(index + 1), 1000);
      return;
    }

    // Update status to dialing
    setDialerResults(prev => prev.map((r, i) => 
      i === index ? { ...r, status: 'dialing' } : r
    ));
    setCurrentIndex(index);

    try {
      const { data, error } = await supabase.functions.invoke('ucm-dial', {
        body: {
          number: phone,
          extension: userExtension,
          estabelecimento_id: estabelecimentoId
        }
      });

      if (error) throw error;

      setDialerResults(prev => prev.map((r, i) => 
        i === index ? { ...r, status: 'success' } : r
      ));

      // Update task status
      await supabase
        .from('calendario_tarefas')
        .update({ status: 'contatado' })
        .eq('id', task.id);

      // Wait for call to complete (simplified - in production, listen for call events)
      // For now, wait 30 seconds before next call
      setTimeout(() => {
        setCurrentIndex(index + 1);
        dialNextNumber(index + 1);
      }, 30000);

    } catch (error) {
      console.error("Erro ao discar:", error);
      setDialerResults(prev => prev.map((r, i) => 
        i === index ? { ...r, status: 'failed', error: 'Erro na discagem' } : r
      ));
      
      // Continue with next after error
      setTimeout(() => {
        setCurrentIndex(index + 1);
        dialNextNumber(index + 1);
      }, 3000);
    }
  };

  const stopDialer = () => {
    setIsDialing(false);
    toast.info("Discador interrompido");
  };

  const getStatusBadge = (status: DialerResult['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Aguardando</Badge>;
      case 'dialing':
        return <Badge className="bg-blue-500"><Phone className="h-3 w-3 mr-1 animate-pulse" />Discando</Badge>;
      case 'success':
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Concluído</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Falhou</Badge>;
      case 'skipped':
        return <Badge variant="secondary">Pulado</Badge>;
    }
  };

  const progress = dialerResults.length > 0 
    ? (dialerResults.filter(r => r.status !== 'pending').length / dialerResults.length) * 100 
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Discador Preditivo
          </DialogTitle>
          <DialogDescription>
            Disca automaticamente para os contatos do agendamento do dia selecionado
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date selector */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Label>Data:</Label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
              disabled={isDialing}
            />
          </div>

          {/* Filters */}
          <div className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Filter className="h-4 w-4" />
              Filtros
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="noWhatsApp" 
                  checked={filterNoWhatsApp}
                  onCheckedChange={(checked) => setFilterNoWhatsApp(!!checked)}
                  disabled={isDialing}
                />
                <Label htmlFor="noWhatsApp" className="text-sm">Sem WhatsApp</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="noEmail" 
                  checked={filterNoEmail}
                  onCheckedChange={(checked) => setFilterNoEmail(!!checked)}
                  disabled={isDialing}
                />
                <Label htmlFor="noEmail" className="text-sm">Sem Email</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="notContacted" 
                  checked={filterNotContacted}
                  onCheckedChange={(checked) => setFilterNotContacted(!!checked)}
                  disabled={isDialing}
                />
                <Label htmlFor="notContacted" className="text-sm">Não contatados</Label>
              </div>
              
              <div className="flex items-center gap-2">
                <Label className="text-sm">Status:</Label>
                <Select 
                  value={filterByStatus} 
                  onValueChange={setFilterByStatus}
                  disabled={isDialing}
                >
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {availableStatuses.map(status => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="text-sm">
                <strong>{filteredTasks.length}</strong> contatos selecionados de <strong>{tasks.length}</strong> agendamentos
              </span>
            </div>
            {userExtension && (
              <Badge variant="outline">Ramal: {userExtension}</Badge>
            )}
          </div>

          {/* Progress */}
          {isDialing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progresso</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Results list */}
          {dialerResults.length > 0 && (
            <ScrollArea className="h-48 border rounded-lg">
              <div className="p-2 space-y-2">
                {dialerResults.map((result, index) => (
                  <div 
                    key={result.taskId}
                    className={`flex items-center justify-between p-2 rounded ${
                      index === currentIndex && isDialing ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{result.contactName}</span>
                      <span className="text-xs text-muted-foreground">{result.phone}</span>
                    </div>
                    {getStatusBadge(result.status)}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            {!isDialing ? (
              <>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={startDialer}
                  disabled={loading || filteredTasks.length === 0 || !userExtension}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Iniciar Discagem ({filteredTasks.length})
                </Button>
              </>
            ) : (
              <Button variant="destructive" onClick={stopDialer}>
                <Square className="h-4 w-4 mr-2" />
                Parar Discador
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
