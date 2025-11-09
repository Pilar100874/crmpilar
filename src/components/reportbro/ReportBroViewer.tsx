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
      let jsonStr: string | null = localStorage.getItem("reportbro_preview");

      // Fallbacks caso a gravação tenha sido grande ou em outra storage
      if (!jsonStr) {
        jsonStr = sessionStorage.getItem("reportbro_preview");
      }
      if (!jsonStr) {
        const countStr = sessionStorage.getItem("reportbro_preview_chunk_count") || localStorage.getItem("reportbro_preview_chunk_count");
        const count = countStr ? parseInt(countStr, 10) : 0;
        if (count > 0) {
          let combined = "";
          for (let i = 0; i < count; i++) {
            combined += sessionStorage.getItem(`reportbro_preview_chunk_${i}`) || localStorage.getItem(`reportbro_preview_chunk_${i}`) || "";
          }
          jsonStr = combined || null;
        }
      }

      if (!jsonStr) {
        toast.error("Nenhum relatório para visualizar. Volte e clique em Visualizar novamente.");
        return;
      }

      const data = JSON.parse(jsonStr);
      if (!data || typeof data !== 'object') {
        toast.error("Dados do relatório inválidos");
        return;
      }

      setReportData(data);
      console.log("Relatório carregado:", data);
    } catch (error) {
      console.error("Erro ao carregar relatório:", error);
      toast.error(`Erro ao carregar relatório: ${error}`);
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
            <p className="text-muted-foreground mb-4">
              Prévia simplificada (sem renderização completa). Abaixo um resumo e o JSON bruto.
            </p>
            {/* Resumo simples */}
            {Array.isArray(reportData?.docElements) && reportData.docElements.length > 0 && (
              <div className="mb-4 border rounded p-3 bg-background">
                <h2 className="font-medium mb-2">Conteúdos de texto encontrados</h2>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {reportData.docElements
                    .filter((el: any) => el && (el.type === 'text' || el.elementType === 'text'))
                    .slice(0, 20)
                    .map((el: any, idx: number) => (
                      <li key={idx} className="text-foreground/80">
                        {el.text?.value || el.text || el.name || 'Texto sem conteúdo visível'}
                      </li>
                    ))}
                </ul>
              </div>
            )}
            <pre className="mt-2 p-4 bg-muted rounded text-xs overflow-auto">
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
