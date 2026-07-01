import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, Users, LogOut, AlertTriangle, Wrench, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Stats {
  totalVehicles: number;
  activeVehicles: number;
  totalDrivers: number;
  vehiclesOut: number;
  pendingDefects: number;
  needOilChange: number;
}

export default function CVDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    (async () => {
      const [v, d, m, def] = await Promise.all([
        supabase.from("cv_vehicles").select("id, active, current_km, next_oil_change_km"),
        supabase.from("cv_drivers").select("id", { count: "exact", head: true }),
        supabase.from("cv_vehicle_movements").select("id", { count: "exact", head: true }).eq("status", "out"),
        supabase.from("cv_defect_reports").select("id", { count: "exact", head: true }).neq("status", "resolved"),
      ]);
      const vehicles = (v.data ?? []) as any[];
      setStats({
        totalVehicles: vehicles.length,
        activeVehicles: vehicles.filter(x => x.active).length,
        totalDrivers: d.count ?? 0,
        vehiclesOut: m.count ?? 0,
        pendingDefects: def.count ?? 0,
        needOilChange: vehicles.filter(x => x.current_km >= x.next_oil_change_km).length,
      });
    })();
  }, []);

  if (!stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
    );
  }

  const cards = [
    { label: "Veículos Ativos", value: `${stats.activeVehicles} / ${stats.totalVehicles}`, icon: Truck },
    { label: "Motoristas", value: stats.totalDrivers, icon: Users },
    { label: "Fora da Base", value: stats.vehiclesOut, icon: LogOut },
    { label: "Defeitos Pendentes", value: stats.pendingDefects, icon: AlertTriangle },
    { label: "Troca de Óleo Vencida", value: stats.needOilChange, icon: Wrench },
    { label: "Frota Operacional", value: `${stats.totalVehicles - stats.vehiclesOut}`, icon: CheckCircle2 },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {cards.map(({ label, value, icon: Icon }) => (
        <Card key={label}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
