import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, BarChart3, Package, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const tipoLabel: Record<string, string> = {
  pacotes_graficos: "Pacotes Gráficos",
  caixas: "Caixas",
  fardos: "Fardos",
  generico: "Genérico",
};

const ContagemDashboard = () => {
  const navigate = useNavigate();
  const [contagens, setContagens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const estabId = await getEstabelecimentoId();
      if (!estabId) { setLoading(false); return; }
      const { data } = await supabase
        .from("contagens")
        .select("*")
        .eq("estabelecimento_id", estabId)
        .order("created_at", { ascending: false })
        .limit(100);
      setContagens(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const stats = useMemo(() => {
    const total = contagens.length;
    const totalObjetos = contagens.reduce((s: number, c: any) => s + (c.quantidade_detectada || 0), 0);
    const divergentes = contagens.filter((c: any) => c.divergencia).length;
    const taxaDivergencia = total > 0 ? ((divergentes / total) * 100).toFixed(1) : "0";
    return { total, totalObjetos, divergentes, taxaDivergencia };
  }, [contagens]);

  const chartData = useMemo(() => {
    const byDay: Record<string, number> = {};
    contagens.forEach((c: any) => {
      const day = format(new Date(c.created_at), "dd/MM");
      byDay[day] = (byDay[day] || 0) + (c.quantidade_detectada || 0);
    });
    return Object.entries(byDay).slice(-7).map(([dia, total]) => ({ dia, total }));
  }, [contagens]);

  const ultimasContagens = contagens.slice(0, 5);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contagem Inteligente</h1>
          <p className="text-muted-foreground text-sm">Contagem automática de volumes por IA</p>
        </div>
        <Button onClick={() => navigate("/contagem/nova")} size="lg" className="gap-2 w-full sm:w-auto">
          <Camera className="w-5 h-5" /> Nova Contagem
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: BarChart3, label: "Total Análises", value: stats.total, color: "text-primary", bg: "bg-primary/10" },
          { icon: Package, label: "Objetos Contados", value: stats.totalObjetos, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { icon: AlertTriangle, label: "Divergências", value: stats.divergentes, color: "text-amber-500", bg: "bg-amber-500/10" },
          { icon: TrendingUp, label: "Taxa Divergência", value: `${stats.taxaDivergencia}%`, color: "text-blue-500", bg: "bg-blue-500/10" },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${s.bg}`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-xl font-bold">{s.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Contagens por Dia</CardTitle></CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="dia" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Nenhuma contagem realizada</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Últimas Análises</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {ultimasContagens.length > 0 ? ultimasContagens.map((c: any) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                onClick={() => navigate(`/contagem/detalhe/${c.id}`)}
              >
                <div className="flex items-center gap-3">
                  {c.divergencia ? <AlertTriangle className="w-4 h-4 text-amber-500" /> : <CheckCircle className="w-4 h-4 text-emerald-500" />}
                  <div>
                    <p className="text-sm font-medium">{tipoLabel[c.tipo_objeto] || c.tipo_objeto}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(c.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                  </div>
                </div>
                <span className="text-lg font-bold">{c.quantidade_detectada}</span>
              </div>
            )) : (
              <div className="text-center text-muted-foreground text-sm py-8">Nenhuma análise encontrada</div>
            )}
            {contagens.length > 5 && (
              <Button variant="ghost" className="w-full" onClick={() => navigate("/contagem/historico")}>Ver Histórico Completo</Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ContagemDashboard;
