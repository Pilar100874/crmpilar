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
  const [loading, setLoading] = useState(true);
  const [customUrl, setCustomUrl] = useState(currentUrl || "");
  const [testingUrl, setTestingUrl] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [variables, setVariables] = useState<APIVariable[]>(currentVariables || []);
  const [selectedEndpoint, setSelectedEndpoint] = useState<APIEndpoint | null>(null);
  const [activeTab, setActiveTab] = useState<string>("endpoints");
  const [customApiName, setCustomApiName] = useState("");
  const [savingCustom, setSavingCustom] = useState(false);

  // Limpar variáveis ao trocar de aba
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === "custom") {
      setSelectedEndpoint(null);
      setVariables([]);
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
        default_value: v.value || null
      }));

      console.log("Parâmetros formatados:", parametersToSave);

      const dataToInsert = {
        name: customApiName,
        description: "URL customizada configurada via ReportBro",
        endpoint_path: customUrl,
        http_method: "GET",
        active: true,
        database_type: "custom",
        query: "",
        parameters: parametersToSave,
        estabelecimento_id: estabId,
        is_custom: true,
        custom_url: customUrl
      };

      console.log("Dados a inserir:", dataToInsert);

      const { data, error } = await supabase
        .from("api_endpoints")
        .insert(dataToInsert)
        .select();

      if (error) throw error;

      console.log("API salva com sucesso:", data);
      
      toast.success(`URL customizada salva com ${variables.length} variável(is)!`);
      setCustomApiName("");
      setCustomUrl("");
      setVariables([]);
      await loadEndpoints();
      setActiveTab("endpoints");
    } catch (error: any) {
      console.error("Erro ao salvar URL customizada:", error);
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setSavingCustom(false);
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
          <Card className="p-4 bg-muted/30">
            <div className="space-y-4">
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
                <p className="text-xs text-muted-foreground">
                  Digite a URL completa da API que retorna dados em JSON
                </p>
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
        </TabsContent>
      </Tabs>

      {/* Configuração de Variáveis - Aparece após selecionar API OU na aba customizada */}
      {((selectedEndpoint && activeTab === "endpoints") || activeTab === "custom") && (
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
                  : "Adicione variáveis que serão enviadas via query string"
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
                    {variable.value 
                      ? '✓ Este valor será enviado automaticamente na URL' 
                      : '⚠️ Sistema solicitará este valor ao gerar o preview'
                    }
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Botão de ação final */}
          <div className="mt-4 pt-4 border-t flex gap-2">
            {activeTab === "custom" && (
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
                ) : (
                  "Salvar Configuração"
                )}
              </Button>
            )}
            <Button 
              onClick={activeTab === "endpoints" ? handleSelectEndpoint : handleSelectCustomUrl}
              disabled={activeTab === "endpoints" ? !selectedEndpoint : !customUrl.trim()}
              className="flex-1"
              size="lg"
            >
              {activeTab === "endpoints" 
                ? `Usar API${selectedEndpoint ? `: ${selectedEndpoint.name}` : ''}`
                : "Usar Agora"
              }
            </Button>
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
