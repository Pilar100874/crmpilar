// Live viewer WebRTC: negocia com o Coletor Desktop via canal "webrtc-signal"
// (Realtime broadcast) e exibe o vídeo H.264 recebido no <video>.
import { useEffect, useRef, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Loader2, Radio, X, Maximize2,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  Volume2, VolumeX, Mic, MicOff, Home, ZoomIn, ZoomOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
          setErro("Coletor não respondeu ao pedido de stream. Atualize para a versão 1.6.10+ do Coletor, mantenha o módulo de câmeras ativo e confirme se a câmera tem RTSP habilitado.");
          setStatus("erro");
        }
      }, 12_000);

    })();


    return () => {
      closed = true;
      try {
        sendAll({ type: "stop", to: "coletor", viewer_id: viewerId, camera_id: cameraId });
      } catch {}
      try { pc?.close(); } catch {}
      for (const ch of channels) supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraId]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const toggleFullscreen = async () => {
    const doc: any = document;
    const fsEl = doc.fullscreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement;
    try {
      if (fsEl) {
        if (doc.exitFullscreen) await doc.exitFullscreen();
        else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
        else if (doc.msExitFullscreen) await doc.msExitFullscreen();
        return;
      }
      // Tenta o container; se falhar (Dialog em portal pode bloquear em alguns navegadores),
      // cai para o <video> — que sempre aceita fullscreen.
      const container: any = containerRef.current;
      const video: any = videoRef.current;
      const req = (el: any) =>
        el?.requestFullscreen?.() ||
        el?.webkitRequestFullscreen?.() ||
        el?.msRequestFullscreen?.() ||
        el?.webkitEnterFullscreen?.(); // iOS Safari
      try {
        await req(container);
      } catch {
        await req(video);
      }
    } catch (e) {
      console.error("[CameraLiveViewer] fullscreen falhou:", e);
    }
  };

  return (
    <Dialog open={!!cameraId} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden bg-background">
        <DialogHeader className="px-4 py-3 border-b bg-card">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Radio className="h-4 w-4 text-red-500 animate-pulse" />
            Ao vivo — {cameraNome}
          </DialogTitle>
        </DialogHeader>
        <div ref={containerRef} className="relative bg-black aspect-video overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
          />
          <button
            onClick={toggleFullscreen}
            className="absolute top-2 right-2 h-8 w-8 flex items-center justify-center rounded bg-black/60 text-white hover:bg-black/80 transition"
            title="Tela cheia"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
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
          <Button variant="outline" size="sm" onClick={toggleFullscreen}>
            <Maximize2 className="h-4 w-4 mr-1" /> Tela cheia
          </Button>
          <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
