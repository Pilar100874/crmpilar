import { User, Phone, Building2, Plus, ChevronDown, ChevronUp, MessageSquare, Calendar, Inbox, Receipt, Mail, Filter, Pencil, Briefcase, Edit3, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SoftphoneDialog } from "@/components/softphone/SoftphoneDialog";
import { VincularEmpresaDialog } from "./VincularEmpresaDialog";
import { EditEmpresaDialog } from "./EditEmpresaDialog";
import { useState } from "react";
import { GlobalFilter } from "./GlobalClientFilter";
import { toast } from "@/lib/toast-config";

export type PanelType = "chat" | "agenda" | "email" | "orcamento";

interface UnifiedDetailsPanelProps {
  type: PanelType;
  // Dados do cliente/empresa
  nome?: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  customerId?: string;
  empresaId?: string;
  // Dados específicos por tipo
  protocolo?: string;
  status?: string;
  valorTotal?: number;
  canal?: string;
  dataHora?: string;
  // Para agenda
  titulo?: string;
  descricao?: string;
  // Empresas vinculadas
  companies?: any[];
  onCompaniesUpdated?: () => void;
  // Filtro global
  onSetGlobalFilter?: (filter: GlobalFilter) => void;
  // Edição inline
  onEditContato?: (customerId: string) => void;
  onEditEmpresa?: (empresaId: string, customerEmpresaId?: string) => void;
  // Criação inline
  onCreateContato?: () => void;
  onCreateEmpresa?: (customerId?: string) => void;
}

