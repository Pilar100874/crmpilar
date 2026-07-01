import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Wrench, BarChart3, TrendingUp, DollarSign, Droplets, AlertTriangle, CheckCircle } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import type { Vehicle } from "@/types/vehicle";

const COLORS = ["hsl(var(--primary))", "#f59e0b", "#10b981", "#3b82f6", "#ec4899", "#8b5cf6"];

export default function CVMaintenance() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [defects, setDefects] = useState<any[]>([]);
  const [vehicleFilter, setVehicleFilter] = useState("all");

  const load = async () => {
    const [v, d] = await Promise.all([
      supabase.from("cv_vehicles").select("*").order("name"),
      supabase.from("cv_defect_reports").select("vehicle_id, cost, status, resolved_at, reported_at"),
    ]);
    setVehicles((v.data ?? []) as Vehicle[]);
    setDefects(d.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const registerOilChange = async (v: Vehicle) => {
    if (!confirm(`Registrar troca de óleo com KM atual (${v.current_km.toLocaleString()})?`)) return;
    const next = v.current_km + v.oil_change_interval;
    const { error } = await supabase.from("cv_vehicles").update({
      last_oil_change_km: v.current_km, next_oil_change_km: next,
    }).eq("id", v.id);
    if (error) return toast.error(error.message);
    toast.success("Troca registrada"); load();
  };

  const resolved = useMemo(
    () => defects.filter(d => d.status === "resolved" && d.cost && (vehicleFilter === "all" || d.vehicle_id === vehicleFilter)),
    [defects, vehicleFilter],
  );

  const byVehicle = useMemo(() =>
    vehicles.map(v => {
      const list = resolved.filter(d => d.vehicle_id === v.id);
      return {
        name: v.name, plate: v.plate,
        totalCost: list.reduce((s, d) => s + Number(d.cost ?? 0), 0),
        count: list.length,
      };
    }).filter(x => x.count > 0),
    [vehicles, resolved]
  );

  const monthly = useMemo(() => {
    const months: { month: string; totalCost: number; count: number; date: Date }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
        totalCost: 0, count: 0, date: d,
      });
    }
    resolved.forEach(d => {
      if (!d.resolved_at) return;
      const dt = new Date(d.resolved_at);
      const m = months.find(x => x.date.getFullYear() === dt.getFullYear() && x.date.getMonth() === dt.getMonth());
      if (m) { m.totalCost += Number(d.cost ?? 0); m.count += 1; }
    });
    return months;
  }, [resolved]);

  const totalCost = resolved.reduce((s, d) => s + Number(d.cost ?? 0), 0);
  const total = resolved.length;
  const avg = total > 0 ? totalCost / total : 0;
  const maxVehicle = byVehicle.reduce((max, cur) => cur.totalCost > max.totalCost ? cur : max, { name: "-", plate: "-", totalCost: 0 });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-7 w-7 text-primary" />
        <div>
          <h2 className="text-xl font-semibold">Análise de Manutenção</h2>
          <p className="text-sm text-muted-foreground">Custos, tendências e trocas de óleo</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Filtrar por veículo</CardTitle></CardHeader>
        <CardContent>
          <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
            <SelectTrigger className="max-w-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os veículos</SelectItem>
              {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.name} — {v.plate}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4">
          <div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">Gasto Total</span><DollarSign className="h-4 w-4 text-primary" /></div>
          <div className="text-2xl font-bold text-primary">R$ {totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">Total de Reparos</span><Wrench className="h-4 w-4 text-amber-500" /></div>
          <div className="text-2xl font-bold text-amber-500">{total}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">Custo Médio</span><TrendingUp className="h-4 w-4 text-emerald-500" /></div>
          <div className="text-2xl font-bold text-emerald-500">R$ {avg.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">Maior Gasto</span><AlertTriangle className="h-4 w-4 text-destructive" /></div>
          <div className="text-2xl font-bold text-destructive">R$ {maxVehicle.totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
          <p className="text-xs text-muted-foreground mt-1">{maxVehicle.name}</p>
        </CardContent></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" />Gasto por Veículo</CardTitle></CardHeader>
          <CardContent>
            {byVehicle.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={byVehicle}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="plate" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `R$${v}`} />
                  <Tooltip formatter={(v: number) => [`R$ ${v.toFixed(2)}`, "Custo"]} />
                  <Bar dataKey="totalCost" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" />Distribuição de Custos</CardTitle></CardHeader>
          <CardContent>
            {byVehicle.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={byVehicle} dataKey="totalCost" nameKey="plate" outerRadius={90} label>
                    {byVehicle.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" />Evolução Mensal (12 meses)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `R$${v}`} />
              <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
              <Line type="monotone" dataKey="totalCost" stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Droplets className="h-4 w-4" />Troca de Óleo</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map(v => {
            const remaining = v.next_oil_change_km - v.current_km;
            const overdue = remaining <= 0;
            const near = remaining > 0 && remaining <= 1000;
            return (
              <Card key={v.id} className="border">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{v.name}</div>
                    <Badge variant="outline" className="font-mono text-xs">{v.plate}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">KM atual: {v.current_km.toLocaleString()} • Próx: {v.next_oil_change_km.toLocaleString()}</div>
                  {overdue
                    ? <Badge variant="destructive" className="w-full justify-center gap-1"><AlertTriangle className="h-3 w-3" />Vencida em {Math.abs(remaining).toLocaleString()} km</Badge>
                    : near
                    ? <Badge variant="outline" className="w-full justify-center border-amber-500 text-amber-500">Faltam {remaining.toLocaleString()} km</Badge>
                    : <Badge variant="outline" className="w-full justify-center border-emerald-500 text-emerald-500 gap-1"><CheckCircle className="h-3 w-3" />Em dia ({remaining.toLocaleString()} km)</Badge>}
                  <Button size="sm" variant="outline" className="w-full" onClick={() => registerOilChange(v)}>
                    <Wrench className="h-4 w-4 mr-1" />Registrar troca
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
