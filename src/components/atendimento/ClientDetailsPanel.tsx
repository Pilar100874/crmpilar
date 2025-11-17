import { User, Phone, Building2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { SoftphoneDialog } from "@/components/softphone/SoftphoneDialog";
import { useState } from "react";

interface ClientDetailsPanelProps {
  customer?: {
    id?: string;
    nome: string;
    email?: string;
    telefone?: string;
    custom_fields?: any;
  };
  companies?: any[];
  additionalInfo?: React.ReactNode;
  onAddCompany?: () => void;
}

export function ClientDetailsPanel({ 
  customer, 
  companies = [], 
  additionalInfo,
  onAddCompany
}: ClientDetailsPanelProps) {
  const navigate = useNavigate();
  const [showSoftphone, setShowSoftphone] = useState(false);
  const [dialNumber, setDialNumber] = useState("");

  if (!customer) {
    return (
      <div className="w-80 bg-card flex flex-col h-full min-h-0 overflow-hidden border-l border-border">
        <div className="p-4 text-center text-muted-foreground">
          <User className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Nenhum cliente selecionado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-card flex flex-col h-full min-h-0 overflow-hidden border-l border-border">
      {/* Header com nome do cliente */}
      <div className="p-4 border-b flex-shrink-0">
        <div className="flex flex-col items-center mb-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary-glow/20 flex items-center justify-center mb-2">
            <User className="w-10 h-10 text-primary" />
          </div>
          <h3 className="font-semibold text-lg">{customer.nome}</h3>
          {customer.telefone && (
            <div className="flex gap-2 mt-2 text-xs">
              <Button
                variant="ghost"
                size="sm"
                className="h-auto py-1 px-2 text-xs text-muted-foreground hover:text-primary"
                onClick={() => {
                  setDialNumber(customer.telefone || "");
                  setShowSoftphone(true);
                }}
              >
                <Phone className="w-3 h-3 mr-1" />
                {customer.telefone}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain p-4 space-y-4">
        {/* Informações Adicionais */}
        {additionalInfo && (
          <div className="pb-4 border-b">
            {additionalInfo}
          </div>
        )}

        {/* Seção de Empresas */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              Empresas Vinculadas
            </h4>
            {onAddCompany && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 rounded-full"
                onClick={onAddCompany}
              >
                <Plus className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          {companies.length === 0 ? (
            <Card className="p-4 text-center">
              <Building2 className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-30" />
              <p className="text-xs text-muted-foreground">Nenhuma empresa vinculada</p>
              {onAddCompany && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 text-xs rounded-full"
                  onClick={onAddCompany}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Vincular empresa
                </Button>
              )}
            </Card>
          ) : (
            <div className="space-y-2">
              {companies.map((company, idx) => (
                <Card key={idx} className="p-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm">
                        {company.empresas?.nome_fantasia || company.empresas?.nome || company.nome_fantasia || company.nome}
                      </p>
                      {company.empresas?.cnpj && (
                        <p className="text-xs text-muted-foreground">
                          CNPJ: {company.empresas.cnpj}
                        </p>
                      )}
                    </div>
                    {company.is_primary && (
                      <Badge variant="default" className="text-[10px]">Principal</Badge>
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
              ))}
            </div>
          )}
        </div>
      </div>


      <SoftphoneDialog 
        open={showSoftphone}
        onOpenChange={setShowSoftphone}
        initialNumber={dialNumber}
      />
    </div>
  );
}
