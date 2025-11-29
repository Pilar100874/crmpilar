import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Globe, Database, Loader2, CheckCircle2, RefreshCw, FileSpreadsheet, Upload, X, FileUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import * as XLSX from "xlsx";

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

type DataSourceType = "api" | "excel";

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
  const [fetchProgress, setFetchProgress] = useState(0);
  const [useCustomUrl, setUseCustomUrl] = useState(false);
  const [localCustomUrl, setLocalCustomUrl] = useState(customUrl);
  const [dataSource, setDataSource] = useState<DataSourceType>("api");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const startProgressSimulation = () => {
    setFetchProgress(0);
    progressIntervalRef.current = setInterval(() => {
      setFetchProgress(prev => {
        if (prev >= 90) {
          return prev;
        }
        const increment = prev < 30 ? 8 : prev < 60 ? 5 : prev < 80 ? 3 : 1;
        return Math.min(prev + increment, 90);
      });
    }, 150);
  };

  const stopProgressSimulation = (success: boolean) => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (success) {
      setFetchProgress(100);
      setTimeout(() => setFetchProgress(0), 500);
    } else {
      setFetchProgress(0);
    }
  };

  const fetchApiData = async () => {
    setFetchingData(true);
    startProgressSimulation();
    try {
      let result: any;
      
      if (useCustomUrl) {
        const response = await fetch(localCustomUrl);
        if (!response.ok) {
          throw new Error(`Erro HTTP: ${response.status}`);
        }
        result = await response.json();
      } else if (selectedApiId) {
        const selectedApi = apis.find(a => a.id === selectedApiId);
        
        if (selectedApi?.custom_url) {
          const response = await fetch(selectedApi.custom_url);
          if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
          }
          result = await response.json();
        } else if (selectedApi) {
          const { data, error } = await supabase.functions.invoke('execute-dynamic-query', {
            body: { endpoint_id: selectedApi.id }
          });
          
          if (error) throw error;
          result = data;
        }
      }

      if (!result) {
        stopProgressSimulation(false);
        toast.error("Não foi possível obter dados da API");
        return;
      }
      
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
        const firstArrayKey = Object.keys(result).find(key => Array.isArray(result[key]));
        if (firstArrayKey) {
          data = result[firstArrayKey];
        }
      }

      if (data.length === 0) {
        stopProgressSimulation(false);
        toast.warning("Nenhum dado encontrado na API");
        return;
      }

      const headers = Object.keys(data[0]);
      
      stopProgressSimulation(true);
      onDataFetch(data, headers);
      toast.success(`${data.length} registros carregados da API`);
    } catch (error: any) {
      console.error("Erro ao buscar dados da API:", error);
      stopProgressSimulation(false);
      toast.error(`Erro ao buscar dados: ${error.message}`);
    } finally {
      setFetchingData(false);
    }
  };

  // Excel handling
  const handleFileSelect = useCallback((file: File) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      '.xlsx',
      '.xls'
    ];
    
    const isValidType = validTypes.some(type => 
      file.type === type || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
    );
    
    if (!isValidType) {
      toast.error('Por favor, selecione um arquivo Excel (.xlsx ou .xls)');
      return;
    }

    setSelectedFile(file);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const processExcelFile = async () => {
    if (!selectedFile) return;

    setFetchingData(true);
    startProgressSimulation();

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      
      if (jsonData.length === 0) {
        stopProgressSimulation(false);
        toast.warning('Nenhum dado encontrado na planilha');
        return;
      }

      const headers = Object.keys(jsonData[0] as object);
      
      stopProgressSimulation(true);
      onDataFetch(jsonData as any[], headers);
      toast.success(`${jsonData.length} registros carregados do Excel`);
    } catch (error: any) {
      console.error('Erro ao processar arquivo Excel:', error);
      stopProgressSimulation(false);
      toast.error(`Erro ao processar arquivo: ${error.message}`);
    } finally {
      setFetchingData(false);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDataSourceChange = (value: DataSourceType) => {
    setDataSource(value);
    // Clear data when switching sources
    if (apiData.length > 0) {
      onDataFetch([], []);
    }
    clearFile();
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Origem dos Dados</h3>
        <p className="text-sm text-muted-foreground">
          Escolha entre importar dados de uma API ou de um arquivo Excel
        </p>
      </div>

      {/* Data Source Selection */}
      <Card className="p-4">
        <RadioGroup
          value={dataSource}
          onValueChange={(value) => handleDataSourceChange(value as DataSourceType)}
          className="flex flex-col sm:flex-row gap-4"
        >
          <div 
            className={`flex-1 flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
              dataSource === 'api' 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            }`}
            onClick={() => handleDataSourceChange('api')}
          >
            <RadioGroupItem value="api" id="api" />
            <Label htmlFor="api" className="flex items-center gap-2 cursor-pointer flex-1">
              <Database className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">API</p>
                <p className="text-xs text-muted-foreground">Importar de uma API cadastrada ou URL</p>
              </div>
            </Label>
          </div>
          <div 
            className={`flex-1 flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
              dataSource === 'excel' 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            }`}
            onClick={() => handleDataSourceChange('excel')}
          >
            <RadioGroupItem value="excel" id="excel" />
            <Label htmlFor="excel" className="flex items-center gap-2 cursor-pointer flex-1">
              <FileSpreadsheet className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium">Excel</p>
                <p className="text-xs text-muted-foreground">Importar de arquivo .xlsx ou .xls</p>
              </div>
            </Label>
          </div>
        </RadioGroup>
      </Card>

      {/* API Selection */}
      {dataSource === 'api' && (
        <Card className="p-6 space-y-4">
          <div className="space-y-2">
            <Label>Selecione a API</Label>
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
      )}

      {/* Excel Upload */}
      {dataSource === 'excel' && (
        <Card className="p-6 space-y-4">
          <div className="space-y-2">
            <Label>Arquivo Excel</Label>
            
            {!selectedFile ? (
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                  isDragging 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm font-medium">
                  Arraste e solte seu arquivo aqui
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  ou clique para selecionar
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Formatos aceitos: .xlsx, .xls
                </p>
              </div>
            ) : (
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-green-100 dark:bg-green-900/30 p-2">
                      <FileUp className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearFile}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Button
            onClick={processExcelFile}
            disabled={fetchingData || !selectedFile}
            className="w-full"
          >
            {fetchingData ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando arquivo...
              </>
            ) : (
              <>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Carregar Dados do Excel
              </>
            )}
          </Button>
        </Card>
      )}

      {/* Progress */}
      {fetchingData && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Carregando dados...</span>
            <span className="font-medium text-primary">{Math.round(fetchProgress)}%</span>
          </div>
          <Progress value={fetchProgress} className="h-2" />
        </div>
      )}

      {/* Success State */}
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
                Campos disponíveis: {apiHeaders.slice(0, 5).join(", ")}{apiHeaders.length > 5 ? ` (+${apiHeaders.length - 5} mais)` : ""}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Hint */}
      {apiData.length === 0 && !fetchingData && (
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Dica:</strong> {dataSource === 'api' 
              ? 'Selecione uma API e clique em "Buscar Dados" para carregar os registros.' 
              : 'Selecione um arquivo Excel e clique em "Carregar Dados" para importar os registros.'}
          </p>
        </div>
      )}
    </div>
  );
}
