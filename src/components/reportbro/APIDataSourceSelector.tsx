import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast-config";
import { supabase } from "@/integrations/supabase/client";
import { Search, Database, Play, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface APIEndpoint {
  id: string;
  name: string;
  description: string;
  endpoint_path: string;
  http_method: string;
  active: boolean;
  parameters: any[];
  is_custom?: boolean;
  custom_url?: string;
}

interface APIVariable {
  name: string;
  type: string;
  value: string;
}

interface APIDataSourceSelectorProps {
  onSelect: (
    apiUrl: string,
    apiName: string,
    variables: APIVariable[],
    options?: { httpMethod?: string; paramType?: string; isCustom?: boolean }
  ) => void;
  onTest?: (
    apiUrl: string,
    params: Record<string, any>,
    options?: { httpMethod?: string; paramType?: string }
  ) => void;
  currentUrl?: string;
  currentVariables?: APIVariable[];
  localUso?: 'relatorio' | 'importar_empresa' | 'criacao_bot';
  hideSelectedCard?: boolean;
}

export function APIDataSourceSelector({ onSelect, onTest, currentUrl, currentVariables, localUso = 'relatorio', hideSelectedCard = false }: APIDataSourceSelectorProps) {
  const [endpoints, setEndpoints] = useState<APIEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingUrl, setTestingUrl] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [variables, setVariables] = useState<APIVariable[]>(currentVariables || []);
  const [selectedEndpoint, setSelectedEndpoint] = useState<APIEndpoint | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [savingDefaults, setSavingDefaults] = useState(false);

  useEffect(() => {
    loadEndpoints();
  }, []);

  const loadEndpoints = async () => {
    try {
      const estabId = await getEstabelecimentoId();
      
      let query = supabase
        .from("api_endpoints")
        .select("*")
        .eq("active", true)
        .contains("locais_permitidos", [localUso]);

      if (estabId) {
        query = query.eq("estabelecimento_id", estabId);
      }

      const { data, error } = await query.order("name");

      if (error) throw error;
      
      const formattedEndpoints = (data || []).map(ep => ({
        ...ep,
        parameters: Array.isArray(ep.parameters) ? ep.parameters : []
      }));
      
      setEndpoints(formattedEndpoints);
    } catch (error: any) {
      console.error("Erro ao carregar endpoints:", error);
      toast.error("Erro ao carregar APIs");
    } finally {
      setLoading(false);
    }
  };

  const getFullUrl = (endpoint: APIEndpoint) => {
    if (endpoint.is_custom && endpoint.custom_url) {
      return endpoint.custom_url;
    }
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    return `https://${projectId}.supabase.co/functions/v1/execute-dynamic-query/${endpoint.endpoint_path}`;
  };

  const loadEndpointVariables = (endpoint: APIEndpoint) => {
    setSelectedEndpoint(endpoint);
    
    if (endpoint.parameters && endpoint.parameters.length > 0) {
      const apiVars: APIVariable[] = endpoint.parameters.map((param: any) => ({
        name: param.name || "",
        type: param.type || "string",
        value: param.default_value || ""
      }));
      setVariables(apiVars);
      toast.info(`${apiVars.length} variável(is) carregada(s) da API`);
    } else {
      setVariables([]);
    }
  };

  const handleSelectEndpoint = () => {
    if (!selectedEndpoint) {
      toast.error("Selecione uma API primeiro");
      return;
    }
    const url = getFullUrl(selectedEndpoint);
    const derivedMethod = selectedEndpoint.http_method || "GET";
    const derivedParamType = (selectedEndpoint.parameters && selectedEndpoint.parameters[0]?.param_type) || "query";
    onSelect(url, selectedEndpoint.name, variables, { httpMethod: derivedMethod, paramType: derivedParamType, isCustom: !!selectedEndpoint.is_custom });
    toast.success(`API "${selectedEndpoint.name}" configurada com sucesso`);
  };

  const saveDefaultValues = async () => {
    if (!selectedEndpoint) {
      toast.error("Nenhuma API selecionada");
      return;
    }

    setSavingDefaults(true);
    try {
      // Atualizar os parâmetros com os novos valores padrão
      const updatedParameters = variables.map(v => ({
        name: v.name,
        type: v.type,
        default_value: v.value || null,
        param_type: selectedEndpoint.parameters?.[0]?.param_type || "query"
      }));

      const { error } = await supabase
        .from("api_endpoints")
        .update({ parameters: updatedParameters })
        .eq("id", selectedEndpoint.id);

      if (error) throw error;

      toast.success("Valores padrão salvos com sucesso!");
      
      // Recarregar endpoints para atualizar a lista
      await loadEndpoints();
    } catch (error: any) {
      console.error("Erro ao salvar valores padrão:", error);
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setSavingDefaults(false);
    }
  };

  const testAndSaveDefaultValues = async () => {
    if (!selectedEndpoint) {
      toast.error("Selecione uma API primeiro");
      return;
    }

    setTestingUrl(getFullUrl(selectedEndpoint));
    setSavingDefaults(true);
    setTestResult(null);

    try {
      const url = getFullUrl(selectedEndpoint);
      const method = selectedEndpoint.http_method || "GET";
      const derivedParamType = (selectedEndpoint.parameters && selectedEndpoint.parameters[0]?.param_type) || "query";
      
      // Prepara os parâmetros com os valores preenchidos
      const params: Record<string, any> = {};
      variables.forEach(v => {
        if (v.name) {
          try {
            if (v.value === undefined || v.value === null || v.value === "") return;
            switch (v.type) {
              case 'number':
                params[v.name] = parseFloat(v.value);
                break;
              case 'boolean':
                params[v.name] = v.value === 'true' || v.value === '1';
                break;
              case 'date':
                params[v.name] = new Date(v.value).toISOString();
                break;
              case 'array':
                params[v.name] = JSON.parse(v.value);
                break;
              case 'object':
                params[v.name] = JSON.parse(v.value);
                break;
              default:
                params[v.name] = v.value;
            }
          } catch (e) {
            params[v.name] = v.value;
          }
        }
      });

      console.log("🧪 Testando API com parâmetros:", params);

      let response: Response;
      if (method === "POST") {
        response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params)
        });
      } else {
        const queryString = new URLSearchParams(
          Object.entries(params).map(([k, v]) => [k, String(v)])
        ).toString();
        response = await fetch(`${url}${queryString ? '?' + queryString : ''}`);
      }

      const data = await response.json();
      console.log("✅ Resposta da API:", data);
      
      setTestResult({ 
        success: true, 
        data: data,
        message: "API testada com sucesso!" 
      });

      // Se o teste foi bem-sucedido, salvar os valores padrão
      const updatedParameters = variables.map(v => ({
        name: v.name,
        type: v.type,
        default_value: v.value || null,
        param_type: selectedEndpoint.parameters?.[0]?.param_type || "query"
      }));

      const { error: saveError } = await supabase
        .from("api_endpoints")
        .update({ parameters: updatedParameters })
        .eq("id", selectedEndpoint.id);

      if (saveError) throw saveError;

      toast.success("API testada e valores salvos com sucesso!");
      
      // Recarregar endpoints para atualizar a lista
      await loadEndpoints();

      if (onTest) {
        onTest(url, params, { httpMethod: method, paramType: derivedParamType });
      }
    } catch (error: any) {
      console.error("Erro ao testar API:", error);
      toast.error("Erro ao testar API: " + error.message);
      setTestResult({ error: error.message });
    } finally {
      setTestingUrl(null);
      setSavingDefaults(false);
    }
  };

  const filteredEndpoints = endpoints.filter(ep => 
    ep.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ep.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ep.endpoint_path.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addVariable = () => {
    setVariables([...variables, { name: "", type: "string", value: "" }]);
  };

  const updateVariable = (index: number, field: keyof APIVariable, value: string) => {
    const newVariables = [...variables];
    newVariables[index] = {
      ...newVariables[index],
      [field]: value
    };
    setVariables(newVariables);
  };

  const removeVariable = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index));
  };

  const testApi = async (url: string) => {
    setTestingUrl(url);
    setTestResult(null);
    
    try {
      const response = await fetch(url);
      let data: any = null;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }
      setTestResult(data);
      
      if (response.ok) {
        toast.success("API respondeu com sucesso!");
      } else {
        toast.error(`API retornou erro (status ${response.status})`);
      }
    } catch (error: any) {
      toast.error("Erro ao testar API: " + error.message);
      setTestResult({ error: error.message });
    } finally {
      setTestingUrl(null);
    }
  };

  const testApiWithVariables = async () => {
    if (!selectedEndpoint) {
      toast.error("Selecione uma API primeiro");
      return;
    }

    setTestingUrl(getFullUrl(selectedEndpoint));
    setTestResult(null);

    try {
      const url = getFullUrl(selectedEndpoint);
      const method = selectedEndpoint.http_method || "GET";
      const derivedParamType = (selectedEndpoint.parameters && selectedEndpoint.parameters[0]?.param_type) || "query";
      
      // Prepara os parâmetros com os valores preenchidos
      const params: Record<string, any> = {};
      variables.forEach(v => {
        if (v.name) {
          try {
            if (v.value === undefined || v.value === null || v.value === "") return;
            switch (v.type) {
              case 'number':
                params[v.name] = parseFloat(v.value);
                break;
              case 'boolean':
                params[v.name] = v.value === 'true' || v.value === '1';
                break;
              case 'date':
                params[v.name] = new Date(v.value).toISOString();
                break;
              case 'array':
                params[v.name] = JSON.parse(v.value);
                break;
              case 'object':
                params[v.name] = JSON.parse(v.value);
                break;
              default:
                params[v.name] = v.value;
            }
          } catch (e) {
            params[v.name] = v.value;
          }
        }
      });

      console.log("🧪 Testando API com parâmetros:", params);

      let response: Response;
      if (method === "POST") {
        response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params)
        });
      } else {
        // GET - adiciona parâmetros na URL
        const urlParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          urlParams.append(key, String(value));
        });
        const fullUrl = `${url}${urlParams.toString() ? '?' + urlParams.toString() : ''}`;
        response = await fetch(fullUrl);
      }

      let data: any = null;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }
      
      setTestResult(data);

      // Notifica o pai para atualizar o ReportBro com estes parâmetros
      onTest?.(url, params, { httpMethod: method, paramType: derivedParamType });
      
      if (response.ok) {
        const count = Array.isArray((data as any)?.data) ? (data as any).data.length : (Array.isArray(data) ? data.length : 0);
        toast.success(`API testada com sucesso! ${count} registro(s) retornado(s)`);
      } else {
        toast.error(`API retornou erro (status ${response.status})`);
      }
    } catch (error: any) {
      console.error("Erro ao testar API:", error);
      toast.error("Erro ao testar API: " + error.message);
      setTestResult({ error: error.message });
    } finally {
      setTestingUrl(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Barra de Pesquisa */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar APIs por nome, descrição ou endpoint..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* API Selecionada */}
      {!hideSelectedCard && selectedEndpoint && (
        <Card className="bg-primary/5 border-primary/20">
          <div className="p-4 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Database className="h-4 w-4 text-primary shrink-0" />
                <p className="text-sm font-semibold">{selectedEndpoint.name}</p>
                <Badge variant="outline" className="text-xs">{selectedEndpoint.http_method}</Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {selectedEndpoint.description || 'Sem descrição'}
              </p>
            </div>
            <Button size="sm" onClick={handleSelectEndpoint}>
              Usar API
            </Button>
          </div>
        </Card>
      )}

      {/* Lista de APIs */}
      <Card>
        <ScrollArea className="h-[400px]">
          <div className="p-4 space-y-2">
            {filteredEndpoints.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">
                  {searchTerm ? "Nenhuma API encontrada" : "Nenhuma API cadastrada"}
                </p>
                <p className="text-sm mt-1">
                  {searchTerm ? "Tente outro termo de busca" : "Configure APIs no Gerador de API"}
                </p>
              </div>
            ) : (
              filteredEndpoints.map((endpoint) => {
                const isSelected = selectedEndpoint?.id === endpoint.id;
                const isTesting = testingUrl === getFullUrl(endpoint);
                
                return (
                  <Card 
                    key={endpoint.id}
                    className={`p-3 cursor-pointer transition-all hover:shadow-sm ${
                      isSelected 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:border-accent hover:bg-accent/5'
                    }`}
                    onClick={() => loadEndpointVariables(endpoint)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm truncate">{endpoint.name}</h4>
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {endpoint.http_method}
                          </Badge>
                          {endpoint.is_custom && (
                            <Badge variant="outline" className="text-xs shrink-0">Custom</Badge>
                          )}
                        </div>
                        
                        {endpoint.description && (
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                            {endpoint.description}
                          </p>
                        )}
                        
                        <code className="text-[10px] bg-muted px-2 py-1 rounded">
                          /{endpoint.endpoint_path}
                        </code>

                        {endpoint.parameters && endpoint.parameters.length > 0 && (
                          <div className="flex items-center gap-1 mt-2">
                            <span className="text-[10px] text-muted-foreground">
                              {endpoint.parameters.length} parâmetro{endpoint.parameters.length > 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                      </div>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={async (e) => {
                          e.stopPropagation();
                          
                          // Carrega variáveis do endpoint
                          loadEndpointVariables(endpoint);
                          
                          // Aguarda um tick para garantir que as variáveis foram carregadas
                          await new Promise(resolve => setTimeout(resolve, 50));
                          
                          // Prepara os dados para teste
                          const url = getFullUrl(endpoint);
                          const method = endpoint.http_method || "GET";
                          const derivedParamType = (endpoint.parameters && endpoint.parameters[0]?.param_type) || "query";
                          
                          // Prepara parâmetros com valores padrão
                          const params: Record<string, any> = {};
                          (endpoint.parameters || []).forEach((param: any) => {
                            if (param.name && param.default_value !== undefined && param.default_value !== null && param.default_value !== "") {
                              try {
                                switch (param.type) {
                                  case 'number':
                                    params[param.name] = parseFloat(param.default_value);
                                    break;
                                  case 'boolean':
                                    params[param.name] = param.default_value === 'true' || param.default_value === '1';
                                    break;
                                  case 'date':
                                    params[param.name] = new Date(param.default_value).toISOString();
                                    break;
                                  case 'array':
                                    params[param.name] = JSON.parse(param.default_value);
                                    break;
                                  case 'object':
                                    params[param.name] = JSON.parse(param.default_value);
                                    break;
                                  default:
                                    params[param.name] = param.default_value;
                                }
                              } catch (e) {
                                params[param.name] = param.default_value;
                              }
                            }
                          });
                          
                          // Se onTest existe, chama e deixa o componente pai gerenciar o loading
                          if (onTest) {
                            onTest(url, params, { httpMethod: method, paramType: derivedParamType });
                          }
                        }}
                        disabled={isTesting}
                        className="h-8 w-8 shrink-0"
                        title="Testar API e carregar dados"
                      >
                        {isTesting ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Configuração de Variáveis */}
      {selectedEndpoint && (
        <Card className="p-4 bg-muted/30">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold">Parâmetros da API</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Defina os valores dos parâmetros (nome e tipo não podem ser alterados)
              </p>
            </div>
            <div className="flex gap-2">
              {variables.length > 0 && variables.some(v => v.value) && (
                <Button 
                  size="sm" 
                  onClick={testAndSaveDefaultValues}
                  disabled={!!testingUrl || savingDefaults}
                >
                  {testingUrl || savingDefaults ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-background mr-2" />
                      {testingUrl ? "Testando..." : "Salvando..."}
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3 mr-2" />
                      Testar e Salvar
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
          
          {variables.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <p className="text-sm text-muted-foreground">
                Esta API não possui parâmetros configurados
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Configure os parâmetros no Gerador de API
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {variables.map((variable, index) => (
                <div key={index} className="p-3 bg-background rounded-lg border">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Nome</Label>
                      <Input
                        value={variable.name}
                        disabled
                        className="h-8 text-sm bg-muted cursor-not-allowed"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">Tipo</Label>
                      <Select
                        value={variable.type}
                        disabled
                      >
                        <SelectTrigger className="h-8 bg-muted cursor-not-allowed">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="string">String</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="boolean">Boolean</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">Valor Padrão</Label>
                      <Input
                        placeholder="opcional"
                        value={variable.value}
                        onChange={(e) => updateVariable(index, "value", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  {!variable.value && (
                    <p className="text-[10px] text-amber-600 mt-1">
                      ⚠️ Valor será solicitado ao gerar o relatório
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {variables.some(v => !v.value) && (
            <div className="mt-3 p-2 bg-muted rounded text-xs text-muted-foreground">
              💡 Parâmetros sem valor padrão serão solicitados ao gerar o relatório
            </div>
          )}
        </Card>
      )}

      {testResult && (
        <Card className="p-4 bg-muted/50 space-y-4">
          <h4 className="font-semibold text-sm">Resultado do Teste</h4>
          
          {/* Modo Tabela */}
          {(() => {
            let data: any[] = [];
            if (Array.isArray(testResult)) {
              data = testResult;
            } else if (testResult?.data && Array.isArray(testResult.data)) {
              data = testResult.data;
            } else if (testResult && typeof testResult === 'object' && !testResult.error) {
              data = [testResult];
            }

            if (data.length > 0) {
              const columns = Object.keys(data[0]);
              return (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">Tabela</Badge>
                    <span className="text-xs text-muted-foreground">
                      {data.length} registro(s)
                    </span>
                  </div>
                  <div className="overflow-x-auto border rounded">
                    <table className="w-full text-xs">
                      <thead className="bg-muted">
                        <tr>
                          {columns.map((col) => (
                            <th key={col} className="px-3 py-2 text-left font-semibold border-b">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.slice(0, 10).map((row, idx) => (
                          <tr key={idx} className="border-b hover:bg-muted/30">
                            {columns.map((col) => (
                              <td key={col} className="px-3 py-2">
                                {typeof row[col] === 'object' 
                                  ? JSON.stringify(row[col])
                                  : String(row[col] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {data.length > 10 && (
                    <p className="text-xs text-muted-foreground text-center">
                      Mostrando 10 de {data.length} registros
                    </p>
                  )}
                </div>
              );
            }
            return null;
          })()}

          {/* Modo JSON */}
          <div className="space-y-2">
            <Badge variant="secondary" className="text-xs">JSON</Badge>
            <ScrollArea className="h-[200px] w-full">
              <pre className="text-xs p-3 bg-background rounded border">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </ScrollArea>
          </div>
        </Card>
      )}
    </div>
  );
}
