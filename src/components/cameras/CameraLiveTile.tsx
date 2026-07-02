// Tile inline (sem Dialog) que negocia WebRTC com o Coletor Desktop
// e exibe o vídeo H.264 recebido. Usado no mosaico ao vivo.
import { useEffect, useRef, useState } from "react";
import { Loader2, Radio, X, Camera as CameraIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Props {
  cameraId: string;
  cameraNome: string;
  filialId?: string | null;
  className?: string;
  autoStart?: boolean;
}

const ICE = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

export function CameraLiveTile({ cameraId, cameraNome, filialId, className, autoStart = true }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<"idle" | "conectando" | "ao-vivo" | "erro">(autoStart ? "conectando" : "idle");
  const [erro, setErro] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!autoStart && nonce === 0) return;
    let pc: RTCPeerConnection | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const viewerId = crypto.randomUUID();
    let closed = false;
    let liveReached = false;

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

      const chanName = filialId ? `webrtc-signal:${filialId}` : "webrtc-signal";
      channel = supabase.channel(chanName, {
        config: { broadcast: { self: false, ack: false } },
      });
      channel.on("broadcast", { event: "msg" }, async ({ payload }: any) => {
        if (!payload || payload.to !== viewerId) return;
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
            channel!.send({
              type: "broadcast",
              event: "msg",
              payload: {
                type: "answer",
                to: "coletor",
                viewer_id: viewerId,
                camera_id: cameraId,
                sdp: pc!.localDescription!.sdp,
              },
            });
          } catch (e: any) {
            setErro(e.message);
            setStatus("erro");
          }
        }
      });

      await new Promise<void>((resolve) => {
        channel!.subscribe((s) => { if (s === "SUBSCRIBED") resolve(); });
      });

      channel.send({
        type: "broadcast",
        event: "msg",
        payload: { type: "request", to: "coletor", viewer_id: viewerId, camera_id: cameraId },
      });

      setTimeout(() => {
        if (!closed && !liveReached) {
          setErro("Coletor não respondeu");
          setStatus("erro");
        }
      }, 12_000);
    })();

    return () => {
      closed = true;
      try {
        channel?.send({
          type: "broadcast",
          event: "msg",
          payload: { type: "stop", to: "coletor", viewer_id: viewerId, camera_id: cameraId },
        });
      } catch {}
      try { pc?.close(); } catch {}
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraId, filialId, nonce]);

  return (
    <div className={cn("relative bg-black rounded-md overflow-hidden aspect-video group", className)}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-contain"
      />
      <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px]">
        {status === "ao-vivo" ? (
          <><Radio className="h-2.5 w-2.5 text-red-500 animate-pulse" /> AO VIVO</>
        ) : status === "erro" ? (
          <><X className="h-2.5 w-2.5 text-red-500" /> ERRO</>
        ) : (
          <><Loader2 className="h-2.5 w-2.5 animate-spin" /> ...</>
        )}
      </div>
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1 text-white text-xs flex items-center gap-1">
        <CameraIcon className="h-3 w-3" /> <span className="truncate">{cameraNome}</span>
      </div>
      {status !== "ao-vivo" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-2 pointer-events-none">
          {status === "erro" ? (
            <>
              <X className="h-6 w-6 text-red-500" />
              <p className="text-[10px] text-center px-2">{erro}</p>
              <button
                onClick={() => setNonce((n) => n + 1)}
                className="pointer-events-auto text-[10px] px-2 py-0.5 rounded bg-white/10 hover:bg-white/20"
              >
                Tentar novamente
              </button>
            </>
          ) : (
            <Loader2 className="h-6 w-6 animate-spin opacity-60" />
          )}
        </div>
      )}
    </div>
  );
}
