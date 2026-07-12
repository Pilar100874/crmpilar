// Tile inline (sem Dialog) que negocia WebRTC com o Coletor Desktop
// e exibe o vídeo H.264 recebido. Usado no mosaico ao vivo.
import { useEffect, useRef, useState } from "react";
import { Loader2, Radio, X, Camera as CameraIcon, ZoomIn, ZoomOut, Maximize2, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { acquireLiveSignalChannels, onLiveSignalHeartbeat, onLiveSignalMessage, requestLiveSignalHeartbeat } from "@/lib/cameras/liveSignalHub";

interface Props {
  cameraId: string;
  cameraNome: string;
  filialId?: string | null;
  className?: string;
  autoStart?: boolean;
  startDelayMs?: number;
  onMaximize?: () => void;
}

const ICE = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

export function CameraLiveTile({ cameraId, cameraNome, filialId, className, autoStart = true, startDelayMs = 0, onMaximize }: Props) {
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
    const viewerId = crypto.randomUUID();
    let closed = false;
    let liveReached = false;
    let noFrameTimer: ReturnType<typeof setTimeout> | null = null;
    let coletorSeenAt = 0;
    let coletorServesCamera = false;
    let coletorVersao: string | null = null;
    let coletorCameras: string[] = [];
    let sendAll: (payload: any) => void = () => {};
    let releaseChannels: (() => void) | null = null;
    let offMsg: (() => void) | null = null;
    let offHeartbeat: (() => void) | null = null;
    const log = (...a: any[]) => console.log(`[CamLive ${cameraNome}]`, ...a);

    (async () => {
      setStatus("conectando");
      setErro(null);
      pc = new RTCPeerConnection(ICE);
      pc.ontrack = (ev) => {
        if (ev.track.kind !== "video") {
          log("track ignorado no mosaico", { kind: ev.track.kind });
          return;
        }
        if (!videoRef.current) return;
        const stream = new MediaStream([ev.track]);
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
        log("track recebido", { kind: ev.track.kind, muted: ev.track.muted, readyState: ev.track.readyState });

        // Só considera "AO VIVO" quando o vídeo REALMENTE tocar (frame decodado).
        // Sem isso, um track sem frames (ffmpeg travado no re-encode) mostra
        // "AO VIVO" com tela preta.
        const markLive = () => {
          if (liveReached || closed) return;
          liveReached = true;
          if (noFrameTimer) { clearTimeout(noFrameTimer); noFrameTimer = null; }
          log("primeiro frame renderizado — AO VIVO");
          setStatus("ao-vivo");
        };
        videoRef.current.onplaying = markLive;
        videoRef.current.onloadeddata = markLive;
        ev.track.onunmute = markLive;

        // Se em 15s nenhum frame chegar, é stream vazio (encoder/RTSP travado).
        if (noFrameTimer) clearTimeout(noFrameTimer);
        noFrameTimer = setTimeout(() => {
          if (closed || liveReached) return;
          const msg = "Coletor abriu a conexão mas nenhum frame chegou em 8s. Provável falha no re-encode, RTSP com credencial errada, ou CPU do Coletor saturada. Atualize o Coletor para a versão mais recente e teste a RTSP no VLC.";
          log("SEM FRAMES", msg);
          setErro(msg);
          setStatus("erro");
        }, 15_000);
      };
      pc.oniceconnectionstatechange = () => {
        log("iceState", pc?.iceConnectionState);
        if (pc?.iceConnectionState === "failed" || pc?.iceConnectionState === "disconnected") {
          setStatus("erro");
          setErro("Conexão perdida");
        }
      };

      const onHeartbeat = (payload: any) => {
        coletorSeenAt = Date.now();
        coletorVersao = payload.versao || payload.version || null;
        if (Array.isArray(payload.cameras)) {
          coletorCameras = payload.cameras;
          if (payload.cameras.includes(cameraId)) coletorServesCamera = true;
        }
        log("heartbeat coletor", { versao: coletorVersao, servesCamera: coletorServesCamera, totalCams: coletorCameras.length });
      };

      const onMsg = async (payload: any) => {
        if (!payload) return;
        if (payload.to !== viewerId) return;
        log("msg do coletor", payload.type);
        if (payload.type === "offer") {
          // Dedupe: o mesmo offer pode chegar em múltiplos canais (plain + filial).
          // Só processa se ainda estivermos em "stable" (antes de setRemoteDescription).
          if (!pc || pc.signalingState !== "stable") return;
          try {
            await pc.setRemoteDescription({ type: "offer", sdp: payload.sdp });
            const answer = await pc.createAnswer();
            // Recheca: se outro handler correu em paralelo, aborta silenciosamente.
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
            // Ignora erros de estado (duplicata de offer); só reporta erros reais.
            if (String(e?.message || "").includes("wrong state")) return;
            setErro(e.message);
            setStatus("erro");
          }
        }
      };

      offHeartbeat = onLiveSignalHeartbeat(onHeartbeat);
      offMsg = onLiveSignalMessage(onMsg);
      const signal = await acquireLiveSignalChannels(filialId);
      sendAll = signal.sendAll;
      releaseChannels = signal.release;
      if (closed) {
        releaseChannels?.();
        releaseChannels = null;
        return;
      }

      requestLiveSignalHeartbeat(sendAll, viewerId);

      // Aguarda rapidamente por heartbeat compartilhado; no mosaico, todas as
      // câmeras usam o mesmo canal para não abrir N WebSockets simultâneos.
      const deadline = Date.now() + 3500;
      while (!coletorSeenAt && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 200));
      }

      // Fallback: se o heartbeat de sinalização não chegou, consulta o status
      // reportado no banco (Coletor -> cv-coletor-cameras/report_status).
      // Se a câmera foi vista online recentemente, tenta negociar mesmo assim.
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
      // Se o heartbeat chegou mas essa câmera não estava na lista, ainda tenta
      // (pode ser diferença de filial temporária); o Coletor descarta se não servir.
      if (startDelayMs > 0) {
        await new Promise((r) => setTimeout(r, startDelayMs));
        if (closed) return;
      }

      log("enviando request de stream ao coletor", { viewerId, coletorVersao, coletorServesCamera });
      sendAll({ type: "request", to: "coletor", viewer_id: viewerId, camera_id: cameraId, want_audio: false });

      setTimeout(() => {
        if (!closed && !liveReached) {
          const detalhes: string[] = [];
          if (coletorVersao) detalhes.push(`Coletor v${coletorVersao}`);
          else detalhes.push("versão do Coletor desconhecida (provavelmente < 1.7.6)");
          if (!coletorServesCamera) detalhes.push("esta câmera NÃO está na lista servida pelo Coletor (verifique filial/ativo)");
          else detalhes.push("Coletor conhece a câmera mas não abriu o stream em 25s — RTSP indisponível, HEVC sem re-encode, ou CPU saturada por muitas câmeras simultâneas");
          const msg = `Coletor não respondeu ao pedido de stream. ${detalhes.join(" · ")}. Atualize o Coletor, confirme RTSP habilitado (teste no VLC) e reduza a resolução/fps se a CPU estiver alta.`;
          log("TIMEOUT", msg);
          setErro(msg);
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
      if (noFrameTimer) clearTimeout(noFrameTimer);
      offMsg?.();
      offHeartbeat?.();
      releaseChannels?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraId, filialId, nonce, startDelayMs]);

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
            onClick={(e) => { e.stopPropagation(); onMaximize ? onMaximize() : toggleFullscreen(); }}
            className="h-6 w-6 flex items-center justify-center rounded bg-black/60 text-white hover:bg-black/80"
            title={onMaximize ? "Maximizar" : "Tela cheia"}
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
