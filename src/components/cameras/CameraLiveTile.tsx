// Tile inline (sem Dialog) que negocia WebRTC com o Coletor Desktop
// e exibe o vídeo H.264 recebido. Usado no mosaico ao vivo.
import { useEffect, useRef, useState } from "react";
import { Loader2, Radio, X, Camera as CameraIcon, ZoomIn, ZoomOut, Maximize2, RotateCcw } from "lucide-react";
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"idle" | "conectando" | "ao-vivo" | "erro">(autoStart ? "conectando" : "idle");
  const [erro, setErro] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    if (!autoStart && nonce === 0) return;
    let pc: RTCPeerConnection | null = null;
    const channels: ReturnType<typeof supabase.channel>[] = [];
    const viewerId = crypto.randomUUID();
    let closed = false;
    let liveReached = false;
    let coletorSeenAt = 0;
    let coletorServesCamera = false;

    // Sempre broadcasta em ambos os canais: plain + filial (caso a câmera
    // ou o coletor esteja sem filial atribuída em algum dos lados).
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
        // Heartbeat do coletor
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

      // Aguarda até 3s por um heartbeat antes de pedir o stream — se o coletor
      // estiver online já veremos ele nesse intervalo (heartbeat sai a cada 4s).
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
  }, [cameraId, filialId, nonce]);

  const zoomIn = () => setScale((s) => Math.min(5, +(s + 0.5).toFixed(2)));
  const zoomOut = () => setScale((s) => {
    const n = Math.max(1, +(s - 0.5).toFixed(2));
    if (n <= 1) setPos({ x: 0, y: 0 });
    return n;
  });
  const resetZoom = () => { setScale(1); setPos({ x: 0, y: 0 }); };
  const onWheel = (e: React.WheelEvent) => {
    if (status !== "ao-vivo") return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.3 : 0.3;
    setScale((s) => {
      const n = Math.min(5, Math.max(1, +(s + delta).toFixed(2)));
      if (n <= 1) setPos({ x: 0, y: 0 });
      return n;
    });
  };
  const onMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    dragRef.current = { x: e.clientX, y: e.clientY, ox: pos.x, oy: pos.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    setPos({
      x: dragRef.current.ox + (e.clientX - dragRef.current.x),
      y: dragRef.current.oy + (e.clientY - dragRef.current.y),
    });
  };
  const onMouseUp = () => { dragRef.current = null; };
  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen().catch(() => {});
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative bg-black rounded-md overflow-hidden aspect-video group", className)}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      style={{ cursor: scale > 1 ? (dragRef.current ? "grabbing" : "grab") : "default" }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        draggable={false}
        className="w-full h-full object-contain transition-transform will-change-transform"
        style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})` }}
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
      {status === "ao-vivo" && (
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
          <button
            onClick={(e) => { e.stopPropagation(); zoomOut(); }}
            disabled={scale <= 1}
            className="h-6 w-6 flex items-center justify-center rounded bg-black/60 text-white hover:bg-black/80 disabled:opacity-40"
            title="Diminuir zoom"
          ><ZoomOut className="h-3 w-3" /></button>
          <span className="text-[10px] text-white bg-black/60 px-1 rounded min-w-[32px] text-center">{Math.round(scale * 100)}%</span>
          <button
            onClick={(e) => { e.stopPropagation(); zoomIn(); }}
            disabled={scale >= 5}
            className="h-6 w-6 flex items-center justify-center rounded bg-black/60 text-white hover:bg-black/80 disabled:opacity-40"
            title="Aumentar zoom"
          ><ZoomIn className="h-3 w-3" /></button>
          {scale > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); resetZoom(); }}
              className="h-6 w-6 flex items-center justify-center rounded bg-black/60 text-white hover:bg-black/80"
              title="Redefinir"
            ><RotateCcw className="h-3 w-3" /></button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
            className="h-6 w-6 flex items-center justify-center rounded bg-black/60 text-white hover:bg-black/80"
            title="Tela cheia"
          ><Maximize2 className="h-3 w-3" /></button>
        </div>
      )}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1 text-white text-xs flex items-center gap-1 pointer-events-none">
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
