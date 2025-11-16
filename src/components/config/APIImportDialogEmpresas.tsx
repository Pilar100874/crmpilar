import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/lib/toast-config";
import { Loader2, ChevronRight, ChevronLeft, AlertCircle, CheckCircle, XCircle, Search } from "lucide-react";
import { maskCNPJ, maskCEP, maskPhone } from "@/lib/masks";
import { supabase } from "@/integrations/supabase/client";
import { APIDataSourceSelector } from "../reportbro/APIDataSourceSelector";
import { ScrollArea } from "@/components/ui/scroll-area";

interface APIImportDialogEmpresasProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: (estabelecimentoId: string) => void;
  estabelecimentoId: string;
}

interface FieldMapping {
  apiField: string;
  systemField: string;
  conversion?: string;
}

interface PreviewRecord {
  rowIndex: number;
  cnpj: string;
  data: Record<string, any>;
  status: "valid" | "invalid" | "duplicate";
  errors: string[];
}

const SYSTEM_FIELDS = [
  { id: "cnpj", label: "CNPJ", required: true },
  { id: "nome", label: "Razão Social", required: true },
  { id: "nome_fantasia", label: "Nome Fantasia", required: false },
  { id: "telefone", label: "Telefone", required: false },
  { id: "email", label: "E-mail", required: false },
  { id: "endereco", label: "Endereço", required: false },
  { id: "bairro", label: "Bairro", required: false },
  { id: "cidade", label: "Cidade", required: false },
  { id: "estado", label: "Estado (UF)", required: false },
  { id: "cep", label: "CEP", required: false },
];

const CONVERSION_OPTIONS = [
  { id: "none", label: "Sem conversão" },
  { id: "remove_mask", label: "Remover máscara/pontuação" },
  { id: "cnpj_mask", label: "Aplicar máscara CNPJ" },
  { id: "phone_mask", label: "Aplicar máscara telefone" },
  { id: "cep_mask", label: "Aplicar máscara CEP" },
  { id: "uppercase", label: "MAIÚSCULAS" },
  { id: "lowercase", label: "minúsculas" },
  { id: "titlecase", label: "Primeira Letra Maiúscula" },
];

function applyConversion(value: any, conversion?: string): string {
  if (!value) return "";
  const str = String(value);
  
  switch (conversion) {
    case "remove_mask":
      return str.replace(/[.\-\/\(\)\s]/g, "");
    case "cnpj_mask":
      return maskCNPJ(str.replace(/\D/g, ""));
    case "phone_mask":
      return maskPhone(str.replace(/\D/g, ""));
    case "cep_mask":
      return maskCEP(str.replace(/\D/g, ""));
    case "uppercase":
      return str.toUpperCase();
    case "lowercase":
      return str.toLowerCase();
    case "titlecase":
      return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    default:
      return str;
  }
}

