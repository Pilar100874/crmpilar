import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { X, CalendarIcon, Clock, Pencil, Trash2, Building2, User } from "lucide-react";
import { format, addDays, addMinutes, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast-config";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

interface Contact {
  id: string;
  name: string;
  type: 'contato' | 'empresa';
  company?: string;
  phone: string;
  email: string;
  customFields?: Record<string, any>;
  cnpj?: string;
  razaoSocial?: string;
}

interface NewTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (task: {
    contactId: string;
    contactName: string;
    date: Date;
    time: string;
    type: string;
    observation?: string;
    isAllDay?: boolean;
    userId?: string;
  }) => void;
  initialDate?: Date;
}

export function NewTaskDialog({ open, onOpenChange, onSave, initialDate }: NewTaskDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showContactList, setShowContactList] = useState(false);
  const [date, setDate] = useState<Date | undefined>(initialDate || new Date());
  const [dateInput, setDateInput] = useState("");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [isAllDay, setIsAllDay] = useState(false);
  const [taskType, setTaskType] = useState("accompany");
  const [assignedTo, setAssignedTo] = useState("me");
  const [observation, setObservation] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [hourPickerOpen, setHourPickerOpen] = useState(false);
  const [minutePickerOpen, setMinutePickerOpen] = useState(false);
  const [selectedQuickOption, setSelectedQuickOption] = useState<string | null>(null);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflictingTasks, setConflictingTasks] = useState<any[]>([]);
  const [pendingTaskData, setPendingTaskData] = useState<any>(null);
  const [contactExistingTasks, setContactExistingTasks] = useState<any[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // Carregar contatos e empresas do Supabase
  useEffect(() => {
    if (open) {
      loadContactsAndCompanies();
    }
  }, [open]);

  const loadContactsAndCompanies = async () => {
    const estabId = await getEstabelecimentoId();
    if (!estabId) return;

    const allContacts: Contact[] = [];

    // Buscar contatos
    const { data: contatosData } = await supabase
      .from('customers')
      .select('*')
      .eq('estabelecimento_id', estabId);

    if (contatosData) {
      contatosData.forEach(contato => {
        allContacts.push({
          id: contato.id,
          name: contato.nome,
          type: 'contato',
          phone: contato.telefone || '',
          email: contato.email || '',
          customFields: (contato.custom_fields as Record<string, any>) || {},
        });
      });
    }

    // Buscar empresas
    const { data: empresasData } = await supabase
      .from('empresas')
      .select('*')
      .eq('estabelecimento_id', estabId);

    if (empresasData) {
      empresasData.forEach(empresa => {
        allContacts.push({
          id: empresa.id,
          name: empresa.nome_fantasia,
          type: 'empresa',
          phone: empresa.telefone || '',
          email: empresa.email || '',
          cnpj: empresa.cnpj || '',
          razaoSocial: empresa.nome || '',
          customFields: (empresa.custom_fields as Record<string, any>) || {},
        });
      });
    }

    setContacts(allContacts);
  };

  // Resetar ao fechar
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSelectedContact(null);
      setShowContactList(false);
      setDate(initialDate || new Date());
      setDateInput(format(initialDate || new Date(), "dd/MM/yyyy"));
      setHours("");
      setMinutes("");
      setIsAllDay(false);
      setTaskType("accompany");
      setAssignedTo("me");
      setObservation("");
    } else {
      setDateInput(format(initialDate || new Date(), "dd/MM/yyyy"));
    }
  }, [open, initialDate]);

  // Filtrar contatos e empresas baseado na busca
  const filteredContacts = contacts.filter(contact => {
    if (!searchQuery) return true;
    
    const searchTerm = searchQuery.toLowerCase();
    
    // Para empresas
    if (contact.type === 'empresa') {
      const nomeFantasia = (contact.name || '').toLowerCase();
      const razaoSocial = (contact.razaoSocial || '').toLowerCase();
      const cnpj = (contact.cnpj || '').toLowerCase();
      const telefone = (contact.phone || '').toLowerCase();
      const email = (contact.email || '').toLowerCase();
      
      return (
        nomeFantasia.includes(searchTerm) ||
        razaoSocial.includes(searchTerm) ||
        cnpj.includes(searchTerm) ||
        telefone.includes(searchTerm) ||
        email.includes(searchTerm)
      );
    }
    
    // Para contatos
    const nome = (contact.name || '').toLowerCase();
    const telefone = (contact.phone || '').toLowerCase();
    const email = (contact.email || '').toLowerCase();
    const cpfCnpj = (contact.customFields?.cpf_cnpj || '').toString().toLowerCase();
    
    return (
      nome.includes(searchTerm) ||
      telefone.includes(searchTerm) ||
      email.includes(searchTerm) ||
      cpfCnpj.includes(searchTerm)
    );
  });

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
    setSearchQuery(contact.name);
    setShowContactList(false);

    // Verificar se existem tarefas para este contato
    const savedTasks = localStorage.getItem("calendar_tasks");
    if (savedTasks) {
      const tasks = JSON.parse(savedTasks);
      const existingTasks = tasks.filter((t: any) => t.contactId === contact.id);
      setContactExistingTasks(existingTasks);
    } else {
      setContactExistingTasks([]);
    }
  };

  const handleQuickDate = (days: number, optionId?: string) => {
    const now = new Date();
    let newDate: Date;
    let clearTime = false;

    if (days === -1) {
      // Após 15 min
      newDate = addMinutes(now, 15);
    } else if (days === -2) {
      // Após 30 min
      newDate = addMinutes(now, 30);
    } else if (days === -3) {
      // Em 1 hora
      newDate = addMinutes(now, 60);
    } else if (days === 0) {
      // Hoje
      newDate = addMinutes(now, 60);
    } else {
      // Amanhã, 7 dias, 30 dias, 1 ano - apenas preenche data
      newDate = addDays(now, days);
      clearTime = true;
    }

    // Verificar se cai em final de semana (0 = domingo, 6 = sábado)
    const dayOfWeek = newDate.getDay();
    if (dayOfWeek === 0) {
      // Domingo -> mover para segunda (adicionar 1 dia)
      newDate = addDays(newDate, 1);
      toast.info("Data ajustada para segunda-feira");
    } else if (dayOfWeek === 6) {
      // Sábado -> mover para segunda (adicionar 2 dias)
      newDate = addDays(newDate, 2);
      toast.info("Data ajustada para segunda-feira");
    }

    console.log("[NewTaskDialog] Quick option selected:", { days, newDate, clearTime });
    
    if (clearTime) {
      setDate(newDate);
      setDateInput(format(newDate, "dd/MM/yyyy"));
      setHours("");
      setMinutes("");
    } else {
      setFromInstant(newDate);
    }
    
    setSelectedQuickOption(optionId ?? null);
    setDatePickerOpen(false);
    setHourPickerOpen(false);
    setMinutePickerOpen(false);
  };

  // Ajusta data e preenche hora/min para o múltiplo de 15 mais próximo
  const setFromInstant = (d: Date) => {
    setDate(d);
    setDateInput(format(d, "dd/MM/yyyy"));
    let h = parseInt(format(d, "HH"));
    let m = parseInt(format(d, "mm"));
    let rounded = Math.round(m / 15) * 15; // aproxima ao mais próximo de 15
    if (rounded === 60) {
      h = (h + 1) % 24;
      rounded = 0;
    }
    setHours(h.toString().padStart(2, '0'));
    setMinutes(rounded.toString().padStart(2, '0'));
    setIsAllDay(false);
  };

  const applyDateMask = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    // Aplica a máscara dd/mm/aaaa
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 4) {
      return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    } else {
      return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
    }
  };

  const handleDateInputChange = (value: string) => {
    const masked = applyDateMask(value);
    setDateInput(masked);
    
    // Tentar fazer parse da data no formato dd/MM/yyyy
    if (masked.length === 10) {
      try {
        const parsed = parse(masked, "dd/MM/yyyy", new Date());
        if (!isNaN(parsed.getTime())) {
          setDate(parsed);
        } else {
          toast.error("Data inválida");
        }
      } catch (e) {
        toast.error("Data inválida");
      }
    }
  };

  // Gerar horários
  const hourSlots = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minuteSlots = ['00', '15', '30', '45'];

  const handleSave = () => {
    if (!selectedContact) {
      toast.error("Selecione um contato");
      return;
    }

    if (!date) {
      toast.error("Selecione uma data válida");
      return;
    }

    if (!isAllDay && (!hours || !minutes)) {
      toast.error("Selecione hora e minutos");
      return;
    }

    // Validar hora e minutos
    if (!isAllDay) {
      const h = parseInt(hours);
      const m = parseInt(minutes);
      if (isNaN(h) || h < 0 || h > 23) {
        toast.error("Hora inválida (0-23)");
        return;
      }
      if (isNaN(m) || m < 0 || m > 59) {
        toast.error("Minutos inválidos (0-59)");
        return;
      }
    }

    // Validar se a data/hora não é anterior ao momento atual
    const now = new Date();
    const taskDate = new Date(date);
    
    if (!isAllDay) {
      taskDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      if (taskDate < now) {
        toast.error("Não é possível adicionar tarefas com data/hora anterior ao momento atual");
        return;
      }
    }

    // Verificar conflitos se for "dia todo"
    if (isAllDay) {
      const savedTasks = localStorage.getItem("calendar_tasks");
      if (savedTasks) {
        const tasks = JSON.parse(savedTasks);
        const dateStr = format(date, "yyyy-MM-dd");
        const conflicts = tasks.filter((t: any) => 
          format(new Date(t.date), "yyyy-MM-dd") === dateStr
        );
        
        if (conflicts.length > 0) {
          // Mostrar diálogo de conflito
          setConflictingTasks(conflicts);
          setPendingTaskData({
            contactId: selectedContact.id,
            contactName: selectedContact.name,
            date,
            time: "",
            type: taskType,
            observation,
          });
          setConflictDialogOpen(true);
          return;
        }
      }
    }

    const timeString = isAllDay ? "" : `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;

    // Se estiver editando uma tarefa existente, atualizar ao invés de criar nova
    if (editingTaskId) {
      const savedTasks = localStorage.getItem("calendar_tasks");
      if (savedTasks) {
        const tasks = JSON.parse(savedTasks);
        const updatedTasks = tasks.map((t: any) => {
          if (t.id === editingTaskId) {
            return {
              ...t,
              date,
              time: timeString,
              type: taskType,
              observation,
            };
          }
          return t;
        });
        localStorage.setItem("calendar_tasks", JSON.stringify(updatedTasks));
        toast.success("Tarefa atualizada com sucesso");
        setEditingTaskId(null);
        onOpenChange(false);
        return;
      }
    }

    onSave({
      contactId: selectedContact.id,
      contactName: selectedContact.name,
      date,
      time: timeString,
      type: taskType,
      observation,
      isAllDay,
    });

    onOpenChange(false);
  };

  const handleMoveTasksToNextDay = () => {
    if (!pendingTaskData) return;

    const savedTasks = localStorage.getItem("calendar_tasks");
    if (savedTasks) {
      const tasks = JSON.parse(savedTasks);
      const nextDay = addDays(pendingTaskData.date, 1);
      
      // Mover tarefas conflitantes para o próximo dia
      const updatedTasks = tasks.map((t: any) => {
        const isConflicting = conflictingTasks.some(ct => ct.id === t.id);
        if (isConflicting) {
          return { ...t, date: nextDay.toISOString() };
        }
        return t;
      });
      
      localStorage.setItem("calendar_tasks", JSON.stringify(updatedTasks));
      toast.success(`${conflictingTasks.length} tarefa(s) movida(s) para ${format(nextDay, "dd/MM/yyyy")}`);
    }

    // Adicionar a nova tarefa
    onSave(pendingTaskData);
    setConflictDialogOpen(false);
    setPendingTaskData(null);
    setConflictingTasks([]);
    onOpenChange(false);
  };

  const handleKeepAllTasks = () => {
    if (!pendingTaskData) return;

    // Apenas adicionar a nova tarefa, mantendo as existentes
    onSave(pendingTaskData);
    setConflictDialogOpen(false);
    setPendingTaskData(null);
    setConflictingTasks([]);
    onOpenChange(false);
  };

  const handleCancelConflict = () => {
    setConflictDialogOpen(false);
    setPendingTaskData(null);
    setConflictingTasks([]);
  };

  const handleEditExistingTask = (task: any) => {
    // Preencher o formulário com os dados da tarefa
    setEditingTaskId(task.id);
    setDate(new Date(task.date));
    setDateInput(format(new Date(task.date), "dd/MM/yyyy"));
    
    if (task.time) {
      const [h, m] = task.time.split(':');
      setHours(h);
      setMinutes(m);
      setIsAllDay(false);
    } else {
      setIsAllDay(true);
      setHours("");
      setMinutes("");
    }
    
    setTaskType(task.type);
    setObservation(task.observation || "");
    
    toast.info("Editando tarefa existente");
  };

  const handleDeleteExistingTask = (taskId: string) => {
    const savedTasks = localStorage.getItem("calendar_tasks");
    if (savedTasks) {
      const tasks = JSON.parse(savedTasks);
      const updatedTasks = tasks.filter((t: any) => t.id !== taskId);
      localStorage.setItem("calendar_tasks", JSON.stringify(updatedTasks));
      
      // Atualizar lista de tarefas do contato
      const remainingTasks = contactExistingTasks.filter(t => t.id !== taskId);
      setContactExistingTasks(remainingTasks);
      
      toast.success("Tarefa excluída com sucesso");
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-6">
        <DialogHeader className="sr-only">
          <DialogTitle>Nova tarefa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Campo de busca de contato */}
          <div className="relative">
            <Input
              placeholder="Pesquisar e vincular uma empresa ou contato"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowContactList(e.target.value.length > 0);
              }}
              onFocus={() => searchQuery.length > 0 && setShowContactList(true)}
              className="w-full"
            />
            {selectedContact && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => {
                  setSelectedContact(null);
                  setSearchQuery("");
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
            
            {/* Lista de contatos */}
            {showContactList && filteredContacts.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border rounded-md shadow-lg max-h-60 overflow-y-auto">
                {filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="p-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0 transition-colors"
                    onClick={() => handleSelectContact(contact)}
                  >
                    <div className="flex items-center gap-2">
                      {contact.type === 'empresa' ? (
                        <Building2 className="w-4 h-4 text-primary" />
                      ) : (
                        <User className="w-4 h-4 text-blue-500" />
                      )}
                      <div className="font-medium text-sm">{contact.name}</div>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5 mt-1 ml-6">
                      {contact.type === 'empresa' && contact.razaoSocial && contact.razaoSocial !== contact.name && (
                        <div>Razão Social: {contact.razaoSocial}</div>
                      )}
                      {contact.type === 'empresa' && contact.cnpj && (
                        <div>CNPJ: {contact.cnpj}</div>
                      )}
                      {contact.type === 'contato' && contact.customFields?.cpf_cnpj && (
                        <div>CPF/CNPJ: {contact.customFields.cpf_cnpj}</div>
                      )}
                      {contact.phone && (
                        <div>Tel: {contact.phone}</div>
                      )}
                      {contact.email && (
                        <div>Email: {contact.email}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lista de tarefas existentes do contato */}
          {selectedContact && contactExistingTasks.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                Tarefas agendadas para {selectedContact.name}:
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                {contactExistingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between gap-2 p-2 bg-muted/30 rounded-sm hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {format(new Date(task.date), "dd/MM/yyyy", { locale: ptBR })}
                        {task.time && ` às ${task.time}`}
                        {!task.time && " (Dia todo)"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {task.type === 'accompany' ? 'Acompanhar' : task.type === 'call' ? 'Ligação' : 'Reunião'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleEditExistingTask(task)}
                        title="Editar tarefa"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteExistingTask(task.id)}
                        title="Excluir tarefa"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grid de data e hora */}
          <div className="grid grid-cols-3 gap-3">
            {/* Campo de data editável */}
            <div className="space-y-2">
              <Label className="text-sm">Data</Label>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <div className="relative">
                    <Input
                      placeholder="dd/mm/aaaa"
                      value={dateInput}
                      onChange={(e) => handleDateInputChange(e.target.value)}
                      className="pr-8"
                    />
                    <CalendarIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer" />
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 flex bg-background z-50 pointer-events-auto" align="start">
                  {/* Opções rápidas */}
                  <div className="border-r bg-background">
                    <ScrollArea className="h-[300px] w-[140px]">
                      <div className="p-2 space-y-1">
                        {[
                          { id: "15m", label: "Após 15 min", days: -1 },
                          { id: "30m", label: "Após 30 min", days: -2 },
                          { id: "1h", label: "Em 1 hora", days: -3 },
                          { id: "today", label: "Hoje", days: 0 },
                          { id: "tomorrow", label: "Amanhã", days: 1 },
                          { id: "7d", label: "Em 7 dias", days: 7 },
                          { id: "30d", label: "Em 30 dias", days: 30 },
                          { id: "1y", label: "Em 1 ano", days: 365 },
                        ].map(({ id, label, days }) => (
                          <button
                            key={id}
                            type="button"
                            role="option"
                            className={cn(
                              "w-full text-left px-2 py-1.5 text-xs rounded-sm transition-colors",
                              "hover:bg-accent/50 hover:text-accent-foreground focus:bg-accent/50",
                              selectedQuickOption === id && "bg-accent text-accent-foreground font-medium"
                            )}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleQuickDate(days, id);
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleQuickDate(days, id);
                            }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                  {/* Calendário */}
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(newDate) => {
                      if (newDate) {
                        setDate(newDate);
                        setDateInput(format(newDate, "dd/MM/yyyy"));
                        setDatePickerOpen(false);
                      }
                    }}
                    locale={ptBR}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Seletor de hora */}
            <div className="space-y-2">
              <Label className="text-sm">Hora</Label>
              <Popover open={hourPickerOpen} onOpenChange={setHourPickerOpen}>
                <PopoverTrigger asChild>
                  <div className="relative">
                    <Input
                      placeholder="HH"
                      value={hours}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 2);
                        if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 23)) {
                          setHours(value);
                        }
                      }}
                      disabled={isAllDay}
                      className="pr-8"
                      maxLength={2}
                    />
                    <Clock className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer" />
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-[120px] p-0 bg-background z-50" align="start">
                  <ScrollArea className="h-[320px]">
                    <div className="p-2 grid grid-cols-2 gap-1">
                      {hourSlots.map((hour) => (
                        <button
                          key={hour}
                          type="button"
                          className={cn(
                            "w-full text-left px-3 py-2 text-sm rounded hover:bg-accent transition-colors",
                            hours === hour && "bg-accent font-medium"
                          )}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setHours(hour);
                            setHourPickerOpen(false);
                          }}
                        >
                          {hour}
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>

            {/* Seletor de minutos */}
            <div className="space-y-2">
              <Label className="text-sm">Minutos</Label>
              <Popover open={minutePickerOpen} onOpenChange={setMinutePickerOpen}>
                <PopoverTrigger asChild>
                  <div className="relative">
                    <Input
                      placeholder="MM"
                      value={minutes}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 2);
                        if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 59)) {
                          setMinutes(value);
                        }
                      }}
                      disabled={isAllDay}
                      className="pr-8"
                      maxLength={2}
                    />
                    <Clock className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer" />
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-[100px] p-0 bg-background z-50" align="start">
                  <div className="p-2 space-y-1">
                    {minuteSlots.map((minute) => (
                      <button
                        key={minute}
                        type="button"
                        className={cn(
                          "w-full text-left px-3 py-2 text-sm rounded hover:bg-accent transition-colors",
                          minutes === minute && "bg-accent font-medium"
                        )}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setMinutes(minute);
                          setMinutePickerOpen(false);
                        }}
                      >
                        {minute}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Checkbox dia todo */}
          <div className="flex items-center gap-2">
            <Checkbox 
              id="allday" 
              checked={isAllDay}
              onCheckedChange={(checked) => {
                setIsAllDay(checked as boolean);
                if (checked) {
                  setHours("");
                  setMinutes("");
                }
              }}
            />
            <label htmlFor="allday" className="text-sm cursor-pointer">
              Dia todo
            </label>
          </div>

          {/* Tipo de tarefa */}
          <div className="space-y-2">
            <Label className="text-sm">Tipo</Label>
            <RadioGroup value={taskType} onValueChange={setTaskType} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="accompany" id="accompany" />
                <Label htmlFor="accompany" className="text-sm cursor-pointer">Acompanhar</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="call" id="call" />
                <Label htmlFor="call" className="text-sm cursor-pointer">Ligação</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="meeting" id="meeting" />
                <Label htmlFor="meeting" className="text-sm cursor-pointer">Reunião</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Atribuição */}
          <div className="space-y-2">
            <Label className="text-sm">Atribuir para</Label>
            <RadioGroup value={assignedTo} onValueChange={setAssignedTo} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="me" id="me" />
                <Label htmlFor="me" className="text-sm cursor-pointer">Eu</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="other" id="other" />
                <Label htmlFor="other" className="text-sm cursor-pointer">Outro usuário</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Observação */}
          <div className="space-y-2">
            <Label className="text-sm">Observação (opcional)</Label>
            <Textarea
              placeholder="Adicione uma observação..."
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* Botões de ação */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="ghost" onClick={() => onOpenChange(false)} size="sm">
              Cancelar
            </Button>
            <Button onClick={handleSave} size="sm">
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Diálogo de conflito */}
    <AlertDialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Tarefas existentes nesta data</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Já existem {conflictingTasks.length} tarefa(s) agendada(s) para {pendingTaskData && format(pendingTaskData.date, "dd/MM/yyyy")}:
              </p>
              <ScrollArea className="max-h-[200px] rounded-md border p-3">
                <div className="space-y-2">
                  {conflictingTasks.map((task, index) => (
                    <div key={task.id || index} className="text-sm border-b pb-2 last:border-b-0">
                      <div className="font-medium">{task.contactName}</div>
                      <div className="text-xs text-muted-foreground">
                        {task.time ? `${task.time}` : 'Dia todo'} - {task.type === 'accompany' ? 'Acompanhar' : task.type === 'call' ? 'Ligação' : 'Reunião'}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-sm">O que deseja fazer?</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={handleMoveTasksToNextDay} className="w-full" size="sm">
            Mover tarefas para o próximo dia
          </Button>
          <Button onClick={handleKeepAllTasks} variant="secondary" className="w-full" size="sm">
            Manter todas as tarefas
          </Button>
          <AlertDialogCancel onClick={handleCancelConflict} className="w-full mt-0" asChild>
            <Button variant="outline" size="sm">Cancelar</Button>
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    </>
  );
}
