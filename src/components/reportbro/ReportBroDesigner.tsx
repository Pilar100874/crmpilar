import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { X, Save, Eye, FileDown, Database } from "lucide-react";
import "reportbro-designer/dist/reportbro.css";
import "./reportbro-custom.css";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DataSourceConfigurator } from "@/components/report/DataSourceConfigurator";

interface ReportBroDesignerProps {
  reportId: string | null;
  onClose: () => void;
}

export function ReportBroDesigner({ reportId, onClose }: ReportBroDesignerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reportBroRef = useRef<any>(null);
const [isLoaded, setIsLoaded] = useState(false);
  const [showDsDialog, setShowDsDialog] = useState(false);
  const [initialSources, setInitialSources] = useState<any[]>([]);
  const [currentSources, setCurrentSources] = useState<any[]>([]);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    loadReportBro();
  }, []);

  useEffect(() => {
    if (isLoaded && reportId) {
      loadReportFromSupabase();
    }
  }, [isLoaded, reportId]);

  const loadReportBro = async () => {
    try {
      // Garante carregamento do UMD via URL gerado pelo Vite
      if (!(window as any).ReportBro) {
        const rbUrl = (await import("reportbro-designer/dist/reportbro.js?url")).default as string;
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = rbUrl;
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Falha ao carregar script do ReportBro"));
          document.head.appendChild(script);
        });
      }

      const ReportBro = (window as any).ReportBro;
      if (!ReportBro) {
        throw new Error("ReportBro UMD não encontrado após importação");
      }
      
      if (!containerRef.current) return;

      // Sempre inicia com relatório vazio (sem template selection)
      const reportDefinition = getEmptyReport();

      // Destroi instância anterior se existir
      if (reportBroRef.current?.destroy) {
        try { reportBroRef.current.destroy(); } catch {}
      }

      reportBroRef.current = new ReportBro(containerRef.current, {
        reportServerUrl: "",
        locale: "pt_BR",
        saveCallback: handleSave,
        report: reportDefinition,
      });

      setIsLoaded(true);
      toast.success("Designer carregado!");
    } catch (error) {
      console.error("Erro ao carregar ReportBro:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao carregar o designer");
    }
  };

  const loadReportFromSupabase = async () => {
    if (!reportId) return;

    try {
      const { data, error } = await supabase
        .from("relatorios")
        .select("*")
        .eq("id", reportId)
        .single();

      if (error) throw error;

      if (reportBroRef.current) {
        let layoutData: any = getEmptyReport();
        if (data?.layout_json) {
          try {
            layoutData = typeof data.layout_json === "string"
              ? JSON.parse(data.layout_json)
              : data.layout_json;
          } catch (e) {
            console.warn("Layout inválido, carregando vazio.", e);
          }
        }
        reportBroRef.current.load(layoutData);
        toast.success("Relatório carregado!");
      }

      // Prepara fontes iniciais a partir das colunas do relatório
      const initSources: any[] = [];
      if (data?.conexao_id || data?.query_sql) {
        initSources.push({
          id: "ds-main",
          name: "Principal",
          connectionId: data?.conexao_id || "",
          query: data?.query_sql || "",
          fields: []
        });
      }
      setInitialSources(initSources);
    } catch (error) {
      console.error("Erro ao carregar relatório:", error);
      toast.error("Erro ao carregar relatório");
    }
  };

  const handleSave = async () => {
    if (!reportBroRef.current || !reportId) return;

    try {
      const reportData = reportBroRef.current.getReport();
      
      const { error } = await supabase
        .from("relatorios")
        .update({
          layout_json: reportData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", reportId);

      if (error) throw error;

      toast.success("Relatório salvo com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar relatório");
    }
  };

  const handlePreview = () => {
    if (!reportBroRef.current) return;
    
    try {
      const reportData = reportBroRef.current.getReport();
      localStorage.setItem("reportbro_preview", JSON.stringify(reportData));
      window.open("/relatorios/viewer", "_blank");
      toast.success("Abrindo visualização...");
    } catch (error) {
      console.error("Erro ao visualizar:", error);
      toast.error("Erro ao abrir visualização");
    }
  };

  const handleExportPDF = async () => {
    if (!reportBroRef.current) return;

    try {
      const reportData = reportBroRef.current.getReport();
      const errors = reportBroRef.current.getErrors();
      
      if (errors.length > 0) {
        toast.error("Corrija os erros no relatório antes de exportar");
        return;
      }

      toast.info("Exportação PDF em desenvolvimento - use a visualização");
    } catch (error) {
      console.error("Erro ao exportar:", error);
      toast.error("Erro ao exportar PDF");
    }
  };

  const applyDataSources = async () => {
    if (!reportId) return;
    try {
      setApplying(true);
      const main = currentSources[0];
      const updates: any = {};
      if (main) {
        updates.conexao_id = main.connectionId || null;
        updates.query_sql = main.query || "";
      }
      const { error } = await supabase
        .from("relatorios")
        .update(updates)
        .eq("id", reportId);
      if (error) throw error;
      toast.success("Fontes aplicadas ao relatório");
      setShowDsDialog(false);
    } catch (error: any) {
      console.error("Erro ao aplicar fontes:", error);
      toast.error("Erro ao aplicar fontes: " + error.message);
    } finally {
      setApplying(false);
    }
  };

  const getEmptyReport = () => ({
    docElements: [
      {
        id: 1,
        type: "text",
        content: "Novo Relatório",
        x: 100,
        y: 100,
        width: 200,
        height: 30,
      }
    ],
    parameters: [],
    styles: [],
    version: 3,
  });

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header compacto */}
      <div className="h-12 border-b flex items-center justify-between px-3 bg-card shrink-0">
        <h2 className="text-sm font-semibold">Designer de Relatórios</h2>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" onClick={handleSave} className="h-8">
            <Save className="h-3.5 w-3.5 mr-1.5" />
            Salvar
          </Button>
          <Button size="sm" variant="outline" onClick={handlePreview} className="h-8">
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            Preview
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowDsDialog(true)} className="h-8">
            <Database className="h-3.5 w-3.5 mr-1.5" />
            Dados
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose} className="h-8 w-8 p-0" title="Fechar designer">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Designer Container */}
      <div className="flex-1 relative overflow-hidden">
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando designer...</p>
            </div>
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>
      <Dialog open={showDsDialog} onOpenChange={setShowDsDialog}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Fontes de Dados do Relatório</DialogTitle>
          </DialogHeader>
          {reportId ? (
            <div className="h-[70vh]">
              <DataSourceConfigurator
                reportId={reportId}
                initialDataSources={initialSources}
                onDataSourcesChange={setCurrentSources}
              />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Salve o relatório para configurar as fontes de dados.
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDsDialog(false)}>Fechar</Button>
            <Button onClick={applyDataSources} disabled={applying || !reportId}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
