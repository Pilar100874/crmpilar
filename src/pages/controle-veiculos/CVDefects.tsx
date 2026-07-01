import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, CheckCircle2 } from "lucide-react";
import type { Vehicle, DefectType, DefectStatus } from "@/types/vehicle";

const STATUS_LABEL: Record<DefectStatus, string> = { pending: "Pendente", in_progress: "Em andamento", resolved: "Resolvido" };

export default function CVDefects() {
  const [rows, setRows] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [types, setTypes] = useState<DefectType[]>([]);
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Defeitos & Avarias</h2>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />Registrar</Button>
      </div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Veículo</TableHead><TableHead>Tipo</TableHead>
            <TableHead>Descrição</TableHead><TableHead>Data</TableHead>
            <TableHead>Status</TableHead><TableHead>Custo</TableHead>
            <TableHead className="w-32"></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.id}>
                <TableCell><div className="font-medium">{r.vehicle?.name}</div><div className="text-xs text-muted-foreground">{r.vehicle?.plate}</div></TableCell>
                <TableCell>{r.defect_type?.name || "—"}</TableCell>
                <TableCell className="max-w-xs truncate">{r.defect_description}</TableCell>
                <TableCell className="text-sm">{new Date(r.reported_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Badge variant={r.status === "resolved" ? "default" : r.status === "in_progress" ? "outline" : "secondary"}>
                    {STATUS_LABEL[r.status as DefectStatus]}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{r.cost ? `R$ ${Number(r.cost).toFixed(2)}` : "—"}</TableCell>
                <TableCell>
                  {r.status !== "resolved" && (
                    <Button size="sm" variant="outline" onClick={() => setResolveOpen(r)}>
                      <CheckCircle2 className="h-4 w-4 mr-1" />Resolver
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum defeito</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent></Card>

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
            <div><Label>Descrição</Label><Textarea value={form.defect_description} onChange={e => setForm({ ...form, defect_description: e.target.value })} /></div>
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
            <div><Label>Solução aplicada</Label><Textarea value={resolveForm.solution} onChange={e => setResolveForm({ ...resolveForm, solution: e.target.value })} /></div>
            <div><Label>Custo (R$)</Label><Input type="number" step="0.01" value={resolveForm.cost} onChange={e => setResolveForm({ ...resolveForm, cost: +e.target.value })} /></div>
            <div><Label>Validado por</Label><Input value={resolveForm.validated_by} onChange={e => setResolveForm({ ...resolveForm, validated_by: e.target.value })} /></div>
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
