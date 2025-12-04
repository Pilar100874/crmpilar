import { User, Phone, Building2, Plus, ChevronDown, ChevronUp, MessageSquare, Calendar, Inbox, Receipt, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SoftphoneDialog } from "@/components/softphone/SoftphoneDialog";
import { useState } from "react";

export type PanelType = "chat" | "agenda" | "email" | "orcamento";

interface UnifiedDetailsPanelProps {
  type: PanelType;
  // Dados do cliente/empresa
  nome?: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
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
  onAddCompany?: () => void;
  // Ações
  onOpenOrcamento?: () => void;
  onOpenEmail?: () => void;
}

export function UnifiedDetailsPanel({ 
  type,
  nome,
  telefone,
  whatsapp,
  email,
  protocolo,
  status,
  valorTotal,
  canal,
  dataHora,
  titulo,
  descricao,
  companies = [],
  onAddCompany,
  onOpenOrcamento,
  onOpenEmail
}: UnifiedDetailsPanelProps) {
  const [showSoftphone, setShowSoftphone] = useState(false);
  const [dialNumber, setDialNumber] = useState("");
  const [empresasOpen, setEmpresasOpen] = useState(true);
  const [contatoOpen, setContatoOpen] = useState(true);

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

  if (!nome && !protocolo && !titulo) {
    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
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
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* PARTE 1 - Nome da Empresa/Cliente */}
      <div className="p-4 border-b flex-shrink-0">
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary-glow/20 flex items-center justify-center mb-3">
            {getIcon()}
          </div>
          <h3 className="font-semibold text-lg text-center">{getTitle()}</h3>
          
          {/* Info básica */}
          <div className="mt-2 space-y-1 text-center">
            {protocolo && (
              <p className="text-xs text-muted-foreground">
                Protocolo: <span className="font-mono font-medium">{protocolo}</span>
              </p>
            )}
            {status && (
              <Badge variant="secondary" className="text-xs">{status}</Badge>
            )}
            {valorTotal !== undefined && valorTotal !== null && (
              <p className="text-sm font-semibold text-primary">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotal)}
              </p>
            )}
          </div>
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
                {onAddCompany && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-xs text-primary"
                    onClick={onAddCompany}
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
                        {company.is_primary && (
                          <Badge className="text-[10px] bg-primary text-primary-foreground">
                            Principal
                          </Badge>
                        )}
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
                {onAddCompany && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-primary"
                    onClick={onAddCompany}
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
              {/* Telefone */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Telefone</span>
                </div>
                {telefone ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto py-1 px-2 text-xs hover:text-primary"
                    onClick={() => {
                      setDialNumber(telefone);
                      setShowSoftphone(true);
                    }}
                  >
                    {telefone}
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </div>

              {/* WhatsApp */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">WhatsApp</span>
                </div>
                {whatsapp || telefone ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto py-1 px-2 text-xs hover:text-green-500"
                    onClick={() => {
                      const number = (whatsapp || telefone || "").replace(/\D/g, '');
                      window.open(`https://wa.me/55${number}`, '_blank');
                    }}
                  >
                    {whatsapp || telefone}
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </div>

              {/* Email */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Email</span>
                </div>
                {email ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto py-1 px-2 text-xs hover:text-primary truncate max-w-[150px]"
                    onClick={() => window.open(`mailto:${email}`, '_blank')}
                  >
                    {email}
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </div>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Ações Rápidas */}
      {(onOpenOrcamento || onOpenEmail) && (
        <div className="border-t p-4 flex-shrink-0 space-y-2">
          {onOpenOrcamento && (
            <Button
              className="w-full rounded-full bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 text-primary-foreground"
              onClick={onOpenOrcamento}
            >
              <Receipt className="w-4 h-4 mr-2" />
              Abrir Orçamento
            </Button>
          )}
          
          {onOpenEmail && (
            <Button
              className="w-full rounded-full"
              variant="outline"
              onClick={onOpenEmail}
            >
              <Inbox className="w-4 h-4 mr-2" />
              Ver Emails
            </Button>
          )}
        </div>
      )}

      <SoftphoneDialog 
        open={showSoftphone}
        onOpenChange={setShowSoftphone}
        initialNumber={dialNumber}
      />
    </div>
  );
}
