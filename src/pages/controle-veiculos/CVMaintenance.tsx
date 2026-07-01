import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Wrench } from "lucide-react";
import type { Vehicle } from "@/types/vehicle";

export default function CVMaintenance() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [totals, setTotals] = useState<Record<string, { count: number; cost: number }>>({});

  const load = async () => {
    const { data: v } = await supabase.from("cv_vehicles").select("*").order("name");
    const { data: def } = await supabase.from("cv_defect_reports").select("vehicle_id, cost, status");
    const agg: Record<string, { count: number; cost: number }> = {};
    (def ?? []).forEach(d => {
      if (!agg[d.vehicle_id]) agg[d.vehicle_id] = { count: 0, cost: 0 };
      agg[d.vehicle_id].count += 1;
      agg[d.vehicle_id].cost += Number(d.cost ?? 0);
    });
    setVehicles((v ?? []) as Vehicle[]);
    setTotals(agg);
  };
  useEffect(() => { load(); }, []);

  const registerOilChange = async (v: Vehicle) => {
    if (!confirm(`Registrar troca de óleo com KM atual (${v.current_km})?`)) return;
    const next = v.current_km + v.oil_change_interval;
    const { error } = await supabase.from("cv_vehicles").update({
      last_oil_change_km: v.current_km, next_oil_change_km: next,
    }).eq("id", v.id);
    if (error) return toast.error(error.message);
    toast.success("Troca registrada"); load();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Análise de Manutenção</h2>
      <Card>
        <CardHeader><CardTitle className="text-base">Troca de Óleo</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Veículo</TableHead><TableHead>KM Atual</TableHead>
              <TableHead>Última</TableHead><TableHead>Próxima</TableHead>
              <TableHead>Faltam</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {vehicles.map(v => {
                const remaining = v.next_oil_change_km - v.current_km;
                const overdue = remaining <= 0;
                const warning = remaining > 0 && remaining <= 1000;
                return (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.name} — {v.plate}</TableCell>
                    <TableCell>{v.current_km.toLocaleString()}</TableCell>
                    <TableCell>{v.last_oil_change_km.toLocaleString()}</TableCell>
                    <TableCell>{v.next_oil_change_km.toLocaleString()}</TableCell>
                    <TableCell>
                      {overdue
                        ? <Badge variant="destructive">Vencida ({Math.abs(remaining)} km)</Badge>
                        : warning
                        ? <Badge variant="secondary">{remaining} km</Badge>
                        : <Badge variant="outline">{remaining} km</Badge>}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => registerOilChange(v)}>
                        <Wrench className="h-4 w-4 mr-1" />Registrar troca
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Custos por Veículo</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Veículo</TableHead><TableHead>Defeitos</TableHead><TableHead>Custo Total</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {vehicles.map(v => {
                const t = totals[v.id] ?? { count: 0, cost: 0 };
                return (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.name} — {v.plate}</TableCell>
                    <TableCell>{t.count}</TableCell>
                    <TableCell>R$ {t.cost.toFixed(2)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
