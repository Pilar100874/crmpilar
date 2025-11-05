import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";

// Importar Stimulsoft
declare const Stimulsoft: any;

export default function StimulsoftViewer() {
  const navigate = useNavigate();
  const viewerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadStimulsoftScripts();
  }, []);

  const loadStimulsoftScripts = () => {
    // Verificar se já está carregado
    if (typeof Stimulsoft !== 'undefined') {
      initializeViewer();
      return;
    }

    // Carregar CSS
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://cdn.stimulsoft.com/lib/2024.2.3/css/stimulsoft.viewer.office2013.whiteblue.css';
    document.head.appendChild(cssLink);

    // Carregar JS
    const script = document.createElement('script');
    script.src = 'https://cdn.stimulsoft.com/lib/2024.2.3/js/stimulsoft.reports.js';
    script.async = true;
    script.onload = () => {
      const viewerScript = document.createElement('script');
      viewerScript.src = 'https://cdn.stimulsoft.com/lib/2024.2.3/js/stimulsoft.viewer.js';
      viewerScript.async = true;
      viewerScript.onload = () => initializeViewer();
      document.head.appendChild(viewerScript);
    };
    document.head.appendChild(script);
  };

  const initializeViewer = () => {
    if (!containerRef.current || typeof Stimulsoft === 'undefined') return;

    try {
      // Configurar localização para português
      Stimulsoft.Base.Localization.StiLocalization.setLocalizationFile(
        'https://cdn.stimulsoft.com/lib/2024.2.3/localization/pt-BR.xml'
      );

      // Criar opções do viewer
      const options = new Stimulsoft.Viewer.StiViewerOptions();
      options.appearance.fullScreenMode = false;
      options.toolbar.showAboutButton = false;
      options.appearance.theme = Stimulsoft.Viewer.StiViewerTheme.Office2013WhiteBlue;
      options.exports.showExportToPdf = true;
      options.exports.showExportToExcel = true;
      options.exports.showExportToExcel2007 = true;
      options.exports.showExportToHtml = true;
      options.exports.showExportToWord2007 = true;

      // Criar viewer
      const viewer = new Stimulsoft.Viewer.StiViewer(options, 'StiViewer', false);

      // Carregar relatório do localStorage
      const savedReport = localStorage.getItem('stimulsoft_preview_report');
      if (savedReport) {
        const report = new Stimulsoft.Report.StiReport();
        report.load(savedReport);
        
        // Renderizar relatório
        report.renderAsync(() => {
          viewer.report = report;
          setIsLoaded(true);
          toast.success('Relatório carregado!');
        });
      } else {
        toast.error('Nenhum relatório para visualizar');
      }

      // Renderizar viewer
      viewer.renderHtml(containerRef.current);
      viewerRef.current = viewer;
    } catch (error) {
      console.error('Erro ao inicializar viewer:', error);
      toast.error('Erro ao carregar o visualizador');
    }
  };

  const handleExportPDF = () => {
    if (!viewerRef.current || !viewerRef.current.report) return;

    try {
      const report = viewerRef.current.report;
      report.exportDocumentAsync((pdfData: any) => {
        Stimulsoft.System.StiObject.saveAs(pdfData, 'relatorio.pdf', 'application/pdf');
        toast.success('PDF exportado com sucesso!');
      }, Stimulsoft.Report.StiExportFormat.Pdf);
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar PDF');
    }
  };

  const handleExportExcel = () => {
    if (!viewerRef.current || !viewerRef.current.report) return;

    try {
      const report = viewerRef.current.report;
      report.exportDocumentAsync((excelData: any) => {
        Stimulsoft.System.StiObject.saveAs(excelData, 'relatorio.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        toast.success('Excel exportado com sucesso!');
      }, Stimulsoft.Report.StiExportFormat.Excel2007);
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      toast.error('Erro ao exportar Excel');
    }
  };

  return (
    <div className="flex flex-col h-screen w-full">
      <div className="border-b bg-background p-4 flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/stimulsoft-designer')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao Editor
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportPDF}
        >
          <Download className="mr-2 h-4 w-4" />
          Exportar PDF
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportExcel}
        >
          <Download className="mr-2 h-4 w-4" />
          Exportar Excel
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        <div ref={containerRef} className="w-full h-full" />
        {!isLoaded && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando visualizador...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
