import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Car, User, LogOut, LogIn, TrendingUp, Clock, AlertTriangle,
  RefreshCw, Wrench, BarChart3, Users, Tag, ListChecks,
} from "lucide-react";

interface Stats {
  totalVehicles: number;
  totalDrivers: number;
  vehiclesOut: number;
  vehiclesInToday: number;
  kmToday: number;
  needOilChange: number;
  pendingDefects: number;
}

export default function CVDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    const thirtyDays = new Date(); thirtyDays.setDate(thirtyDays.getDate() - 30);
    const [v, d, mAll, defs] = await Promise.all([
      supabase.from("cv_vehicles").select("current_km, next_oil_change_km, active"),
      supabase.from("cv_drivers").select("id", { count: "exact", head: true }).eq("active", true),
      supabase.from("cv_vehicle_movements").select("status, entry_time, entry_km, exit_km").gte("created_at", thirtyDays.toISOString()),
      supabase.from("cv_defect_reports").select("id", { count: "exact", head: true }).neq("status", "resolved"),
    ]);
    const vehicles = (v.data ?? []) as any[];
    const movs = (mAll.data ?? []) as any[];
    const today = new Date().toDateString();
    setStats({
      totalVehicles: vehicles.filter(x => x.active).length,
      totalDrivers: d.count ?? 0,
      vehiclesOut: movs.filter(m => m.status === "out").length,
      vehiclesInToday: movs.filter(m => m.status === "returned" && m.entry_time && new Date(m.entry_time).toDateString() === today).length,
      kmToday: movs
        .filter(m => m.entry_time && new Date(m.entry_time).toDateString() === today)
        .reduce((s, m) => s + ((m.entry_km ?? 0) - (m.exit_km ?? 0)), 0),
      needOilChange: vehicles.filter(x => x.current_km >= x.next_oil_change_km).length,
      pendingDefects: 0,
    });
    setStats(prev => prev ? { ...prev, pendingDefects: defs.count ?? 0 } : prev);
    setLastUpdate(new Date());
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const refresh = async () => {
    await load();
    toast.success("Dashboard atualizado");
  };

  if (!stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
    );
  }

  const kpis = [
    { label: "Total de Veículos", value: stats.totalVehicles, sub: "Ativos na frota", icon: Car, color: "text-primary" },
    { label: "Total de Motoristas", value: stats.totalDrivers, sub: "Cadastrados", icon: User, color: "text-primary" },
    { label: "Veículos em Trânsito", value: stats.vehiclesOut, sub: "Fora da base", icon: LogOut, color: "text-amber-500" },
    { label: "Retornaram Hoje", value: stats.vehiclesInToday, sub: "Entradas do dia", icon: LogIn, color: "text-emerald-500" },
    { label: "KM Rodados Hoje", value: stats.kmToday.toLocaleString(), sub: "Quilômetros percorridos", icon: TrendingUp, color: "text-sky-500" },
    { label: "Manutenções Pendentes", value: stats.needOilChange, sub: "Troca de óleo vencida", icon: AlertTriangle, color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Painel da Frota</h2>
          <p className="text-sm text-muted-foreground">Visão geral em tempo real</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3.5 w-3.5" />
            {lastUpdate.toLocaleTimeString("pt-BR")}
          </Badge>
          <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {kpis.map(({ label, value, sub, icon: Icon, color }) => (
          <Card key={label} className="hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              <Icon className={`h-5 w-5 ${color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${color}`}>{value}</div>
              <p className="text-xs text-muted-foreground mt-1">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Ações Rápidas</CardTitle></CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <h3 className="font-semibold">Movimento de Veículos</h3>
            <p className="text-sm text-muted-foreground">Registre saídas e entradas rapidamente.</p>
            <div className="flex gap-2">
              <Button className="flex-1 bg-amber-500 hover:bg-amber-600 text-white" onClick={() => navigate("/controle-veiculos/saida")}>
                <LogOut className="h-4 w-4 mr-1" /> Registrar Saída
              </Button>
              <Button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => navigate("/controle-veiculos/entrada")}>
                <LogIn className="h-4 w-4 mr-1" /> Registrar Entrada
              </Button>
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="font-semibold">Gestão</h3>
            <p className="text-sm text-muted-foreground">Cadastros e análises operacionais.</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => navigate("/controle-veiculos/veiculos")}><Car className="h-4 w-4 mr-1" />Veículos</Button>
              <Button variant="outline" onClick={() => navigate("/controle-veiculos/motoristas")}><Users className="h-4 w-4 mr-1" />Motoristas</Button>
              <Button variant="outline" onClick={() => navigate("/controle-veiculos/defeitos")}>
                <AlertTriangle className="h-4 w-4 mr-1" />Defeitos
                {stats.pendingDefects > 0 && <Badge variant="destructive" className="ml-1">{stats.pendingDefects}</Badge>}
              </Button>
              <Button variant="outline" onClick={() => navigate("/controle-veiculos/manutencao")}><Wrench className="h-4 w-4 mr-1" />Análises</Button>
              <Button variant="outline" onClick={() => navigate("/controle-veiculos/movimentacoes")}><ListChecks className="h-4 w-4 mr-1" />Movimentações</Button>
              <Button variant="outline" onClick={() => navigate("/controle-veiculos/tipos-defeito")}><Tag className="h-4 w-4 mr-1" />Tipos de Defeito</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
