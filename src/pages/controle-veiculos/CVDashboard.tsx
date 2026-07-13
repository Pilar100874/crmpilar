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
  RefreshCw, Wrench, Users, Tag, ListChecks, Gauge,
} from "lucide-react";
import { CVPageHeader, CVKpiCard } from "./CVPageHeader";

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
      pendingDefects: defs.count ?? 0,
    });
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
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  const kpis: Array<Parameters<typeof CVKpiCard>[0]> = [
    { label: "Total de Veículos", value: stats.totalVehicles, sub: "Ativos na frota", icon: Car, tone: "primary" },
    { label: "Motoristas", value: stats.totalDrivers, sub: "Cadastrados", icon: User, tone: "info" },
    { label: "Em Trânsito", value: stats.vehiclesOut, sub: "Fora da base", icon: LogOut, tone: "warning" },
    { label: "Retornaram Hoje", value: stats.vehiclesInToday, sub: "Entradas do dia", icon: LogIn, tone: "success" },
    { label: "KM Rodados Hoje", value: stats.kmToday.toLocaleString(), sub: "Quilômetros percorridos", icon: Gauge, tone: "info" },
    { label: "Trocas de Óleo", value: stats.needOilChange, sub: "Vencidas ou próximas", icon: AlertTriangle, tone: "destructive" },
    { label: "Defeitos Pendentes", value: stats.pendingDefects, sub: "Aguardando resolução", icon: Wrench, tone: "warning" },
  ];

  return (
    <div className="space-y-5">
      <CVPageHeader
        icon={TrendingUp}
        title="Painel da Frota"
        subtitle="Visão geral em tempo real"
        actions={
          <>
            <Badge variant="secondary" className="gap-1 bg-white/20 text-white ring-1 ring-white/30 hover:bg-white/30">
              <Clock className="h-3.5 w-3.5" />
              {lastUpdate.toLocaleTimeString("pt-BR")}
            </Badge>
            <Button
              variant="secondary"
              size="sm"
              onClick={refresh}
              disabled={refreshing}
              className="bg-white/20 text-white ring-1 ring-white/30 hover:bg-white/30"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </>
        }
      />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {kpis.map(k => <CVKpiCard key={k.label} {...k} />)}
      </div>

      <Card className="overflow-hidden border-2 border-primary/20 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ListChecks className="h-5 w-5 text-primary" />
            Movimento de Veículos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground mb-4 text-center">
            Registre a saída ou entrada do veículo com apenas um clique.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button
              className="h-28 sm:h-32 flex-col gap-2 bg-amber-500 hover:bg-amber-600 text-white text-lg font-semibold shadow-md hover:shadow-xl transition-all"
              onClick={() => navigate("/controle-veiculos/saida")}
            >
              <LogOut className="h-10 w-10" />
              Registrar Saída
            </Button>
            <Button
              className="h-28 sm:h-32 flex-col gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-lg font-semibold shadow-md hover:shadow-xl transition-all"
              onClick={() => navigate("/controle-veiculos/entrada")}
            >
              <LogIn className="h-10 w-10" />
              Registrar Entrada
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
