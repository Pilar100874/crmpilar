// Live viewer WebRTC: negocia com o Coletor Desktop via canal "webrtc-signal"
// (Realtime broadcast) e exibe o vídeo H.264 recebido no <video>.
import { useEffect, useRef, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Loader2, Radio, X, Maximize2,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  Volume2, VolumeX, Mic, MicOff, Home, ZoomIn, ZoomOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  cameraId: string | null;
  cameraNome?: string;
  filialId?: string | null;
  temPtz?: boolean;
  temAudio?: boolean;
  onClose: () => void;
}

const ICE = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

export function CameraLiveViewer({ cameraId, cameraNome, filialId, temPtz = false, temAudio = false, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<"idle" | "conectando" | "ao-vivo" | "erro">("idle");
  const [erro, setErro] = useState<string | null>(null);
  const [audioMuted, setAudioMuted] = useState(true);   // começa mutado por autoplay policy
  const [micOn, setMicOn] = useState(false);
  const micStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const controlChannelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);

  useEffect(() => {
    if (!cameraId) return;
    let pc: RTCPeerConnection | null = null;
    const channels: ReturnType<typeof supabase.channel>[] = [];
    const viewerId = crypto.randomUUID();
    let closed = false;
    let liveReached = false;
    let coletorSeenAt = 0;
    let coletorServesCamera = false;

    const chanNames = new Set<string>(["webrtc-signal"]);
    if (filialId) chanNames.add(`webrtc-signal:${filialId}`);

    const sendAll = (payload: any) => {
      for (const ch of channels) {
        try { ch.send({ type: "broadcast", event: "msg", payload }); } catch {}
      }
    };

    (async () => {
      setStatus("conectando");
      setErro(null);
      pc = new RTCPeerConnection(ICE);
      pcRef.current = pc;
      // Prepara recepção de áudio (para escutar a câmera) e transmissor de áudio (falar).
      if (temAudio) {
        try {
          pc.addTransceiver("audio", { direction: "sendrecv" });
        } catch {}
      }
      pc.ontrack = (ev) => {
        if (videoRef.current) {
          videoRef.current.srcObject = ev.streams[0] || new MediaStream([ev.track]);
          videoRef.current.play().catch(() => {});
          liveReached = true;
          setStatus("ao-vivo");
        }
      };
      pc.oniceconnectionstatechange = () => {
        if (pc?.iceConnectionState === "failed" || pc?.iceConnectionState === "disconnected") {
          setStatus("erro");
          setErro("Conexão perdida");
        }
      };

      const onMsg = async ({ payload }: any) => {
        if (!payload) return;
        if (payload.type === "coletor-online" && payload.to === "viewers") {
          coletorSeenAt = Date.now();
          if (Array.isArray(payload.cameras) && payload.cameras.includes(cameraId)) {
            coletorServesCamera = true;
          }
          return;
        }
        if (payload.to !== viewerId) return;
        if (payload.type === "offer") {
          // Dedupe: mesmo offer pode chegar em canais duplicados (plain + filial).
          if (!pc || pc.signalingState !== "stable") return;
          try {
            await pc.setRemoteDescription({ type: "offer", sdp: payload.sdp });
            const answer = await pc.createAnswer();
            if ((pc.signalingState as string) !== "have-remote-offer") return;
            await pc.setLocalDescription(answer);
            await new Promise<void>((resolve) => {
              if (pc!.iceGatheringState === "complete") return resolve();
              const t = setTimeout(resolve, 3000);
              pc!.onicegatheringstatechange = () => {
                if (pc!.iceGatheringState === "complete") { clearTimeout(t); resolve(); }
              };
            });
            sendAll({
              type: "answer",
              to: "coletor",
              viewer_id: viewerId,
              camera_id: cameraId,
              sdp: pc!.localDescription!.sdp,
            });
          } catch (e: any) {
            if (String(e?.message || "").includes("wrong state")) return;
            setErro(e.message);
            setStatus("erro");
          }
        }
      };

      for (const name of chanNames) {
        const ch = supabase.channel(name, { config: { broadcast: { self: false, ack: false } } });
        ch.on("broadcast", { event: "msg" }, onMsg);
        channels.push(ch);
        await new Promise<void>((resolve) => {
          ch.subscribe((s) => { if (s === "SUBSCRIBED") resolve(); });
        });
      }
      controlChannelsRef.current = channels;

      // Ping proativo — Coletor responde com heartbeat imediato
      sendAll({ type: "viewer-ping", to: "coletor", viewer_id: viewerId });

      // Aguarda até 6s por heartbeat (Coletor manda a cada 2s)
      const deadline = Date.now() + 6000;
      while (!coletorSeenAt && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 200));
      }

      // Fallback: se o heartbeat via Realtime não chegou, consulta o status
      // que o Coletor reporta ao servidor via cv-coletor-cameras/report_status.
      if (!coletorSeenAt) {
        try {
          const { data: cam } = await supabase
            .from("cv_cameras")
            .select("ultimo_status,ultima_verificacao")
            .eq("id", cameraId)
            .maybeSingle();
          const seenMs = cam?.ultima_verificacao ? Date.now() - new Date(cam.ultima_verificacao).getTime() : Infinity;
          if (cam?.ultimo_status === "online" && seenMs < 120_000) {
            coletorSeenAt = Date.now();
            coletorServesCamera = true;
          }
        } catch {}
      }

      if (!coletorSeenAt) {
        if (!closed) {
          setErro("Coletor Desktop offline ou sem módulo de câmeras ativado");
          setStatus("erro");
        }
        return;
      }
      // Se heartbeat chegou mas a câmera não estava na lista, ainda tenta:
      // pode ser diferença momentânea de filial; o Coletor ignora se não servir.

      sendAll({ type: "request", to: "coletor", viewer_id: viewerId, camera_id: cameraId });

      setTimeout(() => {
        if (!closed && !liveReached) {
          setErro("Coletor não respondeu ao pedido de stream. Atualize o Coletor para a versão mais recente, mantenha o módulo de câmeras ativo e confirme se a câmera tem RTSP habilitado.");
          setStatus("erro");
        }
      }, 25_000);

    })();


    return () => {
      closed = true;
      try {
        sendAll({ type: "stop", to: "coletor", viewer_id: viewerId, camera_id: cameraId });
      } catch {}
      try { pc?.close(); } catch {}
      try { micStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
      micStreamRef.current = null;
      pcRef.current = null;
      controlChannelsRef.current = [];
      for (const ch of channels) supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraId]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const toggleFullscreen = async () => {
    const doc: any = document;
    const fsEl = doc.fullscreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement;
    if (fsEl) {
      try {
        if (doc.exitFullscreen) await doc.exitFullscreen();
        else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
        else if (doc.msExitFullscreen) await doc.msExitFullscreen();
      } catch {}
      return;
    }
    const video: any = videoRef.current;
    const container: any = containerRef.current;
    const tryOn = async (el: any) => {
      if (!el) return false;
      const fn =
        el.requestFullscreen ||
        el.webkitRequestFullscreen ||
        el.msRequestFullscreen ||
        el.webkitEnterFullscreen;
      if (!fn) return false;
      try {
        const r = fn.call(el);
        if (r && typeof r.then === "function") await r;
        return true;
      } catch (e) {
        console.warn("[CameraLiveViewer] fullscreen falhou em", el?.tagName, e);
        return false;
      }
    };
    // Vídeo primeiro (funciona mesmo em iframes sem allow=fullscreen no iOS).
    if (await tryOn(video)) return;
    if (await tryOn(container)) return;
    // Último recurso: abrir a página numa nova janela em tela cheia.
    toast.error("Tela cheia bloqueada pelo navegador. Verifique se o site tem permissão de fullscreen.");
  };



  // ============ CONTROLES PTZ (ONVIF via Coletor) ============
  const sendControl = useCallback((payload: any) => {
    for (const ch of controlChannelsRef.current) {
      try { ch.send({ type: "broadcast", event: "msg", payload }); } catch {}
    }
  }, []);

  const ptzMoveStart = (dir: "up" | "down" | "left" | "right" | "zoom_in" | "zoom_out") => {
    if (!temPtz || !cameraId) return;
    sendControl({ type: "ptz", action: "move_start", direction: dir, camera_id: cameraId });
  };
  const ptzStop = () => {
    if (!temPtz || !cameraId) return;
    sendControl({ type: "ptz", action: "move_stop", camera_id: cameraId });
  };
  const ptzHome = () => {
    if (!temPtz || !cameraId) return;
    sendControl({ type: "ptz", action: "home", camera_id: cameraId });
    toast.success("Comando 'Home' enviado");
  };

  // ============ ÁUDIO ============
  // Escutar: apenas alterna o mute do <video> (o track chega junto no WebRTC).
  const toggleListen = () => {
    const v = videoRef.current;
    if (!v) return;
    const nv = !audioMuted; // true = queremos ouvir
    v.muted = !nv;
    v.volume = 1;
    setAudioMuted(!nv);
    if (nv) {
      v.play().catch(() => {});
      // Verifica se o stream realmente contém áudio; se não, avisa o usuário.
      setTimeout(() => {
        const stream = v.srcObject as MediaStream | null;
        const tracks = stream?.getAudioTracks?.() || [];
        if (!tracks.length) {
          toast.error("Esta câmera não está enviando áudio. Habilite áudio no stream principal (main) e atualize o Coletor para 1.7.1+.");
        } else {
          toast.success("Áudio ligado");
        }
      }, 400);
    }
  };

  // Falar: captura microfone e adiciona o track ao PeerConnection existente.
  const toggleTalk = async () => {
    if (!temAudio || !cameraId) return;
    if (micOn) {
      try { micStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
      micStreamRef.current = null;
      // Remove o track do PC
      const pc = pcRef.current;
      if (pc) {
        pc.getSenders().forEach((s) => {
          if (s.track?.kind === "audio") {
            try { s.replaceTrack(null); } catch {}
          }
        });
      }
      setMicOn(false);
      sendControl({ type: "talk", action: "stop", camera_id: cameraId });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      micStreamRef.current = stream;
      const pc = pcRef.current;
      if (pc) {
        const track = stream.getAudioTracks()[0];
        const sender = pc.getSenders().find((s) => s.track === null || s.track?.kind === "audio");
        if (sender) sender.replaceTrack(track);
        else pc.addTrack(track, stream);
      }
      setMicOn(true);
      sendControl({ type: "talk", action: "start", camera_id: cameraId });
      toast.success("Microfone ativo — falando na câmera");
    } catch (e: any) {
      toast.error("Não foi possível acessar o microfone: " + e.message);
    }
  };

  const PtzBtn = ({ dir, children, className = "" }: { dir: any; children: any; className?: string }) => (
    <button
      onMouseDown={() => ptzMoveStart(dir)}
      onMouseUp={ptzStop}
      onMouseLeave={ptzStop}
      onTouchStart={(e) => { e.preventDefault(); ptzMoveStart(dir); }}
      onTouchEnd={ptzStop}
      className={cn(
        "h-10 w-10 flex items-center justify-center rounded-md bg-black/60 text-white hover:bg-black/80 active:bg-primary transition select-none",
        className,
      )}
    >
      {children}
    </button>
  );

  return (
    <Dialog open={!!cameraId} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden bg-background">
        <DialogHeader className="px-4 py-3 border-b bg-card">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Radio className="h-4 w-4 text-red-500 animate-pulse" />
            Ao vivo — {cameraNome}
            {temPtz && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-medium">PTZ</span>}
            {temAudio && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-medium">ÁUDIO</span>}
          </DialogTitle>
          <DialogDescription className="sr-only">Transmissão ao vivo da câmera {cameraNome}</DialogDescription>
        </DialogHeader>
        <div ref={containerRef} className="relative bg-black aspect-video overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={audioMuted}
            className="w-full h-full object-contain"
          />
          <button
            onClick={toggleFullscreen}
            className="absolute top-2 right-2 h-8 w-8 flex items-center justify-center rounded bg-black/60 text-white hover:bg-black/80 transition"
            title="Tela cheia"
          >
            <Maximize2 className="h-4 w-4" />
          </button>

          {/* Overlay PTZ (esquerda inferior) */}
          {temPtz && status === "ao-vivo" && (
            <div className="absolute bottom-3 left-3 flex flex-col items-center gap-1 bg-black/30 rounded-lg p-2 backdrop-blur-sm">
              <PtzBtn dir="up"><ChevronUp className="h-5 w-5" /></PtzBtn>
              <div className="flex items-center gap-1">
                <PtzBtn dir="left"><ChevronLeft className="h-5 w-5" /></PtzBtn>
                <button
                  onClick={ptzHome}
                  className="h-10 w-10 flex items-center justify-center rounded-md bg-black/60 text-white hover:bg-black/80 transition"
                  title="Voltar ao centro"
                >
                  <Home className="h-4 w-4" />
                </button>
                <PtzBtn dir="right"><ChevronRight className="h-5 w-5" /></PtzBtn>
              </div>
              <PtzBtn dir="down"><ChevronDown className="h-5 w-5" /></PtzBtn>
              <div className="flex items-center gap-1 mt-1 pt-1 border-t border-white/20 w-full justify-center">
                <PtzBtn dir="zoom_in"><ZoomIn className="h-4 w-4" /></PtzBtn>
                <PtzBtn dir="zoom_out"><ZoomOut className="h-4 w-4" /></PtzBtn>
              </div>
            </div>
          )}

          {/* Overlay áudio (direita inferior) */}
          {temAudio && status === "ao-vivo" && (
            <div className="absolute bottom-3 right-3 flex flex-col gap-2">
              <button
                onClick={toggleListen}
                className={cn(
                  "h-10 w-10 flex items-center justify-center rounded-md transition",
                  audioMuted
                    ? "bg-black/60 text-white hover:bg-black/80"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
                title={audioMuted ? "Ouvir câmera" : "Silenciar"}
              >
                {audioMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
              <button
                onClick={toggleTalk}
                className={cn(
                  "h-10 w-10 flex items-center justify-center rounded-md transition",
                  micOn
                    ? "bg-red-500 text-white hover:bg-red-600 animate-pulse"
                    : "bg-black/60 text-white hover:bg-black/80",
                )}
                title={micOn ? "Parar de falar" : "Falar na câmera"}
              >
                {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </button>
            </div>
          )}

          {status !== "ao-vivo" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3 pointer-events-none">
              {status === "erro" ? (
                <>
                  <X className="h-10 w-10 text-red-500" />
                  <p className="text-sm text-center px-4">{erro}</p>
                </>
              ) : (
                <>
                  <Loader2 className="h-10 w-10 animate-spin" />
                  <p className="text-sm">Negociando com Coletor…</p>
                </>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-between items-center gap-2 px-4 py-3 border-t bg-card">
          <div className="text-[11px] text-muted-foreground">
            {temPtz && "Segure os botões para mover a câmera. "}
            {temAudio && "Áudio requer Coletor 1.7.0+."}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={toggleFullscreen}>
              <Maximize2 className="h-4 w-4 mr-1" /> Tela cheia
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
