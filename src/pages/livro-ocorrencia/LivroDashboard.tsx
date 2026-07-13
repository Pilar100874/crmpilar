import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ShieldAlert, Package, AlertTriangle, CheckCircle2, Clock, Plus } from "lucide-react";

export default function LivroDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    ocorrenciasAbertas: 0,
    ocorrenciasHoje: 0,
    ocorrenciasGraves: 0,
    encomendasAguardando: 0,
    encomendasHoje: 0,
    encomendasEntregues: 0,
  });

  useEffect(() => {
    (async () => {
      const hoje = new Date(); hoje.setHours(0,0,0,0);
      const [oAbertas, oHoje, oGraves, eAguard, eHoje, eEntreg] = await Promise.all([
        supabase.from("livro_ocorrencias" as any).select("id", { count: "exact", head: true }).eq("status", "aberta"),
        supabase.from("livro_ocorrencias" as any).select("id", { count: "exact", head: true }).gte("data_hora", hoje.toISOString()),
        supabase.from("livro_ocorrencias" as any).select("id", { count: "exact", head: true }).in("gravidade", ["alta", "critica"]).eq("status", "aberta"),
        supabase.from("livro_encomendas" as any).select("id", { count: "exact", head: true }).eq("status", "aguardando_retirada"),
        supabase.from("livro_encomendas" as any).select("id", { count: "exact", head: true }).gte("data_recebimento", hoje.toISOString()),
        supabase.from("livro_encomendas" as any).select("id", { count: "exact", head: true }).eq("status", "entregue"),
      ]);
      setStats({
        ocorrenciasAbertas: oAbertas.count || 0,
        ocorrenciasHoje: oHoje.count || 0,
        ocorrenciasGraves: oGraves.count || 0,
        encomendasAguardando: eAguard.count || 0,
        encomendasHoje: eHoje.count || 0,
        encomendasEntregues: eEntreg.count || 0,
      });
    })();
  }, []);

  const cards = [
    { title: "Ocorrências Abertas", value: stats.ocorrenciasAbertas, icon: ShieldAlert, color: "text-orange-500", bg: "bg-orange-500/10" },
    { title: "Ocorrências Hoje", value: stats.ocorrenciasHoje, icon: Clock, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Graves em Aberto", value: stats.ocorrenciasGraves, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10" },
    { title: "Encomendas Aguardando", value: stats.encomendasAguardando, icon: Package, color: "text-amber-500", bg: "bg-amber-500/10" },
    { title: "Recebidas Hoje", value: stats.encomendasHoje, icon: Clock, color: "text-cyan-500", bg: "bg-cyan-500/10" },
    { title: "Entregues", value: stats.encomendasEntregues, icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => navigate("/livro-ocorrencia/ocorrencias?new=1")} className="gap-2">
          <Plus className="h-4 w-4" /> Nova Ocorrência
        </Button>
        <Button variant="outline" onClick={() => navigate("/livro-ocorrencia/encomendas?new=1")} className="gap-2">
          <Plus className="h-4 w-4" /> Nova Encomenda
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.title} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
                <div className={`p-2 rounded-lg ${c.bg}`}>
                  <Icon className={`h-4 w-4 ${c.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{c.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
