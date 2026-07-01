import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, Loader2, MapPin, ShieldCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePontoEmpresa } from "./usePontoEmpresa";
import { usePontoOfflineQueue } from "./usePontoOfflineQueue";
import { OfflineQueueIndicator } from "./OfflineQueueIndicator";

type Tipo = "entrada" | "saida" | "inicio_intervalo" | "fim_intervalo";

interface Func {
  id: string;
  nome: string;
}

// Device fingerprint simples: hash de UA + tela + timezone
async function getDeviceHash() {
  const raw = [
    navigator.userAgent,
    navigator.language,
    screen.width + "x" + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    (navigator as any).deviceMemory || "",
    navigator.hardwareConcurrency || "",
  ].join("|");
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

export default function PontoRegistro() {
  const { empresaId } = usePontoEmpresa();
  const [funcionarios, setFuncionarios] = useState<Func[]>([]);
  const [funcId, setFuncId] = useState<string>("");
  const [tipo, setTipo] = useState<Tipo>("entrada");
  const [antifraudeAtivo, setAntifraudeAtivo] = useState<boolean>(true);
  const [exigirGeofence, setExigirGeofence] = useState<boolean>(true);
  const [geofences, setGeofences] = useState<Array<{ nome: string; lat: number; lng: number; raio_metros: number }>>([]);
  const [gps, setGps] = useState<{ lat: number; lng: number; precisao: number } | null>(null);
  const [gpsErr, setGpsErr] = useState<string>("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [fotoB64, setFotoB64] = useState<string>("");
  const [qrToken, setQrToken] = useState<string>("");
  const [deviceHash, setDeviceHash] = useState<string>("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{
    score: number;
    fatores: Record<string, { ok: boolean; detalhe?: string }>;
  } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Carrega funcionários + flag antifraude + geofences
  useEffect(() => {
    if (!empresaId) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("ponto_funcionarios")
        .select("id, nome")
        .eq("empresa_id", empresaId)
        .eq("ativo", true)
        .order("nome");
      setFuncionarios((data || []) as Func[]);
      const { data: emp } = await (supabase as any)
        .from("ponto_empresas")
        .select("antifraude_ativo, geofence_obrigatorio_app")
        .eq("id", empresaId)
        .maybeSingle();
      setAntifraudeAtivo(emp?.antifraude_ativo ?? true);
      setExigirGeofence(emp?.geofence_obrigatorio_app !== false);
      const { data: geos } = await (supabase as any)
        .from("ponto_geofences")
        .select("nome, lat, lng, raio_metros")
        .eq("empresa_id", empresaId)
        .eq("ativo", true);
      setGeofences((geos || []).map((g: any) => ({ ...g, lat: Number(g.lat), lng: Number(g.lng) })));
    })();
  }, [empresaId]);

  // Avaliação local do geofence
  function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }
  const geoStatus = (() => {
    if (!gps) return { dentro: false, texto: "Aguardando GPS", nome: "" };
    if (geofences.length === 0) return { dentro: false, texto: "Nenhuma área cadastrada", nome: "" };
    let melhor = { dist: Infinity, nome: "", raio: 0 };
    for (const g of geofences) {
      const d = haversine(gps.lat, gps.lng, g.lat, g.lng);
      if (d < melhor.dist) melhor = { dist: d, nome: g.nome, raio: g.raio_metros };
      if (d <= g.raio_metros) return { dentro: true, texto: `Dentro de ${g.nome} (${Math.round(d)}m)`, nome: g.nome };
    }
    return { dentro: false, texto: `Fora — ${melhor.nome} a ${Math.round(melhor.dist)}m (raio ${melhor.raio}m)`, nome: melhor.nome };
  })();
  const bloqueadoPorGeofence = exigirGeofence && !geoStatus.dentro;


  // GPS
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsErr("Geolocalização indisponível");
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (pos) =>
        setGps({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          precisao: pos.coords.accuracy,
        }),
      (err) => setGpsErr(err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // Device fingerprint
  useEffect(() => {
    getDeviceHash().then(setDeviceHash);
  }, []);

  // QR token rotativo
  useEffect(() => {
    if (!empresaId) return;
    let cancel = false;
    const tick = async () => {
      const { data } = await supabase.functions.invoke("ponto-qrcode-token", {
        body: { action: "generate", empresa_id: empresaId },
      });
      if (!cancel && data?.token) setQrToken(data.token);
    };
    tick();
    const iv = setInterval(tick, 15000);
    return () => {
      cancel = true;
      clearInterval(iv);
    };
  }, [empresaId]);

  // Câmera
  const abrirCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 480, height: 480 },
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
      }
    } catch (e) {
      toast.error("Não foi possível acessar a câmera");
    }
  };

  const capturar = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(v, 0, 0);
    const b64 = c.toDataURL("image/jpeg", 0.8);
    setFotoB64(b64);
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
  };

  const offline = usePontoOfflineQueue();

  const enviar = async () => {
    if (!funcId) return toast.error("Selecione o funcionário");
    if (antifraudeAtivo && !gps) return toast.error("Aguardando GPS");
    if (antifraudeAtivo && !fotoB64) return toast.error("Capture sua selfie");
    const payload = {
      funcionario_id: funcId,
      tipo,
      gps,
      foto_base64: fotoB64.split(",")[1],
      device_hash: deviceHash,
      user_agent: navigator.userAgent,
      qr_token: qrToken,
      origem: "app_web",
    };

    // Sem rede: enfileira local e libera o usuário imediatamente
    if (!navigator.onLine) {
      offline.enqueue(payload);
      toast.success("Sem internet — marcação salva e será enviada quando voltar à rede");
      setFotoB64("");
      return;
    }

    setEnviando(true);
    setResultado(null);
    try {
      const { data, error } = await supabase.functions.invoke("ponto-validar-marcacao", {
        body: payload,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResultado({ score: data.score_confianca, fatores: data.fatores });
      toast.success(`Ponto registrado · confiança ${data.score_confianca}%`);
      setFotoB64("");
    } catch (e: any) {
      // Falha de rede inesperada: enfileira para retry automático
      offline.enqueue(payload);
      toast.warning("Falha de envio — marcação salva offline para sincronização");
      setFotoB64("");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Registro de Ponto</h1>
          <p className="text-sm text-muted-foreground">
            Marcação multi-fator com validação antifraude
          </p>
        </div>
        <OfflineQueueIndicator />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Identificação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={funcId} onValueChange={setFuncId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o funcionário" />
            </SelectTrigger>
            <SelectContent>
              {funcionarios.map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(["entrada", "inicio_intervalo", "fim_intervalo", "saida"] as Tipo[]).map((t) => (
              <Button
                key={t}
                variant={tipo === t ? "default" : "outline"}
                size="sm"
                onClick={() => setTipo(t)}
                className="text-xs"
              >
                {t === "entrada" ? "Entrada" : t === "saida" ? "Saída" : t === "inicio_intervalo" ? "Início Int." : "Fim Int."}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="h-4 w-4" /> Selfie
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!fotoB64 && !stream && (
            <Button onClick={abrirCamera} className="w-full">
              <Camera className="mr-2 h-4 w-4" /> Abrir câmera
            </Button>
          )}
          {stream && (
            <div className="space-y-2">
              <video ref={videoRef} className="w-full rounded-lg bg-black aspect-square object-cover" muted playsInline />
              <Button onClick={capturar} className="w-full">Capturar</Button>
            </div>
          )}
          {fotoB64 && (
            <div className="space-y-2">
              <img src={fotoB64} alt="selfie" className="w-full rounded-lg aspect-square object-cover" />
              <Button variant="outline" onClick={() => { setFotoB64(""); abrirCamera(); }} size="sm" className="w-full">
                Refazer
              </Button>
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Fatores de validação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2"><MapPin className="h-4 w-4" /> GPS</span>
            {gps ? (
              <Badge variant="secondary" className="text-xs">
                {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)} (±{Math.round(gps.precisao)}m)
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">{gpsErr || "Aguardando..."}</Badge>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span>QR Token</span>
            <Badge variant={qrToken ? "secondary" : "outline"} className="text-xs">
              {qrToken ? "Ativo (15s)" : "Aguardando..."}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Dispositivo</span>
            <Badge variant="secondary" className="text-xs font-mono">{deviceHash.slice(0, 12)}…</Badge>
          </div>
        </CardContent>
      </Card>

      <Button onClick={enviar} disabled={enviando || !funcId || (antifraudeAtivo && (!gps || !fotoB64))} size="lg" className="w-full">
        {enviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
        Registrar Ponto
      </Button>

      {resultado && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Resultado</span>
              <Badge
                variant={resultado.score >= 80 ? "default" : resultado.score >= 60 ? "secondary" : "destructive"}
                className="text-sm"
              >
                {resultado.score}% confiança
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {Object.entries(resultado.fatores).map(([k, v]) => (
              <div key={k} className="flex items-start justify-between gap-2">
                <span className="flex items-center gap-2">
                  {v.ok ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  )}
                  <span className="capitalize">{k.replace("_", " ")}</span>
                </span>
                <span className="text-xs text-muted-foreground text-right">{v.detalhe}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
