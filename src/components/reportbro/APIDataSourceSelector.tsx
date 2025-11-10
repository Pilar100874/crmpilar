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
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    return `https://${projectId}.supabase.co/functions/v1/execute-dynamic-query/${endpoint.endpoint_path}`;
  };

  const handleSelectEndpoint = (endpoint: APIEndpoint) => {
    const url = getFullUrl(endpoint);
    onSelect(url, endpoint.name, variables);
    toast.success(`API "${endpoint.name}" selecionada`);
  };

  const handleSelectCustomUrl = () => {
    if (!customUrl.trim()) {
      toast.error("Digite uma URL válida");
      return;
    }
    onSelect(customUrl, "API Customizada", variables);
    toast.success("URL customizada configurada");
  };

  const addVariable = () => {
    setVariables([...variables, { name: "", type: "string", value: "" }]);
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
      {/* Configuração de Variáveis */}
      <Card className="p-4 bg-muted/30">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Variáveis da API</h3>
          <Button size="sm" variant="outline" onClick={addVariable}>
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        </div>
        
        {variables.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">
            Nenhuma variável configurada. Variáveis sem valor fixo serão solicitadas no preview.
          </p>
        ) : (
          <div className="space-y-3">
            {variables.map((variable, index) => (
              <div key={index} className="p-3 bg-background rounded border space-y-2">
                <div className="flex gap-2 items-start">
                  <div className="flex-1 space-y-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Nome da Variável *</Label>
                      <Input
                        placeholder="Ex: cliente_id, data_inicio, etc"
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
                          <SelectItem value="string">String (Texto)</SelectItem>
                          <SelectItem value="number">Number (Número)</SelectItem>
                          <SelectItem value="boolean">Boolean (Verdadeiro/Falso)</SelectItem>
                          <SelectItem value="date">Date (Data)</SelectItem>
                          <SelectItem value="array">Array (Lista)</SelectItem>
                          <SelectItem value="object">Object (Objeto JSON)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Valor Fixo (opcional)
                        {!variable.value && (
                          <span className="ml-2 text-amber-600 font-medium">
                            ⚠️ Será solicitado no preview
                          </span>
                        )}
                      </Label>
                      <Input
                        placeholder={
                          variable.type === 'array' ? '["item1", "item2"]' :
                          variable.type === 'object' ? '{"chave": "valor"}' :
                          variable.type === 'boolean' ? 'true ou false' :
                          variable.type === 'date' ? 'YYYY-MM-DD' :
                          variable.type === 'number' ? '123' :
                          'Deixe vazio para solicitar no preview'
                        }
                        value={variable.value}
                        onChange={(e) => updateVariable(index, "value", e.target.value)}
                        className="h-9"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        {variable.value 
                          ? '✓ Valor fixo será enviado automaticamente' 
                          : '⚠️ Sistema pedirá este valor ao gerar o preview do relatório'
                        }
                      </p>
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
              </div>
            ))}
          </div>
        )}
      </Card>

      <Tabs defaultValue="endpoints" className="w-full">
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

        <TabsContent value="endpoints" className="space-y-3 max-h-[400px] overflow-y-auto">
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
              
              return (
                <Card key={endpoint.id} className="p-4 hover:bg-accent/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold truncate">{endpoint.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {endpoint.http_method}
                        </Badge>
                      </div>
                      
                      {endpoint.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {endpoint.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <Link className="h-3 w-3" />
                        <code className="bg-muted px-1 rounded truncate max-w-[300px]">
                          {url}
                        </code>
                      </div>

                      {endpoint.parameters && endpoint.parameters.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {endpoint.parameters.map((param: any, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {param.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSelectEndpoint(endpoint)}
                        className="whitespace-nowrap"
                      >
                        Selecionar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => testApi(url)}
                        disabled={isTesting}
                        className="whitespace-nowrap"
                      >
                        {isTesting ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customUrl">URL da API</Label>
            <Input
              id="customUrl"
              type="url"
              placeholder="https://api.exemplo.com/dados"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Digite a URL completa da API que retorna dados em JSON
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSelectCustomUrl}
              disabled={!customUrl.trim()}
              className="flex-1"
            >
              Usar esta URL
            </Button>
            <Button
              variant="outline"
              onClick={() => testApi(customUrl)}
              disabled={!customUrl.trim() || testingUrl === customUrl}
            >
              {testingUrl === customUrl ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

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