export function UnifiedDetailsPanel({ 
  type,
  nome,
  telefone,
  whatsapp,
  email,
  customerId,
  empresaId,
  protocolo,
  status,
  valorTotal,
  canal,
  dataHora,
  titulo,
  descricao,
  companies = [],
  onCompaniesUpdated,
  onSetGlobalFilter,
  onEditContato,
  onEditEmpresa,
  onCreateContato,
  onCreateEmpresa
}: UnifiedDetailsPanelProps) {
  const [showSoftphone, setShowSoftphone] = useState(false);
  const [dialNumber, setDialNumber] = useState("");
  const [empresasOpen, setEmpresasOpen] = useState(true);
  const [contatoOpen, setContatoOpen] = useState(true);
  const [showVincularDialog, setShowVincularDialog] = useState(false);
  const [editingEmpresaId, setEditingEmpresaId] = useState<string | null>(null);

  // Obtém o cargo da primeira empresa vinculada
  const primaryCompany = companies.find(c => c.is_primary) || companies[0];
  const currentCargo = primaryCompany?.cargo || "";
  const customerEmpresaId = primaryCompany?.id;

  const getIcon = () => {
    switch (type) {
      case "chat": return <MessageSquare className="w-10 h-10 text-primary" />;
      case "agenda": return <Calendar className="w-10 h-10 text-primary" />;
      case "email": return <Inbox className="w-10 h-10 text-primary" />;
      case "orcamento": return <Receipt className="w-10 h-10 text-primary" />;
      default: return <User className="w-10 h-10 text-primary" />;
    }
  };

  const getTitle = () => {
    if (nome) return nome;
    switch (type) {
      case "chat": return "Conversa";
      case "agenda": return titulo || "Tarefa";
      case "email": return "Email";
      case "orcamento": return "Orçamento";
      default: return "Detalhes";
    }
  };

  const handleEditEmpresaClick = (empresa: any) => {
    const empresaData = empresa.empresas || empresa;
    if (empresaData?.id) {
      setEditingEmpresaId(empresaData.id);
    }
  };

  const handleEditContatoClick = () => {
    if (customerId && onEditContato) {
      onEditContato(customerId);
    }
  };

  if (!nome && !protocolo && !titulo) {
    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-card">
        <div className="p-4 text-center text-muted-foreground flex-1 flex items-center justify-center">
          <div>
            {getIcon()}
            <p className="text-sm mt-3">Nenhum item selecionado</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-card">
      {/* PARTE 1 - Nome da Empresa/Cliente */}
      <div className="p-4 border-b flex-shrink-0">
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary-glow/20 flex items-center justify-center mb-3">
            {getIcon()}
          </div>
          <h3 className="font-semibold text-lg text-center">{getTitle()}</h3>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain p-4 space-y-4">
        
        {/* PARTE 2 - Empresa Vinculada - Colapsável */}
        <Collapsible open={empresasOpen} onOpenChange={setEmpresasOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between p-0 h-auto hover:bg-transparent"
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">Empresa Vinculada</span>
              </div>
              {empresasOpen ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            {companies.length === 0 ? (
              <Card className="p-4 text-center rounded-2xl border-dashed">
                <Building2 className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">Nenhuma empresa vinculada</p>
                <div className="flex flex-col gap-1 mt-2">
                  {(customerId || email || whatsapp || telefone) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-primary"
                      onClick={() => setShowVincularDialog(true)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Vincular empresa existente
                    </Button>
                  )}
                  {onCreateEmpresa && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                      onClick={() => onCreateEmpresa(customerId)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Criar nova empresa
                    </Button>
                  )}
                </div>
              </Card>
            ) : (
              <div className="space-y-2">
                {companies.map((company, idx) => {
                  const empresa = company.empresas || company;
                  return (
                    <Card key={idx} className="p-3 rounded-2xl hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {empresa?.nome_fantasia || empresa?.nome}
                          </p>
                          {empresa?.cnpj && (
                            <p className="text-xs text-muted-foreground">
                              CNPJ: {empresa.cnpj}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {company.is_primary && (
                            <Badge className="text-[10px] bg-primary text-primary-foreground">
                              Principal
                            </Badge>
                          )}
                          {/* Botão Editar Empresa */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary"
                            title="Editar empresa"
                            onClick={() => handleEditEmpresaClick(company)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          {onSetGlobalFilter && empresa?.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 hover:bg-emerald-100 hover:text-emerald-600"
                              title="Filtrar por esta empresa"
                              onClick={() => {
                                const empresaNome = empresa.nome_fantasia || empresa.nome || 'Empresa';
                                onSetGlobalFilter({
                                  type: 'empresa',
                                  id: empresa.id,
                                  nome: empresaNome
                                });
                                toast.info(`Filtro aplicado: ${empresaNome}`);
                              }}
                            >
                              <Filter className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {(company.cargo || company.departamento) && (
                        <div className="flex gap-2 flex-wrap">
                          {company.cargo && (
                            <Badge variant="outline" className="text-[10px]">{company.cargo}</Badge>
                          )}
                          {company.departamento && (
                            <Badge variant="secondary" className="text-[10px]">{company.departamento}</Badge>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })}
                <div className="flex flex-col gap-1">
                  {(customerId || email || whatsapp || telefone) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-primary"
                      onClick={() => setShowVincularDialog(true)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Vincular outra empresa
                    </Button>
                  )}
                  {onCreateEmpresa && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                      onClick={() => onCreateEmpresa(customerId)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Criar nova empresa
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* PARTE 3 - Contato - Colapsável */}
        <Collapsible open={contatoOpen} onOpenChange={setContatoOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between p-0 h-auto hover:bg-transparent"
            >
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">Contato</span>
              </div>
              {contatoOpen ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <Card className="p-3 rounded-2xl space-y-3">
              {/* Botões Editar/Criar Contato */}
              <div className="flex justify-end -mt-1 -mr-1 mb-1 gap-1">
                {customerId ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-primary hover:bg-primary/10"
                    onClick={handleEditContatoClick}
                  >
                    <Edit3 className="w-3 h-3 mr-1" />
                    Editar
                  </Button>
                ) : onCreateContato && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-green-600 hover:bg-green-50"
                    onClick={onCreateContato}
                  >
                    <UserPlus className="w-3 h-3 mr-1" />
                    Criar Contato
                  </Button>
                )}
              </div>

              {/* Nome */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-muted-foreground">Nome</span>
                </div>
                <span className="text-xs truncate max-w-[140px]">{nome || '-'}</span>
              </div>

              {/* WhatsApp/Telefone */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-muted-foreground">Telefone</span>
                </div>
                <div className="flex items-center gap-1">
                  {whatsapp || telefone ? (
                    <>
                      <span className="text-xs truncate max-w-[100px]">{whatsapp || telefone}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-green-600 hover:text-green-700 flex-shrink-0"
                        onClick={() => {
                          const number = (whatsapp || telefone || "").replace(/\D/g, '');
                          window.open(`https://wa.me/55${number}`, '_blank');
                        }}
                        title="WhatsApp"
                      >
                        <MessageSquare className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-primary flex-shrink-0"
                        onClick={() => {
                          setDialNumber(whatsapp || telefone || '');
                          setShowSoftphone(true);
                        }}
                        title="Ligar"
                      >
                        <Phone className="w-3 h-3" />
                      </Button>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-muted-foreground">Email</span>
                </div>
                <div className="flex items-center gap-1">
                  {email ? (
                    <>
                      <span className="text-xs truncate max-w-[120px]">{email}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-primary flex-shrink-0"
                        onClick={() => window.open(`mailto:${email}`, '_blank')}
                        title="Enviar email"
                      >
                        <Mail className="w-3 h-3" />
                      </Button>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </div>
              </div>

              {/* Cargo - só mostra se houver empresa vinculada */}
              {companies.length > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Briefcase className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">Cargo</span>
                  </div>
                  <span className="text-xs truncate max-w-[140px]">{currentCargo || '-'}</span>
                </div>
              )}
            </Card>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Dialogs */}
      <SoftphoneDialog 
        open={showSoftphone}
        onOpenChange={setShowSoftphone}
        initialNumber={dialNumber}
      />

      <VincularEmpresaDialog
        open={showVincularDialog}
        onOpenChange={setShowVincularDialog}
        customerId={customerId}
        emailVinculo={type === 'email' ? email : undefined}
        whatsappVinculo={type === 'chat' ? (whatsapp || telefone) : undefined}
        onSuccess={onCompaniesUpdated}
      />

      {editingEmpresaId && (
        <EditEmpresaDialog
          open={!!editingEmpresaId}
          onOpenChange={(open) => !open && setEditingEmpresaId(null)}
          empresaId={editingEmpresaId}
          onSuccess={onCompaniesUpdated}
        />
      )}
    </div>
  );
}
