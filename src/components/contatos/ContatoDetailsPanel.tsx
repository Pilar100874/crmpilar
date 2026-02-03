import { useState, useEffect } from "react";
import { User, Building2, ChevronDown, ChevronUp, Pencil, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { EditEmpresaDialog } from "@/components/atendimento/EditEmpresaDialog";
import { VincularEmpresaDialog } from "@/components/atendimento/VincularEmpresaDialog";
import { CreateEmpresaDialog } from "@/components/atendimento/CreateEmpresaDialog";

interface ContatoDetailsPanelProps {
  contato: {
    id: string;
    name: string;
    phone: string;
    tel?: string;
    email: string;
    position?: string;
    customFields?: Record<string, any>;
  } | null;
  onClose: () => void;
  onEditContato: (contatoId: string) => void;
  onCompaniesUpdated?: () => void;
}

interface EmpresaVinculada {
  id: string;
  empresa_id: string;
  is_primary: boolean;
  cargo?: string;
  empresa: {
    id: string;
    nome_fantasia: string;
    nome: string;
    cnpj?: string;
    telefone?: string;
    email?: string;
  };
}

export function ContatoDetailsPanel({
  contato,
  onClose,
  onEditContato,
  onCompaniesUpdated
}: ContatoDetailsPanelProps) {
  const [contatoOpen, setContatoOpen] = useState(true);
  const [empresasOpen, setEmpresasOpen] = useState(true);
  const [empresasVinculadas, setEmpresasVinculadas] = useState<EmpresaVinculada[]>([]);
  const [editingEmpresaId, setEditingEmpresaId] = useState<string | null>(null);
  const [showVincularDialog, setShowVincularDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  // Carregar empresas vinculadas quando o contato mudar
  useEffect(() => {
    if (contato?.id) {
      loadEmpresasVinculadas();
    } else {
      setEmpresasVinculadas([]);
    }
  }, [contato?.id]);

  const loadEmpresasVinculadas = async () => {
    if (!contato?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customer_empresas')
        .select(`
          id,
          empresa_id,
          is_primary,
          cargo,
          empresas:empresa_id (
            id,
            nome_fantasia,
            nome,
            cnpj,
            telefone,
            email
          )
        `)
        .eq('customer_id', contato.id);

      if (error) throw error;

      const formatted = data?.map(item => ({
        id: item.id,
        empresa_id: item.empresa_id,
        is_primary: item.is_primary,
        cargo: item.cargo,
        empresa: item.empresas as any
      })) || [];

      setEmpresasVinculadas(formatted);
    } catch (error) {
      console.error('Erro ao carregar empresas vinculadas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditEmpresaClick = (empresaId: string) => {
    setEditingEmpresaId(empresaId);
  };

  const handleEmpresaUpdated = () => {
    loadEmpresasVinculadas();
    onCompaniesUpdated?.();
  };

  if (!contato) {
    return (
      <div className="w-80 border-l bg-card flex items-center justify-center">
        <div className="text-center text-muted-foreground p-6">
          <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Selecione um contato para ver os detalhes</p>
        </div>
      </div>
    );
  }

  const primaryEmpresa = empresasVinculadas.find(e => e.is_primary);

  return (
    <div className="w-80 border-l bg-card flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-gradient-to-r from-primary/10 to-transparent flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm truncate">{contato.name}</h3>
            {primaryEmpresa && (
              <p className="text-xs text-muted-foreground truncate">
                {primaryEmpresa.cargo || primaryEmpresa.empresa.nome_fantasia}
              </p>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {/* Informações do Contato */}
          <Collapsible open={contatoOpen} onOpenChange={setContatoOpen}>
            <Card className="border-border/40">
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Dados do Contato</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditContato(contato.id);
                      }}
                      title="Editar contato"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    {contatoOpen ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-3 pb-3 space-y-2">
                  {/* WhatsApp */}
                  {contato.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">WhatsApp:</span>
                      <span className="font-medium">{contato.phone}</span>
                    </div>
                  )}
                  
                  {/* Telefone */}
                  {contato.tel && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Telefone:</span>
                      <span className="font-medium">{contato.tel}</span>
                    </div>
                  )}
                  
                  {/* Email */}
                  {contato.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium truncate">{contato.email}</span>
                    </div>
                  )}
                  
                  {/* Cargo */}
                  {contato.position && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Cargo:</span>
                      <span className="font-medium">{contato.position}</span>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Empresas Vinculadas */}
          <Collapsible open={empresasOpen} onOpenChange={setEmpresasOpen}>
            <Card className="border-border/40">
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Empresas</span>
                    <Badge variant="secondary" className="text-xs">
                      {empresasVinculadas.length}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowVincularDialog(true);
                      }}
                      title="Vincular empresa"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                    {empresasOpen ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-3 pb-3 space-y-2">
                  {loading ? (
                    <div className="text-sm text-muted-foreground text-center py-2">
                      Carregando...
                    </div>
                  ) : empresasVinculadas.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-2">
                      Nenhuma empresa vinculada
                    </div>
                  ) : (
                    empresasVinculadas.map((vinculo) => (
                      <div
                        key={vinculo.id}
                        className="flex items-center justify-between p-2 rounded-md border bg-muted/30 hover:bg-muted/50 transition-colors group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">
                              {vinculo.empresa.nome_fantasia || vinculo.empresa.nome}
                            </span>
                            {vinculo.is_primary && (
                              <Badge variant="secondary" className="text-xs">
                                Principal
                              </Badge>
                            )}
                          </div>
                          {vinculo.empresa.cnpj && (
                            <p className="text-xs text-muted-foreground">
                              {vinculo.empresa.cnpj}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleEditEmpresaClick(vinculo.empresa_id)}
                          title="Editar empresa"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>
      </ScrollArea>

      {/* Dialog para editar empresa */}
      {editingEmpresaId && (
        <EditEmpresaDialog
          open={!!editingEmpresaId}
          onOpenChange={(open) => !open && setEditingEmpresaId(null)}
          empresaId={editingEmpresaId}
          onSuccess={handleEmpresaUpdated}
        />
      )}

      {/* Dialog para vincular empresa */}
      {showVincularDialog && contato && (
        <VincularEmpresaDialog
          open={showVincularDialog}
          onOpenChange={setShowVincularDialog}
          customerId={contato.id}
          onSuccess={handleEmpresaUpdated}
        />
      )}
    </div>
  );
}
