import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Search, User, X } from "lucide-react";
import { format, addDays, addWeeks, addMonths, addYears, addMinutes, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

interface Contact {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  customFields: Record<string, any>;
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
  }) => void;
  initialDate?: Date;
}

export function NewTaskDialog({ open, onOpenChange, onSave, initialDate }: NewTaskDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showContactList, setShowContactList] = useState(false);
  const [date, setDate] = useState<Date | undefined>(initialDate || new Date());
  const [time, setTime] = useState("");
  const [isAllDay, setIsAllDay] = useState(false);
  const [taskType, setTaskType] = useState("accompany");
  const [observation, setObservation] = useState("");
  const [selectedQuickOption, setSelectedQuickOption] = useState<string | null>(null);

  // Carregar contatos do localStorage
  useEffect(() => {
    if (open) {
      const savedContacts = localStorage.getItem("contacts");
      if (savedContacts) {
        const parsedContacts = JSON.parse(savedContacts);
        setContacts(parsedContacts.filter((c: Contact) => c.customFields?.active !== false));
      }
    }
  }, [open]);

  // Resetar ao fechar
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSelectedContact(null);
      setShowContactList(false);
      setDate(initialDate || new Date());
      setTime("");
      setIsAllDay(false);
      setTaskType("accompany");
      setObservation("");
    }
  }, [open, initialDate]);

  // Filtrar contatos baseado na busca unificada
  const filteredContacts = contacts.filter(contact => {
    if (!searchQuery) return true;
    
    const searchTerm = searchQuery.toLowerCase();
    const cpfCnpj = (contact.customFields?.cpf_cnpj || "").toString().toLowerCase();
    const companyName = (contact.customFields?.company_name || "").toString().toLowerCase();
    const companyFantasia = (contact.customFields?.company_fantasia || "").toString().toLowerCase();
    
    return (
      contact.name.toLowerCase().includes(searchTerm) ||
      cpfCnpj.includes(searchTerm) ||
      companyName.includes(searchTerm) ||
      companyFantasia.includes(searchTerm) ||
      contact.phone.includes(searchTerm) ||
      contact.email.toLowerCase().includes(searchTerm)
    );
  });

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
    setSearchQuery(contact.name);
    setShowContactList(false);
  };

  const handleQuickDate = (days: number, optionId: string) => {
    const now = new Date();
    let newDate: Date;
    
    setSelectedQuickOption(optionId);
    
    if (days === 0) {
      newDate = now;
    } else if (days === 1) {
      newDate = addDays(now, 1);
    } else if (days === 7) {
      newDate = addDays(now, 7);
    } else if (days === 30) {
      newDate = addDays(now, 30);
    } else if (days === 365) {
      newDate = addYears(now, 1);
    } else if (days === -1) { // 15 minutos
      newDate = addMinutes(now, 15);
      setDate(newDate);
      setTime(format(newDate, "HH:mm"));
      setIsAllDay(false);
      return;
    } else if (days === -2) { // 30 minutos
      newDate = addMinutes(now, 30);
      setDate(newDate);
      setTime(format(newDate, "HH:mm"));
      setIsAllDay(false);
      return;
    } else if (days === -3) { // 1 hora
      newDate = addMinutes(now, 60);
      setDate(newDate);
      setTime(format(newDate, "HH:mm"));
      setIsAllDay(false);
      return;
    } else {
      newDate = addDays(now, days);
    }
    
    setDate(newDate);
  };

  // Gerar horários de 00:00 até 23:00
  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return `${hour}:00`;
  });

  const handleSave = () => {
    if (!selectedContact) {
      toast.error("Selecione um contato");
      return;
    }

    if (!date) {
      toast.error("Selecione uma data");
      return;
    }

    if (!isAllDay && !time) {
      toast.error("Selecione um horário");
      return;
    }

    // Validar se a data/hora não é anterior ao momento atual
    const now = new Date();
    const taskDate = new Date(date);
    
    if (!isAllDay) {
      const [hours, minutes] = time.split(':').map(Number);
      taskDate.setHours(hours, minutes, 0, 0);
    }

    if (taskDate < now && !isAllDay) {
      toast.error("Não é possível adicionar tarefas com data/hora anterior ao momento atual");
      return;
    }

    onSave({
      contactId: selectedContact.id,
      contactName: selectedContact.name,
      date,
      time: isAllDay ? "" : time,
      type: taskType,
      observation,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <div className="p-6 space-y-6">
          {/* Campo de busca de contato */}
          <div className="relative">
            <Input
              placeholder="Contato ou lead"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowContactList(e.target.value.length > 0);
              }}
              onFocus={() => searchQuery.length > 0 && setShowContactList(true)}
              className="border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
            />
            {selectedContact && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
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
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
                {filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="p-3 hover:bg-accent cursor-pointer"
                    onClick={() => handleSelectContact(contact)}
                  >
                    <div className="font-medium text-sm">{contact.name}</div>
                    {contact.customFields?.company_name && (
                      <div className="text-xs text-muted-foreground">
                        {contact.customFields.company_name}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Informações da tarefa */}
          <div className="flex items-center gap-3 flex-wrap text-sm text-muted-foreground">
            <span>
              {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : "Selecione uma data"}
            </span>
            
            <div className="flex items-center gap-1.5">
              <Checkbox 
                id="allday" 
                checked={isAllDay}
                onCheckedChange={(checked) => {
                  setIsAllDay(checked as boolean);
                  if (checked) setTime("");
                }}
              />
              <label htmlFor="allday" className="text-xs cursor-pointer">
                Dia todo
              </label>
            </div>

            <span>para</span>
            <span className="text-foreground font-medium">
              {selectedContact?.name || "Selecione um contato"}
            </span>

            <Select value={taskType} onValueChange={setTaskType}>
              <SelectTrigger className="w-auto border-0 h-auto p-0 text-xs focus:ring-0 text-foreground font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="accompany">Acompanhar</SelectItem>
                <SelectItem value="call">Ligação</SelectItem>
                <SelectItem value="meeting">Reunião</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Layout principal: Opções rápidas | Calendário | Horários */}
          <div className="grid grid-cols-[140px_1fr_180px] gap-6 h-[380px]">
            {/* Opções rápidas de data */}
            <div className="space-y-0.5 overflow-y-auto">
              <button
                className={cn(
                  "w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent transition-colors",
                  selectedQuickOption === "15min" && "bg-accent"
                )}
                onClick={() => handleQuickDate(-1, "15min")}
              >
                Após 15 minutos
              </button>
              <button
                className={cn(
                  "w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent transition-colors",
                  selectedQuickOption === "30min" && "bg-accent"
                )}
                onClick={() => handleQuickDate(-2, "30min")}
              >
                Após 30 minutos
              </button>
              <button
                className={cn(
                  "w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent transition-colors",
                  selectedQuickOption === "1hour" && "bg-accent"
                )}
                onClick={() => handleQuickDate(-3, "1hour")}
              >
                Em uma hora
              </button>
              <button
                className={cn(
                  "w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent transition-colors",
                  selectedQuickOption === "today" && "bg-accent"
                )}
                onClick={() => handleQuickDate(0, "today")}
              >
                Hoje
              </button>
              <button
                className={cn(
                  "w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent transition-colors",
                  selectedQuickOption === "tomorrow" && "bg-accent"
                )}
                onClick={() => handleQuickDate(1, "tomorrow")}
              >
                Amanhã
              </button>
              <button
                className={cn(
                  "w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent transition-colors",
                  selectedQuickOption === "week" && "bg-accent"
                )}
                onClick={() => handleQuickDate(7, "week")}
              >
                Esta semana
              </button>
              <button
                className={cn(
                  "w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent transition-colors",
                  selectedQuickOption === "7days" && "bg-accent"
                )}
                onClick={() => handleQuickDate(7, "7days")}
              >
                Em 7 dias
              </button>
              <button
                className={cn(
                  "w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent transition-colors",
                  selectedQuickOption === "30days" && "bg-accent"
                )}
                onClick={() => handleQuickDate(30, "30days")}
              >
                Em 30 dias
              </button>
              <button
                className={cn(
                  "w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent transition-colors",
                  selectedQuickOption === "1year" && "bg-accent"
                )}
                onClick={() => handleQuickDate(365, "1year")}
              >
                Em 1 ano
              </button>
            </div>

            {/* Calendário */}
            <div className="flex items-start justify-center">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(newDate) => {
                  setDate(newDate);
                  setSelectedQuickOption(null);
                }}
                locale={ptBR}
                className="pointer-events-auto"
              />
            </div>

            {/* Lista de horários */}
            {!isAllDay && (
              <div className="space-y-0.5 overflow-y-auto border-l pl-4">
                <div className="text-xs font-medium mb-2 text-muted-foreground sticky top-0 bg-background">
                  {taskType === "accompany" ? "Acompanhar" : 
                   taskType === "call" ? "Ligação" : 
                   taskType === "meeting" ? "Reunião" : "Outro"}
                </div>
                {timeSlots.map((slot) => (
                  <button
                    key={slot}
                    className={cn(
                      "w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent transition-colors",
                      time === slot && "bg-accent font-medium"
                    )}
                    onClick={() => setTime(slot)}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Botões de ação */}
          <div className="flex justify-end gap-2 pt-2">
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
  );
}
