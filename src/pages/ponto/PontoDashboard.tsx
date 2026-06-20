import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, TrendingUp, Users, Calendar, ShieldAlert } from "lucide-react";
import { alertas, pendencias, tratamento } from "./mock";

const kpis = [
  { label: "Horas extras (mês)", value: "284h 15min", icon: TrendingUp, color: "text-blue-600" },
  { label: "Faltas (mês)", value: "23", icon: Calendar, color: "text-red-600" },
  { label: "Atrasos (mês)", value: "61", icon: Clock, color: "text-amber-600" },
  { label: "Banco de horas", value: "+412h / -89h", icon: Users, color: "text-emerald-600" },
];

export default function PontoDashboard() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold">Dashboard RH</h2>
        <p className="text-sm text-muted-foreground">Visão geral do controle de ponto · dados de exemplo</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <k.icon className={`h-4 w-4 ${k.color}`} />
              </div>
              <p className="text-xl font-bold mt-2">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Pendências</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendencias.map((p) => (
              <div key={p.tipo} className="flex items-center justify-between p-2 rounded-md bg-muted/40">
                <span className="text-sm">{p.tipo}</span>
                <Badge variant="secondary">{p.qtd}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> Alertas antifraude</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alertas.map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-3 p-2 rounded-md border">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{a.funcionario}</p>
                  <p className="text-xs text-muted-foreground">{a.motivo}</p>
                </div>
                <Badge variant={a.nivel === "alto" ? "destructive" : a.nivel === "medio" ? "default" : "secondary"} className="capitalize shrink-0">{a.nivel}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tratamento de ponto · hoje</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr className="border-b"><th className="text-left p-2">Funcionário</th><th className="text-left p-2">Atraso</th><th className="text-left p-2">Falta</th><th className="text-left p-2">Extra</th><th className="text-left p-2">Noturno</th><th className="text-left p-2">Banco</th></tr>
            </thead>
            <tbody>
              {tratamento.map((t) => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="p-2">{t.funcionario}</td><td className="p-2">{t.atraso}</td><td className="p-2">{t.falta}</td><td className="p-2">{t.extra}</td><td className="p-2">{t.noturno}</td><td className="p-2 font-medium">{t.saldoBanco}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
