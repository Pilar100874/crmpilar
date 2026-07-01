import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  LogOut, Car, User, Users, FileText, Camera, CheckCircle, ChevronRight, ChevronLeft,
  AlertCircle, Save, X, Truck,
} from "lucide-react";
import { toast } from "sonner";
import { CVPageHeader } from "./CVPageHeader";
import { CVPhotoCapture, type CapturedPhoto, type PhotoAngle } from "@/components/cv/CVPhotoCapture";
import type { Vehicle, Driver } from "@/types/vehicle";

const STEPS = ["Veículo", "Motorista", "Detalhes", "Fotos", "Confirmação"] as const;

export default function CVVehicleExit() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [helpers, setHelpers] = useState<{ id: string; name: string; phone: string | null }[]>([]);
  const [busyVehicleIds, setBusyVehicleIds] = useState<Set<string>>(new Set());
  const [busyDriverIds, setBusyDriverIds] = useState<Set<string>>(new Set());
  const [angles, setAngles] = useState<PhotoAngle[]>([]);
  const [photosRequired, setPhotosRequired] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successDetails, setSuccessDetails] = useState<any>(null);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    vehicle_id: "", driver_id: "", has_helper: false, helper_id: "", helper_name: "", exit_notes: "",
  });
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);

  const load = async () => {
    setLoading(true);
    const [v, d, h, m, cfg] = await Promise.all([
      supabase.from("cv_vehicles").select("*").eq("active", true).order("name"),
      supabase.from("cv_drivers").select("*").eq("active", true).order("name"),
      supabase.from("cv_helpers").select("id,name,phone").eq("active", true).order("name"),
      supabase.from("cv_vehicle_movements").select("vehicle_id, driver_id").eq("status", "out"),
      supabase.from("cv_inspection_config").select("*").eq("active", true).limit(1).maybeSingle(),
    ]);
    setVehicles((v.data ?? []) as Vehicle[]);
    setDrivers((d.data ?? []) as Driver[]);
    setHelpers((h.data ?? []) as any);
    setBusyVehicleIds(new Set((m.data ?? []).map((x: any) => x.vehicle_id)));
    setBusyDriverIds(new Set((m.data ?? []).map((x: any) => x.driver_id)));
    setAngles(((cfg.data?.exit_photos as any) ?? []) as PhotoAngle[]);
    setPhotosRequired((cfg.data as any)?.exit_photos_required ?? true);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);


  const availableVehicles = vehicles.filter((v) => !busyVehicleIds.has(v.id));
  const availableDrivers = drivers.filter((d) => !busyDriverIds.has(d.id));
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
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const exitTime = new Date();
    const exitKm = selectedVehicle?.current_km ?? 0;

    const { data: mv, error } = await supabase.from("cv_vehicle_movements").insert({
      vehicle_id: form.vehicle_id,
      driver_id: form.driver_id,
      security_guard_id: user?.id ?? null,
      has_helper: form.has_helper,
      helper_id: form.has_helper ? form.helper_id : null,
      helper_name: form.has_helper ? (helpers.find(h => h.id === form.helper_id)?.name ?? null) : null,
      exit_time: exitTime.toISOString(),
      exit_km: exitKm,
      exit_notes: form.exit_notes || null,
      inspected_by: user?.id ?? null,
      status: "out",
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
                <div className="mb-3 flex items-center gap-2"><Truck className="h-5 w-5 text-primary" /><h3 className="font-semibold">Selecione o veículo</h3></div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {availableVehicles.map((v) => {
                    const active = form.vehicle_id === v.id;
                    return (
                      <button key={v.id} type="button" onClick={() => setForm({ ...form, vehicle_id: v.id })}
                        className={`text-left p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                          active ? "border-primary bg-primary/5 shadow-md" : "border-border bg-card"
                        }`}>
                        <div className="flex items-center justify-between mb-2">
                          <Car className={`h-5 w-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                          {active && <CheckCircle className="h-5 w-5 text-primary" />}
                        </div>
                        <p className="font-semibold truncate">{v.name}</p>
                        <Badge variant="outline" className="font-mono text-xs mt-1">{v.plate}</Badge>
                        <p className="text-xs text-muted-foreground mt-2">KM: {v.current_km?.toLocaleString()}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 1 && (
              <div>
                <div className="mb-3 flex items-center gap-2"><User className="h-5 w-5 text-primary" /><h3 className="font-semibold">Selecione o motorista</h3></div>
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
                  <p><strong>Veículo:</strong> {selectedVehicle?.name} — {selectedVehicle?.plate}</p>
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
                    <Label>Selecione o ajudante</Label>
                    {helpers.length === 0 ? (
                      <div className="p-3 bg-muted/50 rounded text-sm text-muted-foreground">
                        Nenhum ajudante cadastrado. <a href="/controle-veiculos/ajudantes" className="text-primary hover:underline">Cadastrar agora</a>
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
                    <CVPhotoCapture stage="exit" angles={angles} value={photos} onChange={setPhotos} />
                  </>
                )}


              </div>
            )}

            {step === 4 && (
              <div className="space-y-3 max-w-xl">
                <div className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-success" /><h3 className="font-semibold">Confirme os dados</h3></div>
                <div className="p-4 bg-muted/50 rounded text-sm space-y-2">
                  <p><strong>Veículo:</strong> {selectedVehicle?.name} — {selectedVehicle?.plate}</p>
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
