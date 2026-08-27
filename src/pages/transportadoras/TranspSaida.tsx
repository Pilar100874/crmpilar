import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  LogOut, Truck, User, Camera, CheckCircle, Clock, PackageCheck, PackageOpen, ScanLine,
  AlertTriangle, ChevronRight, ChevronLeft, FileText,
} from "lucide-react";
import { toast } from "sonner";
import { CVPageHeader } from "@/pages/controle-veiculos/CVPageHeader";
import { FotosPendentesDialog } from "@/components/cv/FotosPendentesDialog";
import { CVPhotoCapture, type CapturedPhoto, type PhotoAngle } from "@/components/cv/CVPhotoCapture";
import { NfeScannerDialog } from "@/components/transportadoras/NfeScannerDialog";
import { formatarChave, parseChaveNfe } from "@/lib/transportadoras/nfe";
import { TRANSP_ANGLES } from "@/lib/transportadoras/dados";

type StepKey = "veiculo" | "nfe" | "fotos" | "confirmacao";

const STEP_LABELS: Record<StepKey, string> = {
  veiculo: "Veículo",
  nfe: "NF-e da Carga",
  fotos: "Fotos",
  confirmacao: "Confirmação",
};

export default function TranspSaida() {
  const [movs, setMovs] = useState<any[]>([]);
  
  const [sel, setSel] = useState<any | null>(null);
  const [obs, setObs] = useState("");
  const [nfeSaida, setNfeSaida] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sucesso, setSucesso] = useState<any>(null);
  const [angles, setAngles] = useState<PhotoAngle[]>(TRANSP_ANGLES);
  const [photosRequired, setPhotosRequired] = useState(true);
  const [pendentesOpen, setPendentesOpen] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);

  const load = async () => {
    setLoading(true);
    const [m, cfg] = await Promise.all([
      supabase.from("transp_movimentos").select("*").neq("status", "saiu").order("entrada_time", { ascending: false }),
      supabase.from("transp_inspection_config").select("*").eq("active", true).limit(1).maybeSingle(),
    ]);
    const cfgAngles = ((cfg.data as any)?.exit_photos ?? []) as PhotoAngle[];
    setAngles(cfgAngles.length ? cfgAngles : TRANSP_ANGLES);
    setPhotosRequired((cfg.data as any)?.exit_photos_required ?? true);
    setMovs((m.data ?? []) as any[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const coleta = (sel?.tipo_operacao ?? "entrega") === "coleta";
  const liberado = sel?.status === "liberado";
  const nfeInfo = useMemo(() => (nfeSaida ? parseChaveNfe(nfeSaida) : null), [nfeSaida]);

  const steps: StepKey[] = useMemo(() => {
    const s: StepKey[] = ["veiculo"];
    if (sel) {
      if (coleta) s.push("nfe");
      s.push("fotos", "confirmacao");
    }
    return s;
  }, [sel, coleta]);

  const currentStep: StepKey = steps[Math.min(stepIdx, steps.length - 1)] ?? "veiculo";

  const missingRequired = useMemo(
    () => angles.filter((a) => a.required).filter((a) => !photos.some((p) => p.angle_key === a.key)),
    [angles, photos],
  );

  const selecionar = (m: any) => {
    setSel(m);
    setPhotos([]); setObs(""); setNfeSaida("");
    setStepIdx(1); // avança para NF-e ou Fotos
  };

  const canNext = () => {
    if (currentStep === "veiculo") return !!sel;
    if (currentStep === "nfe") return nfeSaida.length === 44;
    if (currentStep === "fotos") return !photosRequired || missingRequired.length === 0;
    return true;
  };

  const goNext = () => {
    if (!canNext()) {
      if (currentStep === "veiculo") toast.error("Selecione um veículo");
      else if (currentStep === "nfe") toast.error("Leia o QR Code / código de barras da NF-e da carga");
      else if (currentStep === "fotos") toast.error(`Fotos obrigatórias pendentes: ${missingRequired.map((a) => a.label).join(", ")}`);
      return;
    }
    setStepIdx((i) => Math.min(i + 1, steps.length - 1));
  };
  const goBack = () => setStepIdx((i) => Math.max(i - 1, 0));

  const cancelar = () => {
    setSel(null); setObs(""); setPhotos([]); setNfeSaida(""); setStepIdx(0);
  };

  const registrar = async () => {
    if (!sel) return;
    if (photosRequired && missingRequired.length > 0) {
      setPendentesOpen(true);
      return;
    }
    if (!liberado) return toast.error("Veículo ainda não foi liberado na tela de Liberação");
    if (coleta && nfeSaida.length !== 44) return toast.error("Leia o QR Code / código de barras da NF-e da carga");

    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const saida = new Date();
    const { error } = await supabase.from("transp_movimentos").update({
      saida_time: saida.toISOString(),
      saida_obs: obs || null,
      saida_por: user?.id ?? null,
      saida_nfe_chave: coleta ? nfeSaida : null,
      saida_nfe_dados: coleta && nfeInfo ? nfeInfo : null,
      status: "saiu",
    } as any).eq("id", sel.id);
    if (error) { setBusy(false); return toast.error(error.message); }

    if (photos.length) {
      await supabase.from("transp_movimento_fotos").insert(
        photos.map((p) => ({
          movimento_id: sel.id,
          stage: "saida",
          angle_key: p.angle_key,
          angle_label: p.angle_label,
          photo_url: p.photo_url,
          caption: p.caption || null,
          is_extra: p.is_extra ?? false,
          created_by: user?.id ?? null,
        })) as any,
      );
    }

    setBusy(false);
    setSucesso({ placa: sel.placa, motorista: sel.motorista_nome, hora: saida.toLocaleString("pt-BR"), fotos: photos.length });
    toast.success("Saída registrada!");
    cancelar();
    load();
  };

  if (loading) return <Card><CardContent className="p-8 text-center text-muted-foreground">Carregando...</CardContent></Card>;

  const lastIdx = steps.length - 1;
  const onLast = stepIdx === lastIdx && currentStep === "confirmacao";

  return (
    <>
      <Dialog open={!!sucesso} onOpenChange={() => setSucesso(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-3 p-3 bg-emerald-500/10 rounded-full w-fit"><CheckCircle className="h-8 w-8 text-emerald-500" /></div>
            <DialogTitle className="text-center">Saída registrada</DialogTitle>
          </DialogHeader>
          {sucesso && (
            <div className="space-y-2 text-center text-sm">
              <div className="p-3 bg-muted/50 rounded"><p className="text-xs text-muted-foreground">Veículo</p><p className="font-semibold font-mono">{sucesso.placa}</p></div>
              <div className="p-3 bg-muted/50 rounded"><p className="text-xs text-muted-foreground">Motorista</p><p className="font-semibold">{sucesso.motorista}</p></div>
              <div className="p-3 bg-muted/50 rounded"><p className="text-xs text-muted-foreground">Data/Hora</p><p className="font-semibold">{sucesso.hora}</p></div>
              <Button className="w-full" onClick={() => setSucesso(null)}>OK</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <NfeScannerDialog open={scannerOpen} onOpenChange={setScannerOpen} onDetected={(c) => { setNfeSaida(c); toast.success("NF-e da carga lida"); }} />

      <div className="space-y-4">
        <CVPageHeader icon={LogOut} title="Registrar Saída" subtitle="Assistente passo a passo para liberar a saída do veículo" />

        {movs.length === 0 ? (
          <Card><CardContent className="py-16 text-center text-muted-foreground">
            <Truck className="h-12 w-12 mx-auto mb-3 opacity-40" />
            Nenhum veículo de transportadora dentro do pátio.
          </CardContent></Card>
        ) : (
          <Card className="max-w-4xl mx-auto shadow-sm">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between gap-2 overflow-x-auto">
                {steps.map((key, i) => {
                  const active = i === stepIdx;
                  const done = i < stepIdx;
                  return (
                    <div key={key} className="flex items-center gap-2 shrink-0">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 ${
                        active ? "border-primary bg-primary text-primary-foreground"
                        : done ? "border-emerald-500 bg-emerald-500/10 text-emerald-600"
                        : "border-muted-foreground/30 text-muted-foreground"
                      }`}>
                        {done ? <CheckCircle className="h-4 w-4" /> : i + 1}
                      </div>
                      <span className={`text-xs sm:text-sm hidden sm:inline ${active ? "font-semibold" : "text-muted-foreground"}`}>{STEP_LABELS[key]}</span>
                      {i < steps.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  );
                })}
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 min-h-[360px]">
              {currentStep === "veiculo" && (
                <div>
                  <div className="mb-3 flex items-center gap-2"><Truck className="h-5 w-5 text-primary" /><h3 className="font-semibold">Selecione o veículo no pátio</h3></div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {movs.map((m) => {
                      const active = sel?.id === m.id;
                      const entrega = (m.tipo_operacao ?? "entrega") === "entrega";
                      const lib = m.status === "liberado";
                      return (
                        <button key={m.id} type="button" onClick={() => selecionar(m)}
                          className={`text-left p-4 rounded-lg border-2 transition-all hover:shadow-md ${active ? "border-primary bg-primary/5 shadow-md" : "border-border bg-card"}`}>
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="font-mono text-xs">{m.placa || "—"}</Badge>
                            {active && <CheckCircle className="h-5 w-5 text-primary" />}
                          </div>
                          
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><User className="h-3 w-3" />{m.motorista_nome || "—"}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(m.entrada_time).toLocaleString("pt-BR")}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            <Badge variant="secondary" className="gap-1">
                              {entrega ? <PackageCheck className="h-3 w-3" /> : <PackageOpen className="h-3 w-3" />}
                              {entrega ? "Entrega" : "Coleta"}
                            </Badge>
                            <Badge variant={lib ? "default" : "outline"} className="gap-1">
                              {lib ? "Liberado" : "Aguardando liberação"}
                            </Badge>
                          </div>
                          {m.nfe_chave && <p className="text-[10px] font-mono text-muted-foreground mt-1 break-all">NF-e {String(m.nfe_chave).slice(25, 34).replace(/^0+/, "")}</p>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {currentStep === "nfe" && sel && (
                <div className="space-y-4 max-w-xl">
                  <div className="flex items-center gap-2"><ScanLine className="h-5 w-5 text-primary" /><h3 className="font-semibold">NF-e da carga (coleta)</h3></div>
                  <p className="text-xs text-muted-foreground">Leia o QR Code ou o código de barras da nota fiscal da carga que está saindo.</p>
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                    <div className="flex-1">
                      <Label>Chave da NF-e *</Label>
                      <Input value={nfeSaida} onChange={(e) => setNfeSaida(e.target.value.replace(/\D/g, "").slice(0, 44))}
                        placeholder="Leia o QR Code / código de barras" inputMode="numeric" />
                    </div>
                    <Button onClick={() => setScannerOpen(true)}><ScanLine className="h-4 w-4 mr-1" />Ler NF-e</Button>
                  </div>
                  {nfeInfo && (
                    <div className="grid gap-2 sm:grid-cols-2 text-xs bg-muted/40 rounded p-3">
                      <p><span className="text-muted-foreground">Número/Série: </span><b>{nfeInfo.numero}/{nfeInfo.serie}</b></p>
                      <p><span className="text-muted-foreground">Emitente: </span><b>{nfeInfo.cnpj_emitente}</b></p>
                      <p className="sm:col-span-2 font-mono break-all text-[10px]">{formatarChave(nfeInfo.chave)}</p>
                    </div>
                  )}
                </div>
              )}

              {currentStep === "fotos" && sel && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2"><Camera className="h-5 w-5 text-primary" /><h3 className="font-semibold">Fotos da saída</h3></div>
                  <p className="text-xs text-muted-foreground">Registro fotográfico simples — sem comparação ou validação de avarias.</p>
                  {photosRequired && missingRequired.length > 0 && (
                    <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                      Fotos obrigatórias pendentes: <strong>{missingRequired.map((a) => a.label).join(", ")}</strong>
                    </div>
                  )}
                  <CVPhotoCapture angles={angles} stage="exit" value={photos} onChange={setPhotos} aiCompare={false} />
                  <div className="max-w-xl"><Label>Observações da saída</Label><Textarea rows={3} value={obs} onChange={(e) => setObs(e.target.value)} /></div>
                </div>
              )}

              {currentStep === "confirmacao" && sel && (
                <div className="space-y-4 max-w-xl">
                  <div className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /><h3 className="font-semibold">Confirmação da saída</h3></div>
                  {!liberado && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                      <p>Este veículo ainda não foi liberado. Faça a liberação na tela "Liberação" antes de registrar a saída.</p>
                    </div>
                  )}
                  <div className="rounded-lg border divide-y text-sm">
                    <div className="p-3 flex justify-between gap-2"><span className="text-muted-foreground">Placa</span><b className="font-mono">{sel.placa || "—"}</b></div>
                    
                    <div className="p-3 flex justify-between gap-2"><span className="text-muted-foreground">Motorista</span><b>{sel.motorista_nome || "—"}</b></div>
                    <div className="p-3 flex justify-between gap-2"><span className="text-muted-foreground">Operação</span><b>{coleta ? "Coleta" : "Entrega"}</b></div>
                    <div className="p-3 flex justify-between gap-2"><span className="text-muted-foreground">Entrada</span><b>{new Date(sel.entrada_time).toLocaleString("pt-BR")}</b></div>
                    {coleta && nfeInfo && (
                      <div className="p-3 flex justify-between gap-2"><span className="text-muted-foreground">NF-e da carga</span><b>{nfeInfo.numero}/{nfeInfo.serie}</b></div>
                    )}
                    <div className="p-3 flex justify-between gap-2"><span className="text-muted-foreground">Fotos capturadas</span><b>{photos.length}</b></div>
                    {obs && <div className="p-3"><span className="text-muted-foreground">Observações: </span>{obs}</div>}
                  </div>
                </div>
              )}
            </CardContent>

            <div className="flex items-center justify-between gap-2 border-t p-4">
              <Button variant="outline" onClick={stepIdx === 0 ? cancelar : goBack} disabled={busy}>
                <ChevronLeft className="h-4 w-4 mr-1" />{stepIdx === 0 ? "Cancelar" : "Voltar"}
              </Button>
              {onLast ? (
                <Button onClick={registrar} disabled={busy || !liberado}>
                  {busy ? "Salvando..." : "Confirmar saída"}<CheckCircle className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                stepIdx > 0 && (
                  <Button onClick={goNext} disabled={!canNext()}>
                    Avançar<ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )
              )}
            </div>
          </Card>
        )}

        <FotosPendentesDialog
          open={pendentesOpen}
          onOpenChange={setPendentesOpen}
          angles={angles}
          capturedKeys={photos.map((p) => p.angle_key)}
        />
      </div>
    </>
  );
}
