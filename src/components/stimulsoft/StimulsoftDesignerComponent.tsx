import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StimulsoftSidebar } from "@/components/stimulsoft/StimulsoftSidebar";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

// Importar Stimulsoft
declare const Stimulsoft: any;

interface StimulsoftDesignerComponentProps {
  reportId: string | null;
  onClose: () => void;
}

export function StimulsoftDesignerComponent({ reportId, onClose }: StimulsoftDesignerComponentProps) {
  const designerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentReport, setCurrentReport] = useState<any>(null);

  useEffect(() => {
    loadStimulsoftScripts();
  }, []);

  useEffect(() => {
    if (reportId && isLoaded) {
      loadReportFromSupabase();
    }
  }, [reportId, isLoaded]);

  const loadReportFromSupabase = async () => {
    if (!reportId) return;

    try {
      const { data, error } = await supabase
        .from("relatorios")
        .select("layout_json")
        .eq("id", reportId)
        .single();

      if (error) throw error;

      if (data?.layout_json && designerRef.current) {
        const report = new Stimulsoft.Report.StiReport();
        const layoutJson = typeof data.layout_json === 'string' 
          ? data.layout_json 
          : JSON.stringify(data.layout_json);
        
        if (layoutJson && layoutJson !== '{}') {
          report.load(layoutJson);
        }
        
        designerRef.current.report = report;
        setCurrentReport(report);
      }
    } catch (error: any) {
      console.error('Erro ao carregar relatório:', error);
      toast.error('Erro ao carregar relatório: ' + error.message);
    }
  };

  const loadStimulsoftScripts = async () => {
    // Já carregado
    if (typeof Stimulsoft !== 'undefined') {
      initializeDesigner();
      return;
    }

    // 1) Tentar carregar via pacote local (sem CDN)
    const loadFromNpm = async () => {
      try {
        // Carrega CSS pelo bundler
        await import('stimulsoft-reports-js/Css/stimulsoft.designer.office2013.whiteblue.css');

        // Obtém URLs dos scripts como assets para executarem no escopo global (window)
        const reportsUrlMod: any = await import('stimulsoft-reports-js/Scripts/stimulsoft.reports.js?url');
        const designerUrlMod: any = await import('stimulsoft-reports-js/Scripts/stimulsoft.designer.js?url');
        const reportsUrl = reportsUrlMod.default || reportsUrlMod;
        const designerUrl = designerUrlMod.default || designerUrlMod;

        // Injeta os scripts em sequência
        await new Promise<void>((resolve, reject) => {
          const s1 = document.createElement('script');
          s1.src = reportsUrl;
          s1.async = true;
          s1.onload = () => resolve();
          s1.onerror = () => reject(new Error('Falha no script local: reports'));
          document.head.appendChild(s1);
        });

        await new Promise<void>((resolve, reject) => {
          const s2 = document.createElement('script');
          s2.src = designerUrl;
          s2.async = true;
          s2.onload = () => resolve();
          s2.onerror = () => reject(new Error('Falha no script local: designer'));
          document.head.appendChild(s2);
        });

        // Garante que o global esteja definido
        const maybeGlobal: any = (window as any).Stimulsoft || (globalThis as any).Stimulsoft;
        if (!maybeGlobal) {
          console.warn('Bibliotecas locais carregadas, mas Stimulsoft global não encontrado.');
          return false;
        }
        (window as any).Stimulsoft = maybeGlobal;
        return true;
      } catch (e) {
        console.warn('Falha ao carregar libs locais do Stimulsoft, usando CDN...', e);
        return false;
      }
    };

    const ok = await loadFromNpm();
    // Só inicializa se a lib realmente expôs o global
    if (ok && typeof Stimulsoft !== 'undefined') {
      initializeDesigner();
      return;
    }
    // Caso o pacote local não exponha o global, fazemos fallback para CDN

    // 2) Fallback para CDN
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://cdn.stimulsoft.com/lib/2024.2.3/css/stimulsoft.designer.office2013.whiteblue.css';
    document.head.appendChild(cssLink);

    const script = document.createElement('script');
    script.src = 'https://cdn.stimulsoft.com/lib/2024.2.3/js/stimulsoft.reports.js';
    script.async = true;
    script.onload = () => {
      const designerScript = document.createElement('script');
      designerScript.src = 'https://cdn.stimulsoft.com/lib/2024.2.3/js/stimulsoft.designer.js';
      designerScript.async = true;
      designerScript.onload = () => initializeDesigner();
      designerScript.onerror = () => toast.error('Falha ao carregar designer do Stimulsoft (CDN)');
      document.head.appendChild(designerScript);
    };
    script.onerror = () => toast.error('Falha ao carregar bibliotecas do Stimulsoft (CDN)');
    document.head.appendChild(script);

    setTimeout(() => {
      if (typeof Stimulsoft !== 'undefined' && !isLoaded) initializeDesigner();
    }, 1500);
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
      
      // Criar novo relatório
      const report = new Stimulsoft.Report.StiReport();
      designer.report = report;
      setCurrentReport(report);

      // Evento de salvamento automático no Supabase
      designer.onSaveReport = async () => {
        const reportJson = designer.report.saveToJsonString();
        localStorage.setItem('stimulsoft_current_report', reportJson);
        
        // Salvar no Supabase se tiver ID
        if (reportId) {
          try {
            const { error } = await supabase
              .from("relatorios")
              .update({
                layout_json: reportJson,
              })
              .eq("id", reportId);

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
    window.open('/stimulsoft-viewer', '_blank');
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
    <div className="fixed inset-0 z-[9999] bg-background flex">
      <StimulsoftSidebar
        onNew={handleNew}
        onPreview={handlePreview}
        onExportPDF={handleExportPDF}
        onExportExcel={handleExportExcel}
        onLoadExternalJSON={handleLoadExternalJSON}
      />
      
      <div className="flex-1 overflow-hidden relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-10"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
        <div ref={containerRef} className="w-full h-full min-h-screen" />
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
