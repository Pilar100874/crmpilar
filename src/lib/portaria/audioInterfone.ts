import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Conversa entre quem está no computador da portaria e quem está no celular,
 * usando WebRTC com sinalização pelo Realtime.
 *
 * Funciona como no WhatsApp:
 * - Viva-voz é um controle local (não depende da outra ponta).
 * - A chamada pode começar já em vídeo ou só em áudio.
 * - No meio da conversa qualquer lado pode ligar a própria câmera e/ou pedir
 *   vídeo para a outra ponta, que aceita ou recusa.
 */
export type StatusAudio = "desligado" | "conectando" | "conectado" | "erro";

const ICE: RTCConfiguration = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:global.stun.twilio.com:3478"] }],
};

type Sinal =
  | { tipo: "oferta"; de: string; sdp: RTCSessionDescriptionInit }
  | { tipo: "resposta"; de: string; sdp: RTCSessionDescriptionInit }
  | { tipo: "ice"; de: string; candidate: RTCIceCandidateInit }
  | { tipo: "video"; de: string; ligado: boolean }
  | { tipo: "pedido_video"; de: string }
  | { tipo: "recusa_video"; de: string }
  | { tipo: "encerrar"; de: string };

export function useAudioInterfone(unidadeId: string | null, autoAtender = true) {
  const [status, setStatus] = useState<StatusAudio>("desligado");
  const [erro, setErro] = useState<string | null>(null);
  const [mudo, setMudo] = useState(false);
  const [meuVideo, setMeuVideo] = useState(false);
  const [vivaVoz, setVivaVoz] = useState(false);
  const [videoRemotoAtivo, setVideoRemotoAtivo] = useState(false);
  const [pedidoVideoRecebido, setPedidoVideoRecebido] = useState(false);
  const [aguardandoVideoRemoto, setAguardandoVideoRemoto] = useState(false);
  const [videoRemoto, setVideoRemoto] = useState<MediaStream | null>(null);

  const pc = useRef<RTCPeerConnection | null>(null);
  const local = useRef<MediaStream | null>(null);
  const videoLocal = useRef<MediaStreamTrack | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const canal = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const eu = useRef(Math.random().toString(36).slice(2));
  const meuVideoRef = useRef(false);
  const vivaVozRef = useRef(false);

  const enviar = useCallback((sinal: Sinal) => {
    void canal.current?.send({ type: "broadcast", event: "sinal", payload: sinal });
  }, []);

  const aplicarVivaVoz = useCallback((ligar: boolean) => {
    const el = audio.current as (HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> }) | null;
    if (!el) return;
    el.volume = 1;
    if (!el.setSinkId) return;
    void el.setSinkId(ligar ? "default" : "").catch(() => undefined);
  }, []);

  const limpar = useCallback(() => {
    pc.current?.getSenders().forEach((s) => s.track?.stop());
    pc.current?.close();
    pc.current = null;
    local.current?.getTracks().forEach((t) => t.stop());
    local.current = null;
    videoLocal.current = null;
    if (audio.current) {
      audio.current.srcObject = null;
      audio.current.remove();
      audio.current = null;
    }
    meuVideoRef.current = false;
    setStatus("desligado");
    setMudo(false);
    setMeuVideo(false);
    setVideoRemoto(null);
    setVideoRemotoAtivo(false);
    setPedidoVideoRecebido(false);
    setAguardandoVideoRemoto(false);
  }, []);

  const renegociar = useCallback(
    async (conexao: RTCPeerConnection) => {
      const oferta = await conexao.createOffer();
      await conexao.setLocalDescription(oferta);
      enviar({ tipo: "oferta", de: eu.current, sdp: oferta });
    },
    [enviar],
  );

  /** Liga a câmera local e publica a faixa de vídeo. */
  const ligarCameraLocal = useCallback(async () => {
    const conexao = pc.current;
    if (!conexao || videoLocal.current) return;
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
    const faixa = stream.getVideoTracks()[0];
    videoLocal.current = faixa;
    conexao.addTrack(faixa, local.current ?? stream);
    await renegociar(conexao);
  }, [renegociar]);

  const desligarCameraLocal = useCallback(async () => {
    const conexao = pc.current;
    if (!conexao || !videoLocal.current) return;
    const sender = conexao.getSenders().find((s) => s.track === videoLocal.current);
    if (sender) conexao.removeTrack(sender);
    videoLocal.current.stop();
    videoLocal.current = null;
    await renegociar(conexao);
  }, [renegociar]);

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
        setVideoRemoto(e.streams[0] ?? new MediaStream([e.track]));
        setVideoRemotoAtivo(true);
        setAguardandoVideoRemoto(false);
        e.track.onended = () => setVideoRemotoAtivo(false);
        e.track.onmute = () => setVideoRemotoAtivo(false);
        e.track.onunmute = () => setVideoRemotoAtivo(true);
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
      aplicarVivaVoz(vivaVozRef.current);
    };
    conexao.onconnectionstatechange = () => {
      const s = conexao.connectionState;
      if (s === "connected") setStatus("conectado");
      if (s === "failed" || s === "disconnected" || s === "closed") limpar();
    };
    pc.current = conexao;
    return conexao;
  }, [aplicarVivaVoz, enviar, limpar]);

  // Canal de sinalização por unidade
  useEffect(() => {
    const ch = supabase.channel(`interfone-audio-${unidadeId ?? "global"}`, {
      config: { broadcast: { self: false } },
    });
    ch.on("broadcast", { event: "sinal" }, async ({ payload }) => {
      const s = payload as Sinal;
      if (s.de === eu.current) return;
      try {
        if (s.tipo === "oferta") {
          if (!autoAtender && !pc.current) return;
          const conexao = pc.current ?? (await criarPeer());
          setStatus((atual) => (atual === "conectado" ? atual : "conectando"));
          await conexao.setRemoteDescription(new RTCSessionDescription(s.sdp));
          const resposta = await conexao.createAnswer();
          await conexao.setLocalDescription(resposta);
          enviar({ tipo: "resposta", de: eu.current, sdp: resposta });
        } else if (s.tipo === "resposta" && pc.current) {
          await pc.current.setRemoteDescription(new RTCSessionDescription(s.sdp)).catch(() => undefined);
        } else if (s.tipo === "ice" && pc.current) {
          await pc.current.addIceCandidate(new RTCIceCandidate(s.candidate)).catch(() => undefined);
        } else if (s.tipo === "video") {
          setVideoRemotoAtivo(s.ligado);
          if (s.ligado) setAguardandoVideoRemoto(false);
          else setVideoRemoto(null);
        } else if (s.tipo === "pedido_video") {
          if (!meuVideoRef.current) setPedidoVideoRecebido(true);
        } else if (s.tipo === "recusa_video") {
          setAguardandoVideoRemoto(false);
          setErro("A outra pessoa recusou o vídeo.");
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

  /** Abre o microfone e chama quem estiver na outra ponta (opcionalmente já em vídeo). */
  const conectar = useCallback(
    async (comVideo = false) => {
      setErro(null);
      setStatus("conectando");
      try {
        const conexao = await criarPeer();
        if (comVideo) {
          meuVideoRef.current = true;
          setMeuVideo(true);
          await ligarCameraLocal();
          enviar({ tipo: "video", de: eu.current, ligado: true });
          enviar({ tipo: "pedido_video", de: eu.current });
          setAguardandoVideoRemoto(true);
        } else {
          await renegociar(conexao);
        }
      } catch (e) {
        setErro((e as Error).message || "Não foi possível acessar o microfone.");
        setStatus("erro");
        limpar();
      }
    },
    [criarPeer, enviar, ligarCameraLocal, limpar, renegociar],
  );

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

  /** Liga/desliga a própria câmera. Se não houver chamada, inicia já em vídeo. */
  const alternarVideo = useCallback(async () => {
    setErro(null);
    if (!pc.current) {
      await conectar(true);
      return;
    }
    const novo = !meuVideoRef.current;
    meuVideoRef.current = novo;
    setMeuVideo(novo);
    try {
      if (novo) {
        await ligarCameraLocal();
        enviar({ tipo: "video", de: eu.current, ligado: true });
        if (!videoRemotoAtivo) {
          enviar({ tipo: "pedido_video", de: eu.current });
          setAguardandoVideoRemoto(true);
        }
      } else {
        await desligarCameraLocal();
        enviar({ tipo: "video", de: eu.current, ligado: false });
        setAguardandoVideoRemoto(false);
      }
    } catch {
      meuVideoRef.current = false;
      setMeuVideo(false);
      setErro("Não foi possível acessar a câmera.");
    }
  }, [conectar, desligarCameraLocal, enviar, ligarCameraLocal, videoRemotoAtivo]);

  /** Aceita o pedido de vídeo da outra ponta. */
  const aceitarVideo = useCallback(async () => {
    setPedidoVideoRecebido(false);
    if (meuVideoRef.current) return;
    try {
      meuVideoRef.current = true;
      setMeuVideo(true);
      await ligarCameraLocal();
      enviar({ tipo: "video", de: eu.current, ligado: true });
    } catch {
      meuVideoRef.current = false;
      setMeuVideo(false);
      setErro("Não foi possível acessar a câmera.");
    }
  }, [enviar, ligarCameraLocal]);

  const recusarVideo = useCallback(() => {
    setPedidoVideoRecebido(false);
    enviar({ tipo: "recusa_video", de: eu.current });
  }, [enviar]);

  /** Viva-voz: controle local, igual ao WhatsApp. */
  const alternarVivaVoz = useCallback(() => {
    const novo = !vivaVozRef.current;
    vivaVozRef.current = novo;
    setVivaVoz(novo);
    aplicarVivaVoz(novo);
  }, [aplicarVivaVoz]);

  /** Inicia a chamada já em viva-voz. */
  const ligarComVivaVoz = useCallback(async () => {
    if (!vivaVozRef.current) {
      vivaVozRef.current = true;
      setVivaVoz(true);
    }
    if (!pc.current) await conectar(false);
    aplicarVivaVoz(true);
  }, [aplicarVivaVoz, conectar]);

  return {
    status,
    erro,
    limparErro: () => setErro(null),
    mudo,
    conectar,
    desconectar,
    alternarMudo,
    meuVideo,
    vivaVoz,
    videoRemotoAtivo,
    videoRemoto,
    pedidoVideoRecebido,
    aguardandoVideoRemoto,
    alternarVideo,
    aceitarVideo,
    recusarVideo,
    alternarVivaVoz,
    ligarComVivaVoz,
  };
}
