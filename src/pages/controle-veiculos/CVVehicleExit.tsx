import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type { Vehicle, Driver } from "@/types/vehicle";

export default function CVVehicleExit() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    vehicle_id: "", driver_id: "", exit_km: 0, exit_notes: "",
    has_helper: false, helper_name: "",
  });

  useEffect(() => {
    (async () => {
      const { data: outIds } = await supabase.from("cv_vehicle_movements").select("vehicle_id").eq("status", "out");
      const busyIds = new Set((outIds ?? []).map(x => x.vehicle_id));
      const { data: v } = await supabase.from("cv_vehicles").select("*").eq("active", true).order("name");
      const { data: d } = await supabase.from("cv_drivers").select("*").eq("active", true).order("name");
      setVehicles(((v ?? []) as Vehicle[]).filter(x => !busyIds.has(x.id)));
      setDrivers((d ?? []) as Driver[]);
    })();
  }, []);

  const vehicle = vehicles.find(v => v.id === form.vehicle_id);

  const submit = async () => {
    if (!form.vehicle_id || !form.driver_id) return toast.error("Selecione veículo e motorista");
    if (!form.exit_km || (vehicle && form.exit_km < vehicle.current_km)) {
      return toast.error("KM de saída inválido");
    }
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("cv_vehicle_movements").insert({
      vehicle_id: form.vehicle_id,
      driver_id: form.driver_id,
      exit_km: form.exit_km,
      exit_notes: form.exit_notes || null,
      has_helper: form.has_helper,
      helper_name: form.has_helper ? form.helper_name : null,
      status: "out",
      security_guard_id: user?.id ?? null,
    });
    if (!error && vehicle) {
      await supabase.from("cv_vehicles").update({ current_km: form.exit_km }).eq("id", vehicle.id);
    }
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Saída registrada");
    setForm({ vehicle_id: "", driver_id: "", exit_km: 0, exit_notes: "", has_helper: false, helper_name: "" });
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader><CardTitle>Registrar Saída de Veículo</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>Veículo</Label>
          <Select value={form.vehicle_id} onValueChange={v => {
            const veh = vehicles.find(x => x.id === v);
            setForm({ ...form, vehicle_id: v, exit_km: veh?.current_km ?? 0 });
          }}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.name} — {v.plate}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Motorista</Label>
          <Select value={form.driver_id} onValueChange={v => setForm({ ...form, driver_id: v })}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.name} — {d.license}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>KM de Saída {vehicle && <span className="text-muted-foreground text-xs">(atual: {vehicle.current_km})</span>}</Label>
          <Input type="number" value={form.exit_km} onChange={e => setForm({ ...form, exit_km: +e.target.value })} />
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={form.has_helper} onCheckedChange={v => setForm({ ...form, has_helper: v })} />
          <Label>Levar ajudante</Label>
        </div>
        {form.has_helper && (
          <div>
            <Label>Nome do ajudante</Label>
            <Input value={form.helper_name} onChange={e => setForm({ ...form, helper_name: e.target.value })} />
          </div>
        )}
        <div>
          <Label>Observações</Label>
          <Textarea value={form.exit_notes} onChange={e => setForm({ ...form, exit_notes: e.target.value })} />
        </div>
        <Button className="w-full" onClick={submit} disabled={busy}>Registrar Saída</Button>
      </CardContent>
    </Card>
  );
}
