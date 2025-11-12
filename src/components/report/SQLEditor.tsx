import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Editor from "@monaco-editor/react";
import { Play, Database, FileDown } from "lucide-react";
import { useState } from "react";
import { toast } from "@/lib/toast-config";
import { supabase } from "@/integrations/supabase/client";

interface SQLEditorProps {
  connectionId: string | null;
  query: string;
  onQueryChange: (query: string) => void;
  onExecute?: (results: any[]) => void;
  dataSourceId: string;
}

export function SQLEditor({ connectionId, query, onQueryChange, onExecute, dataSourceId }: SQLEditorProps) {
  const [executing, setExecuting] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleExecute = async () => {
    if (!query.trim()) {
      toast.error("Digite uma query SQL");
      return;
    }

    setExecuting(true);
    try {
      // Simulação - em produção, chamar a API real
      const mockResults = [
        { id: 1, nome: "Produto A", valor: 100 },
        { id: 2, nome: "Produto B", valor: 200 },
        { id: 3, nome: "Produto C", valor: 150 },
      ];
      
      setResults(mockResults);
      onExecute?.(mockResults);
      toast.success(`Query executada: ${mockResults.length} registros`);
    } catch (error: any) {
      toast.error("Erro ao executar query: " + error.message);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="h-4 w-4" />
            Editor SQL
          </CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExecute}
              disabled={executing || !connectionId}
            >
              <Play className="h-3 w-3 mr-1" />
              Executar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <div className="h-[300px] border-b">
          <Editor
            height="100%"
            defaultLanguage="sql"
            value={query}
            onChange={(value) => onQueryChange(value || "")}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: "on",
              formatOnPaste: true,
              formatOnType: true,
            }}
          />
        </div>
        
        {results.length > 0 && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                Resultados ({results.length} registros)
              </span>
              <Button size="sm" variant="outline">
                <FileDown className="h-3 w-3 mr-1" />
                Exportar
              </Button>
            </div>
            <div className="border rounded-lg overflow-auto max-h-[200px]">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    {results.length > 0 &&
                      Object.keys(results[0]).map((key) => (
                        <th key={key} className="px-4 py-2 text-left font-medium">
                          {key}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((row, idx) => (
                    <tr key={idx} className="border-t">
                      {Object.values(row).map((value: any, i) => (
                        <td key={i} className="px-4 py-2">
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
