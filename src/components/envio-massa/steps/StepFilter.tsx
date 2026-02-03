import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  Search, Filter, Users, CheckSquare, Square, 
  Building2, Phone, Mail, Tag, Calendar
} from "lucide-react";
import { ContactForBulkSend, EnvioMassaFilters } from "../types";
import { cn } from "@/lib/utils";

interface StepFilterProps {
  contacts: ContactForBulkSend[];
  selectedContacts: ContactForBulkSend[];
  segmentos: { id: string; nome: string }[];
  filters: EnvioMassaFilters;
  onFilterChange: (filters: EnvioMassaFilters) => void;
  onSelectContacts: (contacts: ContactForBulkSend[]) => void;
  onNext: () => void;
}

export function StepFilter({
  contacts,
  selectedContacts,
  segmentos,
  filters,
  onFilterChange,
  onSelectContacts,
  onNext
}: StepFilterProps) {
  const [localFilters, setLocalFilters] = useState<EnvioMassaFilters>(filters);

  const handleFilterChange = (key: keyof EnvioMassaFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  const toggleContact = (contact: ContactForBulkSend) => {
    const isSelected = selectedContacts.some(c => c.id === contact.id);
    if (isSelected) {
      onSelectContacts(selectedContacts.filter(c => c.id !== contact.id));
    } else {
      onSelectContacts([...selectedContacts, contact]);
    }
  };

  const selectAll = () => {
    onSelectContacts([...contacts]);
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
    <div className="space-y-4">
      {/* Filtros */}
      <Accordion type="single" collapsible defaultValue="filters" className="border rounded-lg">
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
      <div className="border rounded-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{contacts.length} contatos encontrados</span>
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

        <ScrollArea className="h-[400px]">
          <div className="p-2 space-y-1">
            {contacts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Nenhum contato encontrado</p>
                <p className="text-sm">Ajuste os filtros para ver mais resultados</p>
              </div>
            ) : (
              contacts.map(contact => (
                <Card
                  key={contact.id}
                  className={cn(
                    "p-3 cursor-pointer transition-all hover:shadow-sm",
                    selectedContacts.some(c => c.id === contact.id)
                      ? "bg-primary/10 border-primary/30"
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => toggleContact(contact)}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedContacts.some(c => c.id === contact.id)}
                      onCheckedChange={() => toggleContact(contact)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{contact.nome}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        {contact.telefone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {contact.telefone}
                          </span>
                        )}
                        {contact.empresa && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {contact.empresa}
                          </span>
                        )}
                      </div>
                    </div>
                    {contact.tags && contact.tags.length > 0 && (
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
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-sm text-muted-foreground">
          <Badge variant="outline" className="mr-2">{selectedContacts.length}</Badge>
          contatos selecionados
        </div>
        <Button onClick={onNext} disabled={selectedContacts.length === 0}>
          Continuar
        </Button>
      </div>
    </div>
  );
}