export function APIImportDialogEmpresas({ 
  open, 
  onOpenChange, 
  onImportComplete,
  estabelecimentoId 
}: APIImportDialogEmpresasProps) {
  // Estados para as 6 etapas
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Etapa 1: Dados da API
  const [apiData, setApiData] = useState<any[]>([]);
  const [apiFields, setApiFields] = useState<string[]>([]);

  // Etapa 2: Seleção de campos
  const [enabledFields, setEnabledFields] = useState<string[]>([]);
  const [cnpjField, setCnpjField] = useState<string>("");

  // Etapa 3: Dados filtrados (sem CNPJs duplicados)
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [sortField, setSortField] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Etapa 4: Mapeamento
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);

  // Etapa 5 e 6: Preview
  const [previewRecords, setPreviewRecords] = useState<PreviewRecord[]>([]);
  const [existingCNPJs, setExistingCNPJs] = useState<Set<string>>(new Set());

  // Resetar ao abrir
  useEffect(() => {
    if (open) {
      setStep(1);
      setApiData([]);
      setApiFields([]);
      setEnabledFields([]);
      setCnpjField("");
      setFilteredData([]);
      setSortField("");
      setSortOrder("asc");
      setFieldMappings([]);
      setPreviewRecords([]);
      setExistingCNPJs(new Set());
      setLoadingProgress(0);
      setAbortController(null);
    }
  }, [open]);

  const cancelLoading = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setLoading(false);
      setLoadingProgress(0);
      toast.info("Carregamento cancelado");
    }
  };

  // ============ ETAPA 1: Carregar API ============
  const handleTestAPI = async (
    apiUrl: string,
    params: Record<string, any>,
    options?: { httpMethod?: string; paramType?: string }
  ) => {
    const controller = new AbortController();
    setAbortController(controller);
    setLoading(true);
    setLoadingProgress(0);
    
    // Simular progresso
    const progressInterval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + 10;
      });
    }, 300);

    try {
      const method = options?.httpMethod || "GET";
      const paramType = options?.paramType || "query";
      
      let url = apiUrl;
      let body = undefined;
      
      if (paramType === "query" && Object.keys(params).length > 0) {
        const queryString = new URLSearchParams(params).toString();
        url = `${apiUrl}?${queryString}`;
      } else if (paramType === "body" && Object.keys(params).length > 0) {
        body = JSON.stringify(params);
      }
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body,
        signal: controller.signal,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      setLoadingProgress(70);
      const data = await response.json();
      
      // Processar resposta
      let processedData: any[] = [];
      
      if (Array.isArray(data)) {
        processedData = data;
      } else if (data.data && Array.isArray(data.data)) {
        processedData = data.data;
      } else if (typeof data === "object") {
        processedData = [data];
      }
      
      if (processedData.length === 0) {
        toast.error("Nenhum dado retornado pela API");
        return;
      }
      
      setLoadingProgress(90);
      setApiData(processedData);
      
      // Extrair campos únicos
      const fields = new Set<string>();
      processedData.forEach((row) => {
        Object.keys(row).forEach((key) => fields.add(key));
      });
      
      setApiFields(Array.from(fields));
      setLoadingProgress(100);
      toast.success(`${processedData.length} registros carregados com ${fields.size} campos`);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log("Requisição cancelada pelo usuário");
      } else {
        console.error("Erro ao testar API:", error);
        toast.error("Erro ao carregar dados: " + error.message);
      }
    } finally {
      clearInterval(progressInterval);
      setLoading(false);
      setLoadingProgress(0);
      setAbortController(null);
    }
  };

  const handleSelectAPI = (
    apiUrl: string,
    apiName: string,
    variables: any[],
    options?: { httpMethod?: string; paramType?: string; isCustom?: boolean }
  ) => {
    // Apenas armazena a seleção, não faz nada ainda
    toast.info(`API "${apiName}" selecionada. Clique em "Testar API" para carregar os dados.`);
  };

  const goToStep2 = () => {
    if (apiData.length === 0) {
      toast.error("Carregue os dados da API primeiro");
      return;
    }
    setStep(2);
  };

  // ============ ETAPA 2: Seleção de campos ============
  const toggleField = (field: string) => {
    setEnabledFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const goToStep3 = () => {
    if (enabledFields.length === 0) {
      toast.error("Selecione pelo menos um campo");
      return;
    }
    if (!cnpjField) {
      toast.error("Selecione o campo de CNPJ");
      return;
    }
    if (!enabledFields.includes(cnpjField)) {
      toast.error("O campo de CNPJ deve estar habilitado");
      return;
    }
    
    // Filtrar dados: remover CNPJs duplicados
    const seen = new Set<string>();
    const filtered: any[] = [];
    
    apiData.forEach((row) => {
      const cnpjValue = String(row[cnpjField] || "").replace(/\D/g, "");
      if (cnpjValue && !seen.has(cnpjValue)) {
        seen.add(cnpjValue);
        // Manter apenas os campos habilitados
        const filteredRow: any = {};
        enabledFields.forEach((field) => {
          filteredRow[field] = row[field];
        });
        filtered.push(filteredRow);
      }
    });
    
    setFilteredData(filtered);
    toast.success(`${filtered.length} registros únicos (${apiData.length - filtered.length} duplicados removidos)`);
    setStep(3);
  };

  // ============ ETAPA 3: Filtros e Ordenação ============
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const getSortedData = () => {
    if (!sortField) return filteredData;
    
    return [...filteredData].sort((a, b) => {
      const aVal = String(a[sortField] || "");
      const bVal = String(b[sortField] || "");
      
      if (sortOrder === "asc") {
        return aVal.localeCompare(bVal);
      } else {
        return bVal.localeCompare(aVal);
      }
    });
  };

  const goToStep4 = () => {
    if (filteredData.length === 0) {
      toast.error("Nenhum dado disponível para mapear");
      return;
    }
    
    // Inicializar mapeamentos
    const initialMappings: FieldMapping[] = enabledFields.map((field) => ({
      apiField: field,
      systemField: "",
      conversion: "none",
    }));
    
    // Auto-mapear CNPJ
    const cnpjMappingIndex = initialMappings.findIndex((m) => m.apiField === cnpjField);
    if (cnpjMappingIndex !== -1) {
      initialMappings[cnpjMappingIndex].systemField = "cnpj";
      initialMappings[cnpjMappingIndex].conversion = "remove_mask";
    }
    
    setFieldMappings(initialMappings);
    setStep(4);
  };

  // ============ ETAPA 4: Mapeamento (De-Para) ============
  const updateMapping = (apiField: string, systemField: string, conversion?: string) => {
    setFieldMappings((prev) =>
      prev.map((m) =>
        m.apiField === apiField
          ? { ...m, systemField, conversion: conversion || m.conversion }
          : m
      )
    );
  };

  const isRequiredFieldsMapped = () => {
    const requiredFields = SYSTEM_FIELDS.filter((f) => f.required).map((f) => f.id);
    const mappedSystemFields = fieldMappings
      .filter((m) => m.systemField)
      .map((m) => m.systemField);
    
    return requiredFields.every((rf) => mappedSystemFields.includes(rf));
  };

  const goToStep5 = () => {
    if (!isRequiredFieldsMapped()) {
      const missing = SYSTEM_FIELDS.filter((f) => f.required)
        .map((f) => f.id)
        .filter((id) => !fieldMappings.find((m) => m.systemField === id));
      toast.error(`Campos obrigatórios não mapeados: ${missing.join(", ")}`);
      return;
    }
    setStep(5);
  };

  // ============ ETAPA 5: Formatação e Preview ============
  useEffect(() => {
    if (step === 5 && filteredData.length > 0) {
      generatePreview();
    }
  }, [step, filteredData, fieldMappings]);

  const generatePreview = async () => {
    setLoading(true);
    
    // Buscar CNPJs existentes
    const { data: empresasExistentes } = await supabase
      .from("empresas")
      .select("cnpj")
      .eq("estabelecimento_id", estabelecimentoId);
    
    const existing = new Set(
      (empresasExistentes || []).map((e) => e.cnpj.replace(/\D/g, ""))
    );
    setExistingCNPJs(existing);
    
    const records: PreviewRecord[] = [];
    
    filteredData.forEach((row, index) => {
      const mapped: Record<string, any> = {};
      const errors: string[] = [];
      
      // Aplicar mapeamentos e conversões
      fieldMappings.forEach((mapping) => {
        if (mapping.systemField) {
          const rawValue = row[mapping.apiField];
          const convertedValue = applyConversion(rawValue, mapping.conversion);
          mapped[mapping.systemField] = convertedValue;
        }
      });
      
      // Validações
      const cnpj = (mapped.cnpj || "").replace(/\D/g, "");
      
      if (!cnpj || cnpj.length !== 14) {
        errors.push("CNPJ inválido");
      }
      if (!mapped.nome) {
        errors.push("Razão Social obrigatória");
      }
      
      const isDuplicate = existing.has(cnpj);
      const isValid = errors.length === 0 && !isDuplicate;
      
      records.push({
        rowIndex: index,
        cnpj,
        data: mapped,
        status: isDuplicate ? "duplicate" : isValid ? "valid" : "invalid",
        errors,
      });
    });
    
    setPreviewRecords(records);
    setLoading(false);
  };

  // ============ ETAPA 6: Importação ============
  const handleImport = async () => {
    const validRecords = previewRecords.filter((r) => r.status === "valid");
    
    if (validRecords.length === 0) {
      toast.error("Nenhum registro válido para importar");
      return;
    }
    
    setLoading(true);
    
    try {
      const toInsert = validRecords.map((record) => ({
        ...record.data,
        estabelecimento_id: estabelecimentoId,
      }));
      
      const { error } = await supabase.from("empresas").insert(toInsert);
      
      if (error) throw error;
      
      toast.success(`${validRecords.length} empresas importadas com sucesso!`);
      onImportComplete?.(estabelecimentoId);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Erro ao importar:", error);
      toast.error("Erro ao importar empresas: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ============ RENDERIZAÇÃO ============
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar Empresas via API</DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <div key={s} className="flex items-center">
                <Badge variant={step === s ? "default" : step > s ? "secondary" : "outline"}>
                  {s}
                </Badge>
                {s < 5 && <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground" />}
              </div>
            ))}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {/* ETAPA 1: Escolher API e carregar dados */}
          {step === 1 && (
            <div className="space-y-4 py-4">
              <Card>
                <CardHeader>
                  <CardTitle>1. Selecione uma API</CardTitle>
                  <CardDescription>
                    Escolha uma API geradora e carregue os dados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading && (
                    <div className="space-y-3 mb-4 p-4 border rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Carregando dados da API...</p>
                          <p className="text-xs text-muted-foreground">{loadingProgress}% concluído</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={cancelLoading}
                          className="gap-2"
                        >
                          <XCircle className="h-4 w-4" />
                          Cancelar
                        </Button>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2.5">
                        <div
                          className="bg-primary h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${loadingProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  <APIDataSourceSelector
                    localUso="importar_empresa"
                    onSelect={handleSelectAPI}
                    onTest={handleTestAPI}
                  />
                </CardContent>
              </Card>

              {apiData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Preview dos Dados</CardTitle>
                    <CardDescription>
                      {apiData.length} registros carregados com {apiFields.length} campos
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {apiFields.slice(0, 10).map((field) => (
                              <TableHead key={field}>{field}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {apiData.slice(0, 5).map((row, i) => (
                            <TableRow key={i}>
                              {apiFields.slice(0, 10).map((field) => (
                                <TableCell key={field}>{String(row[field] || "")}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ETAPA 2: Habilitar/Desabilitar Campos e Definir CNPJ */}
          {step === 2 && (
            <div className="space-y-4 py-4">
              <Card>
                <CardHeader>
                  <CardTitle>2. Selecione os Campos</CardTitle>
                  <CardDescription>
                    Habilite os campos que deseja importar e defina qual é o campo de CNPJ
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Campo de CNPJ *</Label>
                    <Select value={cnpjField} onValueChange={setCnpjField}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o campo que contém o CNPJ" />
                      </SelectTrigger>
                      <SelectContent>
                        {apiFields.map((field) => (
                          <SelectItem key={field} value={field}>
                            {field}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-base">Campos Disponíveis</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Marque os campos que deseja utilizar na importação
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {apiFields.map((field) => (
                        <div key={field} className="flex items-center space-x-2">
                          <Checkbox
                            id={field}
                            checked={enabledFields.includes(field)}
                            onCheckedChange={() => toggleField(field)}
                          />
                          <label
                            htmlFor={field}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {field}
                            {field === cnpjField && (
                              <Badge variant="secondary" className="ml-2">
                                CNPJ
                              </Badge>
                            )}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                    <AlertCircle className="h-4 w-4" />
                    <p className="text-sm">
                      {enabledFields.length} campos selecionados de {apiFields.length} disponíveis
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ETAPA 3: Filtros e Ordenação */}
          {step === 3 && (
            <div className="space-y-4 py-4">
              <Card>
                <CardHeader>
                  <CardTitle>3. Filtros e Ordenação</CardTitle>
                  <CardDescription>
                    Dados filtrados sem CNPJs duplicados. Clique nos cabeçalhos para ordenar.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium">
                      {filteredData.length} registros únicos
                      {apiData.length - filteredData.length > 0 && (
                        <span className="text-muted-foreground">
                          {" "}
                          ({apiData.length - filteredData.length} duplicados removidos)
                        </span>
                      )}
                    </p>
                  </div>

                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {enabledFields.map((field) => (
                            <TableHead
                              key={field}
                              className="cursor-pointer hover:bg-muted"
                              onClick={() => handleSort(field)}
                            >
                              <div className="flex items-center gap-1">
                                {field}
                                {sortField === field && (
                                  <span className="text-xs">
                                    {sortOrder === "asc" ? "↑" : "↓"}
                                  </span>
                                )}
                              </div>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getSortedData().slice(0, 50).map((row, i) => (
                          <TableRow key={i}>
                            {enabledFields.map((field) => (
                              <TableCell key={field}>
                                {String(row[field] || "")}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ETAPA 4: Mapeamento (De-Para) */}
          {step === 4 && (
            <div className="space-y-4 py-4">
              <Card>
                <CardHeader>
                  <CardTitle>4. Mapeamento de Campos (De-Para)</CardTitle>
                  <CardDescription>
                    Configure como os campos da API serão importados para o sistema
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {fieldMappings.map((mapping) => (
                    <div
                      key={mapping.apiField}
                      className="grid grid-cols-3 gap-4 items-center p-3 border rounded-md"
                    >
                      <div>
                        <Label className="text-sm font-medium">{mapping.apiField}</Label>
                        <p className="text-xs text-muted-foreground">Campo da API</p>
                      </div>

                      <div>
                        <Select
                          value={mapping.systemField || "none"}
                          onValueChange={(value) =>
                            updateMapping(mapping.apiField, value === "none" ? "" : value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o campo do sistema" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Não importar</SelectItem>
                            {SYSTEM_FIELDS.map((field) => (
                              <SelectItem key={field.id} value={field.id}>
                                {field.label}
                                {field.required && (
                                  <Badge variant="destructive" className="ml-2 text-xs">
                                    Obrigatório
                                  </Badge>
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Select
                          value={mapping.conversion || "none"}
                          onValueChange={(value) =>
                            updateMapping(mapping.apiField, mapping.systemField, value)
                          }
                          disabled={!mapping.systemField}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Conversão" />
                          </SelectTrigger>
                          <SelectContent>
                            {CONVERSION_OPTIONS.map((option) => (
                              <SelectItem key={option.id} value={option.id}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}

                  <Separator />

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Validação de Campos Obrigatórios</Label>
                    {SYSTEM_FIELDS.filter((f) => f.required).map((field) => {
                      const isMapped = fieldMappings.find(
                        (m) => m.systemField === field.id
                      );
                      return (
                        <div
                          key={field.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          {isMapped ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                          <span className={isMapped ? "text-green-600" : "text-destructive"}>
                            {field.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ETAPA 5 e 6: Preview e Importação */}
          {step === 5 && (
            <div className="space-y-4 py-4">
              <Card>
                <CardHeader>
                  <CardTitle>5 & 6. Preview e Importação</CardTitle>
                  <CardDescription>
                    Revise os dados formatados antes de importar
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-4">
                        <Card className="bg-green-50 border-green-200">
                          <CardContent className="pt-6">
                            <div className="text-center">
                              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                              <p className="text-2xl font-bold text-green-700">
                                {previewRecords.filter((r) => r.status === "valid").length}
                              </p>
                              <p className="text-sm text-green-600">Serão importados</p>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-yellow-50 border-yellow-200">
                          <CardContent className="pt-6">
                            <div className="text-center">
                              <AlertCircle className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                              <p className="text-2xl font-bold text-yellow-700">
                                {previewRecords.filter((r) => r.status === "duplicate").length}
                              </p>
                              <p className="text-sm text-yellow-600">Já existem (duplicados)</p>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-red-50 border-red-200">
                          <CardContent className="pt-6">
                            <div className="text-center">
                              <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                              <p className="text-2xl font-bold text-red-700">
                                {previewRecords.filter((r) => r.status === "invalid").length}
                              </p>
                              <p className="text-sm text-red-600">Inválidos</p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <ScrollArea className="h-[400px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Status</TableHead>
                              <TableHead>CNPJ</TableHead>
                              <TableHead>Razão Social</TableHead>
                              <TableHead>Nome Fantasia</TableHead>
                              <TableHead>Detalhes</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {previewRecords.map((record) => (
                              <TableRow key={record.rowIndex}>
                                <TableCell>
                                  {record.status === "valid" && (
                                    <Badge variant="default" className="bg-green-500">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Válido
                                    </Badge>
                                  )}
                                  {record.status === "duplicate" && (
                                    <Badge variant="secondary">
                                      <AlertCircle className="h-3 w-3 mr-1" />
                                      Duplicado
                                    </Badge>
                                  )}
                                  {record.status === "invalid" && (
                                    <Badge variant="destructive">
                                      <XCircle className="h-3 w-3 mr-1" />
                                      Inválido
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="font-mono text-sm">
                                  {maskCNPJ(record.cnpj)}
                                </TableCell>
                                <TableCell>{record.data.nome}</TableCell>
                                <TableCell>{record.data.nome_fantasia}</TableCell>
                                <TableCell>
                                  {record.errors.length > 0 && (
                                    <p className="text-xs text-destructive">
                                      {record.errors.join(", ")}
                                    </p>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </ScrollArea>

        {/* Botões de Navegação */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1 || loading}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>

            {step < 5 && (
              <Button
                onClick={() => {
                  if (step === 1) goToStep2();
                  else if (step === 2) goToStep3();
                  else if (step === 3) goToStep4();
                  else if (step === 4) goToStep5();
                }}
                disabled={
                  loading || 
                  (step === 1 && apiData.length === 0)
                }
              >
                Próximo
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}

            {step === 5 && (
              <Button
                onClick={handleImport}
                disabled={loading || previewRecords.filter((r) => r.status === "valid").length === 0}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    Importar {previewRecords.filter((r) => r.status === "valid").length} Empresas
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
