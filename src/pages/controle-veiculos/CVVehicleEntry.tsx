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
  LogIn, Calendar, Clock, AlertTriangle, CheckCircle, Save, X, MessageSquare, Tags, Car, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { CVPageHeader } from "./CVPageHeader";

export default function CVVehicleEntry() {
  const [openMoves, setOpenMoves] = useState<any[]>([]);
  const [defectTypes, setDefectTypes] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    entry_km: 0,
    reported_defects: "",
    defect_type_id: "",
    damage_notes: "",
    inspected_all_sides: false,
  });

  const load = async () => {
    setLoading(true);
    const [m, dt] = await Promise.all([
      supabase.from("cv_vehicle_movements")
        .select("*, vehicle:cv_vehicles(*), driver:cv_drivers(*)")
        .eq("status", "out").order("exit_time", { ascending: false }),
      supabase.from("cv_defect_types").select("*").neq("category", "bodywork").order("name"),
    ]);
    setOpenMoves(m.data ?? []);
    setDefectTypes(dt.data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleSelect = (move: any) => {
    setSelected(move);
    setForm({
      entry_km: move.exit_km ?? 0,
      reported_defects: "",
      defect_type_id: "",
      damage_notes: "",
      inspected_all_sides: false,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    if (form.entry_km <= selected.exit_km) {
      toast.error(`KM entrada deve ser maior que ${selected.exit_km}`);
      return;
    }
    if (form.reported_defects.trim() && !form.defect_type_id) {
      toast.error("Selecione a categoria do defeito reportado");
      return;
    }
    if (!form.inspected_all_sides) {
      toast.error("Confirme a vistoria nos 4 lados");
      return;
    }
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("cv_vehicle_movements").update({
      status: "returned",
      entry_time: new Date().toISOString(),
      entry_km: form.entry_km,
      reported_defects: form.reported_defects || null,
      damage_notes: form.damage_notes || null,
      inspected_by: user?.id ?? null,
      inspected_all_sides: true,
      resolved_at: new Date().toISOString(),
    }).eq("id", selected.id);

    if (!error) {
      await supabase.from("cv_vehicles").update({ current_km: form.entry_km }).eq("id", selected.vehicle_id);

      if (form.reported_defects && form.defect_type_id) {
        await supabase.from("cv_defect_reports").insert({
          vehicle_id: selected.vehicle_id,
          driver_id: selected.driver_id,
          movement_id: selected.id,
          defect_type_id: form.defect_type_id,
          defect_description: form.reported_defects,
          reported_by: user?.id ?? null,
          status: "pending",
        });
      }

      if (form.damage_notes) {
        // Encontrar/criar tipo padrão de carroceria
        let { data: bw } = await supabase.from("cv_defect_types")
          .select("id").eq("category", "bodywork").limit(1).maybeSingle();
        if (!bw) {
          const { data: newT } = await supabase.from("cv_defect_types")
            .insert({ name: "Avaria de Carroceria", description: "Avarias na vistoria", category: "bodywork" })
            .select().single();
          bw = newT;
        }
        if (bw) {
          await supabase.from("cv_defect_reports").insert({
            vehicle_id: selected.vehicle_id,
            driver_id: selected.driver_id,
            movement_id: selected.id,
            defect_type_id: bw.id,
            defect_description: form.damage_notes,
            reported_by: user?.id ?? null,
            status: "pending",
            is_damage_report: true,
          });
        }
      }
    }
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Entrada registrada com sucesso!");
    setSelected(null);
    load();
  };

  if (loading) {
    return <div className="max-w-lg mx-auto p-6"><Card><CardContent className="p-8 text-center text-muted-foreground">Carregando...</CardContent></Card></div>;
  }

  if (openMoves.length === 0) {
    return (
      <div className="max-w-lg mx-auto p-6">
        <Card>
          <CardHeader className="bg-success text-success-foreground rounded-t-lg">
            <CardTitle className="flex items-center gap-2"><LogIn className="h-5 w-5" /> Registrar Entrada</CardTitle>
          </CardHeader>
          <CardContent className="p-6 text-center">
            <Car className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum veículo em trânsito</h3>
            <p className="text-muted-foreground mb-4">Todos os veículos já retornaram ou não há saídas registradas.</p>
            <a href="/controle-veiculos/saida" className="inline-block bg-warning text-warning-foreground px-4 py-2 rounded hover:opacity-90">
              Registrar Nova Saída
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selected) {
    const v = selected.vehicle, d = selected.driver;
    return (
      <div className="space-y-4">
        <CVPageHeader
          icon={LogIn}
          title="Registrar Entrada"
          subtitle={`${v?.name} — ${v?.plate}`}
        />

        <Card className="max-w-2xl mx-auto shadow-sm">
          <CardHeader className="bg-emerald-500/10 border-b border-emerald-500/20">
            <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <LogIn className="h-5 w-5" /> Registrar Retorno
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="mb-6 p-4 bg-muted/50 rounded space-y-2">
              <h3 className="font-semibold text-sm">Informações da Saída:</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Veículo:</span> <Badge variant="outline">{v?.name}</Badge></div>
                <div><span className="text-muted-foreground">Motorista:</span> <span className="font-medium">{d?.name}</span></div>
                <div><span className="text-muted-foreground">Saída:</span> {new Date(selected.exit_time).toLocaleString("pt-BR")}</div>
                <div><span className="text-muted-foreground">KM Saída:</span> <span className="font-medium">{selected.exit_km?.toLocaleString()}</span></div>
                {selected.has_helper && (
                  <div className="col-span-2"><span className="text-muted-foreground">Ajudante:</span> <span className="font-medium">{selected.helper_name}</span></div>
                )}
              </div>
            </div>

            <div className="mb-4 p-3 bg-success/10 rounded flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4" /><Clock className="h-4 w-4" />
              Data/Hora entrada: {new Date().toLocaleString("pt-BR")}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Quilometragem de Entrada</Label>
                <Input type="number" min={selected.exit_km} value={form.entry_km}
                  onChange={(e) => setForm({ ...form, entry_km: +e.target.value })} />
                <p className="text-xs text-muted-foreground">
                  KM mínimo: {selected.exit_km?.toLocaleString()}
                  {form.entry_km > selected.exit_km && (
                    <span className="ml-2 text-primary">(+{(form.entry_km - selected.exit_km).toLocaleString()} km)</span>
                  )}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" /> Defeitos Reportados pelo Motorista</Label>
                <Textarea rows={3} value={form.reported_defects}
                  onChange={(e) => setForm({ ...form, reported_defects: e.target.value })}
                  placeholder="Descreva defeitos reportados..." />
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" /> Serão listados em Defeitos Reportados
                  {form.reported_defects.trim() && !form.defect_type_id && (
                    <span className="text-destructive font-medium ml-2">⚠️ Categoria obrigatória</span>
                  )}
                </p>
              </div>

              {form.reported_defects.trim() && (
                <div className="space-y-2 p-3 bg-warning/10 border border-warning/20 rounded">
                  <Label className="flex items-center gap-2 font-medium text-warning">
                    <Tags className="h-4 w-4" /> Categoria do Defeito *
                  </Label>
                  <Select value={form.defect_type_id} onValueChange={(v) => setForm({ ...form, defect_type_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
                    <SelectContent>
                      {defectTypes.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{t.name}</span>
                            {t.description && <span className="text-xs text-muted-foreground">{t.description}</span>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-success" /> Avarias Encontradas na Portaria</Label>
                <Textarea rows={3} value={form.damage_notes}
                  onChange={(e) => setForm({ ...form, damage_notes: e.target.value })}
                  placeholder="Amassados ou avarias encontradas..." />
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" /> Serão registradas como defeitos de carroceria
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox id="all4" checked={form.inspected_all_sides}
                    onCheckedChange={(c) => setForm({ ...form, inspected_all_sides: !!c })} />
                  <Label htmlFor="all4" className="flex items-center gap-2 font-medium text-primary">
                    <CheckCircle className="h-4 w-4" /> Vistoria nos 4 Lados (Obrigatório)
                  </Label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={busy} className="flex-1 bg-success text-success-foreground hover:opacity-90">
                  <Save className="h-4 w-4 mr-2" /> Registrar Entrada
                </Button>
                <Button type="button" variant="outline" className="flex-1" onClick={() => setSelected(null)}>
                  <X className="h-4 w-4 mr-2" /> Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <LogIn className="h-8 w-8 text-success" />
        <h1 className="text-3xl font-bold tracking-tight">Registrar Entrada</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Veículos em Trânsito</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">Selecione o veículo que está retornando:</p>
          <div className="space-y-3">
            {openMoves.map((m) => {
              const timeOut = Date.now() - new Date(m.exit_time).getTime();
              const h = Math.floor(timeOut / 3600000);
              const min = Math.floor((timeOut % 3600000) / 60000);
              return (
                <Card key={m.id} className="cursor-pointer hover:shadow-md transition-all border-l-4 border-l-warning"
                  onClick={() => handleSelect(m)}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-primary" />
                        <span className="font-semibold">{m.vehicle?.name} — {m.vehicle?.plate}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Motorista: {m.driver?.name}</span>
                        {m.has_helper && <Badge variant="outline" className="text-xs">Ajudante: {m.helper_name}</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Saída: {new Date(m.exit_time).toLocaleString("pt-BR")}
                        <span className="ml-2 text-warning font-medium">({h}h {min}min em trânsito)</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-warning/10 text-warning border-warning">Em Trânsito</Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
