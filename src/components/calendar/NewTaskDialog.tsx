import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { X, CalendarIcon } from "lucide-react";
import { format, addDays, addMinutes, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

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
  const [dateInput, setDateInput] = useState("");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [isAllDay, setIsAllDay] = useState(false);
  const [taskType, setTaskType] = useState("accompany");
  const [assignedTo, setAssignedTo] = useState("me");
  const [observation, setObservation] = useState("");
  const [selectedQuickOption, setSelectedQuickOption] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

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
      setDateInput("");
      setHours("");
      setMinutes("");
      setIsAllDay(false);
      setTaskType("accompany");
      setAssignedTo("me");
      setObservation("");
      setShowCalendar(false);
    } else {
      setDateInput(format(initialDate || new Date(), "dd/MM/yyyy"));
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
    setShowCalendar(false);
    
    if (days === 0) {
      newDate = now;
    } else if (days === 1) {
      newDate = addDays(now, 1);
    } else if (days === 7) {
      newDate = addDays(now, 7);
    } else if (days === 30) {
      newDate = addDays(now, 30);
    } else if (days === 365) {
      newDate = addDays(now, 365);
    } else if (days === -1) { // 15 minutos
      newDate = addMinutes(now, 15);
      setDate(newDate);
      setDateInput(format(newDate, "dd/MM/yyyy"));
      setHours(format(newDate, "HH"));
      setMinutes(format(newDate, "mm"));
      setIsAllDay(false);
      return;
    } else if (days === -2) { // 30 minutos
      newDate = addMinutes(now, 30);
      setDate(newDate);
      setDateInput(format(newDate, "dd/MM/yyyy"));
      setHours(format(newDate, "HH"));
      setMinutes(format(newDate, "mm"));
      setIsAllDay(false);
      return;
    } else if (days === -3) { // 1 hora
      newDate = addMinutes(now, 60);
      setDate(newDate);
      setDateInput(format(newDate, "dd/MM/yyyy"));
      setHours(format(newDate, "HH"));
      setMinutes(format(newDate, "mm"));
      setIsAllDay(false);
      return;
    } else {
      newDate = addDays(now, days);
    }
    
    setDate(newDate);
    setDateInput(format(newDate, "dd/MM/yyyy"));
  };

  const handleDateInputChange = (value: string) => {
    setDateInput(value);
    // Tentar fazer parse da data no formato dd/MM/yyyy
    if (value.length === 10) {
      try {
        const parsed = parse(value, "dd/MM/yyyy", new Date());
        if (!isNaN(parsed.getTime())) {
          setDate(parsed);
        }
      } catch (e) {
        // Ignorar erro de parse
      }
    }
  };

  // Gerar horários
  const hourSlots = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minuteSlots = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  const handleSave = () => {
    if (!selectedContact) {
      toast.error("Selecione um contato");
      return;
    }

    if (!date) {
      toast.error("Selecione uma data");
      return;
    }

    if (!isAllDay && (!hours || !minutes)) {
      toast.error("Selecione um horário completo (hora e minuto)");
      return;
    }

    // Validar se a data/hora não é anterior ao momento atual
    const now = new Date();
    const taskDate = new Date(date);
    
    if (!isAllDay) {
      taskDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    }

    if (taskDate < now && !isAllDay) {
      toast.error("Não é possível adicionar tarefas com data/hora anterior ao momento atual");
      return;
    }

    const timeString = isAllDay ? "" : `${hours}:${minutes}`;

    onSave({
      contactId: selectedContact.id,
      contactName: selectedContact.name,
      date,
      time: timeString,
      type: taskType,
      observation,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden">
        <div className="p-6 space-y-4">
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
              className="border rounded-md px-3 py-2"
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
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
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

          {/* Campo de data e informações */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Input
                placeholder="dd/mm/aaaa"
                value={dateInput}
                onChange={(e) => handleDateInputChange(e.target.value)}
                onFocus={() => setShowCalendar(true)}
                className="w-32 text-sm"
              />
            </div>

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

            <span className="text-sm text-muted-foreground">para</span>
            <span className="text-sm font-medium">
              {selectedContact?.name || "Selecione um contato"}:
            </span>

            <RadioGroup value={taskType} onValueChange={setTaskType} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="accompany" id="accompany" />
                <Label htmlFor="accompany" className="text-sm cursor-pointer">Acompanhar</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Layout principal: Opções rápidas | Calendário | Seleção de hora */}
          <div className="grid grid-cols-[140px_1fr_auto] gap-4 h-[400px]">
            {/* Opções rápidas de data */}
            <div className="space-y-1 overflow-y-auto pr-2">
              {[
                { label: "Após 15 minutos", days: -1, id: "15min" },
                { label: "Após 30 minutos", days: -2, id: "30min" },
                { label: "Em uma hora", days: -3, id: "1hour" },
                { label: "Hoje", days: 0, id: "today" },
                { label: "Amanhã", days: 1, id: "tomorrow" },
                { label: "Esta semana", days: 7, id: "week" },
                { label: "Em 7 dias", days: 7, id: "7days" },
                { label: "Em 30 dias", days: 30, id: "30days" },
                { label: "Em 1 ano", days: 365, id: "1year" },
              ].map(({ label, days, id }) => (
                <button
                  key={id}
                  className={cn(
                    "w-full text-left px-3 py-2 text-xs rounded hover:bg-accent transition-colors",
                    selectedQuickOption === id && "bg-accent font-medium"
                  )}
                  onClick={() => handleQuickDate(days, id)}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Calendário ou Tabs de horário */}
            <div className="border rounded-md p-4 overflow-auto">
              {showCalendar ? (
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(newDate) => {
                      if (newDate) {
                        setDate(newDate);
                        setDateInput(format(newDate, "dd/MM/yyyy"));
                        setSelectedQuickOption(null);
                      }
                    }}
                    locale={ptBR}
                    className="pointer-events-auto"
                  />
                </div>
              ) : (
                <Tabs defaultValue="accompany" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="allday" onClick={() => setIsAllDay(true)}>
                      Dia todo
                    </TabsTrigger>
                    <TabsTrigger 
                      value="accompany" 
                      onClick={() => setIsAllDay(false)}
                    >
                      Acompanhar
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="allday" className="mt-4">
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Tarefa configurada para o dia todo
                    </p>
                  </TabsContent>
                  <TabsContent value="accompany" className="mt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4 max-h-[280px] overflow-y-auto pr-2">
                      {hourSlots.map((hour) => (
                        <button
                          key={hour}
                          className={cn(
                            "px-3 py-2 text-sm rounded hover:bg-accent transition-colors text-left",
                            hours === hour && "bg-accent font-medium"
                          )}
                          onClick={() => setHours(hour)}
                        >
                          {hour}:00
                        </button>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </div>

            {/* Seleção de minutos */}
            {!isAllDay && !showCalendar && hours && (
              <div className="border rounded-md p-4 w-32 overflow-y-auto">
                <div className="text-xs font-medium mb-2 text-muted-foreground">
                  Minutos
                </div>
                <div className="space-y-1">
                  {minuteSlots.filter((_, i) => i % 5 === 0).map((minute) => (
                    <button
                      key={minute}
                      className={cn(
                        "w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent transition-colors",
                        minutes === minute && "bg-accent font-medium"
                      )}
                      onClick={() => setMinutes(minute)}
                    >
                      {minute}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Campo de observação e atribuição */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Atribuir para:</span>
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

            <Textarea
              placeholder="Adicionar observação (opcional)"
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
  );
}
