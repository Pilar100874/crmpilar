import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileDown } from "lucide-react";
import { toast } from "sonner";
import "reportbro-designer/dist/reportbro.css";

export function ReportBroViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
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
      renderReport(data);
    } catch (error) {
      console.error("Erro ao carregar:", error);
      toast.error("Erro ao carregar relatório");
    }
  };

  const renderReport = async (data: any) => {
    if (!containerRef.current) return;

    try {
      // ReportBro viewer implementation
      // Note: ReportBro focuses on designer, viewer would need additional implementation
      containerRef.current.innerHTML = `
        <div class="p-8">
          <div class="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8">
            <h1 class="text-2xl font-bold mb-4">Visualização de Relatório</h1>
            <p class="text-muted-foreground">
              Relatório carregado. A renderização completa requer configuração adicional.
            </p>
            <pre class="mt-4 p-4 bg-muted rounded text-xs overflow-auto">
              ${JSON.stringify(data, null, 2)}
            </pre>
          </div>
        </div>
      `;
    } catch (error) {
      console.error("Erro ao renderizar:", error);
      toast.error("Erro ao renderizar relatório");
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

      {/* Viewer Container */}
      <div ref={containerRef} className="p-4" />
    </div>
  );
}
