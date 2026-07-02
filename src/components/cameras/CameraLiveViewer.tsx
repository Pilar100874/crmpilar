// Live viewer WebRTC: negocia com o Coletor Desktop via canal "webrtc-signal"
// (Realtime broadcast) e exibe o vídeo H.264 recebido no <video>.
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Radio, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  cameraId: string | null;
  cameraNome?: string;
  filialId?: string | null;
  onClose: () => void;
}

const ICE = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

export function CameraLiveViewer({ cameraId, cameraNome, filialId, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<"idle" | "conectando" | "ao-vivo" | "erro">("idle");
  const [erro, setErro] = useState<string | null>(null);

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
          try {
            await pc!.setRemoteDescription({ type: "offer", sdp: payload.sdp });
            const answer = await pc!.createAnswer();
            await pc!.setLocalDescription(answer);
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

      await new Promise((r) => setTimeout(r, 3000));

      if (!coletorSeenAt) {
        if (!closed) {
          setErro("Coletor Desktop offline ou sem módulo de câmeras ativado");
          setStatus("erro");
        }
        return;
      }
      if (!coletorServesCamera) {
        if (!closed) {
          setErro("Câmera não está atribuída à filial deste Coletor");
          setStatus("erro");
        }
        return;
      }

      sendAll({ type: "request", to: "coletor", viewer_id: viewerId, camera_id: cameraId });

      setTimeout(() => {
        if (!closed && !liveReached) {
          setErro("Coletor recebeu o pedido mas não conseguiu abrir o stream RTSP da câmera");
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

  return (
    <Dialog open={!!cameraId} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-red-500 animate-pulse" />
            Ao vivo — {cameraNome}
          </DialogTitle>
        </DialogHeader>
        <div className="relative bg-black rounded-md aspect-video overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
          />
          {status !== "ao-vivo" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3">
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
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
