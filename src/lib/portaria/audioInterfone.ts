import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Conversa por áudio/vídeo (dois sentidos) entre quem está na portaria
 * e quem está no celular, usando WebRTC com sinalização pelo Realtime.
 * Vídeo e viva-voz só ativam quando AS DUAS pontas permitem.
 */
export type StatusAudio = "desligado" | "conectando" | "conectado" | "erro";

const ICE: RTCConfiguration = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:global.stun.twilio.com:3478"] }],
};

type Sinal =
  | { tipo: "oferta"; de: string; sdp: RTCSessionDescriptionInit }
  | { tipo: "resposta"; de: string; sdp: RTCSessionDescriptionInit }
  | { tipo: "ice"; de: string; candidate: RTCIceCandidateInit }
  | { tipo: "capacidade"; de: string; video: boolean; vivaVoz: boolean }
  | { tipo: "encerrar"; de: string };

export function useAudioInterfone(unidadeId: string | null, autoAtender = true) {
  const [status, setStatus] = useState<StatusAudio>("desligado");
  const [erro, setErro] = useState<string | null>(null);
  const [mudo, setMudo] = useState(false);

  // Consentimento local (o que EU permito) e remoto (o que a OUTRA ponta permite)
  const [meuVideo, setMeuVideo] = useState(false);
  const [meuVivaVoz, setMeuVivaVoz] = useState(false);
  const [remotoVideoOk, setRemotoVideoOk] = useState(false);
  const [remotoVivaVozOk, setRemotoVivaVozOk] = useState(false);
  const [videoRemoto, setVideoRemoto] = useState<MediaStream | null>(null);

  const pc = useRef<RTCPeerConnection | null>(null);
  const local = useRef<MediaStream | null>(null);
  const videoLocal = useRef<MediaStream | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const canal = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const eu = useRef(Math.random().toString(36).slice(2));
  const remoto = useRef<string | null>(null);

  const enviar = useCallback((sinal: Sinal) => {
    void canal.current?.send({ type: "broadcast", event: "sinal", payload: sinal });
  }, []);

  const anunciarCapacidade = useCallback(
    (video: boolean, vivaVoz: boolean) => {
      enviar({ tipo: "capacidade", de: eu.current, video, vivaVoz });
    },
    [enviar],
  );

  const aplicarVivaVoz = useCallback(async (ligado: boolean) => {
    const el = audio.current;
    if (!el) return;
    try {
      // Android WebView raramente expõe setSinkId; quando há, escolhe a saída "speaker"
      const comSink = el as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> };
      if (typeof comSink.setSinkId === "function") {
        const dispositivos = await navigator.mediaDevices.enumerateDevices();
        const saidas = dispositivos.filter((d) => d.kind === "audiooutput");
        const speaker =
          saidas.find((d) => /speaker|alto.?falante/i.test(d.label)) ?? (ligado ? saidas[saidas.length - 1] : saidas[0]);
        if (speaker) await comSink.setSinkId(speaker.deviceId);
      }
      el.volume = 1.0;
    } catch {
      /* sem controle de saída neste aparelho */
    }
  }, []);

  const limpar = useCallback(() => {
    pc.current?.getSenders().forEach((s) => s.track?.stop());
    pc.current?.close();
    pc.current = null;
    local.current?.getTracks().forEach((t) => t.stop());
    local.current = null;
    videoLocal.current?.getTracks().forEach((t) => t.stop());
    videoLocal.current = null;
    if (audio.current) {
      audio.current.srcObject = null;
      audio.current.remove();
      audio.current = null;
    }
    setVideoRemoto(null);
    setRemotoVideoOk(false);
    setRemotoVivaVozOk(false);
    setStatus("desligado");
    setMudo(false);
  }, []);

  const renegociar = useCallback(async () => {
    const conexao = pc.current;
    if (!conexao || conexao.signalingState !== "stable") return;
    try {
      const oferta = await conexao.createOffer();
      await conexao.setLocalDescription(oferta);
      enviar({ tipo: "oferta", de: eu.current, sdp: oferta });
    } catch {
      /* renegociação best-effort */
    }
  }, [enviar]);

  const habilitarVideoLocal = useCallback(async () => {
    if (videoLocal.current || !pc.current) return;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 640 } },
    });
    videoLocal.current = stream;
    stream.getTracks().forEach((t) => pc.current?.addTrack(t, stream));
  }, []);

  const criarPeer = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    local.current = stream;
    const conexao = new RTCPeerConnection(ICE);
    stream.getTracks().forEach((t) => conexao.addTrack(t, stream));
    conexao.onicecandidate = (e) => {
      if (e.candidate) enviar({ tipo: "ice", de: eu.current, candidate: e.candidate.toJSON() });
    };
    conexao.ontrack = (e) => {
      if (e.track.kind === "video") {
        setVideoRemoto(e.streams[0]);
        return;
      }
      if (!audio.current) {
        const el = document.createElement("audio");
        el.autoplay = true;
        document.body.appendChild(el);
        audio.current = el;
      }
      audio.current.srcObject = e.streams[0];
      void audio.current.play().catch(() => undefined);
    };
    conexao.onconnectionstatechange = () => {
      const s = conexao.connectionState;
      if (s === "connected") setStatus("conectado");
      if (s === "failed" || s === "disconnected" || s === "closed") limpar();
    };
    pc.current = conexao;
    return conexao;
  }, [enviar, limpar]);

  // Vídeo só liga quando as DUAS pontas permitem
  const videoAtivo = status === "conectado" && meuVideo && remotoVideoOk;
  const vivaVozAtiva = status === "conectado" && meuVivaVoz && remotoVivaVozOk;

  useEffect(() => {
    if (!videoAtivo) return;
    void (async () => {
      try {
        await habilitarVideoLocal();
        // Evita glare: só a ponta "menor" inicia a renegociação
        if (remoto.current && eu.current < remoto.current) await renegociar();
      } catch {
        setErro("Não foi possível acessar a câmera para vídeo.");
      }
    })();
  }, [videoAtivo, habilitarVideoLocal, renegociar]);

  useEffect(() => {
    if (status === "conectado") void aplicarVivaVoz(vivaVozAtiva);
  }, [vivaVozAtiva, status, aplicarVivaVoz]);

  // Canal de sinalização por unidade
  useEffect(() => {
    const ch = supabase.channel(`interfone-audio-${unidadeId ?? "global"}`, {
      config: { broadcast: { self: false } },
    });
    ch.on("broadcast", { event: "sinal" }, async ({ payload }) => {
      const s = payload as Sinal;
      if (s.de === eu.current) return;
      remoto.current = s.de;
      try {
        if (s.tipo === "capacidade") {
          setRemotoVideoOk(s.video);
          setRemotoVivaVozOk(s.vivaVoz);
          return;
        }
        if (s.tipo === "oferta") {
          if (!autoAtender) return;
          const conexao = pc.current ?? (await criarPeer());
          setStatus("conectando");
          await conexao.setRemoteDescription(new RTCSessionDescription(s.sdp));
          const resposta = await conexao.createAnswer();
          await conexao.setLocalDescription(resposta);
          enviar({ tipo: "resposta", de: eu.current, sdp: resposta });
        } else if (s.tipo === "resposta" && pc.current && pc.current.signalingState === "have-local-offer") {
          await pc.current.setRemoteDescription(new RTCSessionDescription(s.sdp));
        } else if (s.tipo === "ice" && pc.current) {
          await pc.current.addIceCandidate(new RTCIceCandidate(s.candidate)).catch(() => undefined);
        } else if (s.tipo === "encerrar") {
          limpar();
        }
      } catch (e) {
        setErro((e as Error).message);
        setStatus("erro");
      }
    }).subscribe();
    canal.current = ch;
    return () => {
      void supabase.removeChannel(ch);
      canal.current = null;
      limpar();
    };
  }, [autoAtender, criarPeer, enviar, limpar, unidadeId]);

  /** Abre o microfone e chama quem estiver na outra ponta. */
  const conectar = useCallback(async () => {
    setErro(null);
    setStatus("conectando");
    try {
      const conexao = await criarPeer();
      const oferta = await conexao.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await conexao.setLocalDescription(oferta);
      enviar({ tipo: "oferta", de: eu.current, sdp: oferta });
    } catch (e) {
      setErro((e as Error).message || "Não foi possível acessar o microfone.");
      setStatus("erro");
      limpar();
    }
  }, [criarPeer, enviar, limpar]);

  const desconectar = useCallback(() => {
    enviar({ tipo: "encerrar", de: eu.current });
    limpar();
  }, [enviar, limpar]);

  const alternarMudo = useCallback(() => {
    const faixas = local.current?.getAudioTracks() ?? [];
    const novo = !mudo;
    faixas.forEach((t) => (t.enabled = !novo));
    setMudo(novo);
  }, [mudo]);

  /** Marca minha permissão de vídeo e avisa a outra ponta. */
  const alternarVideo = useCallback(() => {
    const novo = !meuVideo;
    setMeuVideo(novo);
    anunciarCapacidade(novo, meuVivaVoz);
    if (!novo && videoLocal.current) {
      videoLocal.current.getTracks().forEach((t) => {
        t.stop();
        const sender = pc.current?.getSenders().find((s) => s.track === t);
        if (sender) pc.current?.removeTrack(sender);
      });
      videoLocal.current = null;
      void renegociar();
    }
  }, [meuVideo, meuVivaVoz, anunciarCapacidade, renegociar]);

  /** Marca minha permissão de viva-voz e avisa a outra ponta. */
  const alternarVivaVoz = useCallback(() => {
    const novo = !meuVivaVoz;
    setMeuVivaVoz(novo);
    anunciarCapacidade(meuVideo, novo);
  }, [meuVivaVoz, meuVideo, anunciarCapacidade]);

  return {
    status,
    erro,
    mudo,
    conectar,
    desconectar,
    alternarMudo,
    // vídeo / viva-voz com consentimento mútuo
    meuVideo,
    meuVivaVoz,
    remotoVideoOk,
    remotoVivaVozOk,
    videoAtivo,
    vivaVozAtiva,
    videoRemoto,
    alternarVideo,
    alternarVivaVoz,
  };
}
