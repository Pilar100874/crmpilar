import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileDown } from "lucide-react";
import { toast } from "sonner";
import "reportbro-designer/dist/reportbro.css";

export function ReportBroViewer() {
  
  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => {
    loadReportFromStorage();
  }, []);

  const loadReportFromStorage = () => {
    try {
      const stored = localStorage.getItem("reportbro_preview");
      if (!stored) {
        toast.error("Nenhum relatório para visualizar");
        return;
      }
      
      const data = JSON.parse(stored);
      if (!data || typeof data !== 'object') {
        toast.error("Dados do relatório inválidos");
        return;
      }
      
      setReportData(data);
    } catch (error) {
      console.error("Erro ao carregar:", error);
      toast.error("Erro ao carregar relatório");
    }
  };


  const handleExportPDF = () => {
    toast.info("Exportação PDF em desenvolvimento");
    window.print();
  };

  const handleGoBack = () => {
    // Fecha a aba ou volta se estiver no mesmo contexto
    if (window.opener) {
      window.close();
    } else {
      window.location.href = "/relatorios";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="h-14 border-b flex items-center justify-between px-4 bg-card">
        <Button variant="ghost" size="sm" onClick={handleGoBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleExportPDF}>
            <FileDown className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>

      <div className="p-4">
        {reportData ? (
          <div className="max-w-4xl mx-auto bg-card shadow-lg rounded-lg p-6 border">
            <h1 className="text-xl font-semibold mb-2">Visualização de Relatório</h1>
            <p className="text-muted-foreground">
              Renderização completa ainda não implementada. Abaixo, os dados do relatório:
            </p>
            <pre className="mt-4 p-4 bg-muted rounded text-xs overflow-auto">
              {JSON.stringify(reportData, null, 2)}
            </pre>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto text-center text-muted-foreground py-16">
            Nenhum relatório para visualizar.
          </div>
        )}
      </div>
    </div>
  );
}
