import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Save, X, Loader2 } from 'lucide-react';

interface FastReportDesignerProps {
  reportId: string | null;
  initialReport?: string;
  onSave?: (reportContent: string) => void;
  onClose?: () => void;
}

declare global {
  interface Window {
    FastReport?: any;
    Designer?: any;
  }
}

export function FastReportDesigner({
  reportId,
  initialReport,
  onSave,
  onClose,
}: FastReportDesignerProps) {
  const designerRef = useRef<HTMLDivElement>(null);
  const [designer, setDesigner] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);

  // Carregar scripts do FastReport
  useEffect(() => {
    const loadScripts = async () => {
      try {
        // Verifica se os scripts já foram carregados
        if (window.FastReport || window.Designer) {
          setScriptsLoaded(true);
          setLoading(false);
          return;
        }

        // Carrega CSS
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = '/fastreport/designer.css';
        document.head.appendChild(cssLink);

        // Carrega JS principal
        const script1 = document.createElement('script');
        script1.src = '/fastreport/FastReport.js';
        script1.async = false;
        document.head.appendChild(script1);

        // Carrega Designer JS
        const script2 = document.createElement('script');
        script2.src = '/fastreport/Designer.js';
        script2.async = false;
        
        script2.onload = () => {
          setScriptsLoaded(true);
          setLoading(false);
        };
        
        script2.onerror = () => {
          console.error('Erro ao carregar FastReport Designer');
          toast.error('Erro ao carregar o editor. Certifique-se de que os arquivos estão em /public/fastreport/');
          setLoading(false);
        };

        document.head.appendChild(script2);
      } catch (error) {
        console.error('Erro ao carregar scripts:', error);
        toast.error('Erro ao inicializar o editor');
        setLoading(false);
      }
    };

    loadScripts();

    return () => {
      // Cleanup
      if (designer) {
        try {
          designer.destroy?.();
        } catch (e) {
          console.error('Erro ao destruir designer:', e);
        }
      }
    };
  }, []);

  // Inicializar designer quando os scripts estiverem carregados
  useEffect(() => {
    if (!scriptsLoaded || !designerRef.current) return;

    try {
      const emptyReport = `<?xml version="1.0" encoding="utf-8"?>
<Report ScriptLanguage="CSharp" ReportInfo.Created="01/01/2024 00:00:00" ReportInfo.Modified="01/01/2024 00:00:00" ReportInfo.CreatorVersion="2025.1.0">
  <Dictionary/>
  <ReportPage Name="Page1" Watermark.Font="Arial, 60pt">
    <ReportTitleBand Name="ReportTitle1" Width="718.2" Height="37.8">
      <TextObject Name="Text1" Width="718.2" Height="37.8" Text="Novo Relatório" Font="Arial, 16pt, style=Bold"/>
    </ReportTitleBand>
    <DataBand Name="Data1" Top="41.8" Width="718.2" Height="75.6"/>
    <PageFooterBand Name="PageFooter1" Top="121.4" Width="718.2" Height="18.9">
      <TextObject Name="Text2" Width="718.2" Height="18.9" Text="[PageN]" HorzAlign="Right" Font="Arial, 10pt"/>
    </PageFooterBand>
  </ReportPage>
</Report>`;

      const reportContent = initialReport || emptyReport;

      // Configuração do designer
      const config = {
        container: designerRef.current,
        report: reportContent,
        language: 'pt-BR',
        toolbar: {
          visible: true,
          items: ['file', 'edit', 'view', 'insert', 'data', 'preview']
        },
        callbacks: {
          onSave: (report: string) => {
            handleSaveInternal(report);
          },
          onError: (error: any) => {
            console.error('Designer error:', error);
            toast.error('Erro no designer: ' + (error.message || 'Erro desconhecido'));
          }
        }
      };

      // Inicializar o designer (a API pode variar dependendo da versão)
      let designerInstance;
      
      if (window.FastReport?.Designer) {
        designerInstance = new window.FastReport.Designer(config);
      } else if (window.Designer) {
        designerInstance = new window.Designer(config);
      } else {
        throw new Error('FastReport Designer não encontrado');
      }

      setDesigner(designerInstance);
      toast.success('Editor carregado com sucesso');
    } catch (error) {
      console.error('Erro ao inicializar designer:', error);
      toast.error('Erro ao inicializar o editor');
    }
  }, [scriptsLoaded, initialReport]);

  const handleSaveInternal = async (reportContent?: string) => {
    try {
      setSaving(true);
      
      let content = reportContent;
      
      // Se não foi passado conteúdo, tenta obter do designer
      if (!content && designer) {
        if (designer.getReport) {
          content = designer.getReport();
        } else if (designer.report) {
          content = designer.report.save?.() || JSON.stringify(designer.report);
        }
      }

      if (!content) {
        throw new Error('Não foi possível obter o conteúdo do relatório');
      }

      if (onSave) {
        await onSave(content);
        toast.success('Relatório salvo com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar relatório');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveClick = () => {
    handleSaveInternal();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Carregando editor FastReport...</p>
        <p className="text-xs text-muted-foreground mt-2">
          Certifique-se de que os arquivos estão em /public/fastreport/
        </p>
      </div>
    );
  }

  if (!scriptsLoaded) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-background">
        <div className="text-center space-y-4">
          <h3 className="text-lg font-semibold">Arquivos do FastReport não encontrados</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Copie os arquivos do FastReport Online Designer para a pasta <code className="bg-muted px-2 py-1 rounded">/public/fastreport/</code>
          </p>
          <ul className="text-xs text-left text-muted-foreground space-y-1 max-w-md mx-auto bg-muted/50 p-4 rounded">
            <li>• FastReport.js</li>
            <li>• Designer.js</li>
            <li>• designer.css</li>
            <li>• (outros arquivos necessários)</li>
          </ul>
          {onClose && (
            <Button onClick={onClose} variant="outline">
              <X className="w-4 h-4 mr-2" />
              Fechar
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Toolbar customizada */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">
            {reportId === 'new' ? 'Novo Relatório' : `Editando Relatório ${reportId}`}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleSaveClick}
            disabled={saving}
            size="sm"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </>
            )}
          </Button>
          {onClose && (
            <Button onClick={onClose} variant="outline" size="sm">
              <X className="w-4 h-4 mr-2" />
              Fechar
            </Button>
          )}
        </div>
      </div>

      {/* Container do Designer */}
      <div ref={designerRef} className="flex-1 overflow-hidden" />
    </div>
  );
}
