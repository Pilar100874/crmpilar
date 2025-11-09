import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileDown } from "lucide-react";
import { toast } from "sonner";
import "reportbro-designer/dist/reportbro.css";

export function ReportBroViewer() {
  const [reportData, setReportData] = useState<any>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReportFromStorage();
  }, []);

  const loadReportFromStorage = () => {
    try {
      const jsonStr = localStorage.getItem("reportbro_preview");

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

  useEffect(() => {
    const generate = async () => {
      if (!reportData) return;
      setLoading(true);
      try {
        const res = await fetch("https://www.reportbro.com/report/run", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            report: reportData,
            outputFormat: "pdf",
            isTestData: true,
            data: {}
          }),
        });
        const text = await res.text();
        const key = text.includes(":") ? text.split(":")[1].trim() : text.trim();
        if (!key) throw new Error("Chave do relatório não recebida");
        setPdfUrl(`https://www.reportbro.com/report/${key}`);
      } catch (e: any) {
        console.error("Erro ao gerar PDF:", e);
        toast.error(`Erro ao gerar PDF: ${e.message || e}`);
      } finally {
        setLoading(false);
      }
    };
    generate();
  }, [reportData]);

  const handleExportPDF = () => {
    if (pdfUrl) {
      window.open(pdfUrl, "_blank");
    } else {
      toast.info("Gerando PDF... aguarde");
    }
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
          <div className="max-w-6xl mx-auto">
            {loading && (
              <div className="text-center text-muted-foreground py-8">Gerando PDF…</div>
            )}
            {pdfUrl ? (
              <div className="border rounded-md overflow-hidden h-[calc(100vh-6rem)] bg-card">
                <iframe
                  src={pdfUrl}
                  className="w-full h-full"
                  title="Pré-visualização do PDF"
                />
              </div>
            ) : (
              <div className="max-w-4xl mx-auto bg-card shadow-lg rounded-lg p-6 border">
                <h1 className="text-xl font-semibold mb-2">Preparando visualização</h1>
                <p className="text-muted-foreground">
                  Estamos gerando o PDF com os dados de teste definidos no relatório.
                </p>
              </div>
            )}
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
