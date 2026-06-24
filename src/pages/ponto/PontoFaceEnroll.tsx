// Cadastro de rosto (face enrollment) + teste de verificação 1:1
import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Camera, ScanFace, CheckCircle2, XCircle, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePontoEmpresa } from "./usePontoEmpresa";

export default function PontoFaceEnroll() {
  const { empresaId } = usePontoEmpresa();
  const [funcs, setFuncs] = useState<any[]>([]);
  const [funcId, setFuncId] = useState<string>("");
  const [func, setFunc] = useState<any>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [foto, setFoto] = useState<string>("");
  const [salvando, setSalvando] = useState(false);
  const [threshold, setThreshold] = useState<number>(70);
  const [testResult, setTestResult] = useState<any>(null);
  const [testando, setTestando] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!empresaId) return;
    supabase.from("ponto_funcionarios")
      .select("id, nome, face_url, face_enrolled_at, face_match_threshold")
      .eq("empresa_id", empresaId).eq("status", "ativo").order("nome")
      .then(({ data }) => setFuncs(data || []));
  }, [empresaId]);

  useEffect(() => {
    if (!funcId) { setFunc(null); return; }
    const f = funcs.find((x) => x.id === funcId);
    setFunc(f);
    setThreshold(f?.face_match_threshold ?? 70);
    setFoto(""); setTestResult(null);
  }, [funcId, funcs]);

  const abrirCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 640 } });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
      }
    } catch { toast.error("Não foi possível acessar a câmera"); }
  };
  const capturar = () => {
    const v = videoRef.current, c = canvasRef.current;
    if (!v || !c) return;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    setFoto(c.toDataURL("image/jpeg", 0.85));
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
  };
  const escolherArquivo = (file: File) => {
    const r = new FileReader();
    r.onload = () => setFoto(r.result as string);
    r.readAsDataURL(file);
  };

  const salvar = async () => {
    if (!funcId || !foto) return toast.error("Selecione funcionário e capture uma foto");
    setSalvando(true);
    try {
      const b64 = foto.split(",")[1];
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const path = `${empresaId}/${funcId}.jpg`;
      const { error: upErr } = await supabase.storage.from("ponto-faces")
        .upload(path, bytes, { upsert: true, contentType: "image/jpeg" });
      if (upErr) throw upErr;
      const { error: updErr } = await (supabase as any).from("ponto_funcionarios").update({
        face_url: `ponto-faces/${path}`,
        face_enrolled_at: new Date().toISOString(),
        face_match_threshold: threshold,
      }).eq("id", funcId);
      if (updErr) throw updErr;
      toast.success("Rosto cadastrado com sucesso");
      const { data } = await supabase.from("ponto_funcionarios")
        .select("id, nome, face_url, face_enrolled_at, face_match_threshold")
        .eq("empresa_id", empresaId).eq("status", "ativo").order("nome");
      setFuncs(data || []);
    } catch (e: any) { toast.error(e.message || "Erro ao salvar"); }
    finally { setSalvando(false); }
  };

  const testar = async () => {
    if (!funcId || !foto) return toast.error("Capture uma selfie para testar");
    setTestando(true); setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("ponto-face-verify", {
        body: { funcionario_id: funcId, selfie_base64: foto.split(",")[1] },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setTestResult(data);
    } catch (e: any) { toast.error(e.message || "Erro ao testar"); }
    finally { setTestando(false); }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ScanFace className="h-6 w-6" /> Reconhecimento Facial 1:1
        </h1>
        <p className="text-sm text-muted-foreground">
          Cadastre o rosto de referência de cada funcionário. As marcações serão validadas comparando a selfie ao rosto cadastrado.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Funcionário</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Select value={funcId} onValueChange={setFuncId}>
            <SelectTrigger><SelectValue placeholder="Selecione o funcionário" /></SelectTrigger>
            <SelectContent>
              {funcs.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.nome} {f.face_enrolled_at && "✓"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {func && (
            <div className="text-xs text-muted-foreground">
              {func.face_enrolled_at
                ? <>Cadastrado em {new Date(func.face_enrolled_at).toLocaleString("pt-BR")}</>
                : <Badge variant="outline">Sem rosto cadastrado</Badge>}
            </div>
          )}
        </CardContent>
      </Card>

      {funcId && (
        <Card>
          <CardHeader><CardTitle className="text-base">Foto de referência</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              {!stream && !foto && (
                <>
                  <Button onClick={abrirCamera}><Camera className="h-4 w-4 mr-2" /> Câmera</Button>
                  <label>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && escolherArquivo(e.target.files[0])} />
                    <Button asChild variant="outline"><span><Upload className="h-4 w-4 mr-2" /> Enviar arquivo</span></Button>
                  </label>
                </>
              )}
              {stream && <Button onClick={capturar} className="w-full">Capturar</Button>}
              {foto && !stream && <Button variant="outline" onClick={() => { setFoto(""); setTestResult(null); abrirCamera(); }}>Refazer</Button>}
            </div>
            {stream && <video ref={videoRef} className="w-64 rounded-lg bg-black aspect-square object-cover" muted playsInline />}
            {foto && (
              <div className="flex gap-4 items-start">
                <img src={foto} alt="foto" className="w-48 rounded-lg aspect-square object-cover border" />
                {func?.face_url && (
                  <div className="text-xs text-muted-foreground">Há um rosto já cadastrado. Salvar substituirá.</div>
                )}
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Limiar mínimo de aceitação</span>
                <span className="font-mono">{threshold}%</span>
              </div>
              <Slider value={[threshold]} onValueChange={(v) => setThreshold(v[0])} min={50} max={95} step={5} />
              <p className="text-xs text-muted-foreground">Recomendado: 70-80%. Mais alto = mais rigoroso.</p>
            </div>

            <div className="flex gap-2">
              <Button onClick={salvar} disabled={!foto || salvando}>
                {salvando ? "Salvando..." : "Salvar cadastro"}
              </Button>
              {func?.face_url && (
                <Button variant="outline" onClick={testar} disabled={!foto || testando}>
                  {testando ? "Testando..." : "Testar verificação"}
                </Button>
              )}
            </div>

            {testResult && (
              <div className="rounded-md border p-4 space-y-2 bg-muted/30">
                <div className="flex items-center gap-2">
                  {testResult.aprovado ? (
                    <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" /> Aprovado</Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Reprovado</Badge>
                  )}
                  <span className="text-sm">Score: <strong>{testResult.score}%</strong> (limiar {testResult.threshold}%)</span>
                  <Badge variant="outline">Confiança: {testResult.confianca}</Badge>
                </div>
                {testResult.motivo && <p className="text-xs text-muted-foreground">{testResult.motivo}</p>}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
