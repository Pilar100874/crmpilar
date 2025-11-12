import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Database } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "@/lib/toast-config";

interface DataSource {
  id: string;
  name: string;
  query: string;
  connectionId: string;
}

interface DatabaseConnection {
  id: string;
  name: string;
  database_type: string;
}

interface DataSourceManagerProps {
  dataSources: DataSource[];
  onDataSourcesChange: (sources: DataSource[]) => void;
  onSelectDataSource: (sourceId: string) => void;
  selectedDataSourceId: string;
}

export function DataSourceManager({ 
  dataSources, 
  onDataSourcesChange, 
  onSelectDataSource,
  selectedDataSourceId 
}: DataSourceManagerProps) {
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newSource, setNewSource] = useState({ name: "", connectionId: "" });

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      const { data, error } = await supabase
        .from("database_connections")
        .select("id, name, database_type")
        .eq("estabelecimento_id", estabelecimentoId)
        .eq("active", true);

      if (error) throw error;
      setConnections(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar conexões: " + error.message);
    }
  };

  const handleAddSource = () => {
    if (!newSource.name || !newSource.connectionId) {
      toast.error("Preencha todos os campos");
      return;
    }

    const source: DataSource = {
      id: `ds-${Date.now()}`,
      name: newSource.name,
      query: "",
      connectionId: newSource.connectionId,
    };

    onDataSourcesChange([...dataSources, source]);
    setNewSource({ name: "", connectionId: "" });
    setShowNew(false);
    toast.success("Fonte de dados adicionada");
  };

  const handleRemoveSource = (id: string) => {
    if (dataSources.length === 1) {
      toast.error("Não é possível remover a última fonte de dados");
      return;
    }
    onDataSourcesChange(dataSources.filter(ds => ds.id !== id));
    if (selectedDataSourceId === id) {
      onSelectDataSource(dataSources[0].id);
    }
    toast.success("Fonte de dados removida");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="h-4 w-4" />
            Fontes de Dados
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowNew(!showNew)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Nova
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {showNew && (
          <div className="space-y-2 p-3 border rounded-lg bg-muted/20">
            <div>
              <Label className="text-xs">Nome da Fonte</Label>
              <Input
                value={newSource.name}
                onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                placeholder="Ex: Vendas, Estoque..."
                className="h-8"
              />
            </div>
            <div>
              <Label className="text-xs">Conexão</Label>
              <Select
                value={newSource.connectionId}
                onValueChange={(value) => setNewSource({ ...newSource, connectionId: value })}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {connections.map((conn) => (
                    <SelectItem key={conn.id} value={conn.id}>
                      {conn.name} ({conn.database_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddSource} className="h-7">
                Adicionar
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setShowNew(false)}
                className="h-7"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {dataSources.map((source) => {
            const connection = connections.find(c => c.id === source.connectionId);
            return (
              <div
                key={source.id}
                className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors ${
                  selectedDataSourceId === source.id
                    ? "bg-primary/10 border-primary"
                    : "hover:bg-muted/50"
                }`}
                onClick={() => onSelectDataSource(source.id)}
              >
                <div className="flex-1">
                  <div className="text-sm font-medium">{source.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {connection ? `${connection.name}` : "Sem conexão"}
                  </div>
                </div>
                {dataSources.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveSource(source.id);
                    }}
                    className="h-7 w-7 p-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
