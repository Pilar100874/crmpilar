import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, Database, Loader2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

interface ApiEndpoint {
  id: string;
  name: string;
  endpoint_path: string;
  custom_url: string | null;
  http_method: string;
}

interface Props {
  selectedApiId: string;
  customUrl: string;
  onApiSelect: (apiId: string, customUrl: string) => void;
  onDataFetch: (data: any[], headers: string[]) => void;
  apiData: any[];
  apiHeaders: string[];
}

export function ApiImportWizardStep1({
  selectedApiId,
  customUrl,
  onApiSelect,
  onDataFetch,
  apiData,
  apiHeaders,
}: Props) {
  const [apis, setApis] = useState<ApiEndpoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [useCustomUrl, setUseCustomUrl] = useState(false);
  const [localCustomUrl, setLocalCustomUrl] = useState(customUrl);

  useEffect(() => {
    loadApis();
  }, []);

  useEffect(() => {
    setLocalCustomUrl(customUrl);
    setUseCustomUrl(!!customUrl && !selectedApiId);
  }, [customUrl, selectedApiId]);

  const loadApis = async () => {
    setLoading(true);
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) return;

      const { data, error } = await supabase
        .from("api_endpoints")
        .select("id, name, endpoint_path, custom_url, http_method")
        .eq("estabelecimento_id", estabelecimentoId)
        .eq("active", true)
        .order("name");

      if (error) throw error;
      setApis(data || []);
    } catch (error) {
      console.error("Erro ao carregar APIs:", error);
      toast.error("Erro ao carregar APIs disponíveis");
    } finally {
      setLoading(false);
    }
  };

  const handleApiChange = (apiId: string) => {
    if (apiId === "custom") {
      setUseCustomUrl(true);
      onApiSelect("", localCustomUrl);
    } else {
      setUseCustomUrl(false);
      onApiSelect(apiId, "");
    }
  };

  const handleCustomUrlChange = (url: string) => {
    setLocalCustomUrl(url);
    onApiSelect("", url);
  };

  const fetchApiData = async () => {
    setFetchingData(true);
    try {
      let result: any;
      
      if (useCustomUrl) {
        // URL personalizada - fazer fetch direto
        const response = await fetch(localCustomUrl);
        if (!response.ok) {
          throw new Error(`Erro HTTP: ${response.status}`);
        }
        result = await response.json();
      } else if (selectedApiId) {
        const selectedApi = apis.find(a => a.id === selectedApiId);
        
        if (selectedApi?.custom_url) {
          // API com URL customizada - fazer fetch direto
          const response = await fetch(selectedApi.custom_url);
          if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
          }
          result = await response.json();
        } else if (selectedApi) {
          // API do banco - executar via execute-dynamic-query
          const { data, error } = await supabase.functions.invoke('execute-dynamic-query', {
            body: { endpoint_id: selectedApi.id }
          });
          
          if (error) throw error;
          result = data;
        }
      }

      if (!result) {
        toast.error("Não foi possível obter dados da API");
        return;
      }
      
      // Tentar extrair os dados de diferentes formatos de resposta
      let data: any[] = [];
      if (Array.isArray(result)) {
        data = result;
      } else if (result.data && Array.isArray(result.data)) {
        data = result.data;
      } else if (result.items && Array.isArray(result.items)) {
        data = result.items;
      } else if (result.products && Array.isArray(result.products)) {
        data = result.products;
      } else if (result.produtos && Array.isArray(result.produtos)) {
        data = result.produtos;
      } else {
        // Tentar encontrar o primeiro array na resposta
        const firstArrayKey = Object.keys(result).find(key => Array.isArray(result[key]));
        if (firstArrayKey) {
          data = result[firstArrayKey];
        }
      }

      if (data.length === 0) {
        toast.warning("Nenhum dado encontrado na API");
        return;
      }

      // Extrair headers (chaves) do primeiro objeto
      const headers = Object.keys(data[0]);
      
      onDataFetch(data, headers);
      toast.success(`${data.length} registros carregados da API`);
    } catch (error: any) {
      console.error("Erro ao buscar dados da API:", error);
      toast.error(`Erro ao buscar dados: ${error.message}`);
    } finally {
      setFetchingData(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Seleção da API de Origem</h3>
        <p className="text-sm text-muted-foreground">
          Selecione uma API cadastrada ou informe uma URL personalizada
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <div className="space-y-2">
          <Label>Origem dos Dados</Label>
          <Select
            value={useCustomUrl ? "custom" : selectedApiId}
            onValueChange={handleApiChange}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma API..." />
            </SelectTrigger>
            <SelectContent>
              {apis.map((api) => (
                <SelectItem key={api.id} value={api.id}>
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    {api.name}
                  </div>
                </SelectItem>
              ))}
              <SelectItem value="custom">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  URL Personalizada
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {useCustomUrl && (
          <div className="space-y-2">
            <Label>URL da API</Label>
            <Input
              placeholder="https://api.exemplo.com/produtos"
              value={localCustomUrl}
              onChange={(e) => handleCustomUrlChange(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              A API deve retornar um array JSON com os dados dos produtos
            </p>
          </div>
        )}

        <Button
          onClick={fetchApiData}
          disabled={fetchingData || (!selectedApiId && !localCustomUrl)}
          className="w-full"
        >
          {fetchingData ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Buscando dados...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Buscar Dados da API
            </>
          )}
        </Button>
      </Card>

      {apiData.length > 0 && (
        <Card className="p-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <div className="flex items-start space-x-4">
            <div className="rounded-lg bg-green-100 dark:bg-green-900 p-3">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-300" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-green-900 dark:text-green-100">
                Dados carregados com sucesso!
              </h4>
              <p className="text-sm text-green-700 dark:text-green-200 mt-1">
                {apiData.length} registros encontrados
              </p>
              <p className="text-xs text-green-600 dark:text-green-300 mt-2">
                Campos disponíveis: {apiHeaders.join(", ")}
              </p>
            </div>
          </div>
        </Card>
      )}

      {apiData.length === 0 && (selectedApiId || localCustomUrl) && !fetchingData && (
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Dica:</strong> Clique em "Buscar Dados da API" para carregar os registros.
          </p>
        </div>
      )}
    </div>
  );
}
