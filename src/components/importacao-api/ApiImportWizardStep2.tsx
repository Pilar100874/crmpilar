import { useState, useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileSpreadsheet, X } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface Props {
  headers: string[];
  selectedFields: string[];
  onSelectFields: (fields: string[]) => void;
  data?: any[];
  onExcelImport?: (data: any[], headers: string[]) => void;
}

export function ApiImportWizardStep2({ headers, selectedFields, onSelectFields, data = [], onExcelImport }: Props) {
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const handleToggleField = (field: string) => {
    if (selectedFields.includes(field)) {
      onSelectFields(selectedFields.filter(f => f !== field));
    } else {
      onSelectFields([...selectedFields, field]);
    }
  };

  const handleSelectAll = () => {
    if (selectedFields.length === headers.length) {
      onSelectFields([]);
    } else {
      onSelectFields([...headers]);
    }
  };

  const handleExcelUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error("Por favor, selecione um arquivo Excel (.xlsx ou .xls)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length < 2) {
          toast.error("Planilha vazia ou sem dados");
          return;
        }

        const excelHeaders = (jsonData[0] as any[]).map(String);
        const excelRows = jsonData.slice(1).map((row: any) => {
          const obj: any = {};
          excelHeaders.forEach((header, i) => {
            obj[header] = row[i];
          });
          return obj;
        }).filter(row => Object.values(row).some(v => v !== undefined && v !== ""));

        setExcelFile(file);
        
        if (onExcelImport) {
          onExcelImport(excelRows, excelHeaders);
        }
        
        toast.success(`${excelRows.length} registros carregados do Excel`);
      } catch (error) {
        console.error("Erro ao processar Excel:", error);
        toast.error("Erro ao processar o arquivo Excel");
      }
    };
    reader.readAsBinaryString(file);
  }, [onExcelImport]);

  const clearExcel = () => {
    setExcelFile(null);
    onSelectFields([]);
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Seleção de Campos</h3>
        <p className="text-sm text-muted-foreground">
          Selecione os campos que deseja importar
        </p>
      </div>

      {onExcelImport && (
        <Card className="p-4 border-dashed">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium">Importar via Excel</h4>
                <p className="text-xs text-muted-foreground">
                  Também é possível importar dados de uma planilha Excel
                </p>
              </div>
            </div>
            {excelFile ? (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <FileSpreadsheet className="h-3 w-3" />
                  {excelFile.name}
                </Badge>
                <Button variant="ghost" size="icon" onClick={clearExcel}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelUpload}
                  className="hidden"
                  id="excel-upload-step2"
                />
                <Button variant="outline" size="sm" asChild>
                  <label htmlFor="excel-upload-step2" className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Excel
                  </label>
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="select-all"
            checked={selectedFields.length === headers.length}
            onCheckedChange={handleSelectAll}
          />
          <Label htmlFor="select-all" className="font-semibold cursor-pointer">
            Selecionar todos
          </Label>
        </div>
        <Badge variant="secondary">
          {selectedFields.length} de {headers.length} selecionados
        </Badge>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {headers.map((header) => (
            <div
              key={header}
              className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <Checkbox
                id={header}
                checked={selectedFields.includes(header)}
                onCheckedChange={() => handleToggleField(header)}
              />
              <Label
                htmlFor={header}
                className="flex-1 cursor-pointer font-medium"
              >
                {header}
              </Label>
            </div>
          ))}
        </div>
      </Card>

      {selectedFields.length === 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ Selecione pelo menos um campo para continuar
          </p>
        </div>
      )}

      {selectedFields.length > 0 && data.length > 0 && (
        <Card className="p-4">
          <div className="space-y-2 mb-4">
            <h4 className="font-semibold">Prévia dos Dados</h4>
            <p className="text-sm text-muted-foreground">
              Mostrando até 5 linhas dos campos selecionados
            </p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {selectedFields.map((field) => (
                    <TableHead key={field}>{field}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.slice(0, 5).map((row, index) => (
                  <TableRow key={index}>
                    {selectedFields.map((field) => (
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
          </div>
        </Card>
      )}
    </div>
  );
}
