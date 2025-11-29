import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

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

interface Props {
  data: any[];
  selectedFields: string[];
  filters: Filter[];
  fieldMapping: Record<string, FieldMappingConfig>;
  onFinalDataChange: (data: any[]) => void;
}

export function ApiImportWizardStep6({
  data,
  selectedFields,
  filters,
  fieldMapping,
  onFinalDataChange,
}: Props) {
  const [processedData, setProcessedData] = useState<any[]>([]);

  useEffect(() => {
    const filtered = applyFilters(data);
    const mapped = mapData(filtered);
    setProcessedData(mapped);
    onFinalDataChange(mapped);
  }, [data, filters, fieldMapping]);

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

  const mappedFields = Object.keys(fieldMapping).filter(
    k => fieldMapping[k]?.value && fieldMapping[k]?.value !== "none"
  );

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Prévia dos Dados</h3>
        <p className="text-sm text-muted-foreground">
          Visualize os dados processados antes de finalizar a importação
        </p>
      </div>

      <div className="flex items-center gap-4 justify-center">
        <Badge variant="secondary">
          {processedData.length} registros processados
        </Badge>
        <Badge variant="outline">
          {mappedFields.length} campos mapeados
        </Badge>
      </div>

      {processedData.length === 0 ? (
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
                  {mappedFields.map((field) => (
                    <TableHead key={field}>{field}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedData.slice(0, 100).map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    {mappedFields.map((field) => (
                      <TableCell key={field}>
                        {row[field] !== undefined && row[field] !== null
                          ? String(row[field])
                          : "-"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
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

      <div className="bg-muted/50 rounded-lg p-4">
        <p className="text-sm text-muted-foreground">
          💡 <strong>Dica:</strong> Verifique se os dados estão corretos antes de prosseguir para a etapa final.
        </p>
      </div>
    </div>
  );
}
