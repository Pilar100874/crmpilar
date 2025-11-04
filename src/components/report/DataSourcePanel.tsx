import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Database } from "lucide-react";

interface DataSourcePanelProps {
  connectionId: string | null;
  query: string;
  onQueryChange: (query: string) => void;
}

export function DataSourcePanel({ connectionId, query, onQueryChange }: DataSourcePanelProps) {
  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="h-4 w-4" />
            Fonte de Dados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="query" className="text-xs">Query SQL</Label>
            <Textarea
              id="query"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="SELECT * FROM tabela"
              className="font-mono text-xs mt-1"
              rows={8}
            />
          </div>
          
          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
            <p className="font-medium">Dica:</p>
            <p>Use campos como [nome_campo] nos elementos do relatório</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
