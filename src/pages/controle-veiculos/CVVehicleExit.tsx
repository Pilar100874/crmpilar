import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  LogOut, Car, User, Users, FileText, Camera, CheckCircle, ChevronRight, ChevronLeft,
  AlertCircle, Save, X, Truck, Plus,
} from "lucide-react";
import { toast } from "sonner";
import { CVPageHeader } from "./CVPageHeader";
import { FotosPendentesDialog } from "@/components/cv/FotosPendentesDialog";
import { CVPhotoCapture, type CapturedPhoto, type PhotoAngle } from "@/components/cv/CVPhotoCapture";
import { CVRastreamentoDot } from "@/components/cv/CVRastreamentoDot";

import type { Vehicle, Driver } from "@/types/vehicle";
import { getEstabelecimentoId } from "@/lib/estabelecimento";
import { CVMaintenanceAlert } from "@/components/cv/CVMaintenanceAlert";
import { CVGrupoFilter } from "@/components/cv/CVGrupoFilter";
import { useCvGrupoFilter, filtrarPorGrupo } from "@/lib/cv/grupoFilter";

import { carregarAlertasManutencao, gerarOrdemAgrupada, type AlertaManutencao } from "@/lib/cv/manutencao";

const STEPS = ["Veículo", "Motorista", "Detalhes", "Fotos", "Confirmação"] as const;

