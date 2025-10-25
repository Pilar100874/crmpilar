import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Calendar as CalendarIcon, Clock, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [date, setDate] = useState<Date | undefined>(initialDate || new Date());
  const [time, setTime] = useState("");
  const [taskType, setTaskType] = useState("call");
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
      setStep(1);
      setSearchQuery("");
      setSelectedContact(null);
      setDate(initialDate || new Date());
      setTime("");
      setTaskType("call");
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
    setStep(2);
  };

  const handleSave = () => {
    if (!selectedContact) {
      toast.error("Selecione um contato");
      return;
    }

    if (!date) {
      toast.error("Selecione uma data");
      return;
    }

    if (!time) {
      toast.error("Selecione um horário");
      return;
    }

    // Validar se a data/hora não é anterior ao momento atual
    const now = new Date();
    const taskDate = new Date(date);
    const [hours, minutes] = time.split(':').map(Number);
    taskDate.setHours(hours, minutes, 0, 0);

    if (taskDate < now) {
      toast.error("Não é possível adicionar tarefas com data/hora anterior ao momento atual");
      return;
    }

    onSave({
      contactId: selectedContact.id,
      contactName: selectedContact.name,
      date,
      time,
      type: taskType,
      observation,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Tarefa</DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Buscar Contato</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, CPF, CNPJ, empresa, fantasia, WhatsApp ou email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto border rounded-lg">
              {filteredContacts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  {searchQuery ? "Nenhum contato encontrado" : "Nenhum contato cadastrado"}
                </div>
              ) : (
                filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="p-4 border-b last:border-b-0 hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => handleSelectContact(contact)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{contact.name}</div>
                        {contact.customFields?.company_name && (
                          <div className="text-sm text-muted-foreground">
                            {contact.customFields.company_name}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1 space-x-3">
                          <span>{contact.phone}</span>
                          <span>{contact.email}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Contato selecionado */}
            <div className="bg-accent rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <User className="w-4 h-4" />
                <span>Contato selecionado</span>
              </div>
              <div className="font-medium">{selectedContact?.name}</div>
              {selectedContact?.customFields?.company_name && (
                <div className="text-sm text-muted-foreground">
                  {selectedContact.customFields.company_name}
                </div>
              )}
            </div>

            {/* Tipo de tarefa */}
            <div className="space-y-2">
              <Label>Tipo de Tarefa *</Label>
              <Select value={taskType} onValueChange={setTaskType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Ligação</SelectItem>
                  <SelectItem value="meeting">Reunião</SelectItem>
                  <SelectItem value="accompany">Acompanhamento</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Data e Hora */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                      locale={ptBR}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Hora *</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Observação */}
            <div className="space-y-2">
              <Label>Observação</Label>
              <Textarea
                placeholder="Adicione observações sobre a tarefa..."
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                Voltar
              </Button>
              <Button onClick={handleSave} className="flex-1">
                Salvar Tarefa
              </Button>
            </div>
          </div>
        )}

        {step === 1 && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
