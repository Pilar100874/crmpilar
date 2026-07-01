import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { format, subDays, startOfDay, endOfDay, startOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Wrench, BarChart3, TrendingUp, DollarSign, Droplets, AlertTriangle, CheckCircle, CalendarIcon } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { CVPageHeader, CVKpiCard } from "./CVPageHeader";
import type { Vehicle } from "@/types/vehicle";

const COLORS = ["hsl(var(--primary))", "#f59e0b", "#10b981", "#3b82f6", "#ec4899", "#8b5cf6"];

type PeriodFilter = "30" | "60" | "90" | "year" | "all" | "custom";

export default function CVMaintenance() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [defects, setDefects] = useState<any[]>([]);
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("30");
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);

  const load = async () => {
    const [v, d] = await Promise.all([
      supabase.from("cv_vehicles").select("*").order("name"),
      supabase.from("cv_defect_reports").select("vehicle_id, cost, status, resolved_at, reported_at"),
    ]);
    setVehicles((v.data ?? []) as Vehicle[]);
    setDefects(d.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const periodBounds = useMemo(() => {
    const now = new Date();
    switch (periodFilter) {
      case "30": return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
      case "60": return { start: startOfDay(subDays(now, 60)), end: endOfDay(now) };
      case "90": return { start: startOfDay(subDays(now, 90)), end: endOfDay(now) };
      case "year": return { start: startOfDay(startOfYear(now)), end: endOfDay(now) };
      case "all": return { start: null, end: null };
      case "custom": {
        if (!customDate) return { start: null, end: null };
        return { start: startOfDay(customDate), end: endOfDay(customDate) };
      }
    }
  }, [periodFilter, customDate]);

  const isWithinPeriod = (dateStr: string | null) => {
    if (!dateStr) return false;
    const dt = new Date(dateStr);
    if (periodBounds.start && dt < periodBounds.start) return false;
    if (periodBounds.end && dt > periodBounds.end) return false;
    return true;
  };

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
    () => defects.filter(d =>
      d.status === "resolved" &&
      d.cost &&
      (vehicleFilter === "all" || d.vehicle_id === vehicleFilter) &&
      isWithinPeriod(d.resolved_at)
    ),
    [defects, vehicleFilter, periodBounds],
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
    if (periodFilter === "custom" && customDate) {
      const label = format(customDate, "dd/MM/yyyy", { locale: ptBR });
      const dayCost = resolved.reduce((s, d) => s + Number(d.cost ?? 0), 0);
      const dayCount = resolved.length;
      return [{ month: label, totalCost: dayCost, count: dayCount, date: customDate }];
    }

    const months: { month: string; totalCost: number; count: number; date: Date }[] = [];
    const now = new Date();
    const count = periodFilter === "year" ? 12 :
                  periodFilter === "all" ? 12 :
                  periodFilter === "90" ? 3 :
                  periodFilter === "60" ? 2 : 1;

    for (let i = count - 1; i >= 0; i--) {
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
  }, [resolved, periodFilter, customDate]);

  const totalCost = resolved.reduce((s, d) => s + Number(d.cost ?? 0), 0);
  const total = resolved.length;
  const avg = total > 0 ? totalCost / total : 0;
  const maxVehicle = byVehicle.reduce((max, cur) => cur.totalCost > max.totalCost ? cur : max, { name: "-", plate: "-", totalCost: 0 });

  return (
    <div className="space-y-4">
      <CVPageHeader
        icon={BarChart3}
        title="Análise de Manutenção"
        subtitle="Custos, tendências e trocas de óleo"
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3">
          <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
            <SelectTrigger className="max-w-sm"><SelectValue placeholder="Veículo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os veículos</SelectItem>
              {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.name} — {v.plate}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={periodFilter} onValueChange={(v) => { setPeriodFilter(v as PeriodFilter); if (v !== "custom") setCustomDate(undefined); }}>
            <SelectTrigger className="max-w-sm"><SelectValue placeholder="Período" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="60">Últimos 60 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="year">Este ano</SelectItem>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="custom">Data específica</SelectItem>
            </SelectContent>
          </Select>

          {periodFilter === "custom" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("max-w-sm justify-start text-left font-normal", !customDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customDate ? format(customDate, "dd/MM/yyyy", { locale: ptBR }) : <span>Selecione a data</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customDate} onSelect={setCustomDate} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <CVKpiCard label="Gasto Total" value={`R$ ${totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} icon={DollarSign} tone="primary" />
        <CVKpiCard label="Total de Reparos" value={total} icon={Wrench} tone="warning" />
        <CVKpiCard label="Custo Médio" value={`R$ ${avg.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} icon={TrendingUp} tone="success" />
        <CVKpiCard label="Maior Gasto" value={`R$ ${maxVehicle.totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} sub={maxVehicle.name} icon={AlertTriangle} tone="destructive" />
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
