import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, AlertTriangle, TrendingUp, Users } from "lucide-react";

export default function PontoCompliance() {
  const [dados, setDados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("ponto_compliance_dashboard" as any)
        .select("*")
        .order("mes", { ascending: false })
        .limit(12);
      setDados((data as any) || []);
      setLoading(false);
    })();
  }, []);

  const totalCriticas = dados.reduce((s, d) => s + (d.criticas || 0), 0);
  const totalPendentes = dados.reduce((s, d) => s + (d.pendentes || 0), 0);
  const totalAnomalias = dados.reduce((s, d) => s + (d.total_anomalias || 0), 0);
  const funcAfetados = dados.reduce((s, d) => Math.max(s, d.funcionarios_afetados || 0), 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Dashboard de Compliance</h1>
          <p className="text-muted-foreground">Visão consolidada de violações CLT e Portaria 671</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Anomalias críticas</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-destructive">{totalCriticas}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pendentes</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-orange-500">{totalPendentes}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total (12m)</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{totalAnomalias}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Funcionários afetados</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold flex items-center gap-2"><Users className="h-6 w-6" />{funcAfetados}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Histórico mensal</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground">Carregando...</p> : dados.length === 0 ? (
            <p className="text-muted-foreground">Sem anomalias registradas ✓</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm resp-table">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="p-2">Mês</th>
                    <th className="p-2">HE&gt;Limite</th>
                    <th className="p-2">Jornada&gt;10h</th>
                    <th className="p-2">Interjornada</th>
                    <th className="p-2">Intrajornada</th>
                    <th className="p-2">Críticas</th>
                    <th className="p-2">Pendentes</th>
                    <th className="p-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.map((d, i) => (
                    <tr key={i} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium">{new Date(d.mes).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}</td>
                      <td className="p-2">{d.he_acima_limite}</td>
                      <td className="p-2">{d.jornada_acima_limite}</td>
                      <td className="p-2">{d.interjornada_violada}</td>
                      <td className="p-2">{d.intrajornada_violada}</td>
                      <td className="p-2"><Badge variant="destructive">{d.criticas}</Badge></td>
                      <td className="p-2"><Badge variant="outline">{d.pendentes}</Badge></td>
                      <td className="p-2 font-bold">{d.total_anomalias}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
