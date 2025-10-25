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

  const handleQuickDate = (days: number) => {
    const now = new Date();
    let newDate: Date;
    
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
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="sr-only">Nova Tarefa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="p-3 hover:bg-accent cursor-pointer border-b last:border-b-0"
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
          <div className="flex items-center gap-4 flex-wrap text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : "Selecione uma data"}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Checkbox 
                id="allday" 
                checked={isAllDay}
                onCheckedChange={(checked) => setIsAllDay(checked as boolean)}
              />
              <label htmlFor="allday" className="text-sm cursor-pointer">
                Dia todo
              </label>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">para</span>
              <span className="font-medium">
                {selectedContact?.name || "Selecione um contato"}
              </span>
            </div>

            <Select value={taskType} onValueChange={setTaskType}>
              <SelectTrigger className="w-auto border-0 h-auto p-0 text-sm font-medium focus:ring-0">
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
          <div className="grid grid-cols-[160px_1fr_200px] gap-4 h-[400px]">
            {/* Opções rápidas de data */}
            <div className="space-y-1 overflow-y-auto pr-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm font-normal"
                onClick={() => handleQuickDate(-1)}
              >
                Após 15 minutos
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm font-normal"
                onClick={() => handleQuickDate(-2)}
              >
                Após 30 minutos
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm font-normal"
                onClick={() => handleQuickDate(-3)}
              >
                Em uma hora
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm font-normal"
                onClick={() => handleQuickDate(0)}
              >
                Hoje
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm font-normal"
                onClick={() => handleQuickDate(1)}
              >
                Amanhã
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm font-normal"
                onClick={() => handleQuickDate(7)}
              >
                Esta semana
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm font-normal"
                onClick={() => handleQuickDate(7)}
              >
                Em 7 dias
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm font-normal"
                onClick={() => handleQuickDate(30)}
              >
                Em 30 dias
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm font-normal"
                onClick={() => handleQuickDate(365)}
              >
                Em 1 ano
              </Button>
            </div>

            {/* Calendário */}
            <div className="flex items-start justify-center">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                locale={ptBR}
                className="pointer-events-auto border rounded-lg"
              />
            </div>

            {/* Lista de horários */}
            {!isAllDay && (
              <div className="space-y-1 overflow-y-auto pr-2 border-l pl-4">
                <div className="text-sm font-medium mb-2 sticky top-0 bg-background">
                  Acompanhar
                </div>
                {timeSlots.map((slot) => (
                  <Button
                    key={slot}
                    variant={time === slot ? "default" : "ghost"}
                    size="sm"
                    className="w-full justify-start text-sm font-normal"
                    onClick={() => setTime(slot)}
                  >
                    {slot}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Botões de ação */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
