import { useEffect, useMemo, useState } from "react";
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
  LogIn, Car, Clock, AlertTriangle, CheckCircle, Save, X, ChevronLeft, ChevronRight,
  Camera, Tags, AlertCircle, MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { CVPageHeader } from "./CVPageHeader";
import { CVPhotoCapture, type CapturedPhoto, type PhotoAngle } from "@/components/cv/CVPhotoCapture";
import { CamerasLivePanel } from "@/components/cameras/CamerasLivePanel";
import { getEstabelecimentoId } from "@/lib/estabelecimento";

const STEPS = ["Veículo", "KM & Defeitos", "Fotos", "Confirmação"] as const;

export default function CVVehicleEntry() {
  const [openMoves, setOpenMoves] = useState<any[]>([]);
  const [defectTypes, setDefectTypes] = useState<any[]>([]);
  const [angles, setAngles] = useState<PhotoAngle[]>([]);
  const [photosRequired, setPhotosRequired] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    entry_km: 0,
    reported_defects: "",
    defect_type_id: "",
    damage_notes: "",
    inspected_all_sides: false,
  });
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);

  const load = async () => {
    setLoading(true);
    const [m, dt, cfg] = await Promise.all([
      supabase.from("cv_vehicle_movements")
        .select("*, vehicle:cv_vehicles(*), driver:cv_drivers(*)")
        .eq("status", "out").order("exit_time", { ascending: false }),
      supabase.from("cv_defect_types").select("*").neq("category", "bodywork").order("name"),
      supabase.from("cv_inspection_config").select("*").eq("active", true).limit(1).maybeSingle(),
    ]);
    setOpenMoves(m.data ?? []);
    setDefectTypes(dt.data ?? []);
    setAngles(((cfg.data?.entry_photos as any) ?? []) as PhotoAngle[]);
    setPhotosRequired((cfg.data as any)?.entry_photos_required ?? true);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);


  const handleSelectVehicle = (move: any) => {
    setSelected(move);
    setForm({
      entry_km: (move.exit_km ?? 0) + 1,
      reported_defects: "",
      defect_type_id: "",
      damage_notes: "",
      inspected_all_sides: false,
    });
    setPhotos([]);
    setStep(1);
  };

  const requiredAngles = useMemo(() => angles.filter((a) => a.required), [angles]);
  const missingRequired = requiredAngles.filter((a) => !photos.some((p) => p.angle_key === a.key));

  const canNext = () => {
    if (step === 1) {
      if (!selected) return false;
      if (form.entry_km <= selected.exit_km) return false;
      if (form.reported_defects.trim() && !form.defect_type_id) return false;
      return true;
    }
    if (step === 2) return !photosRequired || missingRequired.length === 0;
    return true;
  };

  const goNext = () => {
    if (!canNext()) {
      if (step === 1) {
        if (form.entry_km <= selected.exit_km) toast.error(`KM deve ser maior que ${selected.exit_km}`);
        else if (form.reported_defects.trim() && !form.defect_type_id) toast.error("Selecione a categoria do defeito");
      } else if (step === 2) {
        toast.error(`Fotos obrigatórias pendentes: ${missingRequired.map((a) => a.label).join(", ")}`);
      }
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const goBack = () => {
    if (step === 1) { setSelected(null); setStep(0); return; }
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleSubmit = async () => {
    if (!selected) return;
    if (!form.inspected_all_sides) return toast.error("Confirme a vistoria nos 4 lados");
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const estId = await getEstabelecimentoId();


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

    if (error) { setBusy(false); return toast.error(error.message); }

    await supabase.from("cv_vehicles").update({ current_km: form.entry_km }).eq("id", selected.vehicle_id);

    if (photos.length > 0) {
      await supabase.from("cv_movement_photos").insert(
        photos.map((p) => ({
          movement_id: selected.id,
          stage: "entry",
          angle_key: p.angle_key,
          angle_label: p.angle_label,
          photo_url: p.photo_url,
          created_by: user?.id ?? null,
        })),
      );
    }

    if (form.reported_defects && form.defect_type_id) {
      await supabase.from("cv_defect_reports").insert({
        vehicle_id: selected.vehicle_id,
        driver_id: selected.driver_id,
        movement_id: selected.id,
        defect_type_id: form.defect_type_id,
        defect_description: form.reported_defects,
        reported_by: user?.id ?? null,
        status: "pending",
        estabelecimento_id: estId,
      });
    }

    if (form.damage_notes) {
      let { data: bw } = await supabase.from("cv_defect_types")
        .select("id").eq("category", "bodywork").limit(1).maybeSingle();
      if (!bw) {
        const { data: newT } = await supabase.from("cv_defect_types")
          .insert({ name: "Avaria de Carroceria", description: "Avarias na vistoria", category: "bodywork", estabelecimento_id: estId })
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
          estabelecimento_id: estId,
        });
      }
    }

    setBusy(false);
    toast.success("Entrada registrada com sucesso!");
    setSelected(null);
    setStep(0);
    setPhotos([]);
    load();
  };

  if (loading) {
    return <div className="max-w-lg mx-auto p-6"><Card><CardContent className="p-8 text-center text-muted-foreground">Carregando...</CardContent></Card></div>;
  }

  if (openMoves.length === 0) {
    return (
      <div className="max-w-lg mx-auto p-6">
        <Card>
          <CardHeader className="bg-success/10 border-b">
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

  return (
    <div className="space-y-4">
      <CVPageHeader icon={LogIn} title="Registrar Entrada" subtitle="Assistente passo a passo para o retorno" />

      

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
              <div className="mb-3 flex items-center gap-2"><Clock className="h-5 w-5 text-primary" /><h3 className="font-semibold">Selecione o veículo que está retornando</h3></div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {openMoves.map((m) => {
                  const timeOut = Date.now() - new Date(m.exit_time).getTime();
                  const h = Math.floor(timeOut / 3600000);
                  const min = Math.floor((timeOut % 3600000) / 60000);
                  return (
                    <button key={m.id} type="button" onClick={() => handleSelectVehicle(m)}
                      className="text-left p-4 rounded-lg border-2 border-l-4 border-l-amber-500 border-border bg-card hover:shadow-md hover:-translate-y-0.5 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Car className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-semibold truncate">{m.vehicle?.name}</span>
                        </div>
                        <Badge variant="outline" className="font-mono text-xs">{m.vehicle?.plate}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate"><span className="font-medium">Motorista:</span> {m.driver?.name}</p>
                      {m.has_helper && <Badge variant="outline" className="text-xs mt-2">Ajudante: {m.helper_name}</Badge>}
                      <div className="pt-2 mt-2 border-t space-y-1">
                        <p className="text-xs text-muted-foreground">Saída: {new Date(m.exit_time).toLocaleString("pt-BR")}</p>
                        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0">
                          <Clock className="h-3 w-3 mr-1" />{h}h {min}min em trânsito
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step >= 1 && selected && (
            <div className="mb-4 p-3 bg-muted/50 rounded text-sm">
              <strong>{selected.vehicle?.name}</strong> — {selected.vehicle?.plate} · Motorista: {selected.driver?.name} · Saída: {new Date(selected.exit_time).toLocaleString("pt-BR")}
            </div>
          )}

          {step === 1 && selected && (
            <div className="space-y-4 max-w-xl">
              <div className="space-y-2">
                <Label>Quilometragem de Entrada</Label>
                <Input
                  type="number"
                  min={(selected.exit_km ?? 0) + 1}
                  value={form.entry_km}
                  onChange={(e) => setForm({ ...form, entry_km: +e.target.value })}
                  className={form.entry_km <= (selected.exit_km ?? 0) ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                <p className="text-xs text-muted-foreground">
                  KM da saída: {selected.exit_km?.toLocaleString()} · mínimo permitido: {((selected.exit_km ?? 0) + 1).toLocaleString()}
                  {form.entry_km > (selected.exit_km ?? 0) && (
                    <span className="ml-2 text-primary">(+{(form.entry_km - selected.exit_km).toLocaleString()} km)</span>
                  )}
                </p>
                {form.entry_km <= (selected.exit_km ?? 0) && (
                  <p className="text-xs text-destructive">A KM de entrada deve ser maior que a KM de saída.</p>
                )}
              </div>


              <div className="space-y-2">
                <Label className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" /> Defeitos Reportados pelo Motorista</Label>
                <Textarea rows={3} value={form.reported_defects}
                  onChange={(e) => setForm({ ...form, reported_defects: e.target.value })}
                  placeholder="Descreva defeitos reportados..." />
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
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
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
                <p className="text-xs text-muted-foreground flex items-center gap-1"><MessageSquare className="h-3 w-3" /> Serão registradas como defeitos de carroceria</p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2"><Camera className="h-5 w-5 text-primary" /><h3 className="font-semibold">Vistoria fotográfica de entrada</h3></div>
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

                  <CVPhotoCapture stage="entry" angles={angles} value={photos} onChange={setPhotos} vehicleId={selected?.vehicle_id} aiCompare />
                </>
              )}
            </div>
          )}

          {step === 3 && selected && (
            <div className="space-y-3 max-w-xl">
              <div className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-success" /><h3 className="font-semibold">Confirme os dados</h3></div>
              <div className="p-4 bg-muted/50 rounded text-sm space-y-2">
                <p><strong>Veículo:</strong> {selected.vehicle?.name} — {selected.vehicle?.plate}</p>
                <p><strong>Motorista:</strong> {selected.driver?.name}</p>
                <p><strong>KM entrada:</strong> {form.entry_km.toLocaleString()} (+{(form.entry_km - selected.exit_km).toLocaleString()} km)</p>
                {form.reported_defects && <p><strong>Defeitos reportados:</strong> {form.reported_defects}</p>}
                {form.damage_notes && <p><strong>Avarias:</strong> {form.damage_notes}</p>}
                <p><strong>Fotos:</strong> {photos.length} de {angles.length}</p>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="all4" checked={form.inspected_all_sides}
                  onCheckedChange={(c) => setForm({ ...form, inspected_all_sides: !!c })} />
                <Label htmlFor="all4" className="flex items-center gap-2 font-medium text-primary">
                  <CheckCircle className="h-4 w-4" /> Vistoria completa realizada (obrigatório)
                </Label>
              </div>
            </div>
          )}
        </CardContent>

        <div className="p-4 sm:p-6 border-t flex flex-col-reverse sm:flex-row gap-3 sm:justify-between">
          <Button variant="outline" onClick={step === 0 ? () => window.history.back() : goBack}>
            {step === 0 ? <><X className="h-4 w-4 mr-2" />Cancelar</> : <><ChevronLeft className="h-4 w-4 mr-2" />Voltar</>}
          </Button>
          {step === 0 ? null : step < STEPS.length - 1 ? (
            <Button onClick={goNext}>Próximo <ChevronRight className="h-4 w-4 ml-2" /></Button>
          ) : (
            <Button onClick={handleSubmit} disabled={busy} className="bg-success text-success-foreground hover:opacity-90">
              <Save className="h-4 w-4 mr-2" /> {busy ? "Registrando..." : "Confirmar Entrada"}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
