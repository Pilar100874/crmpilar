import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Save, Eye, ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// @ts-ignore
import { Designer } from "@mescius/activereportsjs-react";
import "@mescius/activereportsjs/styles/ar-js-ui.css";
import "@mescius/activereportsjs/styles/ar-js-designer.css";

interface ActiveReportsDesignerProps {
  report: any;
  onSave: (data: any) => void;
  onClose: () => void;
}

export function ActiveReportsDesigner({ report, onSave, onClose }: ActiveReportsDesignerProps) {
  const designerRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    initializeDesigner();
  }, []);

  const initializeDesigner = async () => {
    try {
      setLoading(true);
      
      // Carregar definição do relatório se existir
      let reportDefinition = report.layout_json?.activeReportsDefinition || {
        Name: report.nome,
        Body: {
          ReportItems: []
        },
        DataSources: [],
        DataSets: []
      };

      // Configurar data sources baseado nas conexões
      if (report.conexao_id) {
        const { data: connection } = await supabase
          .from("database_connections")
          .select("*")
          .eq("id", report.conexao_id)
          .single();

        if (connection) {
          // Adicionar data source customizado
          const dataSource = {
            Name: "MainDataSource",
            ConnectionProperties: {
              ConnectString: `Provider=Custom;Data Source=${connection.name}`,
              DataProvider: "Custom"
            }
          };

          if (!reportDefinition.DataSources) {
            reportDefinition.DataSources = [];
          }
          reportDefinition.DataSources.push(dataSource);

          // Adicionar dataset com a query
          if (report.query_sql) {
            const dataSet = {
              Name: "MainDataSet",
              Query: {
                DataSourceName: "MainDataSource",
                CommandText: report.query_sql
              },
              Fields: []
            };

            if (!reportDefinition.DataSets) {
              reportDefinition.DataSets = [];
            }
            reportDefinition.DataSets.push(dataSet);
          }
        }
      }

      setLoading(false);
    } catch (error: any) {
      console.error("Error initializing designer:", error);
      toast.error("Erro ao inicializar designer: " + error.message);
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!designerRef.current) {
        toast.error("Designer não inicializado");
        return;
      }

      // Obter definição do relatório do designer
      const reportDefinition = await designerRef.current.getReport();
      
      onSave({
        layout_json: {
          activeReportsDefinition: reportDefinition,
          version: "activereports-js"
        },
        query_sql: report.query_sql
      });

      toast.success("Relatório salvo com sucesso!");
    } catch (error: any) {
      console.error("Error saving report:", error);
      toast.error("Erro ao salvar relatório: " + error.message);
    }
  };

  const handlePreview = () => {
    setShowPreview(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Carregando ActiveReports Designer...</div>
      </div>
    );
  }

  if (showPreview) {
    return (
      <div className="h-screen flex flex-col">
        <div className="flex items-center gap-2 p-4 border-b bg-background">
          <Button variant="outline" onClick={() => setShowPreview(false)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Designer
          </Button>
        </div>
        <div className="flex-1">
          {/* Viewer será implementado aqui */}
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">
              Preview em desenvolvimento - use o Designer para visualizar
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-background z-10">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onClose}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="text-sm text-muted-foreground">
            Editando: <span className="font-medium text-foreground">{report.nome}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePreview}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
        </div>
      </div>

      {/* ActiveReports Designer */}
      <div className="flex-1 relative">
        <Designer
          ref={designerRef}
        />
      </div>
    </div>
  );
}
