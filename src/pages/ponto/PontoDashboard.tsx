import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Clock, UserX, Calendar, Wallet, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePontoEmpresa } from "./usePontoEmpresa";

type Stat = { label: string; value: string | number; icon: any; tone?: string };

export default function PontoDashboard() {
  const { empresaId } = usePontoEmpresa();
  const [stats, setStats] = useState({
    pendencias: 0,
    extras: 0,
    faltas: 0,
    atrasos: 0,
    banco: 0,
    alertas: 0,
  });

  useEffect(() => {
    if (!empresaId) return;
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [funcsRes, ajustesRes, alertasRes, espelhoRes] = await Promise.all([
        supabase.from("ponto_funcionarios").select("id", { count: "exact", head: true }).eq("empresa_id", empresaId).eq("status", "ativo"),
        supabase.from("ponto_ajustes").select("id", { count: "exact", head: true }).eq("status", "pendente"),
        supabase.from("ponto_alertas").select("id", { count: "exact", head: true }).eq("empresa_id", empresaId).eq("resolvido", false),
        supabase.from("ponto_espelho_diario").select("atraso_min, extra_min, falta, saldo_banco_min").eq("data", today),
      ]);
      const espelho = (espelhoRes.data || []) as any[];
      setStats({
        pendencias: ajustesRes.count || 0,
        extras: espelho.reduce((s, r) => s + (r.extra_min || 0), 0),
        faltas: espelho.filter((r) => r.falta).length,
        atrasos: espelho.filter((r) => (r.atraso_min || 0) > 0).length,
        banco: espelho.reduce((s, r) => s + (r.saldo_banco_min || 0), 0),
        alertas: alertasRes.count || 0,
      });
    })();
  }, [empresaId]);

  const fmt = (m: number) => {
    const h = Math.floor(Math.abs(m) / 60);
    const mm = Math.abs(m) % 60;
    return `${m < 0 ? "-" : ""}${h}h${String(mm).padStart(2, "0")}`;
  };

  const cards: Stat[] = [
    { label: "Pendências de ajuste", value: stats.pendencias, icon: Clock },
    { label: "Horas extras hoje", value: fmt(stats.extras), icon: Wallet },
    { label: "Faltas hoje", value: stats.faltas, icon: UserX, tone: "text-destructive" },
    { label: "Atrasos hoje", value: stats.atrasos, icon: Calendar },
    { label: "Saldo banco (dia)", value: fmt(stats.banco), icon: Wallet },
    { label: "Alertas antifraude abertos", value: stats.alertas, icon: Shield, tone: "text-destructive" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold sm:text-2xl">Dashboard RH</h2>
        <p className="text-sm text-muted-foreground">Visão geral do dia</p>
      </div>
      {!empresaId ? (
        <Card>
          <CardContent className="flex items-center gap-3 py-8">
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Cadastre uma empresa em <strong>Empresas</strong> para começar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {cards.map((c, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {c.label}
                </CardTitle>
                <c.icon className={`h-4 w-4 ${c.tone ?? "text-muted-foreground"}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-xl font-bold sm:text-2xl ${c.tone ?? ""}`}>
                  {c.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
