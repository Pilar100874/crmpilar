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
import type { VehicleMovement } from "@/types/vehicle";

export default function CVVehicleEntry() {
  const [openMoves, setOpenMoves] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [form, setForm] = useState({
    entry_km: 0, reported_defects: "", damage_notes: "", inspected_all_sides: false,
  });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("cv_vehicle_movements")
      .select("*, vehicle:cv_vehicles(*), driver:cv_drivers(*)")
      .eq("status", "out").order("exit_time", { ascending: false });
    setOpenMoves(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const move = openMoves.find(m => m.id === selected);

  const submit = async () => {
    if (!move) return toast.error("Selecione a saída");
    if (form.entry_km < move.exit_km) return toast.error("KM de entrada deve ser >= KM de saída");
    if (!form.inspected_all_sides) return toast.error("Confirme a inspeção nos 4 lados");
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("cv_vehicle_movements").update({
      status: "returned",
      entry_time: new Date().toISOString(),
      entry_km: form.entry_km,
      reported_defects: form.reported_defects || null,
      damage_notes: form.damage_notes || null,
      inspected_all_sides: true,
      inspected_by: user?.id ?? null,
      resolved_at: new Date().toISOString(),
    }).eq("id", move.id);
    if (!error) {
      await supabase.from("cv_vehicles").update({ current_km: form.entry_km }).eq("id", move.vehicle_id);
      if (form.reported_defects) {
        await supabase.from("cv_defect_reports").insert({
          vehicle_id: move.vehicle_id,
          driver_id: move.driver_id,
          movement_id: move.id,
          defect_description: form.reported_defects,
          reported_by: user?.id ?? null,
          status: "pending",
          is_damage_report: !!form.damage_notes,
        });
      }
    }
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Entrada registrada");
    setSelected(""); setForm({ entry_km: 0, reported_defects: "", damage_notes: "", inspected_all_sides: false });
    load();
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader><CardTitle>Registrar Entrada de Veículo</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>Saída em aberto</Label>
          <Select value={selected} onValueChange={v => {
            setSelected(v);
            const m = openMoves.find(x => x.id === v);
            setForm(f => ({ ...f, entry_km: m?.exit_km ?? 0 }));
          }}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {openMoves.map(m => (
                <SelectItem key={m.id} value={m.id}>
                  {m.vehicle?.name} ({m.vehicle?.plate}) — {m.driver?.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {move && (
          <>
            <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
              Saída em {new Date(move.exit_time).toLocaleString()} • KM saída: {move.exit_km}
            </div>
            <div>
              <Label>KM de Entrada</Label>
              <Input type="number" value={form.entry_km} onChange={e => setForm({ ...form, entry_km: +e.target.value })} />
            </div>
            <div>
              <Label>Defeitos reportados</Label>
              <Textarea value={form.reported_defects} onChange={e => setForm({ ...form, reported_defects: e.target.value })} placeholder="Descreva se houver" />
            </div>
            <div>
              <Label>Avarias visíveis</Label>
              <Textarea value={form.damage_notes} onChange={e => setForm({ ...form, damage_notes: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.inspected_all_sides} onCheckedChange={v => setForm({ ...form, inspected_all_sides: v })} />
              <Label>Confirmo que inspecionei os 4 lados</Label>
            </div>
            <Button className="w-full" onClick={submit} disabled={busy}>Registrar Entrada</Button>
          </>
        )}
        {!move && openMoves.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma saída em aberto.</p>
        )}
      </CardContent>
    </Card>
  );
}
