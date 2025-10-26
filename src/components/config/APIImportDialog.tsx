import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, RefreshCw, CheckCircle, AlertCircle, Download } from "lucide-react";
import { useCNPJLookup } from "@/hooks/useCNPJLookup";
import { maskCPF, maskCNPJ, maskCEP, maskPhone } from "@/lib/masks";

interface FieldMapping {
  apiField: string;
  systemField: string;
  conversion?: string;
}

interface APIRecord {
  id: string;
  data: Record<string, any>;
  mapped: Record<string, any>;
  missingFields: string[];
  isValid: boolean;
  cnpjEnriched?: boolean;
}

const SYSTEM_FIELDS = [
  { id: "nome_contato", label: "Nome de contato", required: true },
  { id: "whatsapp", label: "WhatsApp", required: true },
  { id: "email", label: "E-mail", required: true },
  { id: "posicao", label: "Posição", required: true },
  { id: "tipo", label: "Tipo (Pessoa Física/Jurídica)", required: true },
  { id: "cpf_cnpj", label: "CPF/CNPJ", required: true },
  { id: "nome_empresa", label: "Nome da Empresa", required: true },
  { id: "nome_fantasia", label: "Nome Fantasia", required: true },
  { id: "cep", label: "CEP", required: true },
  { id: "endereco", label: "Endereço", required: true },
  { id: "cidade", label: "Cidade", required: true },
  { id: "bairro", label: "Bairro", required: true },
  { id: "uf", label: "UF", required: true },
  { id: "inscricao", label: "Inscrição", required: true },
];

const CONVERSION_OPTIONS = [
  { id: "none", label: "Nenhuma" },
  { id: "remove_dots", label: "Remover pontuação (123.456.789-00 → 12345678900)" },
  { id: "add_cpf_mask", label: "Adicionar máscara CPF (12345678900 → 123.456.789-00)" },
  { id: "add_cnpj_mask", label: "Adicionar máscara CNPJ (12345678000190 → 12.345.678/0001-90)" },
  { id: "add_phone_mask", label: "Adicionar máscara telefone (11999999999 → (11) 99999-9999)" },
  { id: "add_cep_mask", label: "Adicionar máscara CEP (01310100 → 01310-100)" },
  { id: "uppercase", label: "Maiúsculas (abc → ABC)" },
  { id: "lowercase", label: "Minúsculas (ABC → abc)" },
  { id: "title_case", label: "Primeira letra maiúscula (joão silva → João Silva)" },
];

