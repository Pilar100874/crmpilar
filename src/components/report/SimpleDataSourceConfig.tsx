import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "@/lib/toast-config";

interface SimpleDataSourceConfigProps {
  reportId: string;
  currentConexaoId: string | null;
  currentQuerySql: string | null;
  onSave: (conexaoId: string | null, querySql: string) => void;
  onCancel: () => void;
}

export function SimpleDataSourceConfig({ 
  reportId, 
  currentConexaoId,
  currentQuerySql,
  onSave,
  onCancel
}: SimpleDataSourceConfigProps) {
  const [connections, setConnections] = useState<any[]>([]);
  const [conexaoId, setConexaoId] = useState<string>(currentConexaoId || "");
  const [querySql, setQuerySql] = useState<string>(currentQuerySql || "");
  const [testResults, setTestResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      const { data, error } = await supabase
        .from("database_connections")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .eq("active", true);

      if (error) throw error;
      setConnections(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar conexões: " + error.message);
    }
  };

  const handleTestQuery = async () => {
    if (!querySql.trim() || !conexaoId) {
      toast.error("Selecione uma conexão e configure a query");
      return;
    }

    setLoading(true);
    try {
      const connection = connections.find(c => c.id === conexaoId);
      if (!connection) {
        throw new Error("Conexão não encontrada");
      }

      const { data, error } = await supabase.functions.invoke('test-report-query', {
        body: {
          connectionId: connection.id,
          query: querySql,
          type: 'test'
        }
      });

      if (error) throw error;

      if (data?.success && data?.data) {
        setTestResults(data.data);
        toast.success(`Query executada! ${data.data.length} registros retornados`);
      } else {
        throw new Error(data?.error || "Erro ao executar query");
      }
    } catch (error: any) {
      console.error("Error testing query:", error);
      toast.error("Erro ao testar query: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!querySql.trim()) {
      toast.error("Configure a query SQL");
      return;
    }
    onSave(conexaoId || null, querySql);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Conexão SQL Server</Label>
        <Select value={conexaoId} onValueChange={setConexaoId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma conexão" />
          </SelectTrigger>
          <SelectContent>
            {connections.map(conn => (
              <SelectItem key={conn.id} value={conn.id}>
                {conn.name} ({conn.database_type})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Query SQL</Label>
          <Button
            size="sm"
            variant="outline"
            onClick={handleTestQuery}
            disabled={loading || !conexaoId || !querySql.trim()}
          >
            <Play className="h-3 w-3 mr-1" />
            {loading ? "Testando..." : "Testar Query"}
          </Button>
        </div>
        <Textarea
          value={querySql}
          onChange={(e) => setQuerySql(e.target.value)}
          placeholder="SELECT * FROM tabela WHERE..."
          rows={8}
          className="font-mono text-sm"
        />
      </div>

      {/* Resultados do Teste */}
      {testResults.length > 0 && (
        <div>
          <Label className="mb-2 block">
            Resultados ({testResults.length} registros)
          </Label>
          <div className="border rounded-lg overflow-auto max-h-[300px]">
            <table className="w-full text-xs">
              <thead className="bg-muted sticky top-0">
                <tr>
                  {Object.keys(testResults[0] || {}).map(key => (
                    <th key={key} className="px-3 py-2 text-left font-medium">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {testResults.slice(0, 20).map((row, idx) => (
                  <tr key={idx} className="border-t">
                    {Object.values(row).map((value: any, i) => (
                      <td key={i} className="px-3 py-1.5">
                        {String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-1" />
          Cancelar
        </Button>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-1" />
          Salvar Configuração
        </Button>
      </div>
    </div>
  );
}
