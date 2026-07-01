import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus, CheckCircle2, AlertTriangle, Search, Clock, Wrench, DollarSign, Trash2, Car,
} from "lucide-react";
import type { Vehicle, DefectType, DefectStatus } from "@/types/vehicle";

const STATUS_LABEL: Record<DefectStatus, string> = {
  pending: "Pendente", in_progress: "Em Andamento", resolved: "Resolvido",
};

export default function CVDefects() {
  const [rows, setRows] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [types, setTypes] = useState<DefectType[]>([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState<any | null>(null);
  const [form, setForm] = useState({ vehicle_id: "", defect_type_id: "", defect_description: "" });
  const [resolveForm, setResolveForm] = useState({ solution: "", cost: 0, validated_by: "" });

  const load = async () => {
    const { data } = await supabase.from("cv_defect_reports")
      .select("*, vehicle:cv_vehicles(name, plate), defect_type:cv_defect_types(name, category)")
      .order("reported_at", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => {
    load();
    supabase.from("cv_vehicles").select("*").eq("active", true).then(({ data }) => setVehicles((data ?? []) as Vehicle[]));
    supabase.from("cv_defect_types").select("*").then(({ data }) => setTypes((data ?? []) as DefectType[]));
  }, []);

  const create = async () => {
    if (!form.vehicle_id || !form.defect_description) return toast.error("Preencha veículo e descrição");
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("cv_defect_reports").insert({
      ...form,
      defect_type_id: form.defect_type_id || null,
      reported_by: user?.id ?? null,
      status: "pending",
    });
    if (error) return toast.error(error.message);
    toast.success("Defeito registrado"); setOpen(false);
    setForm({ vehicle_id: "", defect_type_id: "", defect_description: "" });
    load();
  };

  const resolve = async () => {
    if (!resolveOpen || !resolveForm.solution) return toast.error("Descreva a solução");
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("cv_defect_reports").update({
      status: "resolved",
      solution: resolveForm.solution,
      cost: resolveForm.cost || null,
      validated_by: resolveForm.validated_by || null,
      resolved_at: new Date().toISOString(),
      resolved_by: user?.id ?? null,
    }).eq("id", resolveOpen.id);
    if (error) return toast.error(error.message);
    toast.success("Resolvido"); setResolveOpen(null);
    setResolveForm({ solution: "", cost: 0, validated_by: "" });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir defeito?")) return;
    await supabase.from("cv_defect_reports").delete().eq("id", id);
    toast.success("Excluído"); load();
  };

  const filtered = useMemo(() => rows.filter(r => {
    const okStatus = statusFilter === "all" || r.status === statusFilter;
    const s = q.toLowerCase();
    const okQ = !s ||
      r.vehicle?.name?.toLowerCase().includes(s) ||
      r.vehicle?.plate?.toLowerCase().includes(s) ||
      r.defect_description?.toLowerCase().includes(s);
    return okStatus && okQ;
  }), [rows, statusFilter, q]);

  const stats = useMemo(() => ({
    pending: rows.filter(r => r.status === "pending").length,
    inProgress: rows.filter(r => r.status === "in_progress").length,
    resolved: rows.filter(r => r.status === "resolved").length,
    totalCost: rows.filter(r => r.status === "resolved").reduce((s, r) => s + Number(r.cost ?? 0), 0),
  }), [rows]);

  const badge = (s: DefectStatus) => {
    if (s === "pending") return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />{STATUS_LABEL[s]}</Badge>;
    if (s === "in_progress") return <Badge variant="outline" className="gap-1 border-sky-500 text-sky-500"><Clock className="h-3 w-3" />{STATUS_LABEL[s]}</Badge>;
    return <Badge className="gap-1 bg-emerald-500 hover:bg-emerald-600"><CheckCircle2 className="h-3 w-3" />{STATUS_LABEL[s]}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-7 w-7 text-amber-500" />
          <div>
            <h2 className="text-xl font-semibold">Defeitos & Avarias</h2>
            <p className="text-sm text-muted-foreground">Registro, acompanhamento e resolução</p>
          </div>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />Registrar Defeito</Button>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4"><div className="text-2xl font-bold text-destructive">{stats.pending}</div><p className="text-sm text-muted-foreground">Pendentes</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold text-sky-500">{stats.inProgress}</div><p className="text-sm text-muted-foreground">Em andamento</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold text-emerald-500">{stats.resolved}</div><p className="text-sm text-muted-foreground">Resolvidos</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold">R$ {stats.totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div><p className="text-sm text-muted-foreground">Custo total</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar veículo, placa ou descrição..." value={q} onChange={e => setQ(e.target.value)} className="pl-8" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="in_progress">Em andamento</SelectItem>
                <SelectItem value="resolved">Resolvidos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-40" />
              Nenhum defeito encontrado
            </div>
          ) : filtered.map(r => (
            <Card key={r.id} className="border-l-4" style={{
              borderLeftColor: r.status === "pending" ? "hsl(var(--destructive))" : r.status === "in_progress" ? "rgb(14 165 233)" : "rgb(16 185 129)",
            }}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <Car className="h-4 w-4 text-primary" />
                        {r.vehicle?.name} <Badge variant="outline" className="font-mono">{r.vehicle?.plate}</Badge>
                      </div>
                      {badge(r.status)}
                      {r.defect_type?.name && <Badge variant="secondary">{r.defect_type.name}</Badge>}
                    </div>
                    <p className="text-sm">{r.defect_description}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>📅 {new Date(r.reported_at).toLocaleString("pt-BR")}</span>
                      {r.cost != null && <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />R$ {Number(r.cost).toFixed(2)}</span>}
                      {r.solution && <span className="flex items-center gap-1"><Wrench className="h-3 w-3" />{r.solution}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 self-end sm:self-start">
                    {r.status !== "resolved" && (
                      <Button size="sm" variant="outline" onClick={() => setResolveOpen(r)}>
                        <CheckCircle2 className="h-4 w-4 mr-1" />Resolver
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(r.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Defeito</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Veículo</Label>
              <Select value={form.vehicle_id} onValueChange={v => setForm({ ...form, vehicle_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.name} — {v.plate}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo (opcional)</Label>
              <Select value={form.defect_type_id} onValueChange={v => setForm({ ...form, defect_type_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{types.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Descrição</Label><Textarea value={form.defect_description} onChange={e => setForm({ ...form, defect_description: e.target.value })} rows={4} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={create}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resolveOpen} onOpenChange={o => !o && setResolveOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resolver defeito</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Solução aplicada</Label><Textarea value={resolveForm.solution} onChange={e => setResolveForm({ ...resolveForm, solution: e.target.value })} rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Custo (R$)</Label><Input type="number" step="0.01" value={resolveForm.cost} onChange={e => setResolveForm({ ...resolveForm, cost: +e.target.value })} /></div>
              <div><Label>Validado por</Label><Input value={resolveForm.validated_by} onChange={e => setResolveForm({ ...resolveForm, validated_by: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveOpen(null)}>Cancelar</Button>
            <Button onClick={resolve}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