function applyConversion(value: any, conversion: string): string {
  if (!value) return "";
  const str = String(value);
  
  switch (conversion) {
    case "remove_dots":
      return str.replace(/[.\-\/\(\)\s]/g, "");
    case "add_cpf_mask":
      return maskCPF(str.replace(/\D/g, ""));
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

export function APIImportDialog() {
  const [step, setStep] = useState<"url" | "mapping" | "preview">("url");
  const [apiUrl, setApiUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiFields, setApiFields] = useState<string[]>([]);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [apiRecords, setApiRecords] = useState<APIRecord[]>([]);
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const { lookupCNPJ, loading: cnpjLoading } = useCNPJLookup();

  const fetchAPIData = async () => {
    if (!apiUrl) {
      toast.error("Digite a URL da API");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error("Erro ao buscar dados da API");
      
      const data = await response.json();
      const records = Array.isArray(data) ? data : [data];
      
      if (records.length === 0) {
        toast.error("Nenhum registro encontrado na API");
        setLoading(false);
        return;
      }

      // Extrair campos únicos de todos os registros
      const allFields = new Set<string>();
      records.forEach((record) => {
        Object.keys(record).forEach((key) => allFields.add(key));
      });

      setApiFields(Array.from(allFields));
      
      // Inicializar mapeamentos vazios
      const initialMappings = SYSTEM_FIELDS.map(field => ({
        apiField: "",
        systemField: field.id,
        conversion: "none"
      }));
      setFieldMappings(initialMappings);
      
      setStep("mapping");
      toast.success(`${records.length} registros encontrados!`);
    } catch (error) {
      toast.error("Erro ao buscar dados da API: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const processRecords = async () => {
    if (!apiUrl) return;

    setLoading(true);
    try {
      const response = await fetch(apiUrl);
      const data = await response.json();
      const records = Array.isArray(data) ? data : [data];

      const processed: APIRecord[] = records.map((record, index) => {
        const mapped: Record<string, any> = {};
        
        fieldMappings.forEach(mapping => {
          if (mapping.apiField) {
            // Verificar se é valor fixo
            if (mapping.apiField.startsWith("FIXED:")) {
              const fixedValue = mapping.apiField.replace("FIXED:", "");
              const convertedValue = applyConversion(fixedValue, mapping.conversion || "none");
              mapped[mapping.systemField] = convertedValue;
            } else {
              const rawValue = record[mapping.apiField];
              const convertedValue = applyConversion(rawValue, mapping.conversion || "none");
              mapped[mapping.systemField] = convertedValue;
            }
          }
        });

        const missingFields = SYSTEM_FIELDS
          .filter(field => field.required && !mapped[field.id])
          .map(field => field.label);

        return {
          id: `record-${index}`,
          data: record,
          mapped,
          missingFields,
          isValid: missingFields.length === 0
        };
      });

      setApiRecords(processed);
      setStep("preview");
      toast.success("Dados processados com sucesso!");
    } catch (error) {
      toast.error("Erro ao processar dados: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const enrichCNPJ = async (recordId: string) => {
    const record = apiRecords.find(r => r.id === recordId);
    if (!record) return;

    const cnpj = record.mapped.cpf_cnpj;
    if (!cnpj) {
      toast.error("CNPJ não encontrado neste registro");
      return;
    }

    const cnpjData = await lookupCNPJ(cnpj);
    if (cnpjData) {
      const updatedRecords = apiRecords.map(r => {
        if (r.id === recordId) {
          return {
            ...r,
            mapped: {
              ...r.mapped,
              nome_empresa: cnpjData.nome || r.mapped.nome_empresa,
              nome_fantasia: cnpjData.fantasia || r.mapped.nome_fantasia,
              endereco: cnpjData.logradouro || r.mapped.endereco,
              bairro: cnpjData.bairro || r.mapped.bairro,
              cidade: cnpjData.municipio || r.mapped.cidade,
              uf: cnpjData.uf || r.mapped.uf,
              cep: cnpjData.cep || r.mapped.cep,
            },
            cnpjEnriched: true,
            missingFields: []
          };
        }
        return r;
      });
      setApiRecords(updatedRecords);
      toast.success("Dados do CNPJ atualizados!");
    }
  };

  const enrichAllCNPJs = async () => {
    for (const record of apiRecords) {
      const cnpj = record.mapped.cpf_cnpj;
      const cleanCNPJ = cnpj?.replace(/\D/g, "");
      
      if (cleanCNPJ && cleanCNPJ.length === 14) {
        await enrichCNPJ(record.id);
        // Pequeno delay para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  };

  const handleCellEdit = (recordId: string, field: string) => {
    const record = apiRecords.find(r => r.id === recordId);
    if (!record) return;
    
    setEditingCell({ id: recordId, field });
    setEditingValue(record.mapped[field] || "");
  };

  const saveCellEdit = () => {
    if (!editingCell) return;

    const updatedRecords = apiRecords.map(record => {
      if (record.id === editingCell.id) {
        const newMapped = {
          ...record.mapped,
          [editingCell.field]: editingValue
        };
        
        const missingFields = SYSTEM_FIELDS
          .filter(field => field.required && !newMapped[field.id])
          .map(field => field.label);

        return {
          ...record,
          mapped: newMapped,
          missingFields,
          isValid: missingFields.length === 0
        };
      }
      return record;
    });

    setApiRecords(updatedRecords);
    setEditingCell(null);
    setEditingValue("");
  };

  const importRecords = () => {
    const validRecords = apiRecords.filter(r => r.isValid);
    
    if (validRecords.length === 0) {
      toast.error("Nenhum registro válido para importar");
      return;
    }

    // Aqui você implementaria a lógica real de inserção no banco de dados
    console.log("Importando registros:", validRecords);
    toast.success(`${validRecords.length} contatos importados com sucesso!`);
    
    // Reset
    setStep("url");
    setApiUrl("");
    setApiFields([]);
    setFieldMappings([]);
    setApiRecords([]);
  };

  return (
    <div className="space-y-6">
      {/* Step 1: URL da API */}
      {step === "url" && (
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Importar por API</h3>
              <p className="text-sm text-muted-foreground">
                Conecte-se a uma API externa para importar dados de contatos.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="api-url">URL da API</Label>
              <Input
                id="api-url"
                placeholder="https://api.exemplo.com/contatos"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                A API deve retornar um JSON com array de objetos ou um único objeto
              </p>
            </div>

            <Button onClick={fetchAPIData} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Buscando dados...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Buscar Dados da API
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Mapeamento de Campos */}
      {step === "mapping" && (
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Mapear Campos</h3>
              <p className="text-sm text-muted-foreground">
                Vincule os campos da API com os campos do sistema e configure conversões.
              </p>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {SYSTEM_FIELDS.map((systemField, index) => {
                const mapping = fieldMappings[index];
                return (
                  <div key={systemField.id} className="grid grid-cols-3 gap-4 items-center p-3 border rounded-lg">
                    <div>
                      <Label className="text-xs text-muted-foreground">Campo do Sistema</Label>
                      <p className="text-sm font-medium mt-1">
                        {systemField.label}
                        {systemField.required && <span className="text-destructive ml-1">*</span>}
                      </p>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Campo da API ou Valor Fixo</Label>
                      <div className="flex gap-2 mt-1">
                        <Select
                          value={mapping.apiField?.startsWith("FIXED:") ? "fixed" : mapping.apiField || "none"}
                          onValueChange={(value) => {
                            const updated = [...fieldMappings];
                            if (value === "fixed") {
                              // Manter valor fixo atual ou iniciar com vazio
                              updated[index].apiField = mapping.apiField?.startsWith("FIXED:") 
                                ? mapping.apiField 
                                : "FIXED:";
                            } else {
                              updated[index].apiField = value === "none" ? "" : value;
                            }
                            setFieldMappings(updated);
                          }}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nenhum</SelectItem>
                            <SelectItem value="fixed">🔒 Valor Fixo (digite ao lado)</SelectItem>
                            {apiFields.map(field => (
                              <SelectItem key={field} value={field}>{field}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {(mapping.apiField?.startsWith("FIXED:") || mapping.apiField === "FIXED:") && (
                          <Input
                            placeholder="Digite o valor fixo"
                            value={mapping.apiField.replace("FIXED:", "")}
                            onChange={(e) => {
                              const updated = [...fieldMappings];
                              updated[index].apiField = "FIXED:" + e.target.value;
                              setFieldMappings(updated);
                            }}
                            className="flex-1"
                          />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {mapping.apiField?.startsWith("FIXED:") 
                          ? "Este valor será aplicado a todos os registros"
                          : "Selecione um campo da API ou use valor fixo"}
                      </p>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Conversão</Label>
                      <Select
                        value={mapping.conversion || "none"}
                        onValueChange={(value) => {
                          const updated = [...fieldMappings];
                          updated[index].conversion = value;
                          setFieldMappings(updated);
                        }}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CONVERSION_OPTIONS.map(option => (
                            <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("url")} className="flex-1">
                Voltar
              </Button>
              <Button onClick={processRecords} disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  "Processar Dados"
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 3: Preview e Edição */}
      {step === "preview" && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Visualizar e Editar Registros</h3>
                <p className="text-sm text-muted-foreground">
                  {apiRecords.filter(r => r.isValid).length} de {apiRecords.length} registros válidos
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={enrichAllCNPJs}
                disabled={cnpjLoading}
              >
                {cnpjLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enriquecendo...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Buscar Todos os CNPJs
                  </>
                )}
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[500px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Status</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>WhatsApp</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>CPF/CNPJ</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead className="w-24">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiRecords.map((record) => (
                      <TableRow 
                        key={record.id}
                        className={!record.isValid ? "bg-destructive/5" : ""}
                      >
                        <TableCell>
                          {record.isValid ? (
                            <CheckCircle className="w-4 h-4 text-success" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-destructive" />
                          )}
                        </TableCell>
                        <TableCell
                          onClick={() => handleCellEdit(record.id, "nome_contato")}
                          className="cursor-pointer hover:bg-muted/50"
                        >
                          {editingCell?.id === record.id && editingCell?.field === "nome_contato" ? (
                            <Input
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onBlur={saveCellEdit}
                              onKeyDown={(e) => e.key === "Enter" && saveCellEdit()}
                              autoFocus
                              className="h-8"
                            />
                          ) : (
                            record.mapped.nome_contato || <Badge variant="outline">Vazio</Badge>
                          )}
                        </TableCell>
                        <TableCell
                          onClick={() => handleCellEdit(record.id, "whatsapp")}
                          className="cursor-pointer hover:bg-muted/50"
                        >
                          {editingCell?.id === record.id && editingCell?.field === "whatsapp" ? (
                            <Input
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onBlur={saveCellEdit}
                              onKeyDown={(e) => e.key === "Enter" && saveCellEdit()}
                              autoFocus
                              className="h-8"
                            />
                          ) : (
                            record.mapped.whatsapp || <Badge variant="outline">Vazio</Badge>
                          )}
                        </TableCell>
                        <TableCell
                          onClick={() => handleCellEdit(record.id, "email")}
                          className="cursor-pointer hover:bg-muted/50"
                        >
                          {editingCell?.id === record.id && editingCell?.field === "email" ? (
                            <Input
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onBlur={saveCellEdit}
                              onKeyDown={(e) => e.key === "Enter" && saveCellEdit()}
                              autoFocus
                              className="h-8"
                            />
                          ) : (
                            record.mapped.email || <Badge variant="outline">Vazio</Badge>
                          )}
                        </TableCell>
                        <TableCell
                          onClick={() => handleCellEdit(record.id, "cpf_cnpj")}
                          className="cursor-pointer hover:bg-muted/50"
                        >
                          {editingCell?.id === record.id && editingCell?.field === "cpf_cnpj" ? (
                            <Input
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onBlur={saveCellEdit}
                              onKeyDown={(e) => e.key === "Enter" && saveCellEdit()}
                              autoFocus
                              className="h-8"
                            />
                          ) : (
                            record.mapped.cpf_cnpj || <Badge variant="outline">Vazio</Badge>
                          )}
                        </TableCell>
                        <TableCell
                          onClick={() => handleCellEdit(record.id, "nome_empresa")}
                          className="cursor-pointer hover:bg-muted/50"
                        >
                          {editingCell?.id === record.id && editingCell?.field === "nome_empresa" ? (
                            <Input
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onBlur={saveCellEdit}
                              onKeyDown={(e) => e.key === "Enter" && saveCellEdit()}
                              autoFocus
                              className="h-8"
                            />
                          ) : (
                            record.mapped.nome_empresa || <Badge variant="outline">Vazio</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => enrichCNPJ(record.id)}
                            disabled={cnpjLoading || !record.mapped.cpf_cnpj}
                            title="Buscar dados do CNPJ"
                          >
                            <RefreshCw className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {apiRecords.some(r => !r.isValid) && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <p className="text-sm font-medium text-destructive">
                  Alguns registros estão incompletos e não serão importados:
                </p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                  {apiRecords.filter(r => !r.isValid).map(record => (
                    <li key={record.id}>
                      • Faltando: {record.missingFields.join(", ")}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("mapping")} className="flex-1">
                Voltar ao Mapeamento
              </Button>
              <Button 
                onClick={importRecords} 
                disabled={apiRecords.filter(r => r.isValid).length === 0}
                className="flex-1"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Importar {apiRecords.filter(r => r.isValid).length} Contatos
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
