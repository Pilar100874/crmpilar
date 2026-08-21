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
  Plus, Pencil, Trash2, Car, Gauge,
  ToggleLeft, ToggleRight, Search, Truck, Wrench, Loader2, History, CheckCircle2, X, Filter,
  ArrowUpDown, ArrowUp, ArrowDown,
} from "lucide-react";

import { CVPageHeader } from "./CVPageHeader";
import type { Vehicle, VehicleType } from "@/types/vehicle";
import { CVMaintenanceAlert } from "@/components/cv/CVMaintenanceAlert";
import { carregarAlertasManutencao, type AlertaManutencao, type MaintenancePlan, type PlanoTipo } from "@/lib/cv/manutencao";
import { listarTiposFrota, sincronizarRoteiro, listarCatalogo, adicionarItensRoteiro, ORIGENS_ROTEIRO, nomeItem, type CatalogItem } from "@/lib/cv/catalogo";
import { FilteredCheckboxList } from "@/components/common/FilteredCheckboxList";
import { CVGrupoFilter } from "@/components/cv/CVGrupoFilter";
import { useCvGrupoFilter, filtrarPorGrupo, CV_GRUPO_ALL } from "@/lib/cv/grupoFilter";


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
  fleet_type: "" as string,
  logistica_grupo_id: null as string | null,
};


const planoVazio = {
  name: "", tipo: "km" as PlanoTipo, interval_km: 10000, interval_days: 90,
  last_done_km: 0, last_done_at: new Date().toISOString().slice(0, 10),
  alert_km_antecedencia: 500, alert_days_antecedencia: 7, active: true,
};

interface LogVeic { id: string; placa: string; descricao: string | null; tipo_veiculo: string | null; grupo_id: string | null; logistica_grupo_id?: string | null }

