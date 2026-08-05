import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw, Loader2, AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  title?: string;
  onClose: () => void;
  onCapture: (file: File) => void;
}

/** Captura de foto usando a câmera do dispositivo via vídeo ao vivo (getUserMedia). */
export function CVWebcamDialog({ open, title = "Capturar foto", onClose, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setStarting(true);
    stop();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (e: any) {
      setError(e?.message ?? "Não foi possível acessar a câmera");
    } finally {
      setStarting(false);
    }
  }, [facing, stop]);

  useEffect(() => {
    if (open) start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, facing]);

  const shoot = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCapture(new File([blob], `captura-${Date.now()}.jpg`, { type: "image/jpeg" }));
        stop();
        onClose();
      },
      "image/jpeg",
      0.92,
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { stop(); onClose(); } }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Camera className="h-4 w-4" /> {title}</DialogTitle>
        </DialogHeader>
        <div className="relative rounded-lg overflow-hidden bg-muted aspect-video flex items-center justify-center">
          <video ref={videoRef} playsInline muted className="w-full h-full object-contain" />
          {starting && <Loader2 className="absolute h-8 w-8 animate-spin text-muted-foreground" />}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center bg-background/90">
              <AlertTriangle className="h-6 w-6 text-warning" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <p className="text-xs text-muted-foreground">Use a opção "Tirar foto com o celular" para continuar.</p>
            </div>
          )}
        </div>
        <div className="flex gap-2 justify-between">
          <Button type="button" variant="outline" size="sm" onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}>
            <RefreshCw className="h-4 w-4 mr-2" /> Trocar câmera
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => { stop(); onClose(); }}>Cancelar</Button>
            <Button type="button" size="sm" onClick={shoot} disabled={!!error || starting}>
              <Camera className="h-4 w-4 mr-2" /> Capturar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
