import { marcarPendencia } from "@/lib/atendimento/finalizarAtendimento";
import { User, Phone, Building2, Plus, ChevronDown, ChevronUp, MessageSquare, Calendar, Inbox, Receipt, Mail, Pencil, Briefcase, Edit3, UserPlus, Check, X, ExternalLink, Unlink, MapPin, ShieldCheck, Expand, PanelRightClose, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { abrirPilarSip } from "@/components/portaria/PilarFoneWeb";
import { prepararNumeroComRegras } from "@/lib/telefonia/regrasDiscagem";
import { abrirChatDoContato, novoEmailParaContato, abrirExtrasDaEmpresa, abrirHistoricoDoContato } from "@/lib/atendimento/navegacaoContato";

import { VincularEmpresaDialog } from "./VincularEmpresaDialog";
import { VincularContatoDialog } from "./VincularContatoDialog";
import { EditEmpresaDialog } from "./EditEmpresaDialog";
import React, { useState, useEffect } from "react";
import { GlobalFilter } from "./GlobalClientFilter";
import { toast } from "@/lib/toast-config";
import { supabase } from "@/integrations/supabase/client";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";


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
  onCompanyCardClick?: (empresa: any) => void;
  // Ocultar o painel (botão no cabeçalho)
  onOcultar?: () => void;
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
  onCreateEmpresa,
  onCompanyCardClick,
  onOcultar
}: UnifiedDetailsPanelProps) {
  const [empresasOpen, setEmpresasOpen] = useState(true);
  const [extrasPicker, setExtrasPicker] = useState<{ tipo: "localizacao" | "qualificacao"; empresas: any[] } | null>(null);

  const handleExtrasClick = (tipo: "localizacao" | "qualificacao") => {
    const empresasList = (companies || [])
      .map((c: any) => c?.empresas || c)
      .filter((e: any) => e?.id);
    if (empresasList.length > 1) {
      setExtrasPicker({ tipo, empresas: empresasList });
      return;
    }
    const empresa = empresasList[0];
    const id = empresa?.id || empresaId;
    if (!id) return;
    const nomeEmpresa = empresa?.nome_fantasia || empresa?.nome || empresa?.company_fantasia || empresa?.company_name || nome;
    abrirExtrasDaEmpresa({ tipo, empresaId: id, empresaNome: nomeEmpresa });
  };
  const [contatoOpen, setContatoOpen] = useState(true);
  const [abaCadastro, setAbaCadastro] = useState<"contato" | "empresa">("contato");
  const [extrasOpen, setExtrasOpen] = useState(true);
  const [showVincularDialog, setShowVincularDialog] = useState(false);
  const [showVincularContatoDialog, setShowVincularContatoDialog] = useState(false);
  const [editingEmpresaId, setEditingEmpresaId] = useState<string | null>(null);
  const [desvincularEmpresa, setDesvincularEmpresa] = useState<{ id: string; nome: string } | null>(null);
  const [isDesvinculating, setIsDesvinculating] = useState(false);
  const [desvincularContato, setDesvincularContato] = useState(false);
  const [isDesvinculatingContato, setIsDesvinculatingContato] = useState(false);
  
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

  const handleDesvincularContato = async () => {
    if (!customerId || companies.length === 0) return;
    
    setIsDesvinculatingContato(true);
    try {
      // Desvincular todas as empresas do contato
      const { error } = await supabase
        .from('customer_empresas')
        .delete()
        .eq('customer_id', customerId);

      if (error) throw error;

      toast.success('Contato desvinculado de todas as empresas!');
      setDesvincularContato(false);
      onCompaniesUpdated?.();
    } catch (error) {
      console.error('Erro ao desvincular contato:', error);
      toast.error('Erro ao desvincular contato');
    } finally {
      setIsDesvinculatingContato(false);
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

  const empresasLista = companies.map((c: any) => ({ vinculo: c, empresa: c?.empresas || c }));
  const podeVincular = !!(customerId || email || whatsapp || telefone);
  const linhaDado = (label: string, conteudo: React.ReactNode, acao?: React.ReactNode) => (
    <div className="flex min-h-[40px] items-center gap-3 border-b border-border/60 py-1.5 last:border-b-0">
      <span className="w-20 flex-shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="min-w-0 flex-1 text-sm text-foreground">{conteudo}</div>
      {acao && <div className="flex-shrink-0">{acao}</div>}
    </div>
  );
  const iconeAcao = (icon: React.ReactNode, titulo: string, onClick?: () => void) => (
    <button type="button" title={titulo} aria-label={titulo} onClick={onClick} disabled={!onClick}
      className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-40">
      {icon}
    </button>
  );
  const campo = (key: keyof typeof editFormData, placeholder: string, onChange?: (v: string) => void) => (
    <Input value={editFormData[key]} placeholder={placeholder} className="h-8 text-sm"
      onChange={(e) => onChange ? onChange(e.target.value) : setEditFormData(prev => ({ ...prev, [key]: e.target.value }))} />
  );

  const blocoEmpresas = (
    <div className="space-y-1">
      <div className="flex items-center justify-between pb-1">
        <h4 className="text-sm font-semibold text-foreground">Empresas vinculadas · {empresasLista.length}</h4>
        {podeVincular && (
          <button type="button" onClick={() => setShowVincularDialog(true)} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            <Plus className="h-3.5 w-3.5" /> Vincular empresa
          </button>
        )}
      </div>
      {empresasLista.length === 0 && (
        <p className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">Nenhuma empresa vinculada</p>
      )}
      {empresasLista.map(({ vinculo, empresa }, idx) => (
        <div key={idx} className="flex items-start gap-3 border-b border-border/60 py-2.5 last:border-b-0">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium text-foreground">{empresa?.nome_fantasia || empresa?.nome}</p>
              {vinculo?.is_primary && <Badge variant="outline" className="border-primary/30 bg-primary/10 text-[10px] text-primary">Principal</Badge>}
            </div>
            {empresa?.cnpj && <p className="truncate text-xs text-muted-foreground">CNPJ {empresa.cnpj}</p>}
            {vinculo?.cargo && <p className="truncate text-xs text-muted-foreground">{vinculo.cargo}</p>}
            {(onCompanyCardClick || (onEditEmpresa && empresa?.id)) && (
              <button type="button" className="mt-0.5 text-xs font-medium text-primary hover:underline"
                onClick={() => onEditEmpresa && empresa?.id ? onEditEmpresa(empresa.id, vinculo?.id) : onCompanyCardClick?.(empresa)}>
                Abrir empresa
              </button>
            )}
          </div>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Desvincular empresa"
            onClick={() => setDesvincularEmpresa({ id: vinculo.id, nome: empresa?.nome_fantasia || empresa?.nome || 'esta empresa' })}>
            <Unlink className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );

  const temEmpresaExtra = !!(companies.find((c: any) => c?.empresas?.id)?.empresas?.id || empresaId);
  const blocoExtras = temEmpresaExtra && (
    <div className="border-t border-border">
      {[{ tipo: "localizacao" as const, label: "Endereços", icon: MapPin }, { tipo: "qualificacao" as const, label: "Qualificação", icon: ShieldCheck }].map(({ tipo, label, icon: Icon }) => (
        <button key={tipo} type="button" onClick={() => handleExtrasClick(tipo)}
          className="flex w-full items-center gap-3 border-b border-border/60 py-3 text-left text-sm text-foreground hover:text-primary">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1">{label}</span>
          <ChevronDown className="h-4 w-4 -rotate-90 text-muted-foreground" />
        </button>
      ))}
    </div>
  );

  const blocoHistorico = customerId && (
    <div className="border-t border-border">
      <button type="button" onClick={() => abrirHistoricoDoContato({ customerId, nome })}
        className="flex w-full items-center gap-3 border-b border-border/60 py-3 text-left text-sm text-foreground hover:text-primary">
        <History className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1">Histórico</span>
        <ChevronDown className="h-4 w-4 -rotate-90 text-muted-foreground" />
      </button>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-card">
      <div className="flex-shrink-0 px-4 pt-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-foreground">Cadastro e vínculos</h3>
        </div>
        <div className="mt-3 grid grid-cols-2 border-b border-border">
          {(["contato", "empresa"] as const).map((aba) => (
            <button key={aba} type="button" onClick={() => setAbaCadastro(aba)}
              className={`-mb-px border-b-2 pb-2 text-sm font-medium transition-colors ${abaCadastro === aba ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {aba === "contato" ? "Contato" : "Empresa"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain px-4 py-4 space-y-5">
        {abaCadastro === "contato" ? (
          <>
            <div>
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-baseline gap-2">
                  <h4 className="text-sm font-semibold text-foreground">Dados do contato</h4>
                  {!isEditingContato && <span className="text-[10px] italic text-muted-foreground">Clique em um campo para editar</span>}
                </div>
                <div className="flex items-center gap-0.5">
                  {isEditingContato ? (
                    <>
                      <Button size="sm" className="h-7 w-7 p-0" onClick={handleSaveContato} disabled={isSaving} title="Salvar"><Check className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleCancelEdit} disabled={isSaving} title="Cancelar"><X className="h-3.5 w-3.5" /></Button>
                    </>
                  ) : customerId ? (
                    <>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-primary" onClick={() => setIsEditingContato(true)} title="Editar aqui"><Pencil className="h-3.5 w-3.5" /></Button>
                      {onEditContato && <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-primary" onClick={handleEditContatoClick} title="Abrir cadastro completo"><ExternalLink className="h-3.5 w-3.5" /></Button>}
                      {companies.length > 0 && <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => setDesvincularContato(true)} title="Desvincular de todas as empresas"><Unlink className="h-3.5 w-3.5" /></Button>}
                    </>
                  ) : onCreateContato && (
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-primary" onClick={onCreateContato} title="Criar contato"><UserPlus className="h-3.5 w-3.5" /></Button>
                  )}
                </div>
              </div>
              {linhaDado("Nome", isEditingContato ? campo("nome", "Nome") : <span className="block truncate">{nome || "-"}</span>)}
              {linhaDado("WhatsApp", isEditingContato ? campo("whatsapp", "+55 (00) 00000-0000", (v) => handlePhoneChange('whatsapp', v)) : <span className="block truncate">{whatsapp || "-"}</span>,
                !isEditingContato && iconeAcao(<MessageSquare className="h-4 w-4" />, "Abrir conversa no Chat", whatsapp ? () => abrirChatDoContato({ customerId, nome, whatsapp }) : undefined))}
              {linhaDado("Telefone", isEditingContato ? campo("telefone", "+55 (00) 00000-0000", (v) => handlePhoneChange('telefone', v)) : <span className="block truncate">{telefone || "-"}</span>,
                !isEditingContato && iconeAcao(<Phone className="h-4 w-4" />, "Ligar pelo Pilar Fone", telefone ? async () => {
                  const numero = await prepararNumeroComRegras(telefone);
                  abrirPilarSip(numero || telefone.replace(/\D/g, ''));
                  marcarPendencia(customerId);
                } : undefined))}
              {linhaDado("E-mail", isEditingContato ? campo("email", "email@exemplo.com") : <span className="block truncate">{email || "-"}</span>,
                !isEditingContato && iconeAcao(<Mail className="h-4 w-4" />, "Escrever e-mail", email ? () => novoEmailParaContato({ customerId, email, nome }) : undefined))}
              {linhaDado("Cargo", isEditingContato ? campo("cargo", "Cargo") : <span className="block truncate">{currentCargo || "-"}</span>)}
              {isEditingContato && <p className="pt-1 text-[11px] text-muted-foreground">Clique no ✓ para salvar ou no ✕ para cancelar</p>}
            </div>

            {blocoEmpresas}

            {companies.length > 0 && companies[0]?.empresas?.id && (
              <button type="button" onClick={() => setShowVincularContatoDialog(true)} className="flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                <UserPlus className="h-4 w-4" /> Vincular outro contato à empresa
              </button>
            )}

            {blocoExtras}
          </>
        ) : (
          <>
            {blocoEmpresas}
            {blocoExtras}
          </>
        )}
      </div>

      {/* Dialogs */}
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

      <DeleteConfirmDialog
        open={desvincularContato}
        onOpenChange={setDesvincularContato}
        onConfirm={handleDesvincularContato}
        title="Desvincular contato"
        description={`Tem certeza que deseja desvincular "${nome}" de todas as empresas vinculadas?`}
        isLoading={isDesvinculatingContato}
      />

      {/* Dialog para escolher a empresa dos Extras quando há mais de uma */}
      <Dialog open={!!extrasPicker} onOpenChange={(open) => !open && setExtrasPicker(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {extrasPicker?.tipo === "localizacao" ? "Ver localização de qual empresa?" : "Ver qualificação de qual empresa?"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {extrasPicker?.empresas.map((emp: any) => (
              <Button
                key={emp.id}
                variant="outline"
                className="w-full justify-start text-xs"
                onClick={() => {
                  const nomeEmpresa = emp?.nome_fantasia || emp?.nome || emp?.company_fantasia || emp?.company_name || "empresa";
                  abrirExtrasDaEmpresa({ tipo: extrasPicker.tipo, empresaId: emp.id, empresaNome: nomeEmpresa });
                  setExtrasPicker(null);
                }}
              >
                <Building2 className="w-3.5 h-3.5 mr-2 text-primary" />
                {emp?.nome_fantasia || emp?.nome || emp?.company_fantasia || emp?.company_name || "Empresa"}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para vincular contato a empresa */}
      {companies.length > 0 && companies[0]?.empresas?.id && (
        <VincularContatoDialog
          open={showVincularContatoDialog}
          onOpenChange={setShowVincularContatoDialog}
          empresaId={companies[0].empresas.id}
          onSuccess={onCompaniesUpdated}
        />
      )}
    </div>
  );
}
