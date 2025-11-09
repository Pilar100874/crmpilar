import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileDown } from "lucide-react";
import { toast } from "sonner";
import "reportbro-designer/dist/reportbro.css";
import { supabase } from "@/integrations/supabase/client";

export function ReportBroViewer() {
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [reportInfo, setReportInfo] = useState<any>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Preparando...');

  useEffect(() => {
    loadReportFromStorage();
  }, []);

  // Poll job status when jobId is set
  useEffect(() => {
    if (!jobId) return;
    
    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('report_preview_jobs')
          .select('*')
          .eq('id', jobId)
          .single();

        if (error) throw error;

        if (data.status === 'ready') {
          setPdfUrl(data.pdf_url);
          setLoading(false);
          clearInterval(pollInterval);
          if (data.truncated) {
            toast.message('Prévia reduzida', {
              description: `Mostrando ${data.included} de ${data.total} registros para evitar timeout. Use filtros para refinar.`
            });
          }
        } else if (data.status === 'error') {
          setLoading(false);
          clearInterval(pollInterval);
          toast.error(data.error || 'Erro ao gerar preview');
        } else {
          setStatus('Processando relatório...');
        }
      } catch (err) {
        console.error('Poll error:', err);
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
      if (!data || typeof data !== 'object') {
        toast.error("Dados do relatório inválidos");
        setLoading(false);
        return;
      }

      setReportInfo(data);
      
      // Se tiver reportId, gera via backend (buscará a API configurada no BD)
      if (data.reportId) {
        await generatePdfViaBackend(data.reportId, data.apiUrl, data.report);
      } else {
        // Fallback: mostra estrutura do relatório
        setReportData(data.report || data);
        setLoading(false);
      }
    } catch (error) {
      console.error("Erro ao carregar relatório:", error);
      toast.error("Erro ao carregar relatório");
      setLoading(false);
    }
  };

  const generatePdfViaBackend = async (reportId: string, _apiUrl: string, _reportLayout: any) => {
    try {
      setLoading(true);
      setStatus('Criando job de geração...');

      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;

      const { data, error } = await supabase.functions.invoke('reportbro-preview', {
        body: { reportId, userId }
      });

      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.error || 'Falha ao criar job');
      }

      setJobId(data.jobId);
      setStatus('Aguardando processamento...');
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao iniciar geração do preview");
      setLoading(false);
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg font-medium text-foreground">{status}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Relatórios grandes podem levar alguns segundos...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="h-14 border-b flex items-center justify-between px-4 bg-card flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={handleGoBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="flex items-center gap-2">
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
        ) : reportData ? (
          <div className="p-4 overflow-auto h-full">
            <div className="max-w-4xl mx-auto bg-card shadow-lg rounded-lg p-6 border">
              <h1 className="text-xl font-semibold mb-2">Visualização de Relatório</h1>
              <p className="text-muted-foreground mb-4">
                Configure uma API de dados para gerar o PDF completo
              </p>
              {Array.isArray(reportData?.docElements) && reportData.docElements.length > 0 && (
                <div className="mb-4 border rounded p-3 bg-background">
                  <h2 className="font-medium mb-2">Elementos do relatório</h2>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {reportData.docElements
                      .filter((el: any) => el && (el.type === 'text' || el.elementType === 'text'))
                      .slice(0, 20)
                      .map((el: any, idx: number) => (
                        <li key={idx} className="text-foreground/80">
                          {el.content || el.text?.value || el.text || el.name || 'Elemento sem conteúdo'}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
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
