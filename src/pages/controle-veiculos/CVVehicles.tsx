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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Car, Gauge, Droplets,
  AlertTriangle, CheckCircle, ToggleLeft, ToggleRight, Search, Truck, Wrench, Loader2,
} from "lucide-react";
import { CVPageHeader } from "./CVPageHeader";
import type { Vehicle, VehicleType } from "@/types/vehicle";
import { CVMaintenanceAlert } from "@/components/cv/CVMaintenanceAlert";
import { carregarAlertasManutencao, type AlertaManutencao, type MaintenancePlan, type PlanoTipo } from "@/lib/cv/manutencao";

const TYPES: { value: VehicleType; label: string }[] = [
  { value: "carro", label: "Carro" }, { value: "vuc", label: "VUC" },
  { value: "truck", label: "Truck" }, { value: "carreta", label: "Carreta" },
  { value: "outro", label: "Outro" },
];

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/** Converte o tipo do cadastro de Logística para o tipo usado no Controle de Veículos. */
function mapTipo(tipo?: string | null): VehicleType | null {
  const t = norm(tipo ?? "");
  if (!t) return null;
  if (t.includes("carreta") || t.includes("bitrem") || t.includes("cavalo")) return "carreta";
  if (t.includes("vuc")) return "vuc";
  if (t.includes("truck") || t.includes("caminhao") || t.includes("pesado") || t.includes("toco")) return "truck";
  if (t.includes("carro") || t.includes("passeio") || t.includes("utilitario")) return "carro";
  return "outro";
}

const empty = {
  name: "", plate: "", vehicle_type: "carro" as VehicleType,
  current_km: 0, oil_change_interval: 10000, last_oil_change_km: 0, active: true,
  veiculo_id: null as string | null,
};

const planoVazio = {
  name: "", tipo: "km" as PlanoTipo, interval_km: 10000, interval_days: 90,
  last_done_km: 0, last_done_at: new Date().toISOString().slice(0, 10),
  alert_km_antecedencia: 500, alert_days_antecedencia: 7, active: true,
};

interface LogVeic { id: string; placa: string; descricao: string | null; tipo_veiculo: string | null }

