import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert } from "lucide-react";
import { alertas } from "./mock";

const cor = { alto: "destructive", medio: "default", baixo: "secondary" } as const;

export default function PontoAlertas() {
  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold">Alertas Antifraude</h2>
        <p className="text-sm text-muted-foreground">Score baixo / médio / alto · GPS, dispositivo, biometria e padrão de marcação</p>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        {(["alto", "medio", "baixo"] as const).map((n) => (
          <Card key={n}>
            <CardContent className="p-4 flex items-center justify-between">
              <span className="capitalize text-sm">{n}</span>
              <Badge variant={cor[n]}>{alertas.filter((a) => a.nivel === n).length}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> Eventos detectados</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {alertas.map((a) => (
            <div key={a.id} className="flex items-start justify-between gap-3 p-3 rounded-md border">
              <div className="min-w-0">
                <p className="font-medium">{a.funcionario}</p>
                <p className="text-sm text-muted-foreground">{a.motivo}</p>
                <p className="text-xs text-muted-foreground mt-1">{a.quando}</p>
              </div>
              <Badge variant={cor[a.nivel]} className="capitalize shrink-0">{a.nivel}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
