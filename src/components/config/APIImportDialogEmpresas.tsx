import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/lib/toast-config";
import { Loader2, CheckCircle, AlertCircle, Download, ChevronRight, ChevronLeft } from "lucide-react";
import { useCNPJLookup } from "@/hooks/useCNPJLookup";
import { maskCNPJ, maskCEP, maskPhone } from "@/lib/masks";
import { supabase } from "@/integrations/supabase/client";
import { APIDataSourceSelector } from "../reportbro/APIDataSourceSelector";

interface FieldMapping {
  apiField: string;
  systemField: string;
  conversion?: string;
}

interface EmpresaRecord {
  id: string;
  data: Record<string, any>;
  mapped: Record<string, any>;
  missingFields: string[];
  isValid: boolean;
  isDuplicate: boolean;
  cnpjEnriched?: boolean;
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
  { id: "none", label: "Nenhuma" },
  { id: "remove_dots", label: "Remover pontuação" },
  { id: "add_cnpj_mask", label: "Adicionar máscara CNPJ" },
  { id: "add_phone_mask", label: "Adicionar máscara telefone" },
  { id: "add_cep_mask", label: "Adicionar máscara CEP" },
  { id: "uppercase", label: "Maiúsculas" },
  { id: "lowercase", label: "Minúsculas" },
  { id: "title_case", label: "Primeira letra maiúscula" },
];

function applyConversion(value: any, conversion: string): string {
  if (!value) return "";
  const str = String(value);
  
  switch (conversion) {
    case "remove_dots":
      return str.replace(/[.\-\/\(\)\s]/g, "");
    case "add_cnpj_mask":
      return maskCNPJ(str.replace(/\D/g, ""));
    case "add_phone_mask":
      return maskPhone(str.replace(/\D/g, ""));
    case "add_cep_mask":
      return maskCEP(str.replace(/\D/g, ""));
    case "uppercase":
      return str.toUpperCase();
    case "lowercase":
      return str.toLowerCase();
    case "title_case":
      return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    default:
      return str;
  }
}

interface APIImportDialogEmpresasProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
  estabelecimentoId: string;
}