export default function CVVehicles() {
  const [rows, setRows] = useState<Vehicle[]>([]);
  const [logVeiculos, setLogVeiculos] = useState<LogVeic[]>([]);
  const [alertas, setAlertas] = useState<Record<string, AlertaManutencao[]>>({});
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [editing, setEditing] = useState<string | null>(null);

  // manutenção
  const [planVehicle, setPlanVehicle] = useState<Vehicle | null>(null);
  const [plans, setPlans] = useState<MaintenancePlan[]>([]);
  const [planForm, setPlanForm] = useState<any>(planoVazio);
  const [planEditing, setPlanEditing] = useState<string | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);
  const [aplicarEm, setAplicarEm] = useState<string[]>([]);

  const load = async () => {
    const { data, error } = await supabase.from("cv_vehicles").select("*").order("name");
    if (error) return toast.error(error.message);
    const list = (data ?? []) as Vehicle[];
    setRows(list);
    const { data: vs } = await supabase.from("veiculos").select("id, placa, descricao, tipo_veiculo").eq("ativo", true).order("placa");
    setLogVeiculos((vs ?? []) as LogVeic[]);
    setAlertas(await carregarAlertasManutencao(list.map(v => ({ id: v.id, current_km: v.current_km }))));
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

  const selecionarLogistica = (id: string) => {
    const lv = logVeiculos.find(v => v.id === id);
    if (!lv) return;
    setForm((f: any) => ({
      ...f,
      veiculo_id: lv.id,
      plate: lv.placa,
      name: (lv.descricao || lv.placa).toUpperCase(),
      vehicle_type: mapTipo(lv.tipo_veiculo) ?? f.vehicle_type,
    }));
  };

  const save = async () => {
    if (!form.veiculo_id) return toast.error("Selecione um veículo do cadastro de Logística");
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

  // ---- planos de manutenção ----
  const abrirPlanos = async (v: Vehicle) => {
    setPlanVehicle(v); setPlanForm({ ...planoVazio, last_done_km: v.current_km }); setPlanEditing(null); setAplicarEm([]);
    const { data } = await supabase.from("cv_maintenance_plans").select("*").eq("vehicle_id", v.id).order("name");
    setPlans((data ?? []) as any as MaintenancePlan[]);
  };
  const recarregarPlanos = async () => {
    if (!planVehicle) return;
    const { data } = await supabase.from("cv_maintenance_plans").select("*").eq("vehicle_id", planVehicle.id).order("name");
    setPlans((data ?? []) as any as MaintenancePlan[]);
  };
  const salvarPlano = async () => {
    if (!planVehicle) return;
    if (!planForm.name) return toast.error("Informe o nome do serviço");
    if ((planForm.tipo === "km" || planForm.tipo === "ambos") && !Number(planForm.interval_km)) return toast.error("Informe o intervalo em KM");
    if ((planForm.tipo === "dias" || planForm.tipo === "ambos") && !Number(planForm.interval_days)) return toast.error("Informe o intervalo em dias");
    setSavingPlan(true);
    const base: any = {
      name: String(planForm.name).toUpperCase(),
      tipo: planForm.tipo,
      interval_km: planForm.tipo === "dias" ? null : Number(planForm.interval_km),
      interval_days: planForm.tipo === "km" ? null : Number(planForm.interval_days),
      last_done_km: Number(planForm.last_done_km) || 0,
      last_done_at: new Date(planForm.last_done_at).toISOString(),
      alert_km_antecedencia: Number(planForm.alert_km_antecedencia) || 0,
      alert_days_antecedencia: Number(planForm.alert_days_antecedencia) || 0,
      active: planForm.active,
    };

    let error: any = null;
    if (planEditing) {
      ({ error } = await supabase.from("cv_maintenance_plans").update({
        ...base, vehicle_id: planVehicle.id, estabelecimento_id: planVehicle.estabelecimento_id,
      }).eq("id", planEditing));
    } else {
      const alvos = [planVehicle, ...rows.filter(r => aplicarEm.includes(r.id))];
      const registros = alvos.map(v => ({
        ...base,
        vehicle_id: v.id,
        estabelecimento_id: v.estabelecimento_id,
        // ao replicar, usa o KM atual de cada veículo como referência inicial
        last_done_km: v.id === planVehicle.id ? base.last_done_km : v.current_km,
      }));
      ({ error } = await supabase.from("cv_maintenance_plans").insert(registros));
    }
    setSavingPlan(false);
    if (error) return toast.error(error.message);
    toast.success(
      planEditing ? "Plano salvo" : `Plano criado em ${1 + aplicarEm.length} veículo(s)`,
    );
    setPlanForm({ ...planoVazio, last_done_km: planVehicle.current_km }); setPlanEditing(null); setAplicarEm([]);
    recarregarPlanos(); load();
  };
  const excluirPlano = async (id: string) => {
    if (!confirm("Excluir este plano de manutenção?")) return;
    const { error } = await supabase.from("cv_maintenance_plans").delete().eq("id", id);
    if (error) return toast.error(error.message);
    recarregarPlanos(); load();
  };

  const filtered = rows.filter(v =>
    !q || v.name.toLowerCase().includes(q.toLowerCase()) || v.plate.toLowerCase().includes(q.toLowerCase())
  );
  const jaVinculados = new Set(rows.filter(r => r.id !== editing).map(r => (r as any).veiculo_id).filter(Boolean));
  const opcoesLogistica = logVeiculos.filter(lv => !jaVinculados.has(lv.id));

  return (
    <div className="space-y-4">
      <CVPageHeader
        icon={Truck}
        title="Veículos"
        subtitle={`${rows.length} cadastrados • ${rows.filter(r => r.active).length} ativos • use o ícone 🔧 no card para os planos de manutenção`}
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
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Planos de manutenção" onClick={() => abrirPlanos(v)}><Wrench className="h-4 w-4" /></Button>
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
                  <CVMaintenanceAlert alertas={alertas[v.id] ?? []} onGerado={load} />
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
            <div>
              <Label>Veículo / Pessoa (cadastro de Logística)</Label>
              <Select value={form.veiculo_id ?? ""} onValueChange={selecionarLogistica}>
                <SelectTrigger><SelectValue placeholder="Selecione o veículo cadastrado na Logística" /></SelectTrigger>
                <SelectContent>
                  {opcoesLogistica.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum veículo disponível</div>}
                  {opcoesLogistica.map(lv => (
                    <SelectItem key={lv.id} value={lv.id}>{lv.placa}{lv.descricao ? ` — ${lv.descricao}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Nome, placa e tipo vêm direto do cadastro de Logística.</p>
            </div>
            <div><Label>Nome</Label><Input value={form.name} readOnly className="bg-muted" /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Placa</Label><Input value={form.plate} readOnly className="bg-muted font-mono" /></div>
              <div>
                <Label>Tipo</Label>
                <Input value={TYPES.find(t => t.value === form.vehicle_type)?.label ?? ""} readOnly className="bg-muted" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><Label>KM Atual</Label><Input type="number" value={form.current_km} onChange={e => setForm({ ...form, current_km: e.target.value })} /></div>
              <div><Label>Intervalo Óleo (km)</Label><Input type="number" value={form.oil_change_interval} onChange={e => setForm({ ...form, oil_change_interval: e.target.value })} /></div>
              <div><Label>Última Troca (km)</Label><Input type="number" value={form.last_oil_change_km} onChange={e => setForm({ ...form, last_oil_change_km: e.target.value })} /></div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={c => setForm({ ...form, active: c })} />
              <Label>Ativo</Label>
            </div>
            {editing && (
              <p className="text-xs text-muted-foreground">
                Use o botão <Wrench className="inline h-3 w-3" /> no card para cadastrar planos de manutenção (por KM ou por dias).
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Planos de manutenção */}
      <Dialog open={!!planVehicle} onOpenChange={o => { if (!o) setPlanVehicle(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-4 w-4" /> Manutenções — {planVehicle?.name} ({planVehicle?.plate})
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {plans.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum plano cadastrado.</p>
            ) : plans.map(p => (
              <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{p.name} {!p.active && <Badge variant="secondary" className="ml-1">Inativo</Badge>}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.tipo === "km" && `A cada ${p.interval_km?.toLocaleString()} km`}
                    {p.tipo === "dias" && `A cada ${p.interval_days} dias`}
                    {p.tipo === "ambos" && `A cada ${p.interval_km?.toLocaleString()} km ou ${p.interval_days} dias`}
                    {" · "}última: {p.last_done_km.toLocaleString()} km em {new Date(p.last_done_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => {
                    setPlanEditing(p.id);
                    setPlanForm({
                      name: p.name, tipo: p.tipo, interval_km: p.interval_km ?? 10000, interval_days: p.interval_days ?? 90,
                      last_done_km: p.last_done_km, last_done_at: p.last_done_at.slice(0, 10),
                      alert_km_antecedencia: p.alert_km_antecedencia, alert_days_antecedencia: p.alert_days_antecedencia,
                      active: p.active,
                    });
                  }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => excluirPlano(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}

            <div className="rounded-lg border-2 border-dashed p-3 space-y-3">
              <p className="text-sm font-semibold">{planEditing ? "Editar plano" : "Novo plano de manutenção"}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label>Serviço</Label><Input placeholder="Ex.: TROCA DE ÓLEO" value={planForm.name} onChange={e => setPlanForm({ ...planForm, name: e.target.value.toUpperCase() })} /></div>
                <div>
                  <Label>Controlar por</Label>
                  <Select value={planForm.tipo} onValueChange={v => setPlanForm({ ...planForm, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="km">Quilometragem</SelectItem>
                      <SelectItem value="dias">Dias</SelectItem>
                      <SelectItem value="ambos">Ambos (o que vencer primeiro)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {planForm.tipo !== "dias" && (
                  <>
                    <div><Label>A cada (km)</Label><Input type="number" value={planForm.interval_km} onChange={e => setPlanForm({ ...planForm, interval_km: e.target.value })} /></div>
                    <div><Label>Avisar com (km) de antecedência</Label><Input type="number" value={planForm.alert_km_antecedencia} onChange={e => setPlanForm({ ...planForm, alert_km_antecedencia: e.target.value })} /></div>
                  </>
                )}
                {planForm.tipo !== "km" && (
                  <>
                    <div><Label>A cada (dias)</Label><Input type="number" value={planForm.interval_days} onChange={e => setPlanForm({ ...planForm, interval_days: e.target.value })} /></div>
                    <div><Label>Avisar com (dias) de antecedência</Label><Input type="number" value={planForm.alert_days_antecedencia} onChange={e => setPlanForm({ ...planForm, alert_days_antecedencia: e.target.value })} /></div>
                  </>
                )}
                <div><Label>Última execução (km)</Label><Input type="number" value={planForm.last_done_km} onChange={e => setPlanForm({ ...planForm, last_done_km: e.target.value })} /></div>
                <div><Label>Última execução (data)</Label><Input type="date" value={planForm.last_done_at} onChange={e => setPlanForm({ ...planForm, last_done_at: e.target.value })} /></div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={planForm.active} onCheckedChange={c => setPlanForm({ ...planForm, active: c })} />
                <Label>Ativo</Label>
              </div>

              {!planEditing && (
                <div className="rounded-md border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Aplicar este plano também em outros veículos</Label>
                    <Button
                      type="button" size="sm" variant="ghost" className="h-7 text-xs"
                      onClick={() => {
                        const outros = rows.filter(r => r.id !== planVehicle?.id).map(r => r.id);
                        setAplicarEm(aplicarEm.length === outros.length ? [] : outros);
                      }}
                    >
                      {aplicarEm.length === rows.length - 1 && rows.length > 1 ? "Limpar" : "Selecionar todos"}
                    </Button>
                  </div>
                  <div className="max-h-40 overflow-y-auto grid gap-1 sm:grid-cols-2">
                    {rows.filter(r => r.id !== planVehicle?.id).map(r => (
                      <label key={r.id} className="flex items-center gap-2 text-sm rounded px-2 py-1 hover:bg-muted cursor-pointer">
                        <Checkbox
                          checked={aplicarEm.includes(r.id)}
                          onCheckedChange={c => setAplicarEm(c ? [...aplicarEm, r.id] : aplicarEm.filter(i => i !== r.id))}
                        />
                        <span className="truncate">{r.plate} — {r.name}</span>
                      </label>
                    ))}
                    {rows.length <= 1 && <p className="text-xs text-muted-foreground">Nenhum outro veículo cadastrado.</p>}
                  </div>
                  {aplicarEm.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      O plano será criado em {aplicarEm.length + 1} veículos, usando o KM atual de cada um como referência inicial.
                    </p>
                  )}
                </div>
              )}
              <div className="flex gap-2 justify-end">
                {planEditing && <Button variant="ghost" onClick={() => { setPlanEditing(null); setPlanForm({ ...planoVazio, last_done_km: planVehicle?.current_km ?? 0 }); }}>Cancelar edição</Button>}
                <Button onClick={salvarPlano} disabled={savingPlan}>
                  {savingPlan ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                  {planEditing ? "Salvar plano" : "Adicionar plano"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
