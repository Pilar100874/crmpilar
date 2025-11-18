import { useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, X } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface Props {
  onFileUpload: (data: any[], headers: string[]) => void;
  excelData: any[];
  excelHeaders: string[];
}

export function ImportWizardStep1({ onFileUpload, excelData, excelHeaders }: Props) {
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error("Por favor, selecione um arquivo Excel válido (.xlsx ou .xls)");
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length === 0) {
          toast.error("O arquivo está vazio");
          return;
        }

        // Primeira linha é o cabeçalho
        const headers = jsonData[0] as string[];
        // Resto são os dados
        const rows = jsonData.slice(1).map((row: any) => {
          const obj: any = {};
          headers.forEach((header, index) => {
            obj[header] = row[index];
          });
          return obj;
        });

        onFileUpload(rows, headers);
        toast.success(`Arquivo carregado com sucesso! ${rows.length} linhas encontradas.`);
      } catch (error) {
        console.error("Erro ao processar arquivo:", error);
        toast.error("Erro ao processar arquivo Excel");
      }
    };

    reader.onerror = () => {
      toast.error("Erro ao ler arquivo");
    };

    reader.readAsBinaryString(file);
  }, [onFileUpload]);

  const handleClear = () => {
    onFileUpload([], []);
    toast.info("Arquivo removido");
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Upload do Arquivo Excel</h3>
        <p className="text-sm text-muted-foreground">
          Faça o upload de um arquivo Excel (.xlsx ou .xls) com os dados dos produtos
        </p>
      </div>

      {excelData.length === 0 ? (
        <Card className="border-2 border-dashed p-8">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="rounded-full bg-muted p-4">
              <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
            </div>
            
            <div className="text-center">
              <p className="text-sm font-medium">Arraste e solte seu arquivo aqui</p>
              <p className="text-xs text-muted-foreground mt-1">ou</p>
            </div>

            <label htmlFor="file-upload">
              <Button variant="default" className="cursor-pointer" asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Selecionar Arquivo
                </span>
              </Button>
              <input
                id="file-upload"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="rounded-lg bg-green-100 dark:bg-green-900 p-3">
                <FileSpreadsheet className="h-6 w-6 text-green-600 dark:text-green-300" />
              </div>
              <div>
                <h4 className="font-semibold">Arquivo carregado com sucesso!</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {excelData.length} linhas de dados encontradas
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Colunas: {excelHeaders.join(", ")}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClear}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {excelData.length > 0 && (
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Dica:</strong> Certifique-se de que a primeira linha do seu arquivo Excel contém os nomes das colunas.
          </p>
        </div>
      )}
    </div>
  );
}
