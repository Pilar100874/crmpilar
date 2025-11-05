import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Save, ArrowLeft, Download, Settings } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// @ts-ignore - ActiveReportsJS types
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
  const [saving, setSaving] = useState(false);

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

      // Configurar data sources baseado nas conexões SQL Server
      if (report.conexao_id) {
        const { data: connection } = await supabase
          .from("database_connections")
          .select("*")
          .eq("id", report.conexao_id)
          .maybeSingle();

        if (connection) {
          console.log("Configuring SQL Server data source:", connection.name);
          
          // Adicionar data source SQL Server
          const dataSource = {
            Name: connection.name,
            ConnectionProperties: {
              ConnectString: `Data Source=${connection.sql_server};Initial Catalog=${connection.sql_database};User ID=${connection.sql_username};Password=${connection.sql_password}`,
              DataProvider: "SQL"
            }
          };

          if (!reportDefinition.DataSources) {
            reportDefinition.DataSources = [];
          }
          reportDefinition.DataSources.push(dataSource);

          // Adicionar dataset com a query SQL
          if (report.query_sql) {
            const dataSet = {
              Name: "DataSet1",
              Query: {
                DataSourceName: connection.name,
                CommandText: report.query_sql,
                CommandType: "Text"
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
    if (!designerRef.current) {
      toast.error("Designer não está pronto");
      return;
    }

    setSaving(true);
    try {
      // Obter definição completa do relatório do ActiveReports
      const reportDefinition = await designerRef.current.getReport();
      
      onSave({
        layout_json: {
          activeReportsDefinition: reportDefinition,
          version: "activereportsjs",
          lastModified: new Date().toISOString()
        },
        query_sql: report.query_sql || ""
      });

      toast.success("Modelo salvo com sucesso!");
    } catch (error: any) {
      console.error("Error saving report:", error);
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-muted/10">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">Carregando ActiveReports Designer...</div>
          <div className="text-sm text-muted-foreground">
            Inicializando editor profissional de relatórios
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Toolbar Customizada */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card shadow-sm">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onClose}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar aos Modelos
          </Button>
          <div className="h-6 w-px bg-border" />
          <div>
            <div className="font-semibold text-sm">{report.nome}</div>
            <div className="text-xs text-muted-foreground">
              {report.descricao || "Modelo de relatório"}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar Modelo"}
          </Button>
        </div>
      </div>

      {/* ActiveReports Designer - Controle Total Integrado */}
      <div className="flex-1 relative overflow-hidden">
        <Designer ref={designerRef} />
      </div>
    </div>
  );
}
