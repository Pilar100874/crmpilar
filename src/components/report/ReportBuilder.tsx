import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Play, Download } from "lucide-react";
import { ReportDesigner } from "./ReportDesigner";
import { ReportDataPanel } from "./ReportDataPanel";
import { ReportPreview } from "./ReportPreview";
import { ReportExport } from "./ReportExport";
import { toast } from "sonner";

interface ReportBuilderProps {
  report: any;
  onSave: (data: any) => void;
  onClose: () => void;
}

export function ReportBuilder({ report, onSave, onClose }: ReportBuilderProps) {
  const [activeTab, setActiveTab] = useState("designer");
  const [layout, setLayout] = useState(report.layout_json || {});
  const [queryData, setQueryData] = useState<any[]>([]);
  const [sql, setSql] = useState(report.query_sql || "");
  const [parameters, setParameters] = useState(report.parametros || []);
  const [configurations, setConfigurations] = useState(report.configuracoes || {});

  const handleSave = () => {
    onSave({
      layout_json: layout,
      query_sql: sql,
      parametros: parameters,
      configuracoes: configurations,
    });
  };

  const handleExecuteQuery = (data: any[]) => {
    setQueryData(data);
    toast.success(`Query executada com sucesso. ${data.length} registros retornados.`);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-between items-center">
            <TabsList>
              <TabsTrigger value="designer">Designer</TabsTrigger>
              <TabsTrigger value="data">Dados</TabsTrigger>
              <TabsTrigger value="preview">Pré-visualização</TabsTrigger>
              <TabsTrigger value="export">Exportar</TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Fechar
              </Button>
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Salvar
              </Button>
            </div>
          </div>
        </Tabs>
      </div>

      <div className="flex-1 overflow-auto">
        <Tabs value={activeTab} className="h-full">
          <TabsContent value="designer" className="h-full mt-0">
            <ReportDesigner
              layout={layout}
              onChange={setLayout}
              queryData={queryData}
            />
          </TabsContent>
          <TabsContent value="data" className="h-full mt-0">
            <ReportDataPanel
              reportId={report.id}
              connectionId={report.conexao_id}
              sql={sql}
              onSqlChange={setSql}
              parameters={parameters}
              onParametersChange={setParameters}
              onExecute={handleExecuteQuery}
            />
          </TabsContent>
          <TabsContent value="preview" className="h-full mt-0">
            <ReportPreview
              layout={layout}
              data={queryData}
            />
          </TabsContent>
          <TabsContent value="export" className="h-full mt-0">
            <ReportExport
              layout={layout}
              data={queryData}
              reportName={report.nome}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
