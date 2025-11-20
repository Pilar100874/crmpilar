import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Copy, Database, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

interface Props {
  finalData: any[];
  onApiCreated: (endpoint: string) => void;
  apiEndpoint: string;
  relatorioId: string | null;
}

export function ImportWizardStep6({ finalData, onApiCreated, apiEndpoint, relatorioId }: Props) {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (apiEndpoint) {
      setSaved(true);
    }
  }, [apiEndpoint]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) {
        toast.error("Estabelecimento não encontrado");
        return;
      }

      // Salvar dados no banco - converter valores explicitamente e vincular ao relatório
      const dataToInsert = finalData.map(item => ({
        estabelecimento_id: estabelecimentoId,
        relatorio_importacao_id: relatorioId,
        nome: String(item.nome || ''),
        quantidade: item.quantidade ? Number(item.quantidade) : null,
        gramatura: item.gramatura ? String(item.gramatura) : null,
        largura: item.largura ? String(item.largura) : null,
        comprimento: item.comprimento ? String(item.comprimento) : null,
        tipo: item.tipo ? String(item.tipo) : null,
        obs: item.obs ? String(item.obs) : null,
        embalagem: item.embalagem ? String(item.embalagem) : null,
        numero_folhas: item.numero_folhas ? Number(item.numero_folhas) : null,
        diametro: item.diametro ? String(item.diametro) : null,
        dados_originais: item,
      }));

      const { error } = await supabase
        .from("produtos_importados")
        .insert(dataToInsert);

      if (error) throw error;

      // Gerar endpoint da API com relatorio_id
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const apiUrl = `${supabaseUrl}/functions/v1/api-produtos-importados?estabelecimento_id=${estabelecimentoId}&relatorio_id=${relatorioId}`;
      onApiCreated(apiUrl);
      setSaved(true);
      toast.success(`${finalData.length} produtos salvos com sucesso!`);
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar dados: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para área de transferência!");
  };

  // A URL da API já vem completa do handleSave
  const fullApiUrl = apiEndpoint || "";

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Salvar e Criar API</h3>
        <p className="text-sm text-muted-foreground">
          Finalize o processo salvando os dados e gerando o endpoint da API
        </p>
      </div>

      {!saved ? (
        <>
          <Card className="p-6">
            <div className="flex items-start space-x-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <Database className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold">Pronto para salvar</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {finalData.length} registro(s) serão salvos no banco de dados
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Após salvar, um endpoint de API será criado automaticamente para você usar em relatórios.
                </p>
              </div>
            </div>
          </Card>

          <Button
            onClick={handleSave}
            disabled={loading || finalData.length === 0}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Salvar e Criar API
              </>
            )}
          </Button>
        </>
      ) : (
        <>
          <Card className="p-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <div className="flex items-start space-x-4">
              <div className="rounded-lg bg-green-100 dark:bg-green-900 p-3">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-300" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-green-900 dark:text-green-100">
                  Dados salvos com sucesso!
                </h4>
                <p className="text-sm text-green-700 dark:text-green-200 mt-1">
                  {finalData.length} produto(s) foram importados e estão prontos para uso
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-semibold">Endpoint da API</Label>
                <Badge variant="outline">Pronto para uso</Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-muted rounded-lg p-3 font-mono text-sm break-all">
                  {fullApiUrl}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(fullApiUrl)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Use este endpoint em seus relatórios para acessar os dados importados
              </p>
            </div>
          </Card>

          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Próximos passos:</strong> Você pode usar este endpoint em qualquer ferramenta de relatórios que suporte APIs REST.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <label className={`text-sm font-medium ${className}`}>{children}</label>;
}
