import { Button } from "@/components/ui/button";
import { FileDown, FileSpreadsheet, FileImage } from "lucide-react";
import { toast } from "@/lib/toast-config";
import * as XLSX from "xlsx";

interface ExportToolbarProps {
  reportData: any;
  reportName: string;
}

export function ExportToolbar({ reportData, reportName }: ExportToolbarProps) {
  const handleExportExcel = () => {
    try {
      // Criar workbook
      const wb = XLSX.utils.book_new();
      
      // Se tiver dados de tabela, exportar
      if (reportData.tableData && reportData.tableData.length > 0) {
        const ws = XLSX.utils.json_to_sheet(reportData.tableData);
        XLSX.utils.book_append_sheet(wb, ws, "Dados");
      }
      
      // Gerar arquivo
      XLSX.writeFile(wb, `${reportName || "relatorio"}_${Date.now()}.xlsx`);
      toast.success("Relatório exportado para Excel");
    } catch (error) {
      toast.error("Erro ao exportar para Excel");
      console.error(error);
    }
  };

  const handleExportPDF = () => {
    toast.info("Exportação PDF em desenvolvimento - use Ctrl+P para imprimir como PDF");
    window.print();
  };

  const handleExportImage = () => {
    toast.info("Exportação de imagem em desenvolvimento");
  };

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={handleExportExcel}
      >
        <FileSpreadsheet className="h-4 w-4 mr-2" />
        Excel
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={handleExportPDF}
      >
        <FileDown className="h-4 w-4 mr-2" />
        PDF
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={handleExportImage}
        disabled
      >
        <FileImage className="h-4 w-4 mr-2" />
        Imagem
      </Button>
    </div>
  );
}