export default function CVVehicleExit() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [helpers, setHelpers] = useState<{ id: string; name: string; phone: string | null }[]>([]);
  const [busyVehicleIds, setBusyVehicleIds] = useState<Set<string>>(new Set());
  const [busyDriverIds, setBusyDriverIds] = useState<Set<string>>(new Set());
  const [alertas, setAlertas] = useState<Record<string, AlertaManutencao[]>>({});
  const geradosRef = useRef<Set<string>>(new Set());

  const [angles, setAngles] = useState<PhotoAngle[]>([]);
  const [photosRequired, setPhotosRequired] = useState(true);
  const [pendentesOpen, setPendentesOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successDetails, setSuccessDetails] = useState<any>(null);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    vehicle_id: "", driver_id: "", has_helper: false, helper_id: "", helper_name: "", exit_notes: "",
  });
  const [helperDialogOpen, setHelperDialogOpen] = useState(false);
  const [helperForm, setHelperForm] = useState({ name: "", phone: "", document: "" });
  const [helperBusy, setHelperBusy] = useState(false);
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const { grupoId, setGrupoId, grupos } = useCvGrupoFilter();

  const load = async () => {
    setLoading(true);
    const [v, d, h, m, cfg] = await Promise.all([
      supabase.from("cv_vehicles").select("*").eq("active", true).order("name"),
      supabase.from("cv_drivers").select("*").eq("active", true).order("name"),
      supabase.from("cv_helpers").select("id,name,phone").eq("active", true).order("name"),
      supabase.from("cv_vehicle_movements").select("vehicle_id, driver_id").eq("status", "out"),
      supabase.from("cv_inspection_config").select("*").eq("active", true).limit(1).maybeSingle(),
    ]);
    const vlist = (v.data ?? []) as Vehicle[];
    setVehicles(vlist);
    carregarAlertasManutencao(vlist.map((x) => ({ id: x.id, current_km: x.current_km }))).then(setAlertas);
    setDrivers((d.data ?? []) as Driver[]);
    setHelpers((h.data ?? []) as any);
    setBusyVehicleIds(new Set((m.data ?? []).map((x: any) => x.vehicle_id)));
    setBusyDriverIds(new Set((m.data ?? []).map((x: any) => x.driver_id)));
    const rawExitAngles = ((cfg.data?.exit_photos as any) ?? []) as PhotoAngle[];
    // Inversão: no estágio de saída, se houver `exit_camera_id`, usa como câmera efetiva.
    const invertedAngles = rawExitAngles.map((a) => ({
      ...a,
      camera_id: a.exit_camera_id ?? a.camera_id ?? null,
    }));
    setAngles(invertedAngles);
    setPhotosRequired((cfg.data as any)?.exit_photos_required ?? true);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const maskWhatsapp = (v: string) => {
    const d = (v || "").replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return d.length ? `(${d}` : "";
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };

  const criarHelper = async () => {
    if (!helperForm.name.trim()) return toast.error("Nome do ajudante é obrigatório");
    setHelperBusy(true);
    const estabelecimentoId = await getEstabelecimentoId();
    if (!estabelecimentoId) {
      setHelperBusy(false);
      return toast.error("Estabelecimento não encontrado");
    }
    const { data, error } = await supabase
      .from("cv_helpers")
      .insert({
        estabelecimento_id: estabelecimentoId,
        name: helperForm.name.trim(),
        phone: helperForm.phone.replace(/\D/g, "") || null,
        document: helperForm.document.trim() || null,
        active: true,
      })
      .select("id,name,phone")
      .single();
    setHelperBusy(false);
    if (error || !data) return toast.error(error?.message || "Erro ao criar ajudante");
    setHelpers((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setForm((f) => ({ ...f, helper_id: data.id }));
    setHelperForm({ name: "", phone: "", document: "" });
    setHelperDialogOpen(false);
    toast.success("Ajudante criado e selecionado");
  };


  const availableVehicles = filtrarPorGrupo(
    vehicles.filter((v) => !busyVehicleIds.has(v.id)),
    grupoId,
    (v: any) => v.logistica_grupo_id,
  );
  const availableDrivers = filtrarPorGrupo(
    drivers.filter((d) => !busyDriverIds.has(d.id)),
    grupoId,
    (d: any) => d.logistica_grupo_id,
  );
  const selectedVehicle = vehicles.find((v) => v.id === form.vehicle_id);
  const selectedDriver = drivers.find((d) => d.id === form.driver_id);

  const requiredAngles = useMemo(() => angles.filter((a) => a.required), [angles]);
  const missingRequired = requiredAngles.filter((a) => !photos.some((p) => p.angle_key === a.key));

  const canNext = () => {
    if (step === 0) return !!form.vehicle_id;
    if (step === 1) return !!form.driver_id;
    if (step === 2) return !form.has_helper || !!form.helper_id;
    if (step === 3) return !photosRequired || missingRequired.length === 0;
    return true;
  };


  const goNext = () => {
    if (!canNext()) {
      if (step === 3) toast.error(`Fotos obrigatórias pendentes: ${missingRequired.map((a) => a.label).join(", ")}`);
      else toast.error("Complete os campos obrigatórios");
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    if (photosRequired && missingRequired.length > 0) {
      setStep(3);
      setPendentesOpen(true);
      return;
    }
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const estId = await getEstabelecimentoId();
    if (!estId) { setBusy(false); return toast.error("Estabelecimento não encontrado"); }
    const exitTime = new Date();
    const exitKm = selectedVehicle?.current_km ?? 0;

    const porteiro = await getRegistroPorteiro();
    const { data: mv, error } = await supabase.from("cv_vehicle_movements").insert({
      vehicle_id: form.vehicle_id,
      driver_id: form.driver_id,
      security_guard_id: user?.id ?? null,
      porteiro_saida_id: porteiro.porteiro_id,
      porteiro_saida_nome: porteiro.porteiro_nome,
      has_helper: form.has_helper,
      helper_id: form.has_helper ? form.helper_id : null,
      helper_name: form.has_helper ? (helpers.find(h => h.id === form.helper_id)?.name ?? null) : null,
      exit_time: exitTime.toISOString(),
      exit_km: exitKm,
      exit_notes: form.exit_notes || null,
      inspected_by: user?.id ?? null,
      status: "out",
      estabelecimento_id: estId,
    } as any).select().single();


    if (error || !mv) { setBusy(false); return toast.error(error?.message ?? "Erro"); }

    if (photos.length > 0) {
      await supabase.from("cv_movement_photos").insert(
        photos.map((p) => ({
          movement_id: mv.id,
          stage: "exit",
          angle_key: p.angle_key,
          angle_label: p.angle_label,
          photo_url: p.photo_url,
          caption: p.caption || null,
          is_extra: p.is_extra ?? false,
          created_by: user?.id ?? null,
        })),
      );
    }

    setBusy(false);
    setSuccessDetails({
      vehicleName: selectedVehicle?.name,
      vehiclePlate: selectedVehicle?.plate,
      driverName: selectedDriver?.name,
      exitTime: exitTime.toLocaleString("pt-BR"),
      photoCount: photos.length,
    });
    setShowSuccess(true);
    toast.success("Saída autorizada! Boa viagem");
    setForm({ vehicle_id: "", driver_id: "", has_helper: false, helper_id: "", helper_name: "", exit_notes: "" });
    setPhotos([]);

    setStep(0);
    load();
  };

  if (loading) {
    return <div className="max-w-lg mx-auto p-6"><Card><CardContent className="p-8 text-center text-muted-foreground">Carregando...</CardContent></Card></div>;
  }

  if (vehicles.length === 0 || drivers.length === 0 || availableVehicles.length === 0 || availableDrivers.length === 0) {
    return (
      <div className="max-w-lg mx-auto p-6">
        <Card className="border-warning">
          <CardHeader className="bg-warning/10 border-b">
            <CardTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5" /> Sem disponibilidade</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-2 text-sm">
            {availableVehicles.length === 0 && <p>⚠️ Nenhum veículo disponível no momento.</p>}
            {availableDrivers.length === 0 && <p>⚠️ Nenhum motorista disponível no momento.</p>}
            <a href="/controle-veiculos/movimentacoes" className="text-primary hover:underline">→ Ver movimentações ativas</a>
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
              <div className="p-3 bg-muted/50 rounded"><p className="text-xs text-muted-foreground">Veículo</p><p className="font-semibold">{successDetails.vehicleName} — {successDetails.vehiclePlate}</p></div>
              <div className="p-3 bg-muted/50 rounded"><p className="text-xs text-muted-foreground">Motorista</p><p className="font-semibold">{successDetails.driverName}</p></div>
              <div className="p-3 bg-muted/50 rounded"><p className="text-xs text-muted-foreground">Data/Hora</p><p className="font-semibold">{successDetails.exitTime}</p></div>
              <div className="p-3 bg-muted/50 rounded"><p className="text-xs text-muted-foreground">Fotos capturadas</p><p className="font-semibold">{successDetails.photoCount}</p></div>
              <Button className="w-full" onClick={() => setShowSuccess(false)}>OK</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        <CVPageHeader icon={LogOut} title="Registrar Saída" subtitle="Assistente passo a passo para autorizar a saída" />


        <Card className="max-w-4xl mx-auto shadow-sm">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between gap-2 overflow-x-auto">
              {STEPS.map((label, i) => {
                const active = i === step;
                const done = i < step;
                return (
                  <div key={label} className="flex items-center gap-2 shrink-0">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 ${
                      active ? "border-primary bg-primary text-primary-foreground"
                      : done ? "border-success bg-success/10 text-success"
                      : "border-muted-foreground/30 text-muted-foreground"
                    }`}>
                      {done ? <CheckCircle className="h-4 w-4" /> : i + 1}
                    </div>
                    <span className={`text-xs sm:text-sm hidden sm:inline ${active ? "font-semibold" : "text-muted-foreground"}`}>{label}</span>
                    {i < STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </div>
                );
              })}
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 min-h-[360px]">
            {step === 0 && (
              <div>
                <div className="mb-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
                  <div className="flex items-center gap-2"><Truck className="h-5 w-5 text-primary" /><h3 className="font-semibold">Selecione o veículo</h3></div>
                  <CVGrupoFilter value={grupoId} onChange={setGrupoId} grupos={grupos} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {availableVehicles.map((v) => {
                    const active = form.vehicle_id === v.id;
                    const al = alertas[v.id] ?? [];
                    const venc = al.some((a) => a.vencido);
                    return (
                      <button key={v.id} type="button" onClick={() => {
                          setForm({ ...form, vehicle_id: v.id });
                          if (al.length && !geradosRef.current.has(v.id)) {
                            geradosRef.current.add(v.id);
                            gerarOrdemAgrupada({ vehicleId: v.id, alertas: al, vehicleKm: v.current_km })
                              .then((r) => { if (r.criado) toast.success(`Ordem de manutenção gerada automaticamente (${r.itens} item(ns))`); })
                              .catch(() => {});
                          }
                        }}
                        className={`text-left p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                          active ? "border-primary bg-primary/5 shadow-md"
                            : venc ? "border-destructive bg-destructive/5"
                            : al.length ? "border-amber-500 bg-amber-500/5"
                            : "border-border bg-card"
                        }`}>
                        <div className="flex items-center justify-between mb-2">
                          <Car className={`h-5 w-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                          <div className="flex items-center gap-1.5">
                            <CVRastreamentoDot veiculoLogisticaId={(v as any).veiculo_id} dotOnly />
                            {active && <CheckCircle className="h-5 w-5 text-primary" />}
                          </div>
                        </div>
                        <p className="font-semibold truncate">{v.name}</p>
                        <Badge variant="outline" className="font-mono text-xs mt-1">{v.plate}</Badge>
                        <p className="text-xs text-muted-foreground mt-2">KM: {v.current_km?.toLocaleString()}</p>
                        <CVMaintenanceAlert alertas={al} compact />
                      </button>
                    );
                  })}
                  {availableVehicles.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhum veículo disponível neste grupo.</p>
                  )}
                </div>
              </div>


            )}

            {step === 1 && (
              <div>
                <div className="mb-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
                  <div className="flex items-center gap-2"><User className="h-5 w-5 text-primary" /><h3 className="font-semibold">Selecione o motorista</h3></div>
                  <CVGrupoFilter value={grupoId} onChange={setGrupoId} grupos={grupos} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {availableDrivers.map((d) => {
                    const active = form.driver_id === d.id;
                    return (
                      <button key={d.id} type="button" onClick={() => setForm({ ...form, driver_id: d.id })}
                        className={`text-left p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                          active ? "border-primary bg-primary/5 shadow-md" : "border-border bg-card"
                        }`}>
                        <div className="flex items-center justify-between mb-2">
                          <User className={`h-5 w-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                          {active && <CheckCircle className="h-5 w-5 text-primary" />}
                        </div>
                        <p className="font-semibold truncate">{d.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">CNH: {d.license}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 max-w-xl">
                <div className="mb-1 flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /><h3 className="font-semibold">Detalhes da saída</h3></div>
                <div className="p-3 bg-muted/50 rounded text-sm space-y-1">
                  <p className="flex items-center gap-2"><strong>Veículo:</strong> {selectedVehicle?.name} — {selectedVehicle?.plate} <CVRastreamentoDot veiculoLogisticaId={(selectedVehicle as any)?.veiculo_id} /></p>
                  <p><strong>Motorista:</strong> {selectedDriver?.name}</p>
                  <p><strong>KM saída:</strong> {selectedVehicle?.current_km?.toLocaleString()}</p>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox id="hasHelper" checked={form.has_helper}
                    onCheckedChange={(c) => setForm({ ...form, has_helper: !!c, helper_id: c ? form.helper_id : "" })} />
                  <Label htmlFor="hasHelper" className="flex items-center gap-2"><Users className="h-4 w-4" /> Há ajudante</Label>
                </div>
                {form.has_helper && (
                  <div className="space-y-2 ml-6">
                    <div className="flex items-center justify-between">
                      <Label>Selecione o ajudante</Label>
                      <Button type="button" variant="outline" size="sm" onClick={() => setHelperDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-1" /> Novo ajudante
                      </Button>
                    </div>
                    {helpers.length === 0 ? (
                      <div className="p-3 bg-muted/50 rounded text-sm text-muted-foreground">
                        Nenhum ajudante cadastrado. Clique em <strong className="text-primary">Novo ajudante</strong> para adicionar.
                      </div>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {helpers.map((h) => {
                          const active = form.helper_id === h.id;
                          return (
                            <button key={h.id} type="button" onClick={() => setForm({ ...form, helper_id: h.id })}
                              className={`text-left p-3 rounded-lg border-2 transition-all hover:shadow-sm ${
                                active ? "border-primary bg-primary/5" : "border-border bg-card"
                              }`}>
                              <div className="flex items-center justify-between mb-1">
                                <Users className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                                {active && <CheckCircle className="h-4 w-4 text-primary" />}
                              </div>
                              <p className="font-medium text-sm truncate">{h.name}</p>
                              {h.phone && <p className="text-xs text-muted-foreground truncate">{h.phone}</p>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Dialog para criar ajudante sem sair da tela */}
                <Dialog open={helperDialogOpen} onOpenChange={setHelperDialogOpen}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Novo ajudante</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="space-y-2">
                        <Label htmlFor="helperName">Nome completo</Label>
                        <Input id="helperName" value={helperForm.name} onChange={(e) => setHelperForm({ ...helperForm, name: e.target.value })}
                          placeholder="Ex: João Silva" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="helperPhone">WhatsApp</Label>
                        <Input id="helperPhone" inputMode="tel" value={helperForm.phone}
                          onChange={(e) => setHelperForm({ ...helperForm, phone: maskWhatsapp(e.target.value) })}
                          placeholder="(11) 99999-9999" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="helperDoc">CPF / Documento (opcional)</Label>
                        <Input id="helperDoc" value={helperForm.document} onChange={(e) => setHelperForm({ ...helperForm, document: e.target.value })}
                          placeholder="000.000.000-00" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="ghost" onClick={() => { setHelperForm({ name: "", phone: "", document: "" }); setHelperDialogOpen(false); }}>Cancelar</Button>
                      <Button type="button" onClick={criarHelper} disabled={helperBusy || !helperForm.name.trim()}>
                        {helperBusy ? "Salvando..." : "Salvar e selecionar"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>


                <div className="space-y-2">
                  <Label>Motivo/Observações</Label>
                  <Textarea rows={3} value={form.exit_notes} onChange={(e) => setForm({ ...form, exit_notes: e.target.value })}
                    placeholder='Ex: "Entrega em São Paulo", "Coleta no centro"...' />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2"><Camera className="h-5 w-5 text-primary" /><h3 className="font-semibold">Vistoria fotográfica</h3></div>
                {angles.length === 0 ? (
                  <div className="p-4 bg-muted/50 rounded text-sm text-muted-foreground">
                    Nenhum ângulo configurado. <a href="/controle-veiculos/vistoria-config" className="text-primary hover:underline">Configurar agora</a>
                  </div>
                ) : (
                  <>
                    {!photosRequired && (
                      <div className="p-3 bg-muted/50 border rounded text-sm text-muted-foreground">
                        As fotos estão marcadas como <strong>opcionais</strong> na configuração de vistoria.
                      </div>
                    )}
                    {photosRequired && missingRequired.length > 0 && (
                      <div className="p-3 bg-warning/10 border border-warning/30 rounded text-sm flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                        <span>Fotos obrigatórias pendentes: <strong>{missingRequired.map((a) => a.label).join(", ")}</strong></span>
                      </div>
                    )}
                    <CVPhotoCapture stage="exit" angles={angles} value={photos} onChange={setPhotos} vehicleId={form.vehicle_id} aiCompare />
                  <FotosPendentesDialog
                    open={pendentesOpen}
                    onOpenChange={setPendentesOpen}
                    angles={angles}
                    capturedKeys={photos.map((p) => p.angle_key)}
                    onIrParaFotos={() => setStep(3)}
                  />
                  </>
                )}


              </div>
            )}

            {step === 4 && (
              <div className="space-y-3 max-w-xl">
                <div className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-success" /><h3 className="font-semibold">Confirme os dados</h3></div>
                <div className="p-4 bg-muted/50 rounded text-sm space-y-2">
                  <p className="flex items-center gap-2"><strong>Veículo:</strong> {selectedVehicle?.name} — {selectedVehicle?.plate} <CVRastreamentoDot veiculoLogisticaId={(selectedVehicle as any)?.veiculo_id} /></p>
                  <p><strong>Motorista:</strong> {selectedDriver?.name}</p>
                  <p><strong>KM saída:</strong> {selectedVehicle?.current_km?.toLocaleString()}</p>
                  {form.has_helper && <p><strong>Ajudante:</strong> {form.helper_name}</p>}
                  {form.exit_notes && <p><strong>Observações:</strong> {form.exit_notes}</p>}
                  <p><strong>Fotos:</strong> {photos.length} de {angles.length}</p>
                </div>
              </div>
            )}
          </CardContent>

          <div className="p-4 sm:p-6 border-t flex flex-col-reverse sm:flex-row gap-3 sm:justify-between">
            <Button variant="outline" onClick={step === 0 ? () => window.history.back() : goBack}>
              {step === 0 ? <><X className="h-4 w-4 mr-2" />Cancelar</> : <><ChevronLeft className="h-4 w-4 mr-2" />Voltar</>}
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={goNext}>Próximo <ChevronRight className="h-4 w-4 ml-2" /></Button>
            ) : (
              <Button onClick={handleSubmit} disabled={busy} className="bg-warning text-warning-foreground hover:opacity-90">
                <Save className="h-4 w-4 mr-2" /> {busy ? "Registrando..." : "Confirmar Saída"}
              </Button>
            )}
          </div>
        </Card>

      </div>

    </>
  );
}
