import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, CheckCircle, Download, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

interface FieldMappingConfig {
  type: "field" | "fixed";
  value: string;
  format?: string;
}

interface Filter {
  field: string;
  operator: string;
  value: string;
}

interface ValidationError {
  field: string;
  message: string;
}

interface Props {
  data: any[];
  selectedFields: string[];
  filters: Filter[];
  fieldMapping: Record<string, FieldMappingConfig>;
  onFinalDataChange: (data: any[]) => void;
}

const REQUIRED_FIELDS = [
  "codigo", "nome", "ncm", "gramatura", "numero_folhas", "foto_url", "ativo",
  "peso_unitario", "peso_frete_tipo", "altura", "largura", "comprimento", "fragil",
  "empilhamento_maximo", "observacoes_frete", "valor_seguro",
  "ean_13", "embalagem_peso", "embalagem_altura", "embalagem_largura", "embalagem_comprimento"
];

export function ApiImportWizardStep6({
  data,
  selectedFields,
  filters,
  fieldMapping,
  onFinalDataChange,
}: Props) {
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<Map<number, ValidationError[]>>(new Map());
  const [ncmCodigos, setNcmCodigos] = useState<Set<string>>(new Set());
  const [existingCodigos, setExistingCodigos] = useState<Set<string>>(new Set());
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    loadValidationData();
  }, []);

  useEffect(() => {
    const filtered = applyFilters(data);
    const mapped = mapData(filtered);
    setProcessedData(mapped);
    onFinalDataChange(mapped);
  }, [data, filters, fieldMapping]);

  useEffect(() => {
    if (processedData.length > 0 && ncmCodigos.size > 0) {
      validateAllRows();
    }
  }, [processedData, ncmCodigos, existingCodigos]);

  const loadValidationData = async () => {
    setValidating(true);
    try {
      // Carregar NCMs válidos
      const { data: ncmData } = await supabase
        .from("ncm_codigos")
        .select("codigo");
      
      if (ncmData) {
        setNcmCodigos(new Set(ncmData.map(n => n.codigo)));
      }

      // Carregar códigos de produtos existentes
      const { data: produtosData } = await supabase
        .from("produtos")
        .select("codigo");
      
      if (produtosData) {
        setExistingCodigos(new Set(produtosData.map(p => p.codigo).filter(Boolean)));
      }
    } catch (error) {
      console.error("Erro ao carregar dados de validação:", error);
    } finally {
      setValidating(false);
    }
  };

  const validateAllRows = () => {
    const errors = new Map<number, ValidationError[]>();
    const codigosNaImportacao = new Set<string>();

    processedData.forEach((row, index) => {
      const rowErrors: ValidationError[] = [];

      // Validar campos obrigatórios mapeados
      Object.keys(fieldMapping).forEach(field => {
        if (REQUIRED_FIELDS.includes(field)) {
          const value = row[field];
          if (value === undefined || value === null || String(value).trim() === "") {
            rowErrors.push({ field, message: "Campo obrigatório vazio" });
          }
        }
      });

      // Validar código duplicado
      if (row.codigo) {
        const codigo = String(row.codigo).trim();
        if (existingCodigos.has(codigo)) {
          rowErrors.push({ field: "codigo", message: "Código já existe no sistema" });
        }
        if (codigosNaImportacao.has(codigo)) {
          rowErrors.push({ field: "codigo", message: "Código duplicado na importação" });
        }
        codigosNaImportacao.add(codigo);
      }

      // Validar NCM
      if (row.ncm && ncmCodigos.size > 0) {
        const ncm = String(row.ncm).trim().replace(/\D/g, "");
        if (!ncmCodigos.has(ncm)) {
          rowErrors.push({ field: "ncm", message: "NCM inválido" });
        }
      }

      // Validar EAN-13 (deve ter 13 dígitos)
      if (row.ean_13) {
        const ean = String(row.ean_13).trim().replace(/\D/g, "");
        if (ean.length !== 13) {
          rowErrors.push({ field: "ean_13", message: "EAN-13 deve ter 13 dígitos" });
        }
      }

      if (rowErrors.length > 0) {
        errors.set(index, rowErrors);
      }
    });

    setValidationErrors(errors);
  };

  const applyFilters = (items: any[]) => {
    return items.filter(item => {
      return filters.every(filter => {
        const value = item[filter.field];
        const filterValue = filter.value;

        switch (filter.operator) {
          case "equals":
            return String(value).toLowerCase() === filterValue.toLowerCase();
          case "not_equals":
            return String(value).toLowerCase() !== filterValue.toLowerCase();
          case "contains":
            return String(value).toLowerCase().includes(filterValue.toLowerCase());
          case "not_contains":
            return !String(value).toLowerCase().includes(filterValue.toLowerCase());
          case "starts_with":
            return String(value).toLowerCase().startsWith(filterValue.toLowerCase());
          case "ends_with":
            return String(value).toLowerCase().endsWith(filterValue.toLowerCase());
          case "greater_than":
            return Number(value) > Number(filterValue);
          case "less_than":
            return Number(value) < Number(filterValue);
          case "is_empty":
            return !value || String(value).trim() === "";
          case "is_not_empty":
            return value && String(value).trim() !== "";
          default:
            return true;
        }
      });
    });
  };

  const applyFormat = (value: any, format?: string): string => {
    if (value === null || value === undefined) return "";
    const str = String(value);

    switch (format) {
      case "uppercase":
        return str.toUpperCase();
      case "lowercase":
        return str.toLowerCase();
      case "capitalize":
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
      case "number":
        const num = parseFloat(str.replace(/[^\d.-]/g, ""));
        return isNaN(num) ? str : String(Math.round(num));
      case "decimal":
        const dec = parseFloat(str.replace(/[^\d.-]/g, ""));
        return isNaN(dec) ? str : dec.toFixed(2);
      default:
        return str;
    }
  };

  const mapData = (items: any[]) => {
    return items.map(item => {
      const mapped: any = {};

      Object.entries(fieldMapping).forEach(([targetField, config]) => {
        if (!config || config.value === "none") return;

        let value: any;
        if (config.type === "fixed") {
          value = config.value;
        } else {
          value = item[config.value];
        }

        mapped[targetField] = applyFormat(value, config.format);
      });

      return mapped;
    });
  };

  const exportToExcel = () => {
    const exportData = processedData.map((row, index) => {
      const errors = validationErrors.get(index);
      return {
        ...row,
        _erros: errors ? errors.map(e => `${e.field}: ${e.message}`).join("; ") : ""
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Prévia Importação");
    XLSX.writeFile(wb, `previa_importacao_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const exportErrorsOnly = () => {
    const errorRows = processedData
      .map((row, index) => ({ row, index }))
      .filter(({ index }) => validationErrors.has(index))
      .map(({ row, index }) => {
        const errors = validationErrors.get(index);
        return {
          ...row,
          _erros: errors ? errors.map(e => `${e.field}: ${e.message}`).join("; ") : ""
        };
      });

    if (errorRows.length === 0) {
      return;
    }

    const ws = XLSX.utils.json_to_sheet(errorRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Erros de Validação");
    XLSX.writeFile(wb, `erros_importacao_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const mappedFields = Object.keys(fieldMapping).filter(
    k => fieldMapping[k]?.value && fieldMapping[k]?.value !== "none"
  );

  const validRows = processedData.length - validationErrors.size;
  const invalidRows = validationErrors.size;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Prévia dos Dados</h3>
        <p className="text-sm text-muted-foreground">
          Visualize os dados processados e validações antes de finalizar a importação
        </p>
      </div>

      <div className="flex items-center gap-4 justify-center flex-wrap">
        <Badge variant="secondary">
          {processedData.length} registros processados
        </Badge>
        <Badge variant="outline">
          {mappedFields.length} campos mapeados
        </Badge>
        <Badge variant="default" className="bg-green-600">
          <CheckCircle className="h-3 w-3 mr-1" />
          {validRows} válidos
        </Badge>
        {invalidRows > 0 && (
          <Badge variant="destructive">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {invalidRows} com erros
          </Badge>
        )}
      </div>

      <div className="flex gap-2 justify-center">
        <Button variant="outline" size="sm" onClick={exportToExcel}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Exportar Todos
        </Button>
        {invalidRows > 0 && (
          <Button variant="outline" size="sm" onClick={exportErrorsOnly}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Erros
          </Button>
        )}
      </div>

      {validating ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Validando dados...</p>
        </Card>
      ) : processedData.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            Nenhum dado para exibir. Verifique os filtros e mapeamentos.
          </p>
        </Card>
      ) : (
        <Card className="p-4">
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead className="w-20">Status</TableHead>
                  {mappedFields.slice(0, 6).map((field) => (
                    <TableHead key={field}>{field}</TableHead>
                  ))}
                  {mappedFields.length > 6 && (
                    <TableHead>+{mappedFields.length - 6}</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedData.slice(0, 100).map((row, index) => {
                  const errors = validationErrors.get(index);
                  const hasErrors = errors && errors.length > 0;

                  return (
                    <TableRow key={index} className={hasErrors ? "bg-destructive/10" : ""}>
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell>
                        {hasErrors ? (
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                            <span className="text-xs text-destructive" title={errors.map(e => `${e.field}: ${e.message}`).join("\n")}>
                              {errors.length} erro(s)
                            </span>
                          </div>
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                      </TableCell>
                      {mappedFields.slice(0, 6).map((field) => {
                        const fieldErrors = errors?.filter(e => e.field === field);
                        const hasFieldError = fieldErrors && fieldErrors.length > 0;

                        return (
                          <TableCell
                            key={field}
                            className={hasFieldError ? "text-destructive font-medium" : ""}
                            title={hasFieldError ? fieldErrors.map(e => e.message).join(", ") : undefined}
                          >
                            {row[field] !== undefined && row[field] !== null
                              ? String(row[field]).substring(0, 30)
                              : "-"}
                            {hasFieldError && " ⚠️"}
                          </TableCell>
                        );
                      })}
                      {mappedFields.length > 6 && (
                        <TableCell className="text-muted-foreground">...</TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
          {processedData.length > 100 && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Mostrando 100 de {processedData.length} registros
            </p>
          )}
        </Card>
      )}

      {invalidRows > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-sm text-destructive font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Atenção: {invalidRows} registro(s) com erros de validação
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Exporte os erros para Excel e corrija os dados antes de continuar.
          </p>
        </div>
      )}

      <div className="bg-muted/50 rounded-lg p-4">
        <p className="text-sm text-muted-foreground">
          💡 <strong>Dica:</strong> Verifique se os dados estão corretos antes de prosseguir para a etapa final.
        </p>
      </div>
    </div>
  );
}
