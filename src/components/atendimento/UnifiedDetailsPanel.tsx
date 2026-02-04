import { User, Phone, Building2, Plus, ChevronDown, ChevronUp, MessageSquare, Calendar, Inbox, Receipt, Mail, Filter, Pencil, Briefcase, Edit3, UserPlus, Check, X, ExternalLink, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SoftphoneDialog } from "@/components/softphone/SoftphoneDialog";
import { VincularEmpresaDialog } from "./VincularEmpresaDialog";
import { EditEmpresaDialog } from "./EditEmpresaDialog";
import { useState, useEffect } from "react";
import { GlobalFilter } from "./GlobalClientFilter";
import { toast } from "@/lib/toast-config";
import { supabase } from "@/integrations/supabase/client";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

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
  const [desvincularEmpresa, setDesvincularEmpresa] = useState<{ id: string; nome: string } | null>(null);
  const [isDesvinculating, setIsDesvinculating] = useState(false);
  
  // Estado para edição inline do contato
  const [isEditingContato, setIsEditingContato] = useState(false);
  const [editFormData, setEditFormData] = useState({
    nome: '',
    whatsapp: '',
    telefone: '',
    email: '',
    cargo: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  // Sincronizar dados do formulário quando props mudam
  useEffect(() => {
    const primaryCompanyData = companies.find(c => c.is_primary) || companies[0];
    setEditFormData({
      nome: nome || '',
      whatsapp: whatsapp || '',
      telefone: telefone || '',
      email: email || '',
      cargo: primaryCompanyData?.cargo || ''
    });
  }, [nome, whatsapp, telefone, email, companies]);

  // Aplicar máscara de telefone
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return `+${numbers.slice(0, 2)} (${numbers.slice(2)}`;
    if (numbers.length <= 6) return `+${numbers.slice(0, 2)} (${numbers.slice(2, 4)}) ${numbers.slice(4)}`;
    if (numbers.length <= 11) return `+${numbers.slice(0, 2)} (${numbers.slice(2, 4)}) ${numbers.slice(4, 9)}-${numbers.slice(9)}`;
    return `+${numbers.slice(0, 2)} (${numbers.slice(2, 4)}) ${numbers.slice(4, 9)}-${numbers.slice(9, 13)}`;
  };

  const handlePhoneChange = (field: 'whatsapp' | 'telefone', value: string) => {
    setEditFormData(prev => ({ ...prev, [field]: formatPhone(value) }));
  };

  const handleSaveContato = async () => {
    if (!customerId) return;
    
    setIsSaving(true);
    try {
      // Atualizar dados do customer
      const { error } = await supabase
        .from('customers')
        .update({
          nome: editFormData.nome,
          telefone: editFormData.whatsapp, // telefone é o campo WhatsApp no banco
          tel: editFormData.telefone,       // tel é o campo Telefone no banco
          email: editFormData.email
        })
        .eq('id', customerId);

      if (error) throw error;

      // Atualizar cargo na empresa vinculada principal (se houver)
      const primaryCompanyData = companies.find(c => c.is_primary) || companies[0];
      if (primaryCompanyData?.id && editFormData.cargo !== (primaryCompanyData.cargo || '')) {
        const { error: cargoError } = await supabase
          .from('customer_empresas')
          .update({ cargo: editFormData.cargo || null })
          .eq('id', primaryCompanyData.id);

        if (cargoError) {
          console.error('Erro ao atualizar cargo:', cargoError);
        }
      }

      toast.success('Contato atualizado com sucesso!');
      setIsEditingContato(false);
      onCompaniesUpdated?.(); // Recarregar dados
    } catch (error) {
      console.error('Erro ao salvar contato:', error);
      toast.error('Erro ao salvar contato');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    const primaryCompanyData = companies.find(c => c.is_primary) || companies[0];
    setEditFormData({
      nome: nome || '',
      whatsapp: whatsapp || '',
      telefone: telefone || '',
      email: email || '',
      cargo: primaryCompanyData?.cargo || ''
    });
    setIsEditingContato(false);
  };

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

  const handleDesvincularEmpresa = async () => {
    if (!desvincularEmpresa) return;
    
    setIsDesvinculating(true);
    try {
      const { error } = await supabase
        .from('customer_empresas')
        .delete()
        .eq('id', desvincularEmpresa.id);

      if (error) throw error;

      toast.success('Empresa desvinculada com sucesso!');
      setDesvincularEmpresa(null);
      onCompaniesUpdated?.();
    } catch (error) {
      console.error('Erro ao desvincular empresa:', error);
      toast.error('Erro ao desvincular empresa');
    } finally {
      setIsDesvinculating(false);
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
                {(customerId || email || whatsapp || telefone) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-primary mt-2"
                    onClick={() => setShowVincularDialog(true)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Vincular Empresa
                  </Button>
                )}
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
                          {/* Botão Desvincular Empresa */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
                            title="Desvincular empresa"
                            onClick={() => setDesvincularEmpresa({
                              id: company.id,
                              nome: empresa?.nome_fantasia || empresa?.nome || 'esta empresa'
                            })}
                          >
                            <Unlink className="w-3.5 h-3.5" />
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
                {(customerId || email || whatsapp || telefone) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-primary"
                    onClick={() => setShowVincularDialog(true)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Vincular Empresa
                  </Button>
                )}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* PARTE 3 - Contato - Colapsável */}
        <Collapsible open={contatoOpen} onOpenChange={setContatoOpen}>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="flex-1 justify-between p-0 h-auto hover:bg-transparent"
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
            {/* Botões Editar/Criar ao lado do título */}
            <div className="flex items-center gap-0.5 ml-2">
              {isEditingContato ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-green-600 hover:bg-green-50"
                    onClick={handleSaveContato}
                    disabled={isSaving}
                    title="Salvar"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    title="Cancelar"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </>
              ) : customerId ? (
                <>
                  {/* Botão edição inline */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-primary hover:bg-primary/10"
                    onClick={() => setIsEditingContato(true)}
                    title="Editar aqui (inline)"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  {/* Botão abrir edição completa na tela central */}
                  {onEditContato && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-orange-600 hover:bg-orange-50"
                      onClick={handleEditContatoClick}
                      title="Editar na tela central"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </>
              ) : onCreateContato && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-green-600 hover:bg-green-50"
                  onClick={onCreateContato}
                  title="Criar contato"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
          <CollapsibleContent className="mt-3">
            <Card className="p-3 rounded-2xl space-y-3">

              {/* Nome */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
                  <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-muted-foreground">Nome</span>
                </div>
                {isEditingContato ? (
                  <Input
                    value={editFormData.nome}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, nome: e.target.value }))}
                    className="h-7 text-xs flex-1 max-w-[140px]"
                    placeholder="Nome"
                  />
                ) : (
                  <span className="text-xs truncate max-w-[140px]">{nome || '-'}</span>
                )}
              </div>

              {/* WhatsApp */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
                  <span className="text-xs text-muted-foreground">WhatsApp</span>
                </div>
                {isEditingContato ? (
                  <Input
                    value={editFormData.whatsapp}
                    onChange={(e) => handlePhoneChange('whatsapp', e.target.value)}
                    className="h-7 text-xs flex-1 max-w-[140px]"
                    placeholder="+55 (00) 00000-0000"
                  />
                ) : (
                  <span className="text-xs truncate max-w-[140px]">{whatsapp || '-'}</span>
                )}
              </div>

              {/* Telefone */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
                  <span className="text-xs text-muted-foreground">Telefone</span>
                </div>
                {isEditingContato ? (
                  <Input
                    value={editFormData.telefone}
                    onChange={(e) => handlePhoneChange('telefone', e.target.value)}
                    className="h-7 text-xs flex-1 max-w-[140px]"
                    placeholder="+55 (00) 00000-0000"
                  />
                ) : (
                  <span className="text-xs truncate max-w-[140px]">{telefone || '-'}</span>
                )}
              </div>

              {/* Email */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
                  <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-muted-foreground">Email</span>
                </div>
                {isEditingContato ? (
                  <Input
                    value={editFormData.email}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="h-7 text-xs flex-1 max-w-[140px]"
                    placeholder="email@exemplo.com"
                    type="email"
                  />
                ) : (
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
                )}
              </div>

              {/* Cargo */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
                  <Briefcase className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-muted-foreground">Cargo</span>
                </div>
                {isEditingContato ? (
                  <Input
                    value={editFormData.cargo}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, cargo: e.target.value }))}
                    className="h-7 text-xs flex-1 max-w-[140px]"
                    placeholder="Cargo"
                  />
                ) : (
                  <span className="text-xs truncate max-w-[140px]">{currentCargo || '-'}</span>
                )}
              </div>
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

      <DeleteConfirmDialog
        open={!!desvincularEmpresa}
        onOpenChange={(open) => !open && setDesvincularEmpresa(null)}
        onConfirm={handleDesvincularEmpresa}
        title="Desvincular empresa"
        description={`Tem certeza que deseja desvincular "${desvincularEmpresa?.nome}" deste contato?`}
        isLoading={isDesvinculating}
      />
    </div>
  );
}
