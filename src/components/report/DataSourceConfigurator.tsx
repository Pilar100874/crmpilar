import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Database, Plus, Trash2, Play, Table } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DataSource {
  id: string;
  name: string;
  connectionId: string;
  query: string;
  fields: Array<{ name: string; type: string }>;
}

interface DataSourceConfiguratorProps {
  reportId: string;
  onDataSourcesChange: (dataSources: DataSource[]) => void;
  initialDataSources?: DataSource[];
}

export function DataSourceConfigurator({ 
  reportId, 
  onDataSourcesChange,
  initialDataSources = []
}: DataSourceConfiguratorProps) {
  const [connections, setConnections] = useState<any[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>(initialDataSources);
  const [selectedDs, setSelectedDs] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadConnections();
  }, []);

  useEffect(() => {
    onDataSourcesChange(dataSources);
  }, [dataSources]);

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

  const handleAddDataSource = () => {
    const newDs: DataSource = {
      id: `ds-${Date.now()}`,
      name: `DataSource ${dataSources.length + 1}`,
      connectionId: connections[0]?.id || "",
      query: "SELECT * FROM ",
      fields: []
    };
    setDataSources([...dataSources, newDs]);
    setSelectedDs(newDs.id);
  };

  const handleRemoveDataSource = (id: string) => {
    setDataSources(dataSources.filter(ds => ds.id !== id));
    if (selectedDs === id) {
      setSelectedDs(dataSources[0]?.id || null);
    }
  };

  const handleUpdateDataSource = (id: string, updates: Partial<DataSource>) => {
    setDataSources(dataSources.map(ds => 
      ds.id === id ? { ...ds, ...updates } : ds
    ));
  };

  const handleTestQuery = async (dsId: string) => {
    const ds = dataSources.find(d => d.id === dsId);
    if (!ds || !ds.query.trim()) {
      toast.error("Configure a query primeiro");
      return;
    }

    setLoading(true);
    try {
      const connection = connections.find(c => c.id === ds.connectionId);
      if (!connection) {
        throw new Error("Conexão não encontrada");
      }

      // Executar query via edge function
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/execute-dynamic-query/test-query`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            server: connection.sql_server,
            database: connection.sql_database,
            username: connection.sql_username,
            password: connection.sql_password,
            query: ds.query,
            database_type: connection.database_type
          })
        }
      );

      const result = await response.json();
      
      if (result.success && result.data) {
        setTestResults({ ...testResults, [dsId]: result.data });
        
        // Extrair campos automaticamente
        if (result.data.length > 0) {
          const fields = Object.keys(result.data[0]).map(key => ({
            name: key,
            type: typeof result.data[0][key]
          }));
          handleUpdateDataSource(dsId, { fields });
        }
        
        toast.success(`Query executada: ${result.data.length} registros`);
      } else {
        throw new Error(result.error || "Erro ao executar query");
      }
    } catch (error: any) {
      console.error("Error testing query:", error);
      toast.error("Erro ao testar query: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const currentDs = dataSources.find(ds => ds.id === selectedDs);

  return (
    <div className="grid grid-cols-3 gap-4 h-full">
      {/* Lista de Data Sources */}
      <Card className="col-span-1">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="h-4 w-4" />
              Data Sources
            </CardTitle>
            <Button size="sm" onClick={handleAddDataSource}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <ScrollArea className="h-[500px]">
            {dataSources.map(ds => (
              <div
                key={ds.id}
                className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer mb-2 ${
                  selectedDs === ds.id ? "bg-primary/10 border-primary" : "hover:bg-muted/50"
                }`}
                onClick={() => setSelectedDs(ds.id)}
              >
                <div className="flex-1">
                  <div className="text-sm font-medium">{ds.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {connections.find(c => c.id === ds.connectionId)?.name || "Sem conexão"}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveDataSource(ds.id);
                  }}
                  className="h-7 w-7 p-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Configuração do Data Source Selecionado */}
      <Card className="col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">
            {currentDs ? `Configurar: ${currentDs.name}` : "Selecione um Data Source"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentDs ? (
            <>
              <div>
                <Label>Nome do Data Source</Label>
                <Input
                  value={currentDs.name}
                  onChange={(e) => handleUpdateDataSource(currentDs.id, { name: e.target.value })}
                  placeholder="Nome descritivo"
                />
              </div>

              <div>
                <Label>Conexão</Label>
                <Select
                  value={currentDs.connectionId}
                  onValueChange={(value) => handleUpdateDataSource(currentDs.id, { connectionId: value })}
                >
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
                    onClick={() => handleTestQuery(currentDs.id)}
                    disabled={loading}
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Testar
                  </Button>
                </div>
                <Textarea
                  value={currentDs.query}
                  onChange={(e) => handleUpdateDataSource(currentDs.id, { query: e.target.value })}
                  placeholder="SELECT * FROM tabela WHERE..."
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>

              {/* Resultados do Teste */}
              {testResults[currentDs.id] && (
                <div>
                  <Label className="mb-2 block">
                    Resultados ({testResults[currentDs.id].length} registros)
                  </Label>
                  <div className="border rounded-lg overflow-auto max-h-[200px]">
                    <table className="w-full text-xs">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          {Object.keys(testResults[currentDs.id][0] || {}).map(key => (
                            <th key={key} className="px-3 py-2 text-left font-medium">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {testResults[currentDs.id].slice(0, 10).map((row, idx) => (
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

              {/* Campos Detectados */}
              {currentDs.fields.length > 0 && (
                <div>
                  <Label className="mb-2 block flex items-center gap-2">
                    <Table className="h-3 w-3" />
                    Campos Detectados
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {currentDs.fields.map(field => (
                      <div key={field.name} className="p-2 border rounded text-sm">
                        <span className="font-medium">{field.name}</span>
                        <span className="text-muted-foreground ml-2">({field.type})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              Adicione ou selecione um Data Source para configurar
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
