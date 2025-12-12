import { User, Phone, Building2, Plus, ChevronDown, ChevronUp, MessageSquare, Calendar, Inbox, Receipt, Mail, Filter, Pencil, Check, X, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SoftphoneDialog } from "@/components/softphone/SoftphoneDialog";
import { VincularEmpresaDialog } from "./VincularEmpresaDialog";
import { useState } from "react";
import { GlobalFilter } from "./GlobalClientFilter";
import { toast } from "@/lib/toast-config";
import { supabase } from "@/integrations/supabase/client";

export type PanelType = "chat" | "agenda" | "email" | "orcamento";

interface UnifiedDetailsPanelProps {
  type: PanelType;
  // Dados do cliente/empresa
  nome?: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  customerId?: string;
  empresaId?: string; // Para vincular diretamente quando não há customer
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
  onSetGlobalFilter
}: UnifiedDetailsPanelProps) {
  const [showSoftphone, setShowSoftphone] = useState(false);
  const [dialNumber, setDialNumber] = useState("");
  const [empresasOpen, setEmpresasOpen] = useState(true);
  const [contatoOpen, setContatoOpen] = useState(true);
  const [showVincularDialog, setShowVincularDialog] = useState(false);
  
  // Estados para edição inline
  const [editingNome, setEditingNome] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingCargo, setEditingCargo] = useState(false);
  const [editingWhatsapp, setEditingWhatsapp] = useState(false);
  const [tempNome, setTempNome] = useState("");
  const [tempEmail, setTempEmail] = useState("");
  const [tempCargo, setTempCargo] = useState("");
  const [tempWhatsapp, setTempWhatsapp] = useState("");
  const [saving, setSaving] = useState(false);

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

  const handleSaveNome = async () => {
    if (!customerId || !tempNome.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('customers')
        .update({ nome: tempNome.trim() })
        .eq('id', customerId);
      
      if (error) throw error;
      toast.success("Nome atualizado!");
      setEditingNome(false);
      onCompaniesUpdated?.();
    } catch (error) {
      console.error('Erro ao atualizar nome:', error);
      toast.error("Erro ao atualizar nome");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmail = async () => {
    if (!customerId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('customers')
        .update({ email: tempEmail.trim() || '' })
        .eq('id', customerId);
      
      if (error) throw error;
      toast.success("Email atualizado!");
      setEditingEmail(false);
      onCompaniesUpdated?.();
    } catch (error) {
      console.error('Erro ao atualizar email:', error);
      toast.error("Erro ao atualizar email");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCargo = async () => {
    if (!customerEmpresaId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('customer_empresas')
        .update({ cargo: tempCargo.trim() || null })
        .eq('id', customerEmpresaId);
      
      if (error) throw error;
      toast.success("Cargo atualizado!");
      setEditingCargo(false);
      onCompaniesUpdated?.();
    } catch (error) {
      console.error('Erro ao atualizar cargo:', error);
      toast.error("Erro ao atualizar cargo");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWhatsapp = async () => {
    if (!customerId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('customers')
        .update({ telefone: tempWhatsapp.trim() || '' })
        .eq('id', customerId);
      
      if (error) throw error;
      toast.success("WhatsApp atualizado!");
      setEditingWhatsapp(false);
      onCompaniesUpdated?.();
    } catch (error) {
      console.error('Erro ao atualizar WhatsApp:', error);
      toast.error("Erro ao atualizar WhatsApp");
    } finally {
      setSaving(false);
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
                    className="mt-2 text-xs text-primary"
                    onClick={() => setShowVincularDialog(true)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Vincular empresa
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
                    Vincular outra empresa
                  </Button>
                )}
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
              {/* Nome */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-muted-foreground">Nome</span>
                </div>
                {editingNome && customerId ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={tempNome}
                      onChange={(e) => setTempNome(e.target.value)}
                      className="h-7 text-xs w-32"
                      placeholder="Nome..."
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-green-600 hover:text-green-700"
                      onClick={handleSaveNome}
                      disabled={saving}
                    >
                      <Check className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground"
                      onClick={() => setEditingNome(false)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="text-xs truncate max-w-[120px]">{nome || '-'}</span>
                    {customerId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-primary flex-shrink-0"
                        onClick={() => {
                          setTempNome(nome || '');
                          setEditingNome(true);
                        }}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* WhatsApp/Telefone */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-muted-foreground">Telefone</span>
                </div>
                {editingWhatsapp && customerId ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={tempWhatsapp}
                      onChange={(e) => setTempWhatsapp(e.target.value)}
                      className="h-7 text-xs w-32"
                      placeholder="(00) 00000-0000"
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-green-600 hover:text-green-700"
                      onClick={handleSaveWhatsapp}
                      disabled={saving}
                    >
                      <Check className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground"
                      onClick={() => setEditingWhatsapp(false)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
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
                    {customerId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-primary flex-shrink-0"
                        onClick={() => {
                          setTempWhatsapp(whatsapp || telefone || '');
                          setEditingWhatsapp(true);
                        }}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Email */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-muted-foreground">Email</span>
                </div>
                {editingEmail && customerId ? (
                  <div className="flex items-center gap-1">
                    <Input
                      type="email"
                      value={tempEmail}
                      onChange={(e) => setTempEmail(e.target.value)}
                      className="h-7 text-xs w-36"
                      placeholder="email@exemplo.com"
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-green-600 hover:text-green-700"
                      onClick={handleSaveEmail}
                      disabled={saving}
                    >
                      <Check className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground"
                      onClick={() => setEditingEmail(false)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    {email ? (
                      <>
                        <span className="text-xs truncate max-w-[100px]">{email}</span>
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
                    {customerId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-primary flex-shrink-0"
                        onClick={() => {
                          setTempEmail(email || '');
                          setEditingEmail(true);
                        }}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Cargo - só mostra se houver empresa vinculada */}
              {companies.length > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Briefcase className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-muted-foreground">Cargo</span>
                  </div>
                  {editingCargo ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={tempCargo}
                        onChange={(e) => setTempCargo(e.target.value)}
                        className="h-7 text-xs w-32"
                        placeholder="Cargo..."
                        autoFocus
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-green-600 hover:text-green-700"
                        onClick={handleSaveCargo}
                        disabled={saving}
                      >
                        <Check className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground"
                        onClick={() => setEditingCargo(false)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="text-xs truncate max-w-[120px]">{currentCargo || '-'}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-primary flex-shrink-0"
                        onClick={() => {
                          setTempCargo(currentCargo);
                          setEditingCargo(true);
                        }}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </CollapsibleContent>
        </Collapsible>
      </div>


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
    </div>
  );
}
