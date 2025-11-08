import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Database, Table, ChevronRight, ChevronDown, Search, RefreshCw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DatabaseTable {
  name: string;
  columns: Array<{ name: string; type: string }>;
  expanded: boolean;
}

interface DatabaseTableExplorerProps {
  connections: any[];
  onInsertField?: (tableName: string, fieldName: string) => void;
}

export function DatabaseTableExplorer({ connections, onInsertField }: DatabaseTableExplorerProps) {
  const [selectedConnection, setSelectedConnection] = useState<string>("");
  const [tables, setTables] = useState<DatabaseTable[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (connections.length > 0 && !selectedConnection) {
      setSelectedConnection(connections[0].id);
    }
  }, [connections]);

  useEffect(() => {
    if (selectedConnection) {
      loadTables();
    }
  }, [selectedConnection]);

  const loadTables = async () => {
    if (!selectedConnection) return;
    const conn = connections.find((c) => c.id === selectedConnection);
    const isSqlServer = conn?.database_type === 'sqlserver';
    const tablesQuery = isSqlServer
      ? "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'"
      : "SELECT table_name AS TABLE_NAME FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'";
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-report-query', {
        body: {
          connectionId: selectedConnection,
          query: tablesQuery,
          type: 'schema'
        }
      });

      if (error) throw error;

      if (data?.success && data?.data) {
        const tableList: DatabaseTable[] = data.data.map((row: any) => ({
          name: row.TABLE_NAME || row.table_name || Object.values(row)[0],
          columns: [],
          expanded: false
        }));
        setTables(tableList);
        toast.success(`${tableList.length} tabelas encontradas`);
      }
    } catch (error: any) {
      console.error("Error loading tables:", error);
      toast.error("Erro ao carregar tabelas: " + error.message);
      setTables([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleTable = async (tableName: string) => {
    const table = tables.find(t => t.name === tableName);
    if (!table) return;

    if (table.expanded) {
      setTables(tables.map(t => 
        t.name === tableName ? { ...t, expanded: false } : t
      ));
      return;
    }

  // Carregar colunas se ainda não foram carregadas
  if (table.columns.length === 0) {
    try {
      const conn = connections.find((c) => c.id === selectedConnection);
      const isSqlServer = conn?.database_type === 'sqlserver';
      const colQuery = isSqlServer
        ? `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${tableName}'`
        : `SELECT column_name AS COLUMN_NAME, data_type AS DATA_TYPE FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${tableName}'`;

      const { data, error } = await supabase.functions.invoke('test-report-query', {
        body: {
          connectionId: selectedConnection,
          query: colQuery,
          type: 'schema'
        }
      });

      if (error) throw error;

      if (data?.success && data?.data) {
        const columns = data.data.map((row: any) => ({
          name: row.COLUMN_NAME || row.column_name || Object.values(row)[0],
          type: row.DATA_TYPE || row.data_type || Object.values(row)[1] || 'unknown'
        }));
        
        setTables(tables.map(t => 
          t.name === tableName ? { ...t, columns, expanded: true } : t
        ));
      }
    } catch (error: any) {
      console.error("Error loading columns:", error);
      setTables(tables.map(t => 
        t.name === tableName ? { ...t, expanded: true } : t
      ));
    }
  } else {
    setTables(tables.map(t => 
      t.name === tableName ? { ...t, expanded: true } : t
    ));
  }
  };

  const filteredTables = tables.filter(table =>
    table.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    table.columns.some(col => col.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleFieldClick = (tableName: string, fieldName: string) => {
    if (onInsertField) {
      onInsertField(tableName, fieldName);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 space-y-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Database className="h-4 w-4" />
          Explorador de Tabelas
        </CardTitle>
        
        <div className="space-y-2">
          <Select value={selectedConnection} onValueChange={setSelectedConnection}>
            <SelectTrigger className="h-8 text-xs">
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

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Buscar tabelas/campos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-7 h-8 text-xs"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={loadTables}
              disabled={loading}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-4 pb-4">
          {loading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              Carregando tabelas...
            </div>
          ) : filteredTables.length === 0 ? (
            <div className="text-center py-8">
              <Table className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {searchTerm ? "Nenhuma tabela encontrada" : "Selecione uma conexão"}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredTables.map(table => (
                <div key={table.name} className="border rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleTable(table.name)}
                    className="w-full flex items-center gap-2 p-2 hover:bg-muted/50 transition-colors text-left"
                  >
                    {table.expanded ? (
                      <ChevronDown className="h-3 w-3 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-3 w-3 flex-shrink-0" />
                    )}
                    <Table className="h-3 w-3 flex-shrink-0 text-primary" />
                    <span className="text-sm font-medium">{table.name}</span>
                  </button>

                  {table.expanded && (
                    <div className="bg-muted/30 border-t">
                      {table.columns.length === 0 ? (
                        <div className="px-4 py-2 text-xs text-muted-foreground">
                          Carregando colunas...
                        </div>
                      ) : (
                        <div className="p-1">
                          {table.columns.map(column => (
                            <button
                              key={column.name}
                              onClick={() => handleFieldClick(table.name, column.name)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-background rounded text-left group"
                            >
                              <div className="w-1 h-1 rounded-full bg-muted-foreground/50 flex-shrink-0" />
                              <span className="text-xs font-medium flex-1">{column.name}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {column.type}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
