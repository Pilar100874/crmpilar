import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScanLine, Camera, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { extrairChaveNfe, chaveValida } from "@/lib/transportadoras/nfe";
import { Html5Qrcode } from "html5-qrcode";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDetected: (chave: string) => void;
}

const FALLBACK_ID = "nfe-fallback-scanner";

/**
 * Leitor de código de barras / QR Code da NF-e usando a câmera do dispositivo.
 * Usa o BarcodeDetector nativo quando disponível e cai para o html5-qrcode
 * (Firefox / iOS Safari) — com digitação manual sempre como alternativa.
 */
export function NfeScannerDialog({ open, onOpenChange, onDetected }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef<number | null>(null);
  const fallbackRef = useRef<Html5Qrcode | null>(null);
  const [modo, setModo] = useState<"nativo" | "fallback" | "manual">("nativo");
  const [manual, setManual] = useState("");
  const [ativo, setAtivo] = useState(false);

  const parar = () => {
    if (loopRef.current) { cancelAnimationFrame(loopRef.current); loopRef.current = null; }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const fb = fallbackRef.current;
    fallbackRef.current = null;
    if (fb) {
      fb.stop().then(() => fb.clear()).catch(() => { /* já parado */ });
    }
    setAtivo(false);
  };

  const confirmar = (texto: string) => {
    const chave = extrairChaveNfe(texto);
    if (!chave) return toast.error("Não foi possível ler a chave de 44 dígitos");
    if (!chaveValida(chave)) toast.warning("Chave lida, mas o dígito verificador não confere");
    parar();
    onDetected(chave);
    onOpenChange(false);
  };

  const iniciarFallback = async () => {
    setModo("fallback");
    // aguarda o container entrar no DOM
    await new Promise((r) => setTimeout(r, 150));
    const el = document.getElementById(FALLBACK_ID);
    if (!el) return;
    el.innerHTML = "";
    try {
      const scanner = new Html5Qrcode(FALLBACK_ID, { verbose: false });
      fallbackRef.current = scanner;
      await scanner.start(
        { facingMode: { ideal: "environment" } } as any,
        { fps: 10, qrbox: { width: 280, height: 160 } },
        (texto) => { if (extrairChaveNfe(texto)) confirmar(texto); },
        () => { /* frame sem código */ }
      );
      setAtivo(true);
    } catch {
      setModo("manual");
      toast.error("Não foi possível acessar a câmera");
    }
  };

  const iniciar = async () => {
    const Detector = (window as any).BarcodeDetector;
    if (!Detector) return iniciarFallback();
    setModo("nativo");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setAtivo(true);
      const detector = new Detector({ formats: ["qr_code", "code_128", "itf", "code_39", "ean_13", "pdf417"] });
      const tick = async () => {
        if (!videoRef.current || !streamRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes?.length) {
            const chave = extrairChaveNfe(codes[0].rawValue ?? "");
            if (chave) return confirmar(chave);
          }
        } catch { /* frame inválido — segue tentando */ }
        loopRef.current = requestAnimationFrame(tick);
      };
      loopRef.current = requestAnimationFrame(tick);
    } catch {
      parar();
      await iniciarFallback();
    }
  };

  useEffect(() => {
    if (open) { setManual(""); iniciar(); }
    else parar();
    return parar;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) parar(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" /> Ler nota fiscal
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {modo === "nativo" && (
            <div className="relative overflow-hidden rounded-lg border bg-black aspect-video">
              <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
              {!ativo && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground bg-muted">
                  <Camera className="h-4 w-4 mr-2" /> Iniciando câmera...
                </div>
              )}
              <div className="pointer-events-none absolute inset-x-6 top-1/2 h-0.5 -translate-y-1/2 bg-primary/80" />
            </div>
          )}

          {modo === "fallback" && (
            <div className="overflow-hidden rounded-lg border bg-black">
              <div id={FALLBACK_ID} className="w-full [&>video]:!w-full [&>video]:!h-auto" style={{ minHeight: 220 }} />
            </div>
          )}

          {modo === "manual" && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              <p>Não foi possível usar a câmera neste dispositivo. Digite ou cole a chave de acesso abaixo.</p>
            </div>
          )}

          <div>
            <Label>Chave de acesso (44 dígitos)</Label>
            <Input
              value={manual}
              onChange={(e) => setManual(e.target.value.replace(/\D/g, "").slice(0, 44))}
              placeholder="Digite ou cole a chave da NF-e"
              inputMode="numeric"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">{manual.length}/44 dígitos</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => confirmar(manual)} disabled={manual.length !== 44}>Usar chave</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
