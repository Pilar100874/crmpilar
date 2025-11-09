import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileDown } from "lucide-react";
import { toast } from "sonner";
import "reportbro-designer/dist/reportbro.css";
import { supabase } from "@/integrations/supabase/client";

export function ReportBroViewer() {
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [jobId, setJobId] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [progress, setProgress] = useState<{ truncated?: boolean; included?: number; total?: number }>();

  useEffect(() => {
    loadReportFromStorage();
  }, []);

  // Poll job status
  useEffect(() => {
    if (!jobId) return;
    
    const pollInterval = setInterval(async () => {
      const { data } = await supabase
        .from('report_preview_jobs')
        .select('*')
        .eq('id', jobId)
        .maybeSingle();

      if (data?.status === 'ready' && data.pdf_url) {
        setPdfUrl(data.pdf_url);
        setProgress({ truncated: data.truncated, included: data.included, total: data.total });
        setLoading(false);
        clearInterval(pollInterval);
        if (data.truncated) {
          toast.message('Prévia reduzida', {
            description: `Mostrando ${data.included} de ${data.total} registros para evitar estouro.`
          });
        }
      } else if (data?.status === 'error') {
        setError(data.error || 'Erro ao gerar preview');
        setLoading(false);
        clearInterval(pollInterval);
        toast.error('Erro ao gerar preview: ' + (data.error || 'desconhecido'));
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [jobId]);

  const loadReportFromStorage = async () => {
    try {
      let jsonStr: string | null = localStorage.getItem("reportbro_preview");
      if (!jsonStr) {
        jsonStr = sessionStorage.getItem("reportbro_preview");
      }

      if (!jsonStr) {
        toast.error("Nenhum relatório para visualizar");
        setLoading(false);
        return;
      }

      const data = JSON.parse(jsonStr);
      if (!data?.reportId) {
        toast.error("Dados do relatório inválidos");
        setLoading(false);
        return;
      }

      // Start async job
      const { data: result, error: fnError } = await supabase.functions.invoke('reportbro-preview', {
        body: { reportId: data.reportId, maxRecords: 5000 }
      });

      if (fnError || !result?.success) {
        throw new Error(result?.error || fnError?.message || 'Falha ao iniciar preview');
      }

      setJobId(result.jobId);
    } catch (err: any) {
      console.error("Erro ao carregar relatório:", err);
      setError(err?.message || 'Erro desconhecido');
      setLoading(false);
      toast.error("Erro ao carregar relatório: " + (err?.message || 'desconhecido'));
    }
  };

  const handleExportPDF = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    } else {
      window.print();
    }
  };

  const handleGoBack = () => {
    window.location.href = "/relatorios";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <div>
            <p className="text-muted-foreground">Gerando relatório...</p>
            <p className="text-xs text-muted-foreground mt-1">Isso pode levar alguns instantes com muitos dados</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-destructive text-4xl">⚠️</div>
          <h2 className="text-xl font-semibold">Erro ao gerar preview</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={handleGoBack}>Voltar para relatórios</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="h-14 border-b flex items-center justify-between px-4 bg-card flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={handleGoBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="flex items-center gap-2">
          {progress?.truncated && (
            <span className="text-xs text-muted-foreground">
              {progress.included} de {progress.total} registros
            </span>
          )}
          <Button size="sm" variant="outline" onClick={handleExportPDF}>
            <FileDown className="h-4 w-4 mr-2" />
            {pdfUrl ? 'Baixar PDF' : 'Imprimir'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {pdfUrl ? (
          <iframe
            src={pdfUrl}
            className="w-full h-full border-0"
            title="Visualização do Relatório"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <p>Nenhum relatório para visualizar</p>
              <Button className="mt-4" onClick={handleGoBack}>
                Voltar para relatórios
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
