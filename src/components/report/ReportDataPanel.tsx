import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Play } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Editor from "@monaco-editor/react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

interface ReportDataPanelProps {
  reportId: string;
  connectionId: string | null;
  sql: string;
  onSqlChange: (sql: string) => void;
  parameters: any[];
  onParametersChange: (params: any[]) => void;
  onExecute: (data: any[]) => void;
}

export function ReportDataPanel({
  reportId,
  connectionId,
  sql,
  onSqlChange,
  parameters,
  onParametersChange,
  onExecute,
}: ReportDataPanelProps) {
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<any[]>([]);
  const [columnDefs, setColumnDefs] = useState<any[]>([]);

  const handleExecute = async () => {
    if (!connectionId) {
      toast.error("Selecione uma conexão de banco de dados");
      return;
    }

    if (!sql.trim()) {
      toast.error("Digite uma query SQL");
      return;
    }

    setExecuting(true);
    try {
      const { data, error } = await supabase.functions.invoke("execute-query", {
        body: {
          connectionId,
          query: sql,
          parameters,
        },
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const cols = Object.keys(data[0]).map((key) => ({
          field: key,
          headerName: key,
          sortable: true,
          filter: true,
        }));
        setColumnDefs(cols);
        setResult(data);
        onExecute(data);
        toast.success(`Query executada com sucesso. ${data.length} registros retornados.`);
      } else {
        toast.info("Query executada, mas não retornou dados.");
        setResult([]);
        setColumnDefs([]);
        onExecute([]);
      }
    } catch (error: any) {
      toast.error("Erro ao executar query: " + error.message);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <Label>Query SQL</Label>
          <Button onClick={handleExecute} disabled={executing}>
            <Play className="mr-2 h-4 w-4" />
            {executing ? "Executando..." : "Executar"}
          </Button>
        </div>
        <div className="flex-1 border rounded-lg overflow-hidden">
          <Editor
            height="100%"
            defaultLanguage="sql"
            value={sql}
            onChange={(value) => onSqlChange(value || "")}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: "on",
              roundedSelection: false,
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        </div>
      </div>

      {result.length > 0 && (
        <div className="flex-1 flex flex-col">
          <Label className="mb-2">Resultado ({result.length} registros)</Label>
          <div className="ag-theme-alpine flex-1 border rounded-lg">
            <AgGridReact
              rowData={result}
              columnDefs={columnDefs}
              defaultColDef={{
                resizable: true,
                sortable: true,
                filter: true,
              }}
              pagination={true}
              paginationPageSize={20}
            />
          </div>
        </div>
      )}
    </div>
  );
}
