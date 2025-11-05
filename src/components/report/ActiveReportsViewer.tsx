import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText, FileSpreadsheet, Printer, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

// @ts-ignore
import { Viewer } from "@mescius/activereportsjs-react";
import "@mescius/activereportsjs/styles/ar-js-ui.css";
import "@mescius/activereportsjs/styles/ar-js-viewer.css";

interface ActiveReportsViewerProps {
  reportDefinition: any;
  data?: any[];
  onClose: () => void;
}

export function ActiveReportsViewer({ reportDefinition, data, onClose }: ActiveReportsViewerProps) {
  const viewerRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (viewerRef.current && reportDefinition) {
      loadReport();
    }
  }, [reportDefinition, data]);

  const loadReport = async () => {
    try {
      setLoading(true);
      
      // Se temos dados, injetá-los no relatório
      if (data && data.length > 0) {
        // Criar data source customizado com os dados
        const customDataSource = {
          getData: () => Promise.resolve(data)
        };

        // Configurar e renderizar relatório
        await viewerRef.current.open(reportDefinition, {
          dataSources: customDataSource
        });
      } else {
        // Renderizar sem dados
        await viewerRef.current.open(reportDefinition);
      }

      setLoading(false);
    } catch (error: any) {
      console.error("Error loading report:", error);
      toast.error("Erro ao carregar relatório: " + error.message);
      setLoading(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'xlsx' | 'html') => {
    try {
      if (!viewerRef.current) {
        toast.error("Viewer não inicializado");
        return;
      }

      const exportSettings = {
        pdf: { info: { title: "Relatório" } },
        xlsx: { },
        html: { }
      };

      const result = await viewerRef.current.export(format, exportSettings[format]);
      
      // Criar download
      const blob = new Blob([result.data], { type: result.contentType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio.${format}`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`Relatório exportado como ${format.toUpperCase()}`);
    } catch (error: any) {
      console.error("Error exporting report:", error);
      toast.error("Erro ao exportar: " + error.message);
    }
  };

  const handlePrint = () => {
    if (viewerRef.current) {
      viewerRef.current.print();
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <Button variant="outline" onClick={onClose}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('pdf')}
            title="Exportar PDF"
          >
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('xlsx')}
            title="Exportar Excel"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('html')}
            title="Exportar HTML"
          >
            <Download className="h-4 w-4 mr-2" />
            HTML
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            title="Imprimir"
          >
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Viewer */}
      <div className="flex-1 relative bg-muted/10">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="text-lg">Carregando relatório...</div>
          </div>
        )}
        <Viewer
          ref={viewerRef}
        />
      </div>
    </div>
  );
}
