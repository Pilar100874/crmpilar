import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Search, Filter, Users, CheckSquare, Square, 
  Building2, Phone, Mail, Tag, Calendar, AlertTriangle, ShieldX, Shield
} from "lucide-react";
import { ContactForBulkSend, EnvioMassaFilters, CanalEnvio } from "../types";
import { cn } from "@/lib/utils";

interface StepFilterProps {
  contacts: ContactForBulkSend[];
  selectedContacts: ContactForBulkSend[];
  segmentos: { id: string; nome: string }[];
  filters: EnvioMassaFilters;
  onFilterChange: (filters: EnvioMassaFilters) => void;
  onSelectContacts: (contacts: ContactForBulkSend[]) => void;
  onBack: () => void;
  onNext: () => void;
  canal: CanalEnvio | null;
}

export function StepFilter({
  contacts,
  selectedContacts,
  segmentos,
  filters,
  onFilterChange,
  onSelectContacts,
  onBack,
  onNext,
  canal
}: StepFilterProps) {
  const [localFilters, setLocalFilters] = useState<EnvioMassaFilters>(filters);
  const [accordionValue, setAccordionValue] = useState<string>("filters");

  const eligibleContacts = contacts.filter(c => !c.isBlocked);
  const blockedContacts = contacts.filter(c => c.isBlocked);

  const handleFilterChange = (key: keyof EnvioMassaFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  const toggleContact = (contact: ContactForBulkSend) => {
    // Don't allow selecting blocked contacts
    if (contact.isBlocked) return;
    
    const isSelected = selectedContacts.some(c => c.id === contact.id);
    if (isSelected) {
      onSelectContacts(selectedContacts.filter(c => c.id !== contact.id));
    } else {
      onSelectContacts([...selectedContacts, contact]);
    }
  };

  const selectAll = () => {
    // Only select eligible (non-blocked) contacts
    onSelectContacts([...eligibleContacts]);
  };

  const deselectAll = () => {
    onSelectContacts([]);
  };

  const toggleSegmento = (segmentoId: string) => {
    const current = localFilters.segmentos || [];
    const newSegmentos = current.includes(segmentoId)
      ? current.filter(s => s !== segmentoId)
      : [...current, segmentoId];
    handleFilterChange('segmentos', newSegmentos);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Content */}
      <div className="flex-1 space-y-4 min-h-0 overflow-hidden flex flex-col">
        {/* Resumo Anti-Bloqueio */}
        {blockedContacts.length > 0 && (
          <Card className="p-3 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/50">
                <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Sistema Anti-Bloqueio Ativo
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  {blockedContacts.length} contato(s) bloqueado(s) pelas regras de permissão
                </p>
              </div>
              <Badge variant="outline" className="border-amber-300 text-amber-700 dark:text-amber-300">
                {eligibleContacts.length} elegíveis
              </Badge>
            </div>
          </Card>
        )}

        {/* Filtros */}
        <Accordion type="single" collapsible value={accordionValue} onValueChange={setAccordionValue} className="border rounded-lg shrink-0">
        <AccordionItem value="filters" className="border-0">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="font-medium">Filtros de Contatos</span>
              {Object.values(filters).some(v => v && (Array.isArray(v) ? v.length > 0 : true)) && (
                <Badge variant="secondary" className="ml-2">Ativo</Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Nome */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Search className="h-3 w-3" /> Nome
                </Label>
                <Input
                  placeholder="Buscar por nome..."
                  value={localFilters.nome || ''}
                  onChange={(e) => handleFilterChange('nome', e.target.value)}
                />
              </div>

              {/* Telefone */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Telefone
                </Label>
                <Input
                  placeholder="Buscar por telefone..."
                  value={localFilters.telefone || ''}
                  onChange={(e) => handleFilterChange('telefone', e.target.value)}
                />
              </div>

              {/* Empresa */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> Empresa
                </Label>
                <Input
                  placeholder="Buscar por empresa..."
                  value={localFilters.empresa || ''}
                  onChange={(e) => handleFilterChange('empresa', e.target.value)}
                />
              </div>

              {/* Data Cadastro */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Data Cadastro (de)
                </Label>
                <Input
                  type="date"
                  value={localFilters.dataCadastroInicio || ''}
                  onChange={(e) => handleFilterChange('dataCadastroInicio', e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Data Cadastro (até)
                </Label>
                <Input
                  type="date"
                  value={localFilters.dataCadastroFim || ''}
                  onChange={(e) => handleFilterChange('dataCadastroFim', e.target.value)}
                />
              </div>
            </div>

            {/* Segmentos */}
            {segmentos.length > 0 && (
              <div className="mt-4 space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Tag className="h-3 w-3" /> Segmentos
                </Label>
                <div className="flex flex-wrap gap-2">
                  {segmentos.map(seg => (
                    <Badge
                      key={seg.id}
                      variant={localFilters.segmentos?.includes(seg.id) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleSegmento(seg.id)}
                    >
                      {seg.nome}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Lista de Contatos */}
      <div className="border rounded-lg flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 shrink-0">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{contacts.length} contatos</span>
            {blockedContacts.length > 0 && (
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                <ShieldX className="h-3 w-3 mr-1" />
                {blockedContacts.length} bloqueados
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
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

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {contacts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Nenhum contato encontrado</p>
                <p className="text-sm">Ajuste os filtros para ver mais resultados</p>
              </div>
            ) : (
              contacts.map(contact => (
                <TooltipProvider key={contact.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Card
                        className={cn(
                          "p-3 transition-all",
                          contact.isBlocked
                            ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 opacity-60 cursor-not-allowed"
                            : selectedContacts.some(c => c.id === contact.id)
                            ? "bg-primary/10 border-primary/30 cursor-pointer hover:shadow-sm"
                            : "hover:bg-muted/50 cursor-pointer hover:shadow-sm"
                        )}
                        onClick={() => toggleContact(contact)}
                      >
                        <div className="flex items-center gap-3">
                          {contact.isBlocked ? (
                            <div className="p-1 rounded bg-red-100 dark:bg-red-900/50">
                              <ShieldX className="h-4 w-4 text-red-500" />
                            </div>
                          ) : (
                            <Checkbox
                              checked={selectedContacts.some(c => c.id === contact.id)}
                              onCheckedChange={() => toggleContact(contact)}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={cn(
                                "font-medium truncate",
                                contact.isBlocked && "text-red-700 dark:text-red-300"
                              )}>
                                {contact.nome}
                              </p>
                              {contact.isBlocked && (
                                <Badge variant="outline" className="text-xs border-red-300 text-red-600 dark:text-red-400 shrink-0">
                                  Bloqueado
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              {canal === 'email' ? (
                                contact.email && (
                                  <span className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {contact.email}
                                  </span>
                                )
                              ) : (
                                contact.telefone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {contact.telefone}
                                  </span>
                                )
                              )}
                              {contact.empresa && (
                                <span className="flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {contact.empresa}
                                </span>
                              )}
                              {contact.lastContactDays !== null && contact.lastContactDays !== undefined && (
                                <span className="text-xs text-muted-foreground">
                                  Último contato: {contact.lastContactDays}d
                                </span>
                              )}
                            </div>
                          </div>
                          {contact.tags && contact.tags.length > 0 && !contact.isBlocked && (
                            <div className="flex gap-1">
                              {contact.tags.slice(0, 2).map((tag, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {contact.tags.length > 2 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{contact.tags.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </Card>
                    </TooltipTrigger>
                    {contact.isBlocked && contact.blockReason && (
                      <TooltipContent side="top" className="max-w-xs">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                          <span>{contact.blockReason}</span>
                        </div>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      </div>

      {/* Footer - Always at bottom */}
      <div className="flex items-center justify-between pt-4 border-t mt-4 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack}>
            Voltar
          </Button>
          <div className="text-sm text-muted-foreground">
            <Badge variant="outline" className="mr-2">{selectedContacts.length}</Badge>
            selecionados
            {canal && (
              <span className="hidden sm:inline ml-1 text-xs">
                ({canal === 'whatsapp' ? 'telefone' : 'e-mail'})
              </span>
            )}
          </div>
        </div>
        <Button onClick={onNext} disabled={selectedContacts.length === 0}>
          Continuar
        </Button>
      </div>
    </div>
  );
}