export function APIImportDialogEmpresas({ 
  open, 
  onOpenChange, 
  onImportComplete,
  estabelecimentoId 
}: APIImportDialogEmpresasProps) {
  const [step, setStep] = useState<"api" | "fields" | "mapping" | "preview">("api");
  const [loading, setLoading] = useState(false);
  const [apiData, setApiData] = useState<any[]>([]);
  const [apiFields, setApiFields] = useState<string[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [cnpjField, setCnpjField] = useState<string>("");
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [empresaRecords, setEmpresaRecords] = useState<EmpresaRecord[]>([]);
  const [existingCNPJs, setExistingCNPJs] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const { lookupCNPJ, loading: cnpjLoading } = useCNPJLookup();

  // Step 1: Load API data
  const handleAPISelect = async (apiDetails: any) => {
    setLoading(true);
    try {
      // apiDetails já contém o resultado da API testada
      if (apiDetails.testResult && Array.isArray(apiDetails.testResult)) {
        setApiData(apiDetails.testResult);
        
        // Extrair campos disponíveis
        if (apiDetails.testResult.length > 0) {
          const fields = Object.keys(apiDetails.testResult[0]);
          setApiFields(fields);
          setSelectedFields(fields); // Todos selecionados por padrão
        }
        
        setStep("fields");
        toast.success("Dados da API carregados com sucesso!");
      } else {
        toast.error("Formato de dados inválido da API");
      }
    } catch (error) {
      console.error("Erro ao processar dados da API:", error);
      toast.error("Erro ao processar dados da API");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Select fields and CNPJ field
  const handleFieldsNext = () => {
    if (!cnpjField) {
      toast.error("Selecione o campo que contém o CNPJ");
      return;
    }
    if (selectedFields.length === 0) {
      toast.error("Selecione pelo menos um campo");
      return;
    }
    
    // Remover duplicados pelo CNPJ e filtrar dados
    const uniqueData = apiData.reduce((acc: any[], item: any) => {
      const cnpj = String(item[cnpjField] || "").replace(/\D/g, "");
      if (cnpj && !acc.some(i => String(i[cnpjField] || "").replace(/\D/g, "") === cnpj)) {
        // Manter apenas campos selecionados
        const filtered: any = {};
        selectedFields.forEach(field => {
          filtered[field] = item[field];
        });
        acc.push(filtered);
      }
      return acc;
    }, []);
    
    setApiData(uniqueData);
    
    // Inicializar mapeamentos
    const mappings: FieldMapping[] = selectedFields.map(field => ({
      apiField: field,
      systemField: "",
      conversion: "none"
    }));
    
    // Auto-mapear campo CNPJ
    const cnpjMapping = mappings.find(m => m.apiField === cnpjField);
    if (cnpjMapping) {
      cnpjMapping.systemField = "cnpj";
      cnpjMapping.conversion = "remove_dots";
    }
    
    setFieldMappings(mappings);
    setStep("mapping");
  };

  // Step 3: Map fields
  const updateMapping = (apiField: string, systemField: string, conversion?: string) => {
    setFieldMappings(prev => 
      prev.map(m => 
        m.apiField === apiField 
          ? { ...m, systemField, conversion: conversion || m.conversion }
          : m
      )
    );
  };

  const handleMappingNext = async () => {
    // Verificar se campos obrigatórios foram mapeados
    const requiredFields = SYSTEM_FIELDS.filter(f => f.required);
    const mappedSystemFields = fieldMappings.filter(m => m.systemField).map(m => m.systemField);
    
    const missingRequired = requiredFields.filter(f => !mappedSystemFields.includes(f.id));
    if (missingRequired.length > 0) {
      toast.error(`Campos obrigatórios não mapeados: ${missingRequired.map(f => f.label).join(", ")}`);
      return;
    }

    setLoading(true);
    
    // Buscar CNPJs existentes
    const { data: existingEmpresas } = await supabase
      .from("empresas")
      .select("cnpj")
      .eq("estabelecimento_id", estabelecimentoId);
    
    const cnpjSet = new Set(
      (existingEmpresas || [])
        .map(e => e.cnpj?.replace(/\D/g, "") || "")
        .filter(Boolean)
    );
    setExistingCNPJs(cnpjSet);

    // Processar registros
    const records: EmpresaRecord[] = apiData.map((item, idx) => {
      const mapped: Record<string, any> = {};
      
      fieldMappings.forEach(mapping => {
        if (mapping.systemField) {
          const value = item[mapping.apiField];
          mapped[mapping.systemField] = applyConversion(value, mapping.conversion || "none");
        }
      });

      const cnpj = mapped.cnpj?.replace(/\D/g, "") || "";
      const isDuplicate = cnpjSet.has(cnpj);
      
      const missingFields = requiredFields
        .filter(f => !mapped[f.id] || mapped[f.id] === "")
        .map(f => f.label);

      return {
        id: `record-${idx}`,
        data: item,
        mapped,
        missingFields,
        isValid: missingFields.length === 0 && cnpj.length === 14,
        isDuplicate,
        cnpjEnriched: false
      };
    });

    setEmpresaRecords(records);
    setStep("preview");
    setLoading(false);
  };

  // Enrich with CNPJ data
  const enrichCNPJ = async (recordId: string) => {
    const record = empresaRecords.find(r => r.id === recordId);
    if (!record) return;

    const cnpj = record.mapped.cnpj?.replace(/\D/g, "");
    if (!cnpj || cnpj.length !== 14) {
      toast.error("CNPJ inválido");
      return;
    }

    const cnpjData = await lookupCNPJ(cnpj);
    if (cnpjData) {
      setEmpresaRecords(prev =>
        prev.map(r =>
          r.id === recordId
            ? {
                ...r,
                mapped: {
                  ...r.mapped,
                  nome: cnpjData.nome || r.mapped.nome,
                  nome_fantasia: cnpjData.fantasia || r.mapped.nome_fantasia,
                  endereco: cnpjData.logradouro || r.mapped.endereco,
                  bairro: cnpjData.bairro || r.mapped.bairro,
                  cidade: cnpjData.municipio || r.mapped.cidade,
                  estado: cnpjData.uf || r.mapped.estado,
                  cep: cnpjData.cep || r.mapped.cep,
                  telefone: cnpjData.telefone || r.mapped.telefone,
                  email: cnpjData.email || r.mapped.email,
                },
                cnpjEnriched: true
              }
            : r
        )
      );
      toast.success("Dados complementados com sucesso!");
    }
  };

  const enrichAllCNPJs = async () => {
    const validRecords = empresaRecords.filter(r => r.isValid && !r.isDuplicate && !r.cnpjEnriched);
    
    for (const record of validRecords) {
      await enrichCNPJ(record.id);
    }
  };

  // Import records
  const importRecords = async () => {
    const validRecords = empresaRecords.filter(r => r.isValid && !r.isDuplicate);
    
    if (validRecords.length === 0) {
      toast.error("Nenhum registro válido para importar");
      return;
    }

    setLoading(true);
    try {
      const empresasToInsert = validRecords.map(record => ({
        estabelecimento_id: estabelecimentoId,
        cnpj: record.mapped.cnpj,
        nome: record.mapped.nome,
        nome_fantasia: record.mapped.nome_fantasia || null,
        telefone: record.mapped.telefone || null,
        email: record.mapped.email || null,
        endereco: record.mapped.endereco || null,
        bairro: record.mapped.bairro || null,
        cidade: record.mapped.cidade || null,
        estado: record.mapped.estado || null,
        cep: record.mapped.cep || null,
      }));

      const { error } = await supabase
        .from("empresas")
        .insert(empresasToInsert);

      if (error) throw error;

      toast.success(`${validRecords.length} empresa(s) importada(s) com sucesso!`);
      onImportComplete?.();
      handleClose();
    } catch (error) {
      console.error("Erro ao importar empresas:", error);
      toast.error("Erro ao importar empresas");
    } finally {
      setLoading(false);
    }
  };

  // Edit cell
  const handleCellEdit = (recordId: string, field: string) => {
    const record = empresaRecords.find(r => r.id === recordId);
    if (record) {
      setEditingCell({ id: recordId, field });
      setEditingValue(record.mapped[field] || "");
    }
  };

  const saveCellEdit = () => {
    if (!editingCell) return;

    setEmpresaRecords(prev =>
      prev.map(r =>
        r.id === editingCell.id
          ? {
              ...r,
              mapped: { ...r.mapped, [editingCell.field]: editingValue }
            }
          : r
      )
    );
    setEditingCell(null);
    setEditingValue("");
  };

  const handleClose = () => {
    setStep("api");
    setApiData([]);
    setApiFields([]);
    setSelectedFields([]);
    setCnpjField("");
    setFieldMappings([]);
    setEmpresaRecords([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>
            Importar Empresas via API
            {step !== "api" && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                {step === "fields" && "Etapa 2/4: Selecionar Campos"}
                {step === "mapping" && "Etapa 3/4: Mapear Campos"}
                {step === "preview" && "Etapa 4/4: Revisar e Importar"}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Select API */}
        {step === "api" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione uma API configurada para carregar os dados das empresas.
            </p>
            <APIDataSourceSelector
              onSelect={handleAPISelect}
              onTest={(result) => {
                // Resultado do teste já é processado no handleAPISelect
              }}
            />
          </div>
        )}

        {/* Step 2: Select fields and CNPJ field */}
        {step === "fields" && (
          <div className="space-y-4">
            <Card className="p-4">
              <Label>Campo que contém o CNPJ *</Label>
              <Select value={cnpjField} onValueChange={setCnpjField}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o campo CNPJ" />
                </SelectTrigger>
                <SelectContent>
                  {apiFields.map(field => (
                    <SelectItem key={field} value={field}>{field}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Card>

            <Card className="p-4">
              <Label className="mb-3 block">Campos a importar</Label>
              <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-auto">
                {apiFields.map(field => (
                  <div key={field} className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedFields.includes(field)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedFields(prev => [...prev, field]);
                        } else {
                          setSelectedFields(prev => prev.filter(f => f !== field));
                        }
                      }}
                    />
                    <Label className="text-sm font-normal">{field}</Label>
                  </div>
                ))}
              </div>
            </Card>

            <div className="text-sm text-muted-foreground">
              <p>Total de registros: {apiData.length}</p>
              <p>Registros únicos por CNPJ: {cnpjField ? new Set(apiData.map(d => String(d[cnpjField] || "").replace(/\D/g, ""))).size : "-"}</p>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("api")}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
              </Button>
              <Button onClick={handleFieldsNext}>
                Próximo <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Map fields */}
        {step === "mapping" && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
              Mapeie os campos da API para os campos do cadastro de empresa. 
              <span className="text-destructive"> * Campos obrigatórios</span>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-auto">
              {fieldMappings.map(mapping => (
                <Card key={mapping.apiField} className="p-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Campo da API</Label>
                      <div className="font-medium text-sm">{mapping.apiField}</div>
                    </div>
                    <div>
                      <Label className="text-xs">Campo do Sistema</Label>
                      <Select
                        value={mapping.systemField}
                        onValueChange={(value) => updateMapping(mapping.apiField, value)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Não importar</SelectItem>
                          {SYSTEM_FIELDS.map(field => (
                            <SelectItem key={field.id} value={field.id}>
                              {field.label} {field.required && <span className="text-destructive">*</span>}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Conversão</Label>
                      <Select
                        value={mapping.conversion || "none"}
                        onValueChange={(value) => updateMapping(mapping.apiField, mapping.systemField, value)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CONVERSION_OPTIONS.map(opt => (
                            <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("fields")}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
              </Button>
              <Button onClick={handleMappingNext} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Próximo <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Preview and import */}
        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-4 text-sm">
                  <Badge variant="default" className="bg-success">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    {empresaRecords.filter(r => r.isValid && !r.isDuplicate).length} válidos
                  </Badge>
                  <Badge variant="destructive">
                    <AlertCircle className="mr-1 h-3 w-3" />
                    {empresaRecords.filter(r => !r.isValid).length} inválidos
                  </Badge>
                  <Badge variant="secondary">
                    {empresaRecords.filter(r => r.isDuplicate).length} duplicados
                  </Badge>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={enrichAllCNPJs}
                disabled={cnpjLoading}
              >
                {cnpjLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Enriquecer Todos
              </Button>
            </div>

            <div className="border rounded-lg max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Status</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Razão Social</TableHead>
                    <TableHead>Nome Fantasia</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Cidade/UF</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empresaRecords.map(record => (
                    <TableRow
                      key={record.id}
                      className={record.isDuplicate ? "bg-muted/50" : ""}
                    >
                      <TableCell>
                        {record.isDuplicate ? (
                          <Badge variant="secondary">Duplicado</Badge>
                        ) : record.isValid ? (
                          <Badge variant="default" className="bg-success">
                            <CheckCircle className="h-3 w-3" />
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <AlertCircle className="h-3 w-3" />
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingCell?.id === record.id && editingCell.field === "cnpj" ? (
                          <Input
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={saveCellEdit}
                            onKeyDown={(e) => e.key === "Enter" && saveCellEdit()}
                            autoFocus
                            className="h-7"
                          />
                        ) : (
                          <div onClick={() => !record.isDuplicate && handleCellEdit(record.id, "cnpj")} className="cursor-pointer">
                            {maskCNPJ(record.mapped.cnpj || "")}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingCell?.id === record.id && editingCell.field === "nome" ? (
                          <Input
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={saveCellEdit}
                            onKeyDown={(e) => e.key === "Enter" && saveCellEdit()}
                            autoFocus
                            className="h-7"
                          />
                        ) : (
                          <div onClick={() => !record.isDuplicate && handleCellEdit(record.id, "nome")} className="cursor-pointer">
                            {record.mapped.nome || "-"}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{record.mapped.nome_fantasia || "-"}</TableCell>
                      <TableCell>{record.mapped.telefone || "-"}</TableCell>
                      <TableCell>
                        {record.mapped.cidade && record.mapped.estado 
                          ? `${record.mapped.cidade}/${record.mapped.estado}`
                          : "-"
                        }
                      </TableCell>
                      <TableCell>
                        {!record.isDuplicate && !record.cnpjEnriched && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => enrichCNPJ(record.id)}
                            disabled={cnpjLoading}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("mapping")}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Voltar
              </Button>
              <Button onClick={importRecords} disabled={loading || empresaRecords.filter(r => r.isValid && !r.isDuplicate).length === 0}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Importar {empresaRecords.filter(r => r.isValid && !r.isDuplicate).length} Empresa(s)
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
