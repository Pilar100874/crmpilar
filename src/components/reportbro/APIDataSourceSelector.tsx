import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Link, Database, Globe, Play, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

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
  onSelect: (apiUrl: string, apiName: string, variables: APIVariable[]) => void;
  currentUrl?: string;
  currentVariables?: APIVariable[];
}

export function APIDataSourceSelector({ onSelect, currentUrl, currentVariables }: APIDataSourceSelectorProps) {
  const [endpoints, setEndpoints] = useState<APIEndpoint[]>([]);
  const [customEndpoints, setCustomEndpoints] = useState<APIEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [customUrl, setCustomUrl] = useState(currentUrl || "");
  const [testingUrl, setTestingUrl] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [variables, setVariables] = useState<APIVariable[]>(currentVariables || []);
  const [selectedEndpoint, setSelectedEndpoint] = useState<APIEndpoint | null>(null);
  const [selectedCustomEndpoint, setSelectedCustomEndpoint] = useState<APIEndpoint | null>(null);
  const [activeTab, setActiveTab] = useState<string>("endpoints");
  const [customApiName, setCustomApiName] = useState("");
  const [savingCustom, setSavingCustom] = useState(false);
  const [editingCustom, setEditingCustom] = useState(false);
  const [httpMethod, setHttpMethod] = useState<string>("GET");
  const [paramType, setParamType] = useState<string>("query");

  // Limpar variáveis ao trocar de aba
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === "custom") {
      setSelectedEndpoint(null);
      setVariables([]);
      setCustomUrl("");
      setCustomApiName("");
      setSelectedCustomEndpoint(null);
      setEditingCustom(false);
      setHttpMethod("GET");
      setParamType("query");
    } else {
      setSelectedCustomEndpoint(null);
      setCustomUrl("");
      setCustomApiName("");
      setVariables([]);
      setEditingCustom(false);
      setHttpMethod("GET");
      setParamType("query");
    }
  };

  useEffect(() => {
    loadEndpoints();
  }, []);

  const loadEndpoints = async () => {
    try {
      const estabId = await getEstabelecimentoId();
      
      let query = supabase
        .from("api_endpoints")
        .select("*")
        .eq("active", true);

      if (estabId) {
        query = query.eq("estabelecimento_id", estabId);
      }

      const { data, error } = await query.order("name");

      if (error) throw error;
      
      const formattedEndpoints = (data || []).map(ep => ({
        ...ep,
        parameters: Array.isArray(ep.parameters) ? ep.parameters : []
      }));
      
      // Separar APIs normais das customizadas
      const normalApis = formattedEndpoints.filter(ep => !ep.is_custom);
      const customApis = formattedEndpoints.filter(ep => ep.is_custom);
      
      setEndpoints(normalApis);
      setCustomEndpoints(customApis);
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
    
    // Carregar variáveis dos parâmetros da API
    if (endpoint.parameters && endpoint.parameters.length > 0) {
      const apiVars: APIVariable[] = endpoint.parameters.map((param: any) => ({
        name: param.name || "",
        type: param.type || "string",
        value: param.default_value || "" // Carrega o valor padrão se existir
      }));
      setVariables(apiVars);
      console.log("Variáveis carregadas da API:", apiVars);
      toast.info(`${apiVars.length} variável(is) carregada(s) da API`);
    } else {
      setVariables([]);
      toast.info("API sem parâmetros configurados");
    }
  };

  const handleSelectEndpoint = () => {
    if (!selectedEndpoint) {
      toast.error("Selecione uma API primeiro");
      return;
    }
    const url = getFullUrl(selectedEndpoint);
    onSelect(url, selectedEndpoint.name, variables);
    toast.success(`API "${selectedEndpoint.name}" configurada com sucesso`);
  };

  const handleSelectCustomUrl = () => {
    if (!customUrl.trim()) {
      toast.error("Digite uma URL válida");
      return;
    }
    onSelect(customUrl, customApiName || "API Customizada", variables);
    toast.success("URL customizada configurada");
  };

  const loadCustomEndpoint = (endpoint: APIEndpoint) => {
    setSelectedCustomEndpoint(endpoint);
    setCustomApiName(endpoint.name);
    setCustomUrl(endpoint.custom_url || endpoint.endpoint_path);
    setHttpMethod(endpoint.http_method || "GET");
    // Extrair paramType dos parâmetros salvos se existir
    const savedParamType = endpoint.parameters?.[0]?.param_type || "query";
    setParamType(savedParamType);
    setEditingCustom(true);
    
    if (endpoint.parameters && endpoint.parameters.length > 0) {
      const apiVars: APIVariable[] = endpoint.parameters.map((param: any) => ({
        name: param.name || "",
        type: param.type || "string",
        value: param.default_value || ""
      }));
      setVariables(apiVars);
    } else {
      setVariables([]);
    }
  };

  const saveCustomUrl = async () => {
    if (!customUrl.trim()) {
      toast.error("Digite uma URL válida");
      return;
    }
    if (!customApiName.trim()) {
      toast.error("Digite um nome para esta configuração");
      return;
    }

    console.log("Salvando URL customizada com variáveis:", variables);

    setSavingCustom(true);
    try {
      const estabId = await getEstabelecimentoId();
      
      const parametersToSave = variables.map(v => ({
        name: v.name,
        type: v.type,
        default_value: v.value || null,
        param_type: paramType
      }));

      console.log("Parâmetros formatados:", parametersToSave);

      const dataToSave = {
        name: customApiName,
        description: `URL customizada configurada via ReportBro (${httpMethod} - ${paramType})`,
        endpoint_path: customUrl,
        http_method: httpMethod,
        active: true,
        database_type: "custom",
        query: "",
        parameters: parametersToSave,
        estabelecimento_id: estabId,
        is_custom: true,
        custom_url: customUrl
      };

      console.log("Dados a salvar:", dataToSave);

      if (editingCustom && selectedCustomEndpoint) {
        // Atualizar existente
        const { data, error } = await supabase
          .from("api_endpoints")
          .update(dataToSave)
          .eq("id", selectedCustomEndpoint.id)
          .select();

        if (error) throw error;
        console.log("API atualizada com sucesso:", data);
        toast.success(`URL customizada atualizada com ${variables.length} variável(is)!`);
      } else {
        // Inserir nova
        const { data, error } = await supabase
          .from("api_endpoints")
          .insert(dataToSave)
          .select();

        if (error) throw error;
        console.log("API salva com sucesso:", data);
        toast.success(`URL customizada salva com ${variables.length} variável(is)!`);
      }
      
      setCustomApiName("");
      setCustomUrl("");
      setVariables([]);
      setSelectedCustomEndpoint(null);
      setEditingCustom(false);
      setHttpMethod("GET");
      setParamType("query");
      await loadEndpoints();
    } catch (error: any) {
      console.error("Erro ao salvar URL customizada:", error);
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setSavingCustom(false);
    }
  };

  const deleteCustomEndpoint = async (endpoint: APIEndpoint) => {
    if (!confirm(`Deseja realmente excluir a URL customizada "${endpoint.name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("api_endpoints")
        .delete()
        .eq("id", endpoint.id);

      if (error) throw error;

      toast.success("URL customizada excluída");
      await loadEndpoints();
      
      if (selectedCustomEndpoint?.id === endpoint.id) {
        setSelectedCustomEndpoint(null);
        setCustomUrl("");
        setCustomApiName("");
        setVariables([]);
        setEditingCustom(false);
        setHttpMethod("GET");
        setParamType("query");
      }
    } catch (error: any) {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao excluir: " + error.message);
    }
  };

  const addVariable = () => {
    const newVariables = [...variables, { name: "", type: "string", value: "" }];
    setVariables(newVariables);
    console.log("Variável adicionada. Total:", newVariables.length);
  };

  const updateVariable = (index: number, field: keyof APIVariable, value: string) => {
    const newVariables = [...variables];
    newVariables[index][field] = value;
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
      const data = await response.json();
      setTestResult(data);
      
      if (response.ok && data.success) {
        toast.success("API respondeu com sucesso!");
      } else {
        toast.warning("API retornou erro");
      }
    } catch (error: any) {
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
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="endpoints">
            <Database className="h-4 w-4 mr-2" />
            APIs Cadastradas
          </TabsTrigger>
          <TabsTrigger value="custom">
            <Globe className="h-4 w-4 mr-2" />
            URL Customizada
          </TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints" className="space-y-3">
          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
            {endpoints.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma API cadastrada</p>
                <p className="text-sm">Crie APIs na tela de Gerador de API</p>
              </div>
            ) : (
              endpoints.map((endpoint) => {
                const url = getFullUrl(endpoint);
                const isTesting = testingUrl === url;
                const isSelected = selectedEndpoint?.id === endpoint.id;
                
                return (
                  <Card 
                    key={endpoint.id} 
                    className={`p-4 cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-primary bg-primary/5 shadow-sm' 
                        : 'hover:bg-accent/50 hover:border-accent'
                    }`}
                    onClick={() => loadEndpointVariables(endpoint)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold truncate">{endpoint.name}</h4>
                          {endpoint.is_custom ? (
                            <Badge variant="secondary" className="text-xs">
                              <Globe className="h-3 w-3 mr-1" />
                              Customizada
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              {endpoint.http_method}
                            </Badge>
                          )}
                          {isSelected && (
                            <Badge className="text-xs">Selecionada</Badge>
                          )}
                        </div>
                        
                        {endpoint.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {endpoint.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                          <Link className="h-3 w-3" />
                          <code className="bg-muted px-1 rounded text-[10px] truncate max-w-[300px]">
                            /{endpoint.endpoint_path}
                          </code>
                        </div>

                        {endpoint.parameters && endpoint.parameters.length > 0 && (
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-muted-foreground">Parâmetros:</span>
                            <div className="flex flex-wrap gap-1">
                              {endpoint.parameters.map((param: any, idx: number) => (
                                <Badge key={idx} variant="secondary" className="text-[10px] py-0">
                                  {param.name} ({param.type || 'string'})
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          testApi(url);
                        }}
                        disabled={isTesting}
                        className="shrink-0"
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
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          {/* Lista de URLs customizadas salvas */}
          {customEndpoints.length > 0 && !editingCustom && !customUrl && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">URLs Customizadas Salvas</h3>
              {customEndpoints.map((endpoint) => (
                <Card 
                  key={endpoint.id} 
                  className="p-3 cursor-pointer hover:bg-accent/50 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0" onClick={() => loadCustomEndpoint(endpoint)}>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-semibold text-sm truncate">{endpoint.name}</h4>
                        <Badge variant="secondary" className="text-xs">
                          <Globe className="h-3 w-3 mr-1" />
                          Customizada
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {endpoint.http_method}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Link className="h-3 w-3" />
                        <code className="bg-muted px-1 rounded text-[10px] truncate max-w-[250px]">
                          {endpoint.custom_url || endpoint.endpoint_path}
                        </code>
                      </div>
                      {endpoint.parameters && endpoint.parameters.length > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground">
                            {endpoint.parameters.length} variável(is)
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          testApi(endpoint.custom_url || endpoint.endpoint_path);
                        }}
                        className="h-8 w-8"
                      >
                        <Play className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCustomEndpoint(endpoint);
                        }}
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              <Button
                variant="outline"
                onClick={() => {
                  setCustomUrl("");
                  setCustomApiName("");
                  setVariables([]);
                  setEditingCustom(false);
                  setSelectedCustomEndpoint(null);
                  setHttpMethod("GET");
                  setParamType("query");
                }}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova URL Customizada
              </Button>
            </div>
          )}

          {/* Formulário de criar/editar URL customizada */}
          {(editingCustom || customUrl || customEndpoints.length === 0) && (
            <Card className="p-4 bg-muted/30">
              <div className="space-y-4">
                {editingCustom && (
                  <div className="flex items-center justify-between pb-3 border-b">
                    <Badge variant="secondary">Editando URL Customizada</Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingCustom(false);
                        setSelectedCustomEndpoint(null);
                        setCustomUrl("");
                        setCustomApiName("");
                        setVariables([]);
                        setHttpMethod("GET");
                        setParamType("query");
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="customApiName">Nome da Configuração *</Label>
                  <Input
                    id="customApiName"
                    placeholder="Ex: API de Produtos Externa"
                    value={customApiName}
                    onChange={(e) => setCustomApiName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Nome para identificar esta URL customizada
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="httpMethod">Método HTTP *</Label>
                    <Select value={httpMethod} onValueChange={setHttpMethod}>
                      <SelectTrigger id="httpMethod">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                        <SelectItem value="DELETE">DELETE</SelectItem>
                        <SelectItem value="PATCH">PATCH</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paramType">Tipo de Envio *</Label>
                    <Select value={paramType} onValueChange={setParamType}>
                      <SelectTrigger id="paramType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="query">Query String</SelectItem>
                        <SelectItem value="json">JSON Body</SelectItem>
                        <SelectItem value="formdata">Form Data</SelectItem>
                        <SelectItem value="header">Custom Header</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customUrl">URL da API *</Label>
                  <Input
                    id="customUrl"
                    type="url"
                    placeholder="https://api.exemplo.com/dados"
                    value={customUrl}
                    onChange={(e) => {
                      setCustomUrl(e.target.value);
                      setSelectedEndpoint(null);
                    }}
                  />
                  {paramType === "header" && (
                    <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <p className="text-xs font-semibold text-amber-900 dark:text-amber-100 mb-1">
                        Formato Custom Header:
                      </p>
                      <p className="text-xs text-amber-800 dark:text-amber-200">
                        Os parâmetros serão enviados em um único header com key="keys"
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                        Formato: <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">variavel,valor,tipo</code>
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        Exemplo: <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">prod,10000,string</code>
                      </p>
                    </div>
                  )}
                  {paramType !== "header" && (
                    <p className="text-xs text-muted-foreground">
                      {paramType === "query" 
                        ? "Parâmetros serão enviados na URL (?param=value)"
                        : paramType === "json"
                        ? "Parâmetros serão enviados no corpo da requisição como JSON"
                        : "Parâmetros serão enviados como form-data"
                      }
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => testApi(customUrl)}
                    disabled={!customUrl.trim() || testingUrl === customUrl}
                  >
                    {testingUrl === customUrl ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Testar API
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Configuração de Variáveis - Aparece após selecionar API OU na aba customizada com formulário ativo */}
      {((selectedEndpoint && activeTab === "endpoints") || (activeTab === "custom" && (editingCustom || customUrl))) && (
        <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Database className="h-4 w-4" />
                Configurar Variáveis
                {selectedEndpoint && (
                  <Badge variant="outline" className="text-xs">
                    {selectedEndpoint.name}
                  </Badge>
                )}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedEndpoint 
                  ? "Preencha os valores para as variáveis da API selecionada"
                  : paramType === "header"
                  ? "Variáveis serão enviadas como header 'keys' no formato: variavel,valor,tipo"
                  : paramType === "json"
                  ? "Variáveis serão enviadas no corpo da requisição como JSON"
                  : paramType === "formdata"
                  ? "Variáveis serão enviadas como form-data"
                  : "Variáveis serão enviadas como query string na URL"
                }
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={addVariable}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>
          
          {variables.length === 0 ? (
            <div className="text-center py-6 border-2 border-dashed rounded-lg bg-background/50">
              <p className="text-xs text-muted-foreground">
                {selectedEndpoint 
                  ? "Esta API não possui parâmetros configurados"
                  : "Nenhuma variável adicionada"
                }
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Clique em "Adicionar" para criar variáveis personalizadas
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {variables.map((variable, index) => (
                <div key={index} className="p-3 bg-background rounded-lg border shadow-sm space-y-2">
                  <div className="flex gap-2 items-start">
                    <div className="flex-1 grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Nome *</Label>
                        <Input
                          placeholder="nome_parametro"
                          value={variable.name}
                          onChange={(e) => updateVariable(index, "name", e.target.value)}
                          className="h-9"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Tipo</Label>
                        <Select
                          value={variable.type}
                          onValueChange={(value) => updateVariable(index, "type", value)}
                        >
                          <SelectTrigger className="h-9">
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
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          Valor
                          {!variable.value && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-500/10 text-amber-700 border-amber-200">
                              Será solicitado
                            </Badge>
                          )}
                        </Label>
                        <Input
                          placeholder={
                            variable.type === 'boolean' ? 'true/false' :
                            variable.type === 'date' ? 'YYYY-MM-DD' :
                            variable.type === 'number' ? '123' :
                            'Opcional'
                          }
                          value={variable.value}
                          onChange={(e) => updateVariable(index, "value", e.target.value)}
                          className="h-9"
                        />
                      </div>
                    </div>
                    
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeVariable(index)}
                      className="h-9 w-9 mt-5"
                      title="Remover variável"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground pl-1">
                    {paramType === "header" 
                      ? variable.value 
                        ? `✓ Será enviado no header 'keys' como: ${variable.name},${variable.value},${variable.type}`
                        : `⚠️ Sistema solicitará este valor para montar o header 'keys'`
                      : variable.value 
                        ? '✓ Este valor será enviado automaticamente' 
                        : '⚠️ Sistema solicitará este valor ao gerar o preview'
                    }
                  </p>
                </div>
              ))}
              
              {/* Preview do formato do header quando paramType for "header" */}
              {paramType === "header" && variables.length > 0 && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Preview do Header:
                  </p>
                  <div className="font-mono text-xs bg-blue-100 dark:bg-blue-900/40 p-2 rounded">
                    <div className="text-blue-800 dark:text-blue-200">
                      <strong>Key:</strong> keys
                    </div>
                    <div className="text-blue-700 dark:text-blue-300 mt-1">
                      <strong>Value:</strong>{' '}
                      {variables
                        .filter(v => v.name)
                        .map(v => `${v.name},${v.value || '{valor}'},${v.type}`)
                        .join(';')}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Botão de ação final */}
          <div className="mt-4 pt-4 border-t space-y-3">
            {activeTab === "custom" && (
              <div className="space-y-2">
                {(!customUrl.trim() || !customApiName.trim()) && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <p className="text-xs text-amber-700 font-medium">
                      ⚠️ Para salvar a configuração, preencha:
                    </p>
                    <ul className="text-xs text-amber-600 mt-1 ml-4 list-disc">
                      {!customApiName.trim() && <li>Nome da Configuração</li>}
                      {!customUrl.trim() && <li>URL da API</li>}
                    </ul>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button 
                    onClick={saveCustomUrl}
                    disabled={!customUrl.trim() || !customApiName.trim() || savingCustom}
                    variant="outline"
                    className="flex-1"
                    size="lg"
                  >
                    {savingCustom ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                        Salvando...
                      </>
                    ) : editingCustom ? (
                      "Salvar Alterações"
                    ) : (
                      "Salvar Configuração"
                    )}
                  </Button>
                  <Button 
                    onClick={handleSelectCustomUrl}
                    disabled={!customUrl.trim()}
                    className="flex-1"
                    size="lg"
                  >
                    Usar Agora
                  </Button>
                </div>
              </div>
            )}
            {activeTab === "endpoints" && (
              <Button 
                onClick={handleSelectEndpoint}
                disabled={!selectedEndpoint}
                className="w-full"
                size="lg"
              >
                {`Usar API${selectedEndpoint ? `: ${selectedEndpoint.name}` : ''}`}
              </Button>
            )}
          </div>
        </Card>
      )}

      {testResult && (
        <Card className="p-4 bg-muted/50">
          <h4 className="font-semibold mb-2 text-sm">Resultado do Teste:</h4>
          <pre className="text-xs overflow-x-auto max-h-[200px] overflow-y-auto">
            {JSON.stringify(testResult, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}
