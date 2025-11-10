import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "../RichTextEditor";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { Input } from "@/components/ui/input";

interface ConfigProps {
  config: any;
  handleConfigChange: (updates: any) => void;
  nodes?: any[];
  edges?: any[];
  selectedNode?: any;
}

interface Relatorio {
  id: string;
  nome: string;
  descricao: string | null;
  parametros: any;
  configuracoes: any;
}

interface VariableData {
  value: string;
  type: string;
}

export const CRMGerarRelatorioConfig = ({ config, handleConfigChange, nodes, edges, selectedNode }: ConfigProps) => {
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingVariables, setLoadingVariables] = useState(false);

  useEffect(() => {
    loadRelatorios();
  }, []);

  useEffect(() => {
    if (config.relatorioId && relatorios.length > 0) {
      loadReportVariables(config.relatorioId);
    }
  }, [config.relatorioId, relatorios]);

  const loadRelatorios = async () => {
    try {
      const estabId = await getEstabelecimentoId();
      if (!estabId) {
        setRelatorios([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('relatorios')
        .select('id, nome, descricao, parametros, configuracoes')
        .eq('estabelecimento_id', estabId)
        .order('nome');

      if (error) throw error;

      setRelatorios(data || []);
    } catch (error) {
      console.error("Erro ao carregar relatórios:", error);
      setRelatorios([]);
    } finally {
      setLoading(false);
    }
  };

  const loadReportVariables = async (relatorioId: string) => {
    setLoadingVariables(true);
    console.log("📊 Carregando variáveis para relatório:", relatorioId);
    
    try {
      const relatorio = relatorios.find(r => r.id === relatorioId);
      if (!relatorio) {
        console.log("❌ Relatório não encontrado");
        handleConfigChange({ apiVariables: {} });
        setLoadingVariables(false);
        return;
      }

      console.log("✅ Relatório encontrado:", relatorio);

      // Primeiro tenta usar os parametros do relatório
      if (relatorio.parametros && Array.isArray(relatorio.parametros) && relatorio.parametros.length > 0) {
        console.log("📝 Usando parâmetros do relatório:", relatorio.parametros);
        const newVars: Record<string, VariableData> = {};
        relatorio.parametros.forEach((param: any) => {
          newVars[param.name] = {
            value: param.default_value || param.value || "",
            type: param.type || "string"
          };
        });
        console.log("✅ Variáveis configuradas:", newVars);
        handleConfigChange({ apiVariables: newVars });
        setLoadingVariables(false);
        return;
      }

      // Se não tiver parametros, tenta buscar da API configurada
      if (relatorio.configuracoes?.api_url) {
        console.log("🔗 Tentando buscar variáveis da API:", relatorio.configuracoes.api_url);
        const apiUrl = relatorio.configuracoes.api_url;
        const urlParts = apiUrl.split('/api/');
        
        if (urlParts.length > 1) {
          const endpointPath = '/api/' + urlParts[1].split('?')[0];
          console.log("🔍 Buscando endpoint:", endpointPath);
          
          const { data: apiData, error } = await supabase
            .from('api_endpoints')
            .select('parameters')
            .eq('endpoint_path', endpointPath)
            .maybeSingle();

          if (!error && apiData?.parameters && Array.isArray(apiData.parameters) && apiData.parameters.length > 0) {
            console.log("📝 Parâmetros encontrados na API:", apiData.parameters);
            const newVars: Record<string, VariableData> = {};
            apiData.parameters.forEach((param: any) => {
              newVars[param.name] = {
                value: param.default_value || "",
                type: param.type || "string"
              };
            });
            console.log("✅ Variáveis da API configuradas:", newVars);
            handleConfigChange({ apiVariables: newVars });
            setLoadingVariables(false);
            return;
          } else {
            console.log("⚠️ Nenhum parâmetro encontrado na API ou erro:", error);
          }
        }
      }

      console.log("ℹ️ Nenhuma variável encontrada para este relatório");
      handleConfigChange({ apiVariables: {} });
    } catch (error) {
      console.error("❌ Erro ao carregar variáveis do relatório:", error);
      handleConfigChange({ apiVariables: {} });
    } finally {
      setLoadingVariables(false);
    }
  };

  const apiVariables = config.apiVariables || {};

  const updateVariableValue = (key: string, value: string) => {
    const newVars = { ...apiVariables };
    const currentVar = newVars[key];
    newVars[key] = typeof currentVar === 'object' ? { ...currentVar, value } : { value, type: "string" };
    handleConfigChange({ apiVariables: newVars });
  };

  if (loading) {
    return <div className="p-4 text-center text-muted-foreground">Carregando relatórios...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Relatório</Label>
        <Select
          value={config.relatorioId || ""}
          onValueChange={(value) => handleConfigChange({ relatorioId: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione um relatório" />
          </SelectTrigger>
          <SelectContent>
            {relatorios.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground text-center">
                Nenhum relatório cadastrado
              </div>
            ) : (
              relatorios.map((rel) => (
                <SelectItem key={rel.id} value={rel.id}>
                  {rel.nome}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Selecione o modelo de relatório que será gerado
        </p>
      </div>

      {config.relatorioId && (
        <div className="space-y-3 border-t pt-4">
          <div>
            <Label className="font-semibold">Variáveis do Relatório</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Insira os valores para as variáveis do relatório selecionado
            </p>
          </div>

          {loadingVariables ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              Carregando variáveis...
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
              {Object.entries(apiVariables).length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4 border-2 border-dashed rounded">
                  Este relatório não possui variáveis configuradas
                </div>
              ) : (
                Object.entries(apiVariables).map(([key, varData]) => {
                  const isVarObject = typeof varData === 'object' && varData !== null && 'value' in varData;
                  const value = isVarObject ? (varData as VariableData).value : String(varData);
                  const type = isVarObject ? (varData as VariableData).type : 'string';
                  
                  return (
                    <div key={key} className="space-y-2 p-3 bg-muted/30 rounded-lg border">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Nome</Label>
                          <Input
                            value={key}
                            disabled
                            className="h-8 text-xs bg-muted/50"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Tipo</Label>
                          <Input
                            value={type}
                            disabled
                            className="h-8 text-xs bg-muted/50 capitalize"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Valor</Label>
                        <RichTextEditor
                          value={value}
                          onChange={(newValue) => updateVariableValue(key, newValue)}
                          placeholder="Insira o valor da variável"
                          multiline={false}
                          nodes={nodes}
                          edges={edges}
                          selectedNode={selectedNode}
                          showFormatting={false}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      <div className="space-y-2 border-t pt-4">
        <Label>Variável de saída</Label>
        <RichTextEditor
          value={config.outputVariable || "relatorio_gerado"}
          onChange={(value) => handleConfigChange({ outputVariable: value })}
          placeholder="relatorio_gerado"
          multiline={false}
          nodes={nodes}
          edges={edges}
          selectedNode={selectedNode}
          showFormatting={false}
        />
        <p className="text-xs text-muted-foreground">
          Esta variável receberá "Sucesso" após o relatório ser gerado e anexado ao chat
        </p>
      </div>
    </div>
  );
};