export default function CVVehicles() {
  const [rows, setRows] = useState<Vehicle[]>([]);
  const [logVeiculos, setLogVeiculos] = useState<LogVeic[]>([]);
  const [tiposFrota, setTiposFrota] = useState<string[]>([]);
  const [sincronizando, setSincronizando] = useState(false);
  const [alertas, setAlertas] = useState<Record<string, AlertaManutencao[]>>({});
  const [q, setQ] = useState("");
  const { grupoId, setGrupoId, grupos } = useCvGrupoFilter();

  const [sortBy, setSortBy] = useState<"name" | "last_maintenance" | "km">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [lastMaintByVehicle, setLastMaintByVehicle] = useState<Record<string, string>>({});
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

  // roteiro padrão: edição inline e inclusão de itens avulsos da biblioteca
  const [rotEdit, setRotEdit] = useState<Record<string, { km: string; dias: string }>>({});
  const [rotSalvando, setRotSalvando] = useState<string | null>(null);
  const [catalogo, setCatalogo] = useState<CatalogItem[]>([]);
  const [addItensOpen, setAddItensOpen] = useState(false);
  const [addItensSel, setAddItensSel] = useState<string[]>([]);
  const [addItensSalvando, setAddItensSalvando] = useState(false);
  const [addItensTipo, setAddItensTipo] = useState<string>("__todos__");



  // histórico de manutenções executadas
  const [histVehicle, setHistVehicle] = useState<Vehicle | null>(null);
  const [histRows, setHistRows] = useState<any[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [histFiltroTexto, setHistFiltroTexto] = useState("");
  const [histFiltroTipo, setHistFiltroTipo] = useState<"todos" | PlanoTipo>("todos");
  const [histFiltroDataInicio, setHistFiltroDataInicio] = useState("");
  const [histFiltroDataFim, setHistFiltroDataFim] = useState("");
  const [histFiltroKmMin, setHistFiltroKmMin] = useState("");
  const [histFiltroKmMax, setHistFiltroKmMax] = useState("");

  // registro rápido de nova ocorrência dentro do histórico
  const novaOcorrenciaVazia = { plano: "nenhum", descricao: "", solucao: "", data: "", km: "", custo: "", responsavel: "" };
  const [histPlanos, setHistPlanos] = useState<MaintenancePlan[]>([]);
  const [histNova, setHistNova] = useState<any>(novaOcorrenciaVazia);
  const [histSalvando, setHistSalvando] = useState(false);
  const [histFormAberto, setHistFormAberto] = useState(false);

  const limparFiltrosHistorico = () => {
    setHistFiltroTexto("");
    setHistFiltroTipo("todos");
    setHistFiltroDataInicio("");
    setHistFiltroDataFim("");
    setHistFiltroKmMin("");
    setHistFiltroKmMax("");
  };

  const carregarHistorico = async (vehicleId: string) => {
    const { data } = await supabase
      .from("cv_defect_reports")
      .select("id, defect_description, solution, cost, reported_at, resolved_at, resolved_by, status, maintenance_plan_id, vehicle_km, maintenance_plan:cv_maintenance_plans!maintenance_plan_id(name, tipo)")
      .eq("vehicle_id", vehicleId)
      .order("resolved_at", { ascending: false, nullsFirst: false })
      .limit(200);
    setHistRows(data ?? []);
  };

  const abrirHistorico = async (v: Vehicle) => {
    setHistVehicle(v);
    limparFiltrosHistorico();
    setHistRows([]);
    setHistFormAberto(false);
    setHistNova({ ...novaOcorrenciaVazia, data: new Date().toISOString().slice(0, 10), km: String(v.current_km ?? "") });
    setHistLoading(true);
    const [{ data: planos }] = await Promise.all([
      supabase.from("cv_maintenance_plans").select("*").eq("vehicle_id", v.id).order("name"),
      carregarHistorico(v.id),
    ]);
    setHistPlanos((planos ?? []) as MaintenancePlan[]);
    setHistLoading(false);
  };

  const salvarNovaOcorrencia = async () => {
    if (!histVehicle) return;
    const planoSel = histNova.plano !== "nenhum" ? histPlanos.find(p => p.id === histNova.plano) : null;
    const descricao = (histNova.descricao || planoSel?.name || "").trim();
    if (!descricao) return toast.error("Informe a descrição da manutenção (ou selecione um plano).");
    if (!histNova.data) return toast.error("Informe a data da manutenção.");

    setHistSalvando(true);
    const quando = new Date(histNova.data + "T12:00:00").toISOString();
    const km = histNova.km !== "" ? Number(histNova.km) : null;

    const { error } = await supabase.from("cv_defect_reports").insert({
      vehicle_id: histVehicle.id,
      defect_description: descricao,
      solution: histNova.solucao || null,
      cost: histNova.custo !== "" ? Number(histNova.custo) : null,
      vehicle_km: km,
      maintenance_plan_id: planoSel?.id ?? null,
      reported_at: quando,
      resolved_at: quando,
      resolved_by: histNova.responsavel || null,
      status: "resolved" as const,
    });
    if (error) { setHistSalvando(false); return toast.error(error.message); }

    // atualiza KM atual do veículo se a ocorrência for mais recente
    if (km != null && km > (histVehicle.current_km ?? 0)) {
      await supabase.from("cv_vehicles").update({ current_km: km }).eq("id", histVehicle.id);
      setHistVehicle({ ...histVehicle, current_km: km });
    }

    await carregarHistorico(histVehicle.id);
    setHistNova({ ...novaOcorrenciaVazia, data: new Date().toISOString().slice(0, 10), km: String(km ?? histVehicle.current_km ?? "") });
    setHistFormAberto(false);
    setHistSalvando(false);
    toast.success("Ocorrência de manutenção registrada.");
    load();
  };



  const load = async () => {
    const { data, error } = await supabase.from("cv_vehicles").select("*").order("name");
    if (error) return toast.error(error.message);
    const list = (data ?? []) as Vehicle[];
    setRows(list);
    const { data: vs } = await supabase.from("veiculos").select("id, placa, descricao, tipo_veiculo, grupo_id, logistica_grupo_id").eq("ativo", true).order("placa");
    setLogVeiculos((vs ?? []) as LogVeic[]);
    setAlertas(await carregarAlertasManutencao(list.map(v => ({ id: v.id, current_km: v.current_km }))));

    // última manutenção por veículo para ordenação
    if (list.length > 0) {
      const { data: lastMaint } = await supabase
        .from("cv_defect_reports")
        .select("vehicle_id, resolved_at")
        .in("vehicle_id", list.map(v => v.id))
        .not("resolved_at", "is", null)
        .order("resolved_at", { ascending: false });
      const map: Record<string, string> = {};
      (lastMaint ?? []).forEach((r: any) => {
        if (!map[r.vehicle_id]) map[r.vehicle_id] = r.resolved_at;
      });
      setLastMaintByVehicle(map);
    } else {
      setLastMaintByVehicle({});
    }
  };
  useEffect(() => {
    load();
    listarTiposFrota().then(setTiposFrota).catch(() => {});
  }, []);

  const openNew = () => { setForm(empty); setEditing(null); setOpen(true); };
  const openEdit = (v: Vehicle) => {
    setForm({
      name: v.name, plate: v.plate, vehicle_type: v.vehicle_type,
      current_km: v.current_km, oil_change_interval: v.oil_change_interval,
      last_oil_change_km: v.last_oil_change_km, active: v.active,
      veiculo_id: (v as any).veiculo_id ?? null,
      fleet_type: (logVeiculos.find(l => l.id === (v as any).veiculo_id)?.tipo_veiculo || "").trim() || (v as any).fleet_type || "",
      logistica_grupo_id: (v as any).logistica_grupo_id ?? null,
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
      fleet_type: (lv.tipo_veiculo || "").trim() || f.fleet_type,
      logistica_grupo_id: lv.logistica_grupo_id ?? lv.grupo_id ?? null,
    }));
  };

  const save = async () => {
    if (!form.veiculo_id) return toast.error("Selecione um veículo do cadastro de Logística");
    if (!form.name || !form.plate) return toast.error("Nome e placa são obrigatórios");
    // óleo/revisões passaram a ser controlados pelos planos de manutenção
    const last_oil_change_km = Number(form.current_km) || 0;
    const oil_change_interval = Number(form.oil_change_interval) || 10000;
    const payload: any = {
      ...form,
      last_oil_change_km,
      oil_change_interval,
      next_oil_change_km: last_oil_change_km + oil_change_interval,
      plate: String(form.plate).toUpperCase(),
      fleet_type: form.fleet_type || null,
      logistica_grupo_id: form.logistica_grupo_id || null,

    };

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
    setRotEdit({}); setAddItensSel([]); setAddItensTipo((v as any).fleet_type || "__todos__");
    const { data } = await supabase.from("cv_maintenance_plans").select("*").eq("vehicle_id", v.id).order("name");
    setPlans((data ?? []) as any as MaintenancePlan[]);
    if (!catalogo.length) listarCatalogo().then(setCatalogo).catch(() => {});
  };
  const recarregarPlanos = async () => {
    if (!planVehicle) return;
    const { data } = await supabase.from("cv_maintenance_plans").select("*").eq("vehicle_id", planVehicle.id).order("name");
    setPlans((data ?? []) as any as MaintenancePlan[]);
  };

  const planosRoteiro = plans;

  const salvarIntervaloRoteiro = async (p: MaintenancePlan) => {
    const e = rotEdit[p.id];
    if (!e) return;
    const km = e.km === "" ? null : Number(e.km);
    const dias = e.dias === "" ? null : Number(e.dias);
    if (!km && !dias) return toast.error("Informe pelo menos KM ou dias.");
    setRotSalvando(p.id);
    const { error } = await supabase.from("cv_maintenance_plans")
      .update({ interval_km: km, interval_days: dias, tipo: km && dias ? "ambos" : dias ? "dias" : "km" })
      .eq("id", p.id);
    setRotSalvando(null);
    if (error) return toast.error(error.message);
    toast.success("Intervalo atualizado");
    setRotEdit(prev => { const n = { ...prev }; delete n[p.id]; return n; });
    recarregarPlanos(); load();
  };

  const adicionarAvulsos = async () => {
    if (!planVehicle || !addItensSel.length) return;
    setAddItensSalvando(true);
    try {
      const itens = catalogo.filter(i => addItensSel.includes(i.id));
      const n = await adicionarItensRoteiro(planVehicle, itens);
      toast.success(`${n} item(ns) adicionado(s) ao roteiro`);
      setAddItensSel([]); setAddItensOpen(false);
      recarregarPlanos(); load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setAddItensSalvando(false);
    }
  };


  const aplicarRoteiroPadrao = async () => {
    if (!planVehicle) return;
    const ft = (planVehicle as any).fleet_type as string | null;
    if (!ft) return toast.error("Defina o Tipo de frota do veículo (editar veículo) antes de aplicar o roteiro padrão.");
    setSincronizando(true);
    try {
      const r = await sincronizarRoteiro({
        id: planVehicle.id,
        estabelecimento_id: planVehicle.estabelecimento_id,
        current_km: planVehicle.current_km,
        fleet_type: ft,
      });
      toast.success(`Roteiro sincronizado: ${r.criados} incluído(s), ${r.removidos} removido(s)`);
      recarregarPlanos(); load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSincronizando(false);
    }
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

  const porGrupo = filtrarPorGrupo(rows, grupoId, (v: any) => v.logistica_grupo_id);
  const filtered = porGrupo.filter(v =>
    !q || v.name.toLowerCase().includes(q.toLowerCase()) || v.plate.toLowerCase().includes(q.toLowerCase())
  );

  const sortedFiltered = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortBy === "name") {
      cmp = a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });
    } else if (sortBy === "km") {
      cmp = a.current_km - b.current_km;
    } else if (sortBy === "last_maintenance") {
      const da = lastMaintByVehicle[a.id] ? new Date(lastMaintByVehicle[a.id]).getTime() : 0;
      const db = lastMaintByVehicle[b.id] ? new Date(lastMaintByVehicle[b.id]).getTime() : 0;
      cmp = da - db;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const jaVinculados = new Set(rows.filter(r => r.id !== editing).map(r => (r as any).veiculo_id).filter(Boolean));
  const opcoesLogistica = logVeiculos.filter(lv => !jaVinculados.has(lv.id));

  const histRowsFiltrados = histRows.filter(h => {
    const plan: any = h.maintenance_plan;
    const texto = (h.defect_description + " " + (h.solution ?? "") + " " + (plan?.name ?? "")).toLowerCase();
    const matchTexto = !histFiltroTexto || texto.includes(histFiltroTexto.toLowerCase());
    const matchTipo = histFiltroTipo === "todos" || plan?.tipo === histFiltroTipo;
    const dataRef = h.resolved_at || h.reported_at;
    const matchData = (!histFiltroDataInicio || (dataRef && new Date(dataRef) >= new Date(histFiltroDataInicio + "T00:00:00"))) &&
                      (!histFiltroDataFim || (dataRef && new Date(dataRef) <= new Date(histFiltroDataFim + "T23:59:59")));
    const km = h.vehicle_km != null ? Number(h.vehicle_km) : null;
    const min = histFiltroKmMin ? Number(histFiltroKmMin) : null;
    const max = histFiltroKmMax ? Number(histFiltroKmMax) : null;
    const matchKm = (min == null || (km != null && km >= min)) && (max == null || (km != null && km <= max));
    return matchTexto && matchTipo && matchData && matchKm;
  });

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

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar nome ou placa..." value={q} onChange={e => setQ(e.target.value)} className="pl-9" />
        </div>
        <CVGrupoFilter value={grupoId} onChange={setGrupoId} grupos={grupos} />
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Ordenar por</span>
          <Select value={sortBy} onValueChange={v => setSortBy(v as any)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Nome</SelectItem>
              <SelectItem value="last_maintenance">Última manutenção</SelectItem>
              <SelectItem value="km">KM</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            title={sortDir === "asc" ? "Crescente" : "Decrescente"}
            onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
          >
            {sortDir === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {sortedFiltered.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <Car className="h-12 w-12 mx-auto mb-3 opacity-40" />
          Nenhum veículo encontrado.
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {sortedFiltered.map(v => {
            const km = v.next_oil_change_km - v.current_km;
            const overdue = km <= 0;
            const near = km > 0 && km <= 1000;
            return (
              <Card key={v.id} className="hover:shadow-lg transition-all overflow-hidden flex flex-col">
                <CardHeader className="pb-3 px-3 sm:px-4">
                  <div className="flex flex-col gap-2 min-w-0">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2 min-w-0">
                      <Car className="h-5 w-5 text-primary shrink-0" />
                      <span className="truncate" title={v.name}>{v.name}</span>
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-0.5 -ml-1.5">
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="Planos de manutenção" onClick={() => abrirPlanos(v)}><Wrench className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="Editar" onClick={() => openEdit(v)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" title={v.active ? "Desativar" : "Ativar"} onClick={() => toggle(v)}>
                        {v.active ? <ToggleRight className="h-4 w-4 text-emerald-500" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive" title="Excluir" onClick={() => remove(v.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 px-3 sm:px-4 pb-4 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 text-sm min-w-0">
                    <span className="text-muted-foreground shrink-0">Placa</span>
                    <Badge variant="outline" className="font-mono truncate max-w-[60%]">{v.plate}</Badge>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-sm min-w-0">
                    <span className="text-muted-foreground shrink-0">Tipo</span>
                    <span className="truncate text-right">{TYPES.find(t => t.value === v.vehicle_type)?.label}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-sm min-w-0">
                    <span className="text-muted-foreground flex items-center gap-1 shrink-0"><Gauge className="h-4 w-4" />KM Atual</span>
                    <span className="font-semibold text-primary truncate">{v.current_km.toLocaleString()} km</span>
                  </div>

                  <div className="pt-2 border-t">
                    <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={() => abrirHistorico(v)}>
                      <History className="h-3.5 w-3.5 mr-1" /> Últimas manutenções
                    </Button>
                  </div>

                  <CVMaintenanceAlert alertas={alertas[v.id] ?? []} vehicleId={v.id} vehicleKm={v.current_km} onGerado={load} />
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
            <div>
              <Label>Grupo (unidade / filial)</Label>
              <Input
                value={grupos.find(g => g.id === form.logistica_grupo_id)?.nome ?? "Sem grupo"}
                readOnly
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Vem automaticamente do cadastro do veículo na Logística. Usado para filtrar as telas do Controle de Veículos.
              </p>
            </div>


            <div>
              <Label>Tipo de frota (roteiro de manutenção preventiva)</Label>
              <Input
                value={form.fleet_type || "Sem roteiro padrão"}
                readOnly
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Preenchido automaticamente pelo tipo do veículo no cadastro de Logística. Define quais itens da Biblioteca de Manutenção serão aplicados.
              </p>
            </div>

            <div>
              <Label>KM Inicial</Label>
              <Input type="number" value={form.current_km} onChange={e => setForm({ ...form, current_km: e.target.value })} />
              <p className="text-xs text-muted-foreground mt-1">
                KM de início dos dados. Trocas de óleo e revisões são cadastradas nos planos de manutenção (ícone 🔧 no card).
              </p>
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
              <Wrench className="h-4 w-4" /> Plano de manutenção — {planVehicle?.name} ({planVehicle?.plate})
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {/* Roteiro padrão vindo da biblioteca */}
            <div className="rounded-lg border p-3 space-y-2 bg-muted/30">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Itens de manutenção do veículo</p>
                  <p className="text-xs text-muted-foreground">
                    {(planVehicle as any)?.fleet_type
                      ? `Tipo: ${(planVehicle as any).fleet_type} · ${planosRoteiro.length} item(ns) aplicados`
                      : "Defina o Tipo de frota no cadastro do veículo para usar a biblioteca."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setAddItensOpen(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar item avulso
                  </Button>
                  <Button size="sm" variant="outline" disabled={sincronizando} onClick={aplicarRoteiroPadrao}>
                    {sincronizando ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Wrench className="h-3.5 w-3.5 mr-1" />}
                    Aplicar / atualizar roteiro
                  </Button>
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {planosRoteiro.map(p => {
                  const ed = rotEdit[p.id];
                  return (
                    <div key={p.id} className="flex flex-wrap items-center gap-2 rounded border bg-background px-2 py-1.5 text-xs">
                      <span className="truncate flex-1 min-w-[140px]">
                        {p.name}
                        {(p as any).origem === "catalogo_avulso" && <Badge variant="secondary" className="ml-1 text-[10px]">avulso</Badge>}
                        {!ORIGENS_ROTEIRO.includes((p as any).origem) && <Badge variant="secondary" className="ml-1 text-[10px]">manual</Badge>}
                        <span className="ml-1 text-[10px] text-muted-foreground">
                          · última: {p.last_done_km?.toLocaleString("pt-BR")} km · {new Date(p.last_done_at).toLocaleDateString("pt-BR")}
                        </span>
                      </span>
                      {ed ? (
                        <>
                          <Input
                            type="number" placeholder="km" value={ed.km}
                            onChange={e => setRotEdit({ ...rotEdit, [p.id]: { ...ed, km: e.target.value } })}
                            className="h-7 w-24 text-xs"
                          />
                          <Input
                            type="number" placeholder="dias" value={ed.dias}
                            onChange={e => setRotEdit({ ...rotEdit, [p.id]: { ...ed, dias: e.target.value } })}
                            className="h-7 w-20 text-xs"
                          />
                          <Button size="sm" className="h-7 text-xs" disabled={rotSalvando === p.id} onClick={() => salvarIntervaloRoteiro(p)}>
                            {rotSalvando === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Salvar"}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setRotEdit(prev => { const n = { ...prev }; delete n[p.id]; return n; })}>
                            Cancelar
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="text-muted-foreground shrink-0">
                            {p.interval_km ? `${p.interval_km.toLocaleString("pt-BR")} km` : ""}
                            {p.interval_km && p.interval_days ? " / " : ""}
                            {p.interval_days ? `${p.interval_days} dias` : ""}
                          </span>
                          <Button
                            size="icon" variant="ghost" className="h-7 w-7" title="Alterar km/dias"
                            onClick={() => setRotEdit({ ...rotEdit, [p.id]: { km: p.interval_km ? String(p.interval_km) : "", dias: p.interval_days ? String(p.interval_days) : "" } })}
                          ><Pencil className="h-3 w-3" /></Button>
                          <Button
                            size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Remover do roteiro"
                            onClick={() => excluirPlano(p.id)}
                          ><Trash2 className="h-3 w-3" /></Button>
                        </>
                      )}
                    </div>
                  );
                })}
                {planosRoteiro.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhum item do roteiro padrão aplicado.</p>
                )}
              </div>
            </div>


          </div>
        </DialogContent>
      </Dialog>

      {/* Adicionar itens avulsos da biblioteca ao roteiro */}
      <Dialog open={addItensOpen} onOpenChange={setAddItensOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Adicionar itens da biblioteca ao roteiro
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Tipo de frota da biblioteca</Label>
              <Select value={addItensTipo} onValueChange={setAddItensTipo}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__todos__">Todos os tipos</SelectItem>
                  {Array.from(new Set(catalogo.map(i => i.tipo_veiculo))).sort().map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <FilteredCheckboxList
              idPrefix="cv-cat"
              searchPlaceholder="Buscar item da biblioteca..."
              maxHeightClass="max-h-[320px]"
              emptyText="Nenhum item disponível na biblioteca."
              selected={addItensSel}
              onToggle={(id, checked) => setAddItensSel(checked ? [...addItensSel, id] : addItensSel.filter(i => i !== id))}
              items={catalogo
                .filter(i => i.ativo)
                .filter(i => addItensTipo === "__todos__" || i.tipo_veiculo === addItensTipo)
                .filter(i => !plans.some(p => (p as any).catalog_item_id === i.id))
                .map(i => ({
                  id: i.id,
                  label: nomeItem(i),
                  extra: [
                    i.interval_principal ? `${i.interval_principal.toLocaleString("pt-BR")} km` : null,
                    i.interval_days ? `${i.interval_days} dias` : null,
                  ].filter(Boolean).join(" / "),
                  searchableText: `${i.sistema} ${i.tipo_veiculo} ${i.criticidade}`,
                }))}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddItensOpen(false)}>Cancelar</Button>
              <Button onClick={adicionarAvulsos} disabled={addItensSalvando || !addItensSel.length}>
                {addItensSalvando ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                Adicionar {addItensSel.length > 0 ? `(${addItensSel.length})` : ""}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {/* Histórico de manutenções do veículo */}
      <Dialog open={!!histVehicle} onOpenChange={o => { if (!o) setHistVehicle(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-4 w-4" /> Manutenções — {histVehicle?.name} ({histVehicle?.plate})
            </DialogTitle>
          </DialogHeader>

          {histLoading ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Carregando...</p>
          ) : (
            <div className="space-y-4">
              {/* Registrar nova ocorrência */}
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Registrar manutenção realizada
                  </h4>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setHistFormAberto(o => !o)}>
                    {histFormAberto ? "Fechar" : "Abrir"}
                  </Button>
                </div>

                {histFormAberto && (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Plano de manutenção (opcional)</Label>
                        <Select value={histNova.plano} onValueChange={v => setHistNova((f: any) => ({ ...f, plano: v }))}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nenhum">Nenhum (avulsa)</SelectItem>
                            {histPlanos.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Data da manutenção *</Label>
                        <Input type="date" value={histNova.data} onChange={e => setHistNova((f: any) => ({ ...f, data: e.target.value }))} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">KM do veículo</Label>
                        <Input type="number" value={histNova.km} onChange={e => setHistNova((f: any) => ({ ...f, km: e.target.value }))} className="h-8 text-sm" placeholder="Ex: 125000" />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-xs">Descrição *</Label>
                        <Input value={histNova.descricao} onChange={e => setHistNova((f: any) => ({ ...f, descricao: e.target.value }))} className="h-8 text-sm" placeholder="Ex: Troca de óleo e filtros" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Responsável</Label>
                        <Input value={histNova.responsavel} onChange={e => setHistNova((f: any) => ({ ...f, responsavel: e.target.value }))} className="h-8 text-sm" placeholder="Oficina / mecânico" />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-xs">Serviço executado / observações</Label>
                        <Input value={histNova.solucao} onChange={e => setHistNova((f: any) => ({ ...f, solucao: e.target.value }))} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Custo (R$)</Label>
                        <Input type="number" step="0.01" value={histNova.custo} onChange={e => setHistNova((f: any) => ({ ...f, custo: e.target.value }))} className="h-8 text-sm" />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button size="sm" onClick={salvarNovaOcorrencia} disabled={histSalvando}>
                        {histSalvando ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                        Registrar ocorrência
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {histRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma manutenção registrada para este veículo.</p>
              ) : (
                <div className="space-y-4">

              {/* Filtros */}
              <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Filter className="h-4 w-4" /> Filtros
                  </h4>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={limparFiltrosHistorico}>
                    <X className="h-3 w-3 mr-1" /> Limpar
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Buscar</Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Descrição, solução ou serviço..."
                        value={histFiltroTexto}
                        onChange={e => setHistFiltroTexto(e.target.value)}
                        className="pl-8 h-8 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Tipo de manutenção</Label>
                    <Select value={histFiltroTipo} onValueChange={v => setHistFiltroTipo(v as any)}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="km">Por quilometragem</SelectItem>
                        <SelectItem value="dias">Por dias</SelectItem>
                        <SelectItem value="ambos">Ambos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                    <Label className="text-xs">Intervalo de datas</Label>
                    <div className="flex items-center gap-2">
                      <Input type="date" value={histFiltroDataInicio} onChange={e => setHistFiltroDataInicio(e.target.value)} className="h-8 text-xs" />
                      <span className="text-muted-foreground">-</span>
                      <Input type="date" value={histFiltroDataFim} onChange={e => setHistFiltroDataFim(e.target.value)} className="h-8 text-xs" />
                    </div>
                  </div>

                  <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                    <Label className="text-xs">Intervalo de KM</Label>
                    <div className="flex items-center gap-2">
                      <Input type="number" placeholder="KM mínimo" value={histFiltroKmMin} onChange={e => setHistFiltroKmMin(e.target.value)} className="h-8 text-sm" />
                      <span className="text-muted-foreground">-</span>
                      <Input type="number" placeholder="KM máximo" value={histFiltroKmMax} onChange={e => setHistFiltroKmMax(e.target.value)} className="h-8 text-sm" />
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  {histRowsFiltrados.length} de {histRows.length} registro(s)
                </p>
              </div>

              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {histRowsFiltrados.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhum resultado com os filtros selecionados.</p>
                ) : (
                  histRowsFiltrados.map(h => {
                    const plan: any = h.maintenance_plan;
                    return (
                      <div key={h.id} className="rounded-lg border p-3 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{h.defect_description}</p>
                            {plan?.name && (
                              <p className="text-[11px] text-muted-foreground truncate">
                                Plano: {plan.name}
                                {plan.tipo && ` · ${plan.tipo === "km" ? "KM" : plan.tipo === "dias" ? "Dias" : "KM + Dias"}`}
                              </p>
                            )}
                          </div>
                          <Badge variant={h.status === "resolved" ? "outline" : "secondary"} className="shrink-0">
                            {h.status === "resolved" ? "Concluída" : h.status === "in_progress" ? "Em andamento" : "Pendente"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Aberta em {new Date(h.reported_at).toLocaleDateString("pt-BR")}
                          {h.resolved_at && ` · Concluída em ${new Date(h.resolved_at).toLocaleDateString("pt-BR")}`}
                          {h.resolved_by && ` · por ${h.resolved_by}`}
                          {h.vehicle_km != null && ` · ${Number(h.vehicle_km).toLocaleString("pt-BR")} km`}
                          {h.cost != null && ` · R$ ${Number(h.cost).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                        </p>
                        {h.solution && <p className="text-xs">Solução: {h.solution}</p>}
                      </div>
                    );
                  })
                )}
              </div>
                </div>
              )}
            </div>
          )}

        </DialogContent>
      </Dialog>
    </div>
  );
}

