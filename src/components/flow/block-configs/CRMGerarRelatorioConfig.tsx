import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "../RichTextEditor";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { Input } from "@/components/ui/input";
import { WaitingMessageField } from "./WaitingMessageField";
import { MediaCaptionFields } from "./MediaCaptionFields";

const DEFAULT_WAITING_REPORT = "⏳ Aguarde... gerando relatório em tempo real.";

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
  layout_json: any;
}

interface VariableData {
  value: string;
  type: string;
}

export const CRMGerarRelatorioConfig = ({ config, handleConfigChange, nodes, edges, selectedNode }: ConfigProps) => {
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingVariables, setLoadingVariables] = useState(false);
  const [reportVariables, setReportVariables] = useState<Array<{ name: string; type: string }>>([]);

  useEffect(() => {
    loadRelatorios();
  }, []);

  useEffect(() => {
    if (config.relatorioId) {
      // Limpa apenas a lista local para evitar pisar nos valores já digitados
      setReportVariables([]);
      if (relatorios.length > 0) {
        loadReportVariables(config.relatorioId);
      }
    } else {
      setReportVariables([]);
    }
  }, [config.relatorioId]);

  // Quando a lista de relatórios chegar/atualizar, recarrega os parâmetros do relatório selecionado
  useEffect(() => {
    if (config.relatorioId && relatorios.length > 0) {
      loadReportVariables(config.relatorioId);
    }
  }, [relatorios]);

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
        .select('id, nome, descricao, parametros, configuracoes, layout_json')
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
    console.log("📊 Carregando parâmetros para relatório:", relatorioId);
    
    try {
      const relatorio = relatorios.find(r => r.id === relatorioId);
      if (!relatorio) {
        console.log("❌ Relatório não encontrado");
        handleConfigChange({ apiVariables: {} });
        setReportVariables([]);
        setLoadingVariables(false);
        return;
      }

      console.log("✅ Relatório encontrado:", relatorio);
      console.log("📋 Configurações do relatório:", relatorio.configuracoes);
      console.log("📋 Parâmetros do relatório:", relatorio.parametros);
      console.log("📋 Layout JSON completo:", relatorio.layout_json);

      // Extrair variáveis fixas do relatório (do layout_json do ReportBro)
      let layoutData = null;
      
      // Tentar primeiro de layout_json (campo principal)
      if (relatorio.layout_json) {
        try {
          layoutData = typeof relatorio.layout_json === 'string' 
            ? JSON.parse(relatorio.layout_json) 
            : relatorio.layout_json;
        } catch (e) {
          console.error("Erro ao parsear layout_json:", e);
        }
      }
      
      // Fallback para configuracoes.layout
      if (!layoutData && relatorio.configuracoes?.layout) {
        try {
          layoutData = typeof relatorio.configuracoes.layout === 'string' 
            ? JSON.parse(relatorio.configuracoes.layout) 
            : relatorio.configuracoes.layout;
        } catch (e) {
          console.error("Erro ao parsear configuracoes.layout:", e);
        }
      }
      
      if (layoutData?.parameters && Array.isArray(layoutData.parameters)) {
        // Filtrar e ignorar api_data
        const vars = layoutData.parameters
          .filter((param: any) => param.name !== 'api_data')
          .map((param: any) => ({
            name: param.name,
            type: param.type || 'string'
          }));
        console.log("📝 Variáveis fixas do relatório encontradas (sem api_data):", vars);
        setReportVariables(vars);
        
        // Inicializar valores vazios para novos parâmetros
        const newReportVars: Record<string, any> = {};
        vars.forEach((v: any) => {
          newReportVars[v.name] = (config.reportVariables || {})[v.name] || "";
        });
        handleConfigChange({ reportVariables: newReportVars });
      } else {
        console.log("⚠️ Nenhum parâmetro encontrado no layout do relatório");
        setReportVariables([]);
        handleConfigChange({ reportVariables: {} });
      }

      // PRIORIDADE 1: Usar api_variables de configuracoes (mais recente)
      if (relatorio.configuracoes?.api_variables && Object.keys(relatorio.configuracoes.api_variables).length > 0) {
        console.log("📝 Usando api_variables de configuracoes:", relatorio.configuracoes.api_variables);
        const apiVars = relatorio.configuracoes.api_variables;
        const newVars: Record<string, VariableData> = {};
        
        Object.entries(apiVars).forEach(([key, varData]: [string, any]) => {
          if (typeof varData === 'object' && varData !== null && 'type' in varData) {
            newVars[key] = {
              value: varData.value || "",
              type: varData.type || "string"
            };
          } else {
            newVars[key] = {
              value: String(varData),
              type: "string"
            };
          }
        });
        
        console.log("✅ Parâmetros configurados de api_variables:", newVars);
        // Mesclar com valores já presentes no config, priorizando o que o usuário digitou
        const existing = (config.apiVariables || {}) as Record<string, any>;
        const merged: Record<string, VariableData> = { ...newVars };
        Object.entries(existing).forEach(([k, v]: [string, any]) => {
          const isObj = v && typeof v === 'object' && 'value' in v;
          const val = isObj ? v.value : String(v ?? '');
          const typ = isObj ? (v.type || 'string') : (newVars[k]?.type || 'string');
          if (!(val === undefined || val === null || val === '')) {
            merged[k] = { value: String(val), type: typ };
          }
        });
        handleConfigChange({ apiVariables: merged });
        setLoadingVariables(false);
        return;
      }

      // PRIORIDADE 2: Tentar usar os parametros do relatório
      if (relatorio.parametros && Array.isArray(relatorio.parametros) && relatorio.parametros.length > 0) {
        console.log("📝 Usando parâmetros do relatório:", relatorio.parametros);
        const newVars: Record<string, VariableData> = {};
        relatorio.parametros.forEach((param: any) => {
          newVars[param.name] = {
            value: param.default_value || param.value || "",
            type: param.type || "string"
          };
        });
        console.log("✅ Parâmetros configurados:", newVars);
        const existing = (config.apiVariables || {}) as Record<string, any>;
        const merged: Record<string, VariableData> = { ...newVars };
        Object.entries(existing).forEach(([k, v]: [string, any]) => {
          const isObj = v && typeof v === 'object' && 'value' in v;
          const val = isObj ? v.value : String(v ?? '');
          const typ = isObj ? (v.type || 'string') : (newVars[k]?.type || 'string');
          if (!(val === undefined || val === null || val === '')) {
            merged[k] = { value: String(val), type: typ };
          }
        });
        handleConfigChange({ apiVariables: merged });
        setLoadingVariables(false);
        return;
      }

      // PRIORIDADE 3: Se não tiver parametros, tenta buscar da API configurada
      if (relatorio.configuracoes?.api_url) {
        console.log("🔗 Tentando buscar parâmetros da API:", relatorio.configuracoes.api_url);
        const apiUrl = relatorio.configuracoes.api_url;
        
        // Extrai o endpoint_path da URL completa
        // Formato esperado: https://PROJECT.supabase.co/functions/v1/execute-dynamic-query/ENDPOINT_PATH
        let endpointPath = '';
        
        if (apiUrl.includes('/execute-dynamic-query/')) {
          const parts = apiUrl.split('/execute-dynamic-query/');
          if (parts.length > 1) {
            endpointPath = parts[1].split('?')[0]; // Remove query params se houver
            console.log("🔍 Endpoint path extraído:", endpointPath);
          }
        }
        
        if (endpointPath) {
          console.log("🔍 Buscando API com endpoint_path:", endpointPath);
          
          const { data: apiData, error } = await supabase
            .from('api_endpoints')
            .select('id, name, parameters, endpoint_path')
            .eq('endpoint_path', endpointPath)
            .maybeSingle();

          console.log("📦 Resultado da busca:", { apiData, error });

          if (!error && apiData?.parameters && Array.isArray(apiData.parameters) && apiData.parameters.length > 0) {
            console.log("📝 Parâmetros encontrados na API:", apiData.parameters);
            const newVars: Record<string, VariableData> = {};
            apiData.parameters.forEach((param: any) => {
              newVars[param.name] = {
                value: param.default_value || "",
                type: param.type || "string"
              };
            });
            console.log("✅ Parâmetros da API configurados:", newVars);
            const existing = (config.apiVariables || {}) as Record<string, any>;
            const merged: Record<string, VariableData> = { ...newVars };
            Object.entries(existing).forEach(([k, v]: [string, any]) => {
              const isObj = v && typeof v === 'object' && 'value' in v;
              const val = isObj ? v.value : String(v ?? '');
              const typ = isObj ? (v.type || 'string') : (newVars[k]?.type || 'string');
              if (!(val === undefined || val === null || val === '')) {
                merged[k] = { value: String(val), type: typ };
              }
            });
            handleConfigChange({ apiVariables: merged });
            setLoadingVariables(false);
            return;
          } else {
            console.log("⚠️ Nenhum parâmetro encontrado na API ou erro:", error);
            if (error) console.error("Erro detalhado:", error);
            if (!apiData) console.log("❌ API não encontrada com endpoint_path:", endpointPath);
            if (apiData && (!apiData.parameters || !Array.isArray(apiData.parameters) || apiData.parameters.length === 0)) {
              console.log("⚠️ API encontrada mas sem parâmetros:", apiData);
            }
          }
        } else {
          console.log("⚠️ Não foi possível extrair endpoint_path da URL:", apiUrl);
        }
      }

      console.log("ℹ️ Nenhum parâmetro encontrado para este relatório");
      if (!config.apiVariables || Object.keys(config.apiVariables || {}).length === 0) {
        handleConfigChange({ apiVariables: {} });
      }
    } catch (error) {
      console.error("❌ Erro ao carregar parâmetros do relatório:", error);
      handleConfigChange({ apiVariables: {} });
    } finally {
      setLoadingVariables(false);
    }
  };

  const apiVariables = config.apiVariables || {};

  const updateVariableValue = (key: string, value: string) => {
    console.log("🔧 [CRMGerarRelatorioConfig] Atualizando variável:", key, "com valor:", value);
    const newVars = { ...apiVariables };
    const currentVar = newVars[key];
    newVars[key] = typeof currentVar === 'object' ? { ...currentVar, value } : { value, type: "string" };
    console.log("📦 [CRMGerarRelatorioConfig] Novo apiVariables:", newVars);
    handleConfigChange({ apiVariables: newVars });
  };

  const updateReportVariable = (key: string, value: string) => {
    const reportVars = config.reportVariables || {};
    const newReportVars = { ...reportVars, [key]: value };
    handleConfigChange({ reportVariables: newReportVars });
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
          onValueChange={(value) => {
            const rel = relatorios.find((r) => r.id === value);
            handleConfigChange({ relatorioId: value, relatorioNome: rel?.nome || "" });
          }}
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

      <div className="space-y-2">
        <Label>Tipo de Saída</Label>
        <Select
          value={config.outputType || "pdf"}
          onValueChange={(value) => handleConfigChange({ outputType: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tipo de saída" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pdf">PDF</SelectItem>
            <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Formato do arquivo que será gerado
        </p>
      </div>

      {config.relatorioId && (
        <>
          {/* Variáveis Fixas do Relatório */}
          {reportVariables.length > 0 && (
            <div className="space-y-3 border-t pt-4">
              <div>
                <Label className="font-semibold">Variáveis do Relatório</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Variáveis fixas definidas no template do relatório
                </p>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                {reportVariables.map((variable) => {
                  const currentValue = (config.reportVariables || {})[variable.name] || "";
                  
                  return (
                    <div key={variable.name} className="space-y-2 p-3 bg-muted/30 rounded-lg border">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Nome</Label>
                          <Input
                            value={variable.name}
                            disabled
                            className="h-8 text-xs bg-muted/50"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Tipo</Label>
                          <Input
                            value={variable.type}
                            disabled
                            className="h-8 text-xs bg-muted/50 capitalize"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Valor</Label>
                        <RichTextEditor
                          value={currentValue}
                          onChange={(newValue) => updateReportVariable(variable.name, newValue)}
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
                })}
              </div>
            </div>
          )}

          {/* Parâmetros da API */}
          {Object.entries(apiVariables).length > 0 && (
            <div className="space-y-3 border-t pt-4">
              <div>
                <Label className="font-semibold">Parâmetros da API</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Parâmetros para consulta de dados da API
                </p>
              </div>

              {loadingVariables ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  Carregando parâmetros...
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                  {Object.entries(apiVariables).map(([key, varData]) => {
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
                            placeholder="Insira o valor do parâmetro"
                            multiline={false}
                            nodes={nodes}
                            edges={edges}
                            selectedNode={selectedNode}
                            showFormatting={false}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <WaitingMessageField
        enabled={config.waitingMessageEnabled !== false}
        message={config.waitingMessage || ""}
        defaultMessage={DEFAULT_WAITING_REPORT}
        onChange={(patch) => handleConfigChange(patch)}
      />

      <MediaCaptionFields
        title={config.mediaTitle || ""}
        description={config.mediaDescription || config.successMessage || ""}
        footer={config.mediaFooter || ""}
        onChange={(patch) => handleConfigChange(patch)}
        placeholders={{ title: "Ex.: 📊 Seu relatório está pronto", description: "Mensagem enviada junto com o arquivo" }}
      />

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
