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
  selectedGrupoId: string;
  onApiCreated: (endpoint: string) => void;
  apiEndpoint: string;
  relatorioId: string | null;
  importMode?: "full" | "stock_only";
}

export function ApiImportWizardStep7({ 
  finalData, 
  selectedGrupoId,
  onApiCreated, 
  apiEndpoint, 
  relatorioId,
  importMode = "full"
}: Props) {
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

      // Separar campos padrão e customizados
      const dataToInsert = finalData.map(item => {
        const standardFields: any = {
          estabelecimento_id: estabelecimentoId,
          grupo_id: selectedGrupoId,
          ativo: true,
        };

        const customFields: any = {};

        Object.entries(item).forEach(([key, value]) => {
          if (key.startsWith("custom_")) {
            const customKey = key.replace("custom_", "");
            customFields[customKey] = value;
          } else {
            // Mapear para campos da tabela produtos
            switch (key) {
              case "codigo":
                standardFields.codigo = value;
                break;
              case "nome":
                standardFields.nome = value;
                break;
              case "descricao":
                standardFields.descricao = value;
                break;
              case "preco":
                standardFields.preco = value ? Number(value) : null;
                break;
              case "unidade":
                standardFields.unidade = value;
                break;
              case "estoque":
                standardFields.estoque_atual = value ? Number(value) : null;
                break;
              case "codigo_barras":
                standardFields.codigo_barras = value;
                break;
              case "ncm":
                standardFields.ncm = value;
                break;
              case "marca":
                standardFields.marca = value;
                break;
              case "modelo":
                standardFields.modelo = value;
                break;
              case "peso":
                standardFields.peso = value ? Number(value) : null;
                break;
              case "peso_bruto":
                standardFields.peso_bruto = value ? Number(value) : null;
                break;
              case "observacoes":
                standardFields.observacoes = value;
                break;
            }
          }
        });

        // Adicionar campos customizados como JSONB
        if (Object.keys(customFields).length > 0) {
          standardFields.campos_customizados = customFields;
        }

        return standardFields;
      });

      // Inserir produtos
      const { error } = await supabase
        .from("produtos")
        .insert(dataToInsert);

      if (error) throw error;

      // Gerar endpoint da API
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const apiUrl = `${supabaseUrl}/functions/v1/api-produtos?estabelecimento_id=${estabelecimentoId}&grupo_id=${selectedGrupoId}`;
      onApiCreated(apiUrl);
      setSaved(true);
      toast.success(`${finalData.length} produtos importados com sucesso!`);
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

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Importar Produtos</h3>
        <p className="text-sm text-muted-foreground">
          Finalize o processo importando os produtos para o sistema
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
                <h4 className="font-semibold">Pronto para importar</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {finalData.length} produto(s) serão importados para o cadastro de produtos
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Os produtos serão adicionados ao grupo selecionado e estarão disponíveis para uso no sistema.
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
                Importando...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Importar {finalData.length} Produtos
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
                  Importação concluída!
                </h4>
                <p className="text-sm text-green-700 dark:text-green-200 mt-1">
                  {finalData.length} produto(s) foram importados com sucesso
                </p>
              </div>
            </div>
          </Card>

          {apiEndpoint && (
            <Card className="p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">Endpoint da API</span>
                  <Badge variant="outline">Disponível</Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted rounded-lg p-3 font-mono text-xs break-all">
                    {apiEndpoint}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(apiEndpoint)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Use este endpoint para acessar os produtos importados via API
                </p>
              </div>
            </Card>
          )}

          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              💡 <strong>Próximos passos:</strong> Os produtos importados estão disponíveis 
              no cadastro de produtos e podem ser editados individualmente se necessário.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
