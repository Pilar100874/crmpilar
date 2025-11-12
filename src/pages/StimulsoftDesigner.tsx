import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { StimulsoftSidebar } from "@/components/stimulsoft/StimulsoftSidebar";
import { toast } from "@/lib/toast-config";

// Importar Stimulsoft
declare const Stimulsoft: any;

export default function StimulsoftDesigner() {
  const navigate = useNavigate();
  const designerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentReport, setCurrentReport] = useState<any>(null);
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);

  useEffect(() => {
    // Verificar se há um relatório do Supabase para carregar
    const reportId = localStorage.getItem('stimulsoft_current_report_id');
    if (reportId) {
      setCurrentReportId(reportId);
    }
    loadStimulsoftScripts();
  }, []);

  const loadStimulsoftScripts = () => {
    // Verificar se já está carregado
    if (typeof Stimulsoft !== 'undefined') {
      initializeDesigner();
      return;
    }

    // Carregar CSS
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://cdn.stimulsoft.com/lib/2024.2.3/css/stimulsoft.designer.office2013.whiteblue.css';
    document.head.appendChild(cssLink);

    // Carregar JS
    const script = document.createElement('script');
    script.src = 'https://cdn.stimulsoft.com/lib/2024.2.3/js/stimulsoft.reports.js';
    script.async = true;
    script.onload = () => {
      const designerScript = document.createElement('script');
      designerScript.src = 'https://cdn.stimulsoft.com/lib/2024.2.3/js/stimulsoft.designer.js';
      designerScript.async = true;
      designerScript.onload = () => initializeDesigner();
      document.head.appendChild(designerScript);
    };
    document.head.appendChild(script);
  };

  const initializeDesigner = () => {
    if (!containerRef.current || typeof Stimulsoft === 'undefined') return;

    try {
      // Configurar localização para português
      Stimulsoft.Base.Localization.StiLocalization.setLocalizationFile(
        'https://cdn.stimulsoft.com/lib/2024.2.3/localization/pt-BR.xml'
      );

      // Criar opções do designer
      const options = new Stimulsoft.Designer.StiDesignerOptions();
      options.appearance.fullScreenMode = false;
      options.toolbar.showAboutButton = false;
      options.appearance.theme = Stimulsoft.Designer.StiDesignerTheme.Office2013WhiteBlue;

      // Criar designer
      const designer = new Stimulsoft.Designer.StiDesigner(options, 'StiDesigner', false);
      
      // Criar novo relatório ou carregar do localStorage
      let report = new Stimulsoft.Report.StiReport();
      const savedReport = localStorage.getItem('stimulsoft_current_report');
      
      if (savedReport) {
        try {
          report.load(savedReport);
        } catch (e) {
          console.error('Erro ao carregar relatório salvo:', e);
        }
      }

      designer.report = report;
      setCurrentReport(report);

      // Evento de salvamento automático no Supabase
      designer.onSaveReport = async () => {
        const reportJson = designer.report.saveToJsonString();
        localStorage.setItem('stimulsoft_current_report', reportJson);
        
        // Salvar no Supabase se tiver ID
        if (currentReportId) {
          try {
            const { error } = await supabase
              .from("relatorios")
              .update({
                layout_json: reportJson,
              })
              .eq("id", currentReportId);

            if (error) throw error;
            toast.success('Relatório salvo automaticamente');
          } catch (error: any) {
            toast.error('Erro ao salvar: ' + error.message);
          }
        } else {
          toast.success('Rascunho salvo automaticamente');
        }
      };

      // Renderizar designer
      designer.renderHtml(containerRef.current);
      designerRef.current = designer;
      setIsLoaded(true);

      toast.success('Stimulsoft Designer carregado!');
    } catch (error) {
      console.error('Erro ao inicializar designer:', error);
      toast.error('Erro ao carregar o designer');
    }
  };

  const handleNew = () => {
    if (!designerRef.current) return;
    
    const newReport = new Stimulsoft.Report.StiReport();
    designerRef.current.report = newReport;
    setCurrentReport(newReport);
    localStorage.removeItem('stimulsoft_current_report');
    toast.success('Novo relatório criado');
  };


  const handlePreview = () => {
    if (!designerRef.current) return;

    const reportJson = designerRef.current.report.saveToJsonString();
    localStorage.setItem('stimulsoft_preview_report', reportJson);
    navigate('/stimulsoft-viewer');
  };

  const handleExportPDF = () => {
    if (!designerRef.current) return;

    try {
      const report = designerRef.current.report;
      report.renderAsync(() => {
        report.exportDocumentAsync((pdfData: any) => {
          Stimulsoft.System.StiObject.saveAs(pdfData, 'relatorio.pdf', 'application/pdf');
          toast.success('PDF exportado com sucesso!');
        }, Stimulsoft.Report.StiExportFormat.Pdf);
      });
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar PDF');
    }
  };

  const handleExportExcel = () => {
    if (!designerRef.current) return;

    try {
      const report = designerRef.current.report;
      report.renderAsync(() => {
        report.exportDocumentAsync((excelData: any) => {
          Stimulsoft.System.StiObject.saveAs(excelData, 'relatorio.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          toast.success('Excel exportado com sucesso!');
        }, Stimulsoft.Report.StiExportFormat.Excel2007);
      });
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      toast.error('Erro ao exportar Excel');
    }
  };

  const handleLoadExternalJSON = (data: any) => {
    if (!designerRef.current) return;

    try {
      const report = designerRef.current.report;
      const dataSource = new Stimulsoft.System.Data.DataSet('ExternalData');
      dataSource.readJson(JSON.stringify(data));
      report.dictionary.databases.clear();
      report.regData('ExternalData', 'ExternalData', dataSource);
      toast.success('Dados externos carregados no Dictionary!');
    } catch (error) {
      console.error('Erro ao carregar dados externos:', error);
      toast.error('Erro ao carregar dados externos');
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <StimulsoftSidebar
        onNew={handleNew}
        onPreview={handlePreview}
        onExportPDF={handleExportPDF}
        onExportExcel={handleExportExcel}
        onLoadExternalJSON={handleLoadExternalJSON}
      />
      
      <div className="flex-1 overflow-hidden">
        <div ref={containerRef} className="w-full h-full" />
        {!isLoaded && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando Stimulsoft Designer...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
