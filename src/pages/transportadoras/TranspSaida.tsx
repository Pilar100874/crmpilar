import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  LogOut, Truck, User, Camera, CheckCircle, Clock, PackageCheck, PackageOpen, ScanLine, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { CVPageHeader } from "@/pages/controle-veiculos/CVPageHeader";
import { CVPhotoCapture, type CapturedPhoto, type PhotoAngle } from "@/components/cv/CVPhotoCapture";
import { NfeScannerDialog } from "@/components/transportadoras/NfeScannerDialog";
import { formatarChave, parseChaveNfe } from "@/lib/transportadoras/nfe";
import { TRANSP_ANGLES, listarTransportadoras, nomeTransportadora, type TranspEmpresa } from "@/lib/transportadoras/dados";

export default function TranspSaida() {
  const [movs, setMovs] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<TranspEmpresa[]>([]);
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

  const load = async () => {
    setLoading(true);
    const [emp, m, cfg] = await Promise.all([
      listarTransportadoras(),
      supabase.from("transp_movimentos").select("*").neq("status", "saiu").order("entrada_time", { ascending: false }),
      supabase.from("cv_inspection_config").select("*").eq("active", true).limit(1).maybeSingle(),
    ]);
    const cfgAngles = ((cfg.data as any)?.exit_photos ?? []) as PhotoAngle[];
    setAngles(cfgAngles.length ? cfgAngles : TRANSP_ANGLES);
    setPhotosRequired((cfg.data as any)?.exit_photos_required ?? true);
    setEmpresas(emp);
    setMovs((m.data ?? []) as any[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const empNome = (id: string | null) => nomeTransportadora(empresas.find((e) => e.id === id));
  const coleta = (sel?.tipo_operacao ?? "entrega") === "coleta";
  const nfeInfo = useMemo(() => (nfeSaida ? parseChaveNfe(nfeSaida) : null), [nfeSaida]);

  const missingRequired = useMemo(
    () => angles.filter((a) => a.required).filter((a) => !photos.some((p) => p.angle_key === a.key)),
    [angles, photos],
  );

  const registrar = async () => {
    if (!sel) return;
    if (photosRequired && missingRequired.length > 0) {
      return toast.error(`Fotos obrigatórias pendentes: ${missingRequired.map((a) => a.label).join(", ")}`);
    }
    if (sel.status !== "liberado") return toast.error("Veículo ainda não foi liberado na tela de Liberação");
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
    setSel(null); setObs(""); setPhotos([]); setNfeSaida("");
    load();
  };

  if (loading) return <Card><CardContent className="p-8 text-center text-muted-foreground">Carregando...</CardContent></Card>;

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
        <CVPageHeader icon={LogOut} title="Registrar Saída" subtitle="Libere a saída dos veículos que estão no pátio" />

        {movs.length === 0 ? (
          <Card><CardContent className="py-16 text-center text-muted-foreground">
            <Truck className="h-12 w-12 mx-auto mb-3 opacity-40" />
            Nenhum veículo de transportadora dentro do pátio.
          </CardContent></Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {movs.map((m) => {
              const active = sel?.id === m.id;
              const entrega = (m.tipo_operacao ?? "entrega") === "entrega";
              const liberado = m.status === "liberado";
              return (
                <button key={m.id} type="button" onClick={() => { setSel(m); setPhotos([]); setObs(""); setNfeSaida(""); }}
                  className={`text-left p-4 rounded-lg border-2 transition-all hover:shadow-md ${active ? "border-primary bg-primary/5 shadow-md" : "border-border bg-card"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="font-mono text-xs">{m.placa || "—"}</Badge>
                    {active && <CheckCircle className="h-5 w-5 text-primary" />}
                  </div>
                  <p className="font-semibold truncate">{empNome(m.transportadora_id)}</p>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><User className="h-3 w-3" />{m.motorista_nome || "—"}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(m.entrada_time).toLocaleString("pt-BR")}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge variant="secondary" className="gap-1">
                      {entrega ? <PackageCheck className="h-3 w-3" /> : <PackageOpen className="h-3 w-3" />}
                      {entrega ? "Entrega" : "Coleta"}
                    </Badge>
                    <Badge variant={liberado ? "default" : "outline"} className="gap-1">
                      {liberado ? "Liberado" : "Aguardando liberação"}
                    </Badge>
                  </div>
                  {m.nfe_chave && <p className="text-[10px] font-mono text-muted-foreground mt-1 break-all">NF-e {String(m.nfe_chave).slice(25, 34).replace(/^0+/, "")}</p>}
                </button>
              );
            })}
          </div>
        )}

        {sel && (
          <Card className="max-w-4xl">
            <CardContent className="p-4 sm:p-6 space-y-4">
              {sel.status !== "liberado" && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                  <p>Este veículo ainda não foi liberado. Faça a liberação na tela "Liberação" antes de registrar a saída.</p>
                </div>
              )}

              {coleta && (
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center gap-2"><ScanLine className="h-5 w-5 text-primary" /><h3 className="font-semibold">NF-e da carga (coleta)</h3></div>
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

              <div className="flex items-center gap-2"><Camera className="h-5 w-5 text-primary" /><h3 className="font-semibold">Fotos da saída</h3></div>
              <p className="text-xs text-muted-foreground">Registro fotográfico simples — sem comparação ou validação de avarias.</p>
              {photosRequired && missingRequired.length > 0 && (
                <div className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  Fotos obrigatórias pendentes: <strong>{missingRequired.map((a) => a.label).join(", ")}</strong>
                </div>
              )}
              <CVPhotoCapture angles={angles} stage="exit" value={photos} onChange={setPhotos} aiCompare={false} />
              <div><Label>Observações da saída</Label><Textarea rows={3} value={obs} onChange={(e) => setObs(e.target.value)} /></div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSel(null)}>Cancelar</Button>
                <Button onClick={registrar} disabled={busy}>{busy ? "Salvando..." : "Confirmar saída"}</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
