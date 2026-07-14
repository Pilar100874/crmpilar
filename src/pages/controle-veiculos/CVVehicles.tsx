import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Car, Gauge, Droplets,
  AlertTriangle, CheckCircle, ToggleLeft, ToggleRight, Search, Truck,
} from "lucide-react";
import { CVPageHeader } from "./CVPageHeader";
import type { Vehicle, VehicleType } from "@/types/vehicle";

const TYPES: { value: VehicleType; label: string }[] = [
  { value: "carro", label: "Carro" }, { value: "vuc", label: "VUC" },
  { value: "truck", label: "Truck" }, { value: "carreta", label: "Carreta" },
  { value: "outro", label: "Outro" },
];
const empty = {
  name: "", plate: "", vehicle_type: "carro" as VehicleType,
  current_km: 0, oil_change_interval: 10000, last_oil_change_km: 0, active: true,
  veiculo_id: null as string | null,
};

interface LogVeic { id: string; placa: string; descricao: string | null }

export default function CVVehicles() {
  const [rows, setRows] = useState<Vehicle[]>([]);
  const [logVeiculos, setLogVeiculos] = useState<LogVeic[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [editing, setEditing] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase.from("cv_vehicles").select("*").order("name");
    if (error) return toast.error(error.message);
    setRows((data ?? []) as Vehicle[]);
    const { data: vs } = await supabase.from("veiculos").select("id, placa, descricao").eq("ativo", true).order("placa");
    setLogVeiculos((vs ?? []) as LogVeic[]);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(empty); setEditing(null); setOpen(true); };
  const openEdit = (v: Vehicle) => {
    setForm({
      name: v.name, plate: v.plate, vehicle_type: v.vehicle_type,
      current_km: v.current_km, oil_change_interval: v.oil_change_interval,
      last_oil_change_km: v.last_oil_change_km, active: v.active,
      veiculo_id: (v as any).veiculo_id ?? null,
    });
    setEditing(v.id); setOpen(true);
  };
  const save = async () => {
    if (!form.name || !form.plate) return toast.error("Nome e placa são obrigatórios");
    const next_oil_change_km = Number(form.last_oil_change_km) + Number(form.oil_change_interval);
    const payload: any = { ...form, next_oil_change_km, plate: String(form.plate).toUpperCase() };
    if (!editing) {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: u } = await supabase.from("usuarios").select("estabelecimento_id").eq("auth_user_id", user?.id).maybeSingle();
      if (!u?.estabelecimento_id) return toast.error("Usuário sem estabelecimento vinculado");
      payload.estabelecimento_id = u.estabelecimento_id;
    }
    const { error } = editing
      ? await supabase.from("cv_vehicles").update(payload).eq("id", editing)
      : await supabase.from("cv_vehicles").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Salvo"); setOpen(false); load();
  };
  const remove = async (id: string) => {
    if (!confirm("Excluir veículo?")) return;
    const { error } = await supabase.from("cv_vehicles").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Excluído"); load();
  };
  const toggle = async (v: Vehicle) => {
    await supabase.from("cv_vehicles").update({ active: !v.active }).eq("id", v.id);
    load();
  };

  const filtered = rows.filter(v =>
    !q || v.name.toLowerCase().includes(q.toLowerCase()) || v.plate.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <CVPageHeader
        icon={Truck}
        title="Veículos"
        subtitle={`${rows.length} cadastrados • ${rows.filter(r => r.active).length} ativos`}
        actions={
          <Button onClick={openNew} className="bg-white text-primary hover:bg-white/90">
            <Plus className="h-4 w-4 mr-1" />Novo Veículo
          </Button>
        }
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar nome ou placa..." value={q} onChange={e => setQ(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <Car className="h-12 w-12 mx-auto mb-3 opacity-40" />
          Nenhum veículo encontrado.
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(v => {
            const km = v.next_oil_change_km - v.current_km;
            const overdue = km <= 0;
            const near = km > 0 && km <= 1000;
            return (
              <Card key={v.id} className="hover:shadow-lg transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Car className="h-5 w-5 text-primary" />
                      {v.name}
                    </CardTitle>
                    <div className="flex gap-0.5">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(v)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggle(v)}>
                        {v.active ? <ToggleRight className="h-4 w-4 text-emerald-500" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(v.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Placa</span>
                    <Badge variant="outline" className="font-mono">{v.plate}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Tipo</span>
                    <span>{TYPES.find(t => t.value === v.vehicle_type)?.label}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1"><Gauge className="h-4 w-4" />KM Atual</span>
                    <span className="font-semibold text-primary">{v.current_km.toLocaleString()} km</span>
                  </div>
                  <div className="space-y-1.5 pt-2 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1"><Droplets className="h-4 w-4" />Troca de Óleo</span>
                      {overdue ? (
                        <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Vencida</Badge>
                      ) : near ? (
                        <Badge variant="outline" className="gap-1 border-amber-500 text-amber-500"><AlertTriangle className="h-3 w-3" />Próxima</Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 border-emerald-500 text-emerald-500"><CheckCircle className="h-3 w-3" />Em dia</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {overdue
                        ? <span className="text-destructive">Atrasada em {Math.abs(km).toLocaleString()} km</span>
                        : <>Próxima em {km.toLocaleString()} km ({v.next_oil_change_km.toLocaleString()} km)</>}
                    </p>
                  </div>
                  {!v.active && <Badge variant="secondary" className="w-full justify-center">Inativo</Badge>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar Veículo" : "Novo Veículo"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Placa</Label><Input value={form.plate} onChange={e => setForm({ ...form, plate: e.target.value.toUpperCase() })} /></div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.vehicle_type} onValueChange={v => setForm({ ...form, vehicle_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><Label>KM Atual</Label><Input type="number" value={form.current_km} onChange={e => setForm({ ...form, current_km: +e.target.value })} /></div>
              <div><Label>Última Troca (km)</Label><Input type="number" value={form.last_oil_change_km} onChange={e => setForm({ ...form, last_oil_change_km: +e.target.value })} /></div>
              <div><Label>Intervalo (km)</Label><Input type="number" value={form.oil_change_interval} onChange={e => setForm({ ...form, oil_change_interval: +e.target.value })} /></div>
            </div>
            <div>
              <Label>Vincular ao veículo da Logística (opcional)</Label>
              <Select
                value={form.veiculo_id ?? "__none__"}
                onValueChange={v => setForm({ ...form, veiculo_id: v === "__none__" ? null : v })}
              >
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {logVeiculos.map(lv => (
                    <SelectItem key={lv.id} value={lv.id}>
                      {lv.placa}{lv.descricao ? ` — ${lv.descricao}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Usado no monitoramento da Logística para exibir motorista e WhatsApp em tempo real.
              </p>
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
