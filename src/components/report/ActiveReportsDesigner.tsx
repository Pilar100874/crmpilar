import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Save, ArrowLeft, Database } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SimpleDataSourceConfig } from "./SimpleDataSourceConfig";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

// Importar estilos do ActiveReportsJS
// @ts-ignore - ActiveReportsJS types
import { Designer } from "@mescius/activereportsjs-react";
import "@mescius/activereportsjs/styles/ar-js-ui.css";
import "@mescius/activereportsjs/styles/ar-js-designer.css";
import { applyPortugueseLocale } from "@/lib/activereports-locale-pt-br";

interface ActiveReportsDesignerProps {
  report: any;
  onSave: (data: any) => void;
  onClose: () => void;
}

export function ActiveReportsDesigner({ report, onSave, onClose }: ActiveReportsDesignerProps) {
  const designerRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDataSource, setShowDataSource] = useState(false);
  const [currentReport, setCurrentReport] = useState(report);

  useEffect(() => {
    // Aplicar localização em português
    applyPortugueseLocale();
    initializeDesigner();
  }, [currentReport]);

  const initializeDesigner = async () => {
    try {
      setLoading(true);
      
      // Carregar definição do relatório se existir
      let reportDefinition = currentReport.layout_json?.activeReportsDefinition || {
        Name: currentReport.nome,
        Body: {
          ReportItems: []
        },
        DataSources: [],
        DataSets: []
      };

      // Configurar data sources baseado nas conexões SQL Server
      if (currentReport.conexao_id) {
        const { data: connection } = await supabase
          .from("database_connections")
          .select("*")
          .eq("id", currentReport.conexao_id)
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
          if (currentReport.query_sql) {
            const dataSet = {
              Name: "DataSet1",
              Query: {
                DataSourceName: connection.name,
                CommandText: currentReport.query_sql,
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

  const handleDataSourceSave = async (conexaoId: string | null, querySql: string) => {
    try {
      const { error } = await supabase
        .from("relatorios")
        .update({
          conexao_id: conexaoId,
          query_sql: querySql,
        })
        .eq("id", currentReport.id);

      if (error) throw error;

      // Atualizar estado local
      setCurrentReport({
        ...currentReport,
        conexao_id: conexaoId,
        query_sql: querySql,
      });

      toast.success("Fonte de dados configurada!");
      setShowDataSource(false);
      
      // Reinicializar designer com nova configuração
      initializeDesigner();
    } catch (error: any) {
      console.error("Error saving data source:", error);
      toast.error("Erro ao salvar fonte de dados: " + error.message);
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
        query_sql: currentReport.query_sql || ""
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
          <div className="text-lg font-medium mb-2">Carregando Designer de Relatórios...</div>
          <div className="text-sm text-muted-foreground">
            Inicializando editor profissional ActiveReports
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
            <div className="font-semibold text-sm">{currentReport.nome}</div>
            <div className="text-xs text-muted-foreground">
              {currentReport.descricao || "Modelo de relatório"}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setShowDataSource(true)}
            className="gap-2"
          >
            <Database className="h-4 w-4" />
            Configurar Fonte de Dados
          </Button>
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

      {/* ActiveReports Designer com Configuração em Português */}
      <div className="flex-1 relative overflow-hidden">
        <Designer 
          ref={designerRef}
        />
      </div>

      {/* Painel de Configuração de Fonte de Dados SQL Server */}
      <Sheet open={showDataSource} onOpenChange={setShowDataSource}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Configurar Fonte de Dados SQL Server</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <SimpleDataSourceConfig
              reportId={currentReport.id}
              currentConexaoId={currentReport.conexao_id}
              currentQuerySql={currentReport.query_sql}
              onSave={handleDataSourceSave}
              onCancel={() => setShowDataSource(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
