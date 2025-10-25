import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { X, CalendarIcon, Clock } from "lucide-react";
import { format, addDays, addMinutes, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [hourPickerOpen, setHourPickerOpen] = useState(false);
  const [minutePickerOpen, setMinutePickerOpen] = useState(false);

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
    
    if (days === -1) { // 15 minutos
      newDate = addMinutes(now, 15);
      setDate(newDate);
      setDateInput(format(newDate, "dd/MM/yyyy"));
      const hour = format(newDate, "HH");
      const minute = format(newDate, "mm");
      // Arredondar minutos para múltiplo de 15
      const roundedMinute = Math.floor(parseInt(minute) / 15) * 15;
      setHours(hour);
      setMinutes(roundedMinute.toString().padStart(2, '0'));
      setIsAllDay(false);
    } else if (days === -2) { // 30 minutos
      newDate = addMinutes(now, 30);
      setDate(newDate);
      setDateInput(format(newDate, "dd/MM/yyyy"));
      const hour = format(newDate, "HH");
      const minute = format(newDate, "mm");
      const roundedMinute = Math.floor(parseInt(minute) / 15) * 15;
      setHours(hour);
      setMinutes(roundedMinute.toString().padStart(2, '0'));
      setIsAllDay(false);
    } else if (days === -3) { // 1 hora
      newDate = addMinutes(now, 60);
      setDate(newDate);
      setDateInput(format(newDate, "dd/MM/yyyy"));
      const hour = format(newDate, "HH");
      const minute = format(newDate, "mm");
      const roundedMinute = Math.floor(parseInt(minute) / 15) * 15;
      setHours(hour);
      setMinutes(roundedMinute.toString().padStart(2, '0'));
      setIsAllDay(false);
    } else {
      newDate = addDays(now, days);
      setDate(newDate);
      setDateInput(format(newDate, "dd/MM/yyyy"));
    }
    
    setDatePickerOpen(false);
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

    const timeString = isAllDay ? "" : `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;

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
      <DialogContent className="max-w-2xl p-6">
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
                <PopoverContent className="w-auto p-0 flex bg-background z-50" align="start">
                  {/* Opções rápidas */}
                  <div className="border-r bg-background">
                    <ScrollArea className="h-[300px] w-[140px]">
                      <div className="p-2 space-y-1">
                        {[
                          { label: "Após 15 min", days: -1 },
                          { label: "Após 30 min", days: -2 },
                          { label: "Em 1 hora", days: -3 },
                          { label: "Hoje", days: 0 },
                          { label: "Amanhã", days: 1 },
                          { label: "Em 7 dias", days: 7 },
                          { label: "Em 30 dias", days: 30 },
                          { label: "Em 1 ano", days: 365 },
                        ].map(({ label, days }) => (
                          <button
                            key={label}
                            type="button"
                            className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent transition-colors"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleQuickDate(days);
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
                  <ScrollArea className="h-[280px]">
                    <div className="p-2 space-y-1">
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
  );
}
