import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface Filter {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface Props {
  data: any[];
  selectedFields: string[];
  filters: Filter[];
  fieldMapping: Record<string, string>;
  onFinalDataChange: (data: any[]) => void;
}

export function ImportWizardStep5({ data, selectedFields, filters, fieldMapping, onFinalDataChange }: Props) {
  const [processedData, setProcessedData] = useState<any[]>([]);

  useEffect(() => {
    // Aplicar filtros
    let filteredData = [...data];
    
    filters.forEach(filter => {
      filteredData = filteredData.filter(row => {
        const value = row[filter.field];
        const filterValue = filter.value;

        switch (filter.operator) {
          case "contains":
            return String(value).toLowerCase().includes(filterValue.toLowerCase());
          case "not_contains":
            return !String(value).toLowerCase().includes(filterValue.toLowerCase());
          case "equals":
            return String(value) === filterValue;
          case "not_equals":
            return String(value) !== filterValue;
          case "greater_than":
            return Number(value) > Number(filterValue);
          case "less_than":
            return Number(value) < Number(filterValue);
          case "greater_equal":
            return Number(value) >= Number(filterValue);
          case "less_equal":
            return Number(value) <= Number(filterValue);
          case "starts_with":
            return String(value).toLowerCase().startsWith(filterValue.toLowerCase());
          case "ends_with":
            return String(value).toLowerCase().endsWith(filterValue.toLowerCase());
          case "empty":
            return !value || String(value).trim() === "";
          case "not_empty":
            return value && String(value).trim() !== "";
          default:
            return true;
        }
      });
    });

    // Mapear para campos fixos
    const mappedData = filteredData.map(row => {
      const mapped: any = {};
      Object.entries(fieldMapping).forEach(([fixedField, excelField]) => {
        mapped[fixedField] = row[excelField] || null;
      });
      return mapped;
    });

    setProcessedData(mappedData);
    onFinalDataChange(mappedData);
  }, [data, filters, fieldMapping, onFinalDataChange]);

  const fixedFields = Object.keys(fieldMapping);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Preview dos Dados</h3>
        <p className="text-sm text-muted-foreground">
          Visualize como os dados serão importados após aplicar filtros e mapeamento
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {processedData.length > 0 ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <Badge variant="default">
                {processedData.length} registro(s) processado(s)
              </Badge>
            </>
          ) : (
            <>
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <Badge variant="secondary">
                Nenhum registro após aplicar filtros
              </Badge>
            </>
          )}
        </div>
        <Badge variant="outline">
          {fixedFields.length} campo(s) mapeado(s)
        </Badge>
      </div>

      {processedData.length > 0 ? (
        <Card>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  {fixedFields.map(field => (
                    <TableHead key={field} className="font-semibold capitalize">
                      {field}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedData.slice(0, 50).map((row, index) => (
                  <TableRow key={index}>
                    {fixedFields.map(field => (
                      <TableCell key={field}>
                        {row[field] !== null && row[field] !== undefined ? String(row[field]) : (
                          <span className="text-muted-foreground italic">-</span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
          {processedData.length > 50 && (
            <div className="p-3 border-t bg-muted/50 text-center text-sm text-muted-foreground">
              Mostrando primeiros 50 de {processedData.length} registros
            </div>
          )}
        </Card>
      ) : (
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
          <p className="font-medium">Nenhum dado para exibir</p>
          <p className="text-sm text-muted-foreground mt-1">
            Os filtros aplicados removeram todos os registros ou não há mapeamento de campos configurado.
          </p>
        </Card>
      )}

      <div className="bg-muted/50 rounded-lg p-4">
        <p className="text-sm text-muted-foreground">
          💡 <strong>Dica:</strong> Verifique se os dados estão corretos antes de prosseguir para a próxima etapa.
        </p>
      </div>
    </div>
  );
}
