import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Database, Table, Link, Search, ChevronRight, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";

interface DatabaseTable {
  name: string;
  columns: string[];
  expanded?: boolean;
}

interface DatabaseExplorerProps {
  connectionId: string | null;
  onDragStart: (data: { type: string; field: string; table: string }) => void;
}

export function DatabaseExplorer({ connectionId, onDragStart }: DatabaseExplorerProps) {
  const [tables, setTables] = useState<DatabaseTable[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (connectionId) {
      loadTables();
    }
  }, [connectionId]);

  const loadTables = async () => {
    setLoading(true);
    try {
      // Simulação - em produção, buscar do banco
      const mockTables: DatabaseTable[] = [
        { name: "customers", columns: ["id", "nome", "email", "telefone", "created_at"] },
        { name: "orcamentos", columns: ["id", "cliente_id", "valor_total", "status", "created_at"] },
        { name: "produtos", columns: ["id", "nome", "categoria_id", "preco", "estoque"] },
        { name: "empresas", columns: ["id", "nome", "cnpj", "cidade", "estado"] },
      ];
      setTables(mockTables);
    } catch (error: any) {
      toast.error("Erro ao carregar tabelas: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleTable = (tableName: string) => {
    setTables(tables.map(t => 
      t.name === tableName ? { ...t, expanded: !t.expanded } : t
    ));
  };

  const filteredTables = tables.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.columns.some(c => c.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleDragStart = (e: React.DragEvent, table: string, column: string) => {
    e.dataTransfer.setData("application/json", JSON.stringify({
      type: "field",
      field: column,
      table: table,
    }));
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Database className="h-4 w-4" />
          Explorador de Banco de Dados
        </CardTitle>
        <div className="relative mt-2">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tabelas ou campos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-4">
          {loading ? (
            <div className="text-sm text-muted-foreground py-4">Carregando...</div>
          ) : (
            <div className="space-y-2 pb-4">
              {filteredTables.map((table) => (
                <div key={table.name} className="border rounded-lg">
                  <div
                    className="flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleTable(table.name)}
                  >
                    {table.expanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <Table className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{table.name}</span>
                  </div>
                  
                  {table.expanded && (
                    <div className="border-t bg-muted/20">
                      {table.columns.map((column) => (
                        <div
                          key={column}
                          draggable
                          onDragStart={(e) => handleDragStart(e, table.name, column)}
                          className="flex items-center gap-2 px-8 py-1.5 text-xs cursor-move hover:bg-muted/50"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                          <span className="text-muted-foreground">{column}</span>
                        </div>
                      ))}
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
