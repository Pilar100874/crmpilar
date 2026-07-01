import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Vehicle, VehicleType } from "@/types/vehicle";

const TYPES: { value: VehicleType; label: string }[] = [
  { value: "carro", label: "Carro" },
  { value: "vuc", label: "VUC" },
  { value: "truck", label: "Truck" },
  { value: "carreta", label: "Carreta" },
  { value: "outro", label: "Outro" },
];

const empty = {
  name: "", plate: "", vehicle_type: "carro" as VehicleType,
  current_km: 0, oil_change_interval: 10000, last_oil_change_km: 0, active: true,
};

export default function CVVehicles() {
  const [rows, setRows] = useState<Vehicle[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [editing, setEditing] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase.from("cv_vehicles").select("*").order("name");
    if (error) return toast.error(error.message);
    setRows((data ?? []) as Vehicle[]);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(empty); setEditing(null); setOpen(true); };
  const openEdit = (v: Vehicle) => {
    setForm({
      name: v.name, plate: v.plate, vehicle_type: v.vehicle_type,
      current_km: v.current_km, oil_change_interval: v.oil_change_interval,
      last_oil_change_km: v.last_oil_change_km, active: v.active,
    });
    setEditing(v.id); setOpen(true);
  };

  const save = async () => {
    if (!form.name || !form.plate) return toast.error("Nome e placa são obrigatórios");
    const next_oil_change_km = Number(form.last_oil_change_km) + Number(form.oil_change_interval);
    const payload = { ...form, next_oil_change_km, plate: String(form.plate).toUpperCase() };
    const { error } = editing
      ? await supabase.from("cv_vehicles").update(payload).eq("id", editing)
      : await supabase.from("cv_vehicles").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Salvo");
    setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir veículo?")) return;
    const { error } = await supabase.from("cv_vehicles").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Excluído"); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Veículos</h2>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Novo</Button>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead><TableHead>Placa</TableHead><TableHead>Tipo</TableHead>
              <TableHead>KM Atual</TableHead><TableHead>Próx. Óleo</TableHead>
              <TableHead>Status</TableHead><TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(v => {
              const alert = v.current_km >= v.next_oil_change_km;
              return (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.name}</TableCell>
                  <TableCell><Badge variant="outline">{v.plate}</Badge></TableCell>
                  <TableCell>{TYPES.find(t => t.value === v.vehicle_type)?.label}</TableCell>
                  <TableCell>{v.current_km.toLocaleString()} km</TableCell>
                  <TableCell>
                    <span className={alert ? "text-destructive font-semibold" : ""}>
                      {v.next_oil_change_km.toLocaleString()} km
                    </span>
                  </TableCell>
                  <TableCell>{v.active ? <Badge>Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(v)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(v.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum veículo cadastrado</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar Veículo" : "Novo Veículo"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Placa</Label><Input value={form.plate} onChange={e => setForm({ ...form, plate: e.target.value.toUpperCase() })} /></div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.vehicle_type} onValueChange={v => setForm({ ...form, vehicle_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>KM Atual</Label><Input type="number" value={form.current_km} onChange={e => setForm({ ...form, current_km: +e.target.value })} /></div>
              <div><Label>Última Troca (km)</Label><Input type="number" value={form.last_oil_change_km} onChange={e => setForm({ ...form, last_oil_change_km: +e.target.value })} /></div>
              <div><Label>Intervalo (km)</Label><Input type="number" value={form.oil_change_interval} onChange={e => setForm({ ...form, oil_change_interval: +e.target.value })} /></div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={v => setForm({ ...form, active: v })} />
              <Label>Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
