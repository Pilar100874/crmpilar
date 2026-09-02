import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Conversa entre quem está no computador da portaria e quem está no celular,
 * usando WebRTC com sinalização pelo Realtime.
 *
 * Vídeo e viva-voz só são ativados quando AS DUAS pontas permitem: cada lado
 * envia um sinal de "capacidade" com suas permissões locais; o recurso liga
 * apenas quando os dois lados estão com a flag ligada.
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
  const [meuVideo, setMeuVideo] = useState(false);
  const [meuVivaVoz, setMeuVivaVoz] = useState(false);
  const [remotoVideoOk, setRemotoVideoOk] = useState(false);
  const [remotoVivaVozOk, setRemotoVivaVozOk] = useState(false);
  const [videoRemoto, setVideoRemoto] = useState<MediaStream | null>(null);

  const pc = useRef<RTCPeerConnection | null>(null);
  const local = useRef<MediaStream | null>(null);
  const videoLocal = useRef<MediaStreamTrack | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const canal = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const eu = useRef(Math.random().toString(36).slice(2));
  const remotoVideoRef = useRef(false);
  const meuVideoRef = useRef(false);

  const videoAtivo = meuVideo && remotoVideoOk;
  const vivaVozAtiva = meuVivaVoz && remotoVivaVozOk;

  const enviar = useCallback((sinal: Sinal) => {
    void canal.current?.send({ type: "broadcast", event: "sinal", payload: sinal });
  }, []);

  const enviarCapacidade = useCallback(
    (video: boolean, vivaVoz: boolean) => {
      enviar({ tipo: "capacidade", de: eu.current, video, vivaVoz });
    },
    [enviar],
  );

  const aplicarVivaVoz = useCallback((ligar: boolean) => {
    const el = audio.current as (HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> }) | null;
    if (!el?.setSinkId) return;
    // Em Android/Chrome o alto-falante costuma ser o sink "default" quando não há fone
    void el.setSinkId(ligar ? "default" : "").catch(() => undefined);
    if (ligar) el.volume = 1;
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
    setStatus("desligado");
    setMudo(false);
    setVideoRemoto(null);
    setRemotoVideoOk(false);
    setRemotoVivaVozOk(false);
    remotoVideoRef.current = false;
  }, []);

  const renegociar = useCallback(
    async (conexao: RTCPeerConnection) => {
      const oferta = await conexao.createOffer();
      await conexao.setLocalDescription(oferta);
      enviar({ tipo: "oferta", de: eu.current, sdp: oferta });
    },
    [enviar],
  );

  /** Liga/desliga a faixa de vídeo local conforme o consentimento das duas pontas. */
  const sincronizarVideo = useCallback(
    async (remotoOk: boolean) => {
      const conexao = pc.current;
      if (!conexao) return;
      const ambos = meuVideoRef.current && remotoOk;
      const temVideo = !!videoLocal.current;
      try {
        if (ambos && !temVideo) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          const faixa = stream.getVideoTracks()[0];
          videoLocal.current = faixa;
          conexao.addTrack(faixa, local.current ?? stream);
          // Só o lado com id menor inicia a renegociação para evitar conflito de ofertas
          await renegociar(conexao);
        } else if (!ambos && temVideo) {
          const sender = conexao.getSenders().find((s) => s.track === videoLocal.current);
          if (sender) conexao.removeTrack(sender);
          videoLocal.current?.stop();
          videoLocal.current = null;
          await renegociar(conexao);
        }
      } catch {
        setErro("Não foi possível acessar a câmera para o vídeo.");
      }
    },
    [renegociar],
  );

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
      if (s === "connected") {
        setStatus("conectado");
        // Ao conectar, avisa a outra ponta das permissões atuais
        enviarCapacidade(meuVideoRef.current, meuVivaVoz);
      }
      if (s === "failed" || s === "disconnected" || s === "closed") limpar();
    };
    pc.current = conexao;
    return conexao;
  }, [enviar, enviarCapacidade, limpar, meuVivaVoz]);

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
        } else if (s.tipo === "capacidade") {
          remotoVideoRef.current = s.video;
          setRemotoVideoOk(s.video);
          setRemotoVivaVozOk(s.vivaVoz);
          aplicarVivaVoz(meuVivaVoz && s.vivaVoz);
          void sincronizarVideo(s.video);
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
  }, [autoAtender, criarPeer, enviar, limpar, unidadeId, aplicarVivaVoz, meuVivaVoz, sincronizarVideo]);

  /** Abre o microfone e chama quem estiver na outra ponta. */
  const conectar = useCallback(async () => {
    setErro(null);
    setStatus("conectando");
    try {
      const conexao = await criarPeer();
      await renegociar(conexao);
      enviarCapacidade(meuVideoRef.current, meuVivaVoz);
    } catch (e) {
      setErro((e as Error).message || "Não foi possível acessar o microfone.");
      setStatus("erro");
      limpar();
    }
  }, [criarPeer, enviarCapacidade, limpar, meuVivaVoz, renegociar]);

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

  /** Permite (ou não) vídeo nesta ponta. Só ativa se a outra ponta também permitir. */
  const alternarVideo = useCallback(() => {
    const novo = !meuVideoRef.current;
    meuVideoRef.current = novo;
    setMeuVideo(novo);
    enviarCapacidade(novo, meuVivaVoz);
    void sincronizarVideo(remotoVideoRef.current);
  }, [enviarCapacidade, meuVivaVoz, sincronizarVideo]);

  /** Permite (ou não) viva-voz nesta ponta. Só ativa se a outra ponta também permitir. */
  const alternarVivaVoz = useCallback(() => {
    setMeuVivaVoz((atual) => {
      const novo = !atual;
      enviarCapacidade(meuVideoRef.current, novo);
      aplicarVivaVoz(novo && remotoVivaVozOk);
      return novo;
    });
  }, [aplicarVivaVoz, enviarCapacidade, remotoVivaVozOk]);

  return {
    status,
    erro,
    mudo,
    conectar,
    desconectar,
    alternarMudo,
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
