import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Link, Database, Globe, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface APIDataSourceSelectorProps {
  onSelect: (apiUrl: string, apiName: string) => void;
  currentUrl?: string;
}

export function APIDataSourceSelector({ onSelect, currentUrl }: APIDataSourceSelectorProps) {
  const [endpoints, setEndpoints] = useState<APIEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [customUrl, setCustomUrl] = useState(currentUrl || "");
  const [testingUrl, setTestingUrl] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any>(null);

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
    onSelect(url, endpoint.name);
    toast.success(`API "${endpoint.name}" selecionada`);
  };

  const handleSelectCustomUrl = () => {
    if (!customUrl.trim()) {
      toast.error("Digite uma URL válida");
      return;
    }
    onSelect(customUrl, "API Customizada");
    toast.success("URL customizada configurada");
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
