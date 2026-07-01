import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  LogOut, Calendar, Clock, User, Car, Users, Save, X, FileText, AlertCircle, CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { Vehicle, Driver } from "@/types/vehicle";

export default function CVVehicleExit() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [busyVehicleIds, setBusyVehicleIds] = useState<Set<string>>(new Set());
  const [busyDriverIds, setBusyDriverIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successDetails, setSuccessDetails] = useState<any>(null);
  const [form, setForm] = useState({
    vehicle_id: "", driver_id: "", has_helper: false, helper_name: "", exit_notes: "",
  });

  const load = async () => {
    setLoading(true);
    const [v, d, m] = await Promise.all([
      supabase.from("cv_vehicles").select("*").eq("active", true).order("name"),
      supabase.from("cv_drivers").select("*").eq("active", true).order("name"),
      supabase.from("cv_vehicle_movements").select("vehicle_id, driver_id").eq("status", "out"),
    ]);
    setVehicles((v.data ?? []) as Vehicle[]);
    setDrivers((d.data ?? []) as Driver[]);
    setBusyVehicleIds(new Set((m.data ?? []).map((x: any) => x.vehicle_id)));
    setBusyDriverIds(new Set((m.data ?? []).map((x: any) => x.driver_id)));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const availableVehicles = vehicles.filter((v) => !busyVehicleIds.has(v.id));
  const availableDrivers = drivers.filter((d) => !busyDriverIds.has(d.id));
  const selectedVehicle = vehicles.find((v) => v.id === form.vehicle_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vehicle_id || !form.driver_id) {
      toast.error("Selecione veículo e motorista");
      return;
    }
    if (form.has_helper && !form.helper_name.trim()) {
      toast.error("Informe o nome do ajudante");
      return;
    }
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const exitTime = new Date();
    const exitKm = selectedVehicle?.current_km ?? 0;
    const driver = drivers.find((d) => d.id === form.driver_id);

    const { error } = await supabase.from("cv_vehicle_movements").insert({
      vehicle_id: form.vehicle_id,
      driver_id: form.driver_id,
      security_guard_id: user?.id ?? null,
      has_helper: form.has_helper,
      helper_name: form.has_helper ? form.helper_name : null,
      exit_time: exitTime.toISOString(),
      exit_km: exitKm,
      exit_notes: form.exit_notes || null,
      inspected_by: user?.id ?? null,
      status: "out",
    });
    setBusy(false);
    if (error) return toast.error(error.message);

    setSuccessDetails({
      vehicleName: selectedVehicle?.name,
      vehiclePlate: selectedVehicle?.plate,
      driverName: driver?.name,
      exitTime: exitTime.toLocaleString("pt-BR"),
    });
    setShowSuccess(true);
    toast.success("Saída autorizada! Boa viagem");
    setForm({ vehicle_id: "", driver_id: "", has_helper: false, helper_name: "", exit_notes: "" });
    load();
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto p-6">
        <Card><CardContent className="p-8 text-center text-muted-foreground">Carregando...</CardContent></Card>
      </div>
    );
  }

  if (vehicles.length === 0 || drivers.length === 0) {
    return (
      <div className="max-w-lg mx-auto p-6">
        <Card className="border-warning">
          <CardHeader className="bg-warning text-warning-foreground rounded-t-lg">
            <CardTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5" /> Cadastros Necessários</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            <p>Para registrar saída é necessário ter:</p>
            {vehicles.length === 0 && (
              <div className="p-3 bg-warning/10 rounded border border-warning/20">
                <p className="text-sm">✓ Pelo menos um veículo ativo</p>
                <a href="/controle-veiculos/veiculos" className="text-primary hover:underline text-sm">→ Cadastrar veículos</a>
              </div>
            )}
            {drivers.length === 0 && (
              <div className="p-3 bg-warning/10 rounded border border-warning/20">
                <p className="text-sm">✓ Pelo menos um motorista ativo</p>
                <a href="/controle-veiculos/motoristas" className="text-primary hover:underline text-sm">→ Cadastrar motoristas</a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (availableVehicles.length === 0 || availableDrivers.length === 0) {
    return (
      <div className="max-w-lg mx-auto p-6">
        <Card className="border-warning">
          <CardHeader className="bg-warning text-warning-foreground rounded-t-lg">
            <CardTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5" /> Nenhum Disponível</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            {availableVehicles.length === 0 && (
              <div className="p-3 bg-warning/10 rounded border border-warning/20">
                <p className="text-sm">⚠️ Todos os veículos estão em uso</p>
                <a href="/controle-veiculos/movimentacoes" className="text-primary hover:underline text-sm">→ Ver movimentações ativas</a>
              </div>
            )}
            {availableDrivers.length === 0 && (
              <div className="p-3 bg-warning/10 rounded border border-warning/20">
                <p className="text-sm">⚠️ Todos os motoristas estão na rua</p>
                <a href="/controle-veiculos/movimentacoes" className="text-primary hover:underline text-sm">→ Ver movimentações ativas</a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 p-3 bg-success/10 rounded-full w-fit">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <DialogTitle className="text-xl font-bold text-success text-center">✅ Saída Registrada!</DialogTitle>
          </DialogHeader>
          {successDetails && (
            <div className="space-y-3 text-center">
              <div className="p-3 bg-muted/50 rounded">
                <p className="text-sm text-muted-foreground">Veículo</p>
                <p className="font-semibold">{successDetails.vehicleName} — {successDetails.vehiclePlate}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded">
                <p className="text-sm text-muted-foreground">Motorista</p>
                <p className="font-semibold">{successDetails.driverName}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded">
                <p className="text-sm text-muted-foreground">Data/Hora</p>
                <p className="font-semibold">{successDetails.exitTime}</p>
              </div>
              <Button className="w-full" onClick={() => setShowSuccess(false)}>OK</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <LogOut className="h-8 w-8 text-warning" />
          <h1 className="text-3xl font-bold tracking-tight">Registrar Saída</h1>
        </div>

        <Card className="max-w-lg mx-auto shadow-md">
          <CardHeader className="bg-warning text-warning-foreground rounded-t-lg">
            <CardTitle className="flex items-center gap-2"><LogOut className="h-5 w-5" /> Registrar Saída de Veículo</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="mb-4 p-3 bg-muted/50 rounded flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" /><Clock className="h-4 w-4" />
              Data/Hora atual: {new Date().toLocaleString("pt-BR")}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Veículo</Label>
                <Select value={form.vehicle_id} onValueChange={(v) => setForm({ ...form, vehicle_id: v })}>
                  <SelectTrigger><Car className="h-4 w-4 mr-2" /><SelectValue placeholder="Selecione o veículo" /></SelectTrigger>
                  <SelectContent>
                    {availableVehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.name} — {v.plate} (KM: {v.current_km?.toLocaleString()})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Motorista</Label>
                <Select value={form.driver_id} onValueChange={(v) => setForm({ ...form, driver_id: v })}>
                  <SelectTrigger><User className="h-4 w-4 mr-2" /><SelectValue placeholder="Selecione o motorista" /></SelectTrigger>
                  <SelectContent>
                    {availableDrivers.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name} — CNH: {d.license}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quilometragem de Saída</Label>
                <Input type="number" value={selectedVehicle?.current_km ?? 0} readOnly className="bg-muted/50" />
                <p className="text-xs text-muted-foreground">KM atual do veículo (não editável)</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasHelper" checked={form.has_helper}
                    onCheckedChange={(c) => setForm({ ...form, has_helper: !!c, helper_name: c ? form.helper_name : "" })}
                  />
                  <Label htmlFor="hasHelper" className="flex items-center gap-2"><Users className="h-4 w-4" /> Há ajudante</Label>
                </div>
                {form.has_helper && (
                  <div className="space-y-2 ml-6">
                    <Label>Nome do Ajudante</Label>
                    <Input value={form.helper_name} onChange={(e) => setForm({ ...form, helper_name: e.target.value })} placeholder="Nome completo" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Motivo/Observações</Label>
                <Textarea rows={3} value={form.exit_notes} onChange={(e) => setForm({ ...form, exit_notes: e.target.value })}
                  placeholder='Ex: "Entrega em São Paulo", "Coleta no centro"...' />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={busy} className="flex-1 bg-warning text-warning-foreground hover:opacity-90">
                  <Save className="h-4 w-4 mr-2" /> Registrar Saída
                </Button>
                <Button type="button" variant="outline" className="flex-1" onClick={() => window.history.back()}>
                  <X className="h-4 w-4 mr-2" /> Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
