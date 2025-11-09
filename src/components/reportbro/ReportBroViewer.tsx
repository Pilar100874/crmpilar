import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileDown, Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import "reportbro-designer/dist/reportbro.css";

export function ReportBroViewer() {
  const [reportData, setReportData] = useState<any>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    loadReportFromStorage();
  }, []);

  // Gera o PDF automaticamente quando os dados estiverem prontos
  useEffect(() => {
    if (reportData && !pdfUrl && !isGeneratingPdf) {
      handleGeneratePDF();
    }
  }, [reportData]);

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


  const handleGeneratePDF = async () => {
    if (!reportData || isGeneratingPdf) return;
    
    setIsGeneratingPdf(true);
    try {
      toast.info("Gerando PDF...");
      
      const { data, error } = await supabase.functions.invoke('generate-reportbro-pdf', {
        body: {
          report: reportData,
          isTestData: true, // Usa dados de teste do próprio relatório
          outputFormat: 'pdf'
        }
      });

      if (error) {
        console.error('Erro ao gerar PDF:', error);
        throw error;
      }

      // A resposta do invoke é o ArrayBuffer direto quando é binary
      if (data instanceof ArrayBuffer) {
        const blob = new Blob([data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        toast.success("PDF gerado com sucesso!");
      } else if (data && data.error) {
        throw new Error(data.error);
      } else {
        // Se não é ArrayBuffer, tenta converter
        const blob = new Blob([data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        toast.success("PDF gerado com sucesso!");
      }
    } catch (error: any) {
      console.error("Erro ao gerar PDF:", error);
      toast.error(error.message || "Erro ao gerar PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!pdfUrl) return;
    
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `relatorio-${Date.now()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Download iniciado!");
  };

  const handlePrintPDF = () => {
    if (!pdfUrl) return;
    
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = pdfUrl;
    document.body.appendChild(iframe);
    
    iframe.onload = () => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    };
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
          {!pdfUrl && !isGeneratingPdf && (
            <Button size="sm" onClick={handleGeneratePDF}>
              <Eye className="h-4 w-4 mr-2" />
              Gerar PDF
            </Button>
          )}
          {isGeneratingPdf && (
            <Button size="sm" disabled>
              Gerando...
            </Button>
          )}
          {pdfUrl && (
            <>
              <Button size="sm" variant="outline" onClick={handlePrintPDF}>
                Imprimir
              </Button>
              <Button size="sm" onClick={handleDownloadPDF}>
                <FileDown className="h-4 w-4 mr-2" />
                Baixar PDF
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="p-4">
        {pdfUrl ? (
          <div className="w-full h-[calc(100vh-5rem)]">
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0 rounded-lg shadow-lg"
              title="Visualização do PDF"
            />
          </div>
        ) : reportData ? (
          <div className="max-w-4xl mx-auto bg-card shadow-lg rounded-lg p-6 border">
            <h1 className="text-xl font-semibold mb-2">Preparando visualização</h1>
            <p className="text-muted-foreground mb-4">
              {isGeneratingPdf ? "Gerando PDF do relatório..." : "Clique em 'Gerar PDF' acima para visualizar"}
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
            <details className="mt-4">
              <summary className="cursor-pointer font-medium text-sm">Ver JSON bruto</summary>
              <pre className="mt-2 p-4 bg-muted rounded text-xs overflow-auto">
                {JSON.stringify(reportData, null, 2)}
              </pre>
            </details>
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
