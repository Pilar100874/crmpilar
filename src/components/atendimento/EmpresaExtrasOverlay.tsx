import { useEffect, useState } from "react";
import { X, MapPin, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { EmpresaLocalizacaoTab } from "@/components/empresas/EmpresaLocalizacaoTab";

interface EmpresaExtrasOverlayProps {
  tipo: "localizacao" | "qualificacao";
  empresaId: string;
  empresaNome?: string;
  onClose: () => void;
}

function Campo({ label, valor }: { label: string; valor?: string | number | null }) {
  return (
    <div className="space-y-1 min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm break-words">{valor !== null && valor !== undefined && String(valor).trim() !== "" ? String(valor) : "-"}</p>
    </div>
  );
}

export function EmpresaExtrasOverlay({ tipo, empresaId, empresaNome, onClose }: EmpresaExtrasOverlayProps) {
  const [empresa, setEmpresa] = useState<any | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    supabase
      .from("empresas")
      .select("company_name, company_fantasia, address, numero, neighborhood, city, state, cep, porte, situacao_cadastral, faturamento_estimado, funcionarios_estimado, data_fundacao, score_prospect, prioridade, score_motivo, produtos_interesse, tags, observacoes_internas")
      .eq("id", empresaId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!ativo) return;
        if (error) console.error("Erro ao carregar empresa:", error);
        setEmpresa(data || null);
        setCarregando(false);
      });
    return () => { ativo = false; };
  }, [empresaId]);

  const titulo = tipo === "localizacao" ? "Localização da empresa" : "Qualificação da empresa";
  const nome = empresa?.company_fantasia || empresa?.company_name || empresaNome || "Empresa";

  return (
    <div className="absolute inset-0 z-[110] flex flex-col bg-background">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
        <div className="min-w-0 flex items-center gap-2">
          {tipo === "localizacao" ? (
            <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
          ) : (
            <ShieldCheck className="h-4 w-4 text-primary flex-shrink-0" />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{titulo}</p>
            <p className="truncate text-xs text-muted-foreground">{nome}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} title="Fechar">
          <X className="h-4 w-4 mr-1" />
          Fechar
        </Button>
      </div>
      <div className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-4">
        {carregando ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm">Carregando...</span>
          </div>
        ) : !empresa ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-muted-foreground">Não foi possível carregar os dados da empresa.</p>
          </Card>
        ) : tipo === "localizacao" ? (
          <EmpresaLocalizacaoTab
            endereco={empresa.address}
            numero={empresa.numero}
            bairro={empresa.neighborhood}
            cidade={empresa.city}
            estado={empresa.state}
            cep={empresa.cep}
            nome={nome}
          />
        ) : (
          <div className="space-y-6 max-w-3xl mx-auto">
            <Card className="p-4 sm:p-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wide">Perfil da Empresa</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Campo label="Porte" valor={empresa.porte} />
                <Campo label="Situação Cadastral" valor={empresa.situacao_cadastral} />
                <Campo label="Faturamento estimado" valor={empresa.faturamento_estimado} />
                <Campo label="Nº de funcionários (estimado)" valor={empresa.funcionarios_estimado} />
                <Campo
                  label="Data de fundação"
                  valor={empresa.data_fundacao ? new Date(empresa.data_fundacao + "T00:00:00").toLocaleDateString("pt-BR") : null}
                />
              </div>
            </Card>
            <Card className="p-4 sm:p-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wide">Qualificação Comercial</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Campo label="Score (0-100)" valor={empresa.score_prospect} />
                <Campo
                  label="Prioridade"
                  valor={empresa.prioridade === "alta" ? "Alta" : empresa.prioridade === "media" ? "Média" : empresa.prioridade === "baixa" ? "Baixa" : empresa.prioridade}
                />
                <div className="sm:col-span-2"><Campo label="Motivo do score" valor={empresa.score_motivo} /></div>
                <div className="sm:col-span-2"><Campo label="Produtos de interesse" valor={empresa.produtos_interesse} /></div>
                <div className="sm:col-span-2"><Campo label="Tags" valor={empresa.tags} /></div>
                <div className="sm:col-span-2"><Campo label="Observações internas" valor={empresa.observacoes_internas} /></div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
