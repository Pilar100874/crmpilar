import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Conversa por áudio (dois sentidos) entre quem está no computador da portaria
 * e quem está no celular, usando WebRTC com sinalização pelo Realtime.
 */
export type StatusAudio = "desligado" | "conectando" | "conectado" | "erro";

const ICE: RTCConfiguration = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:global.stun.twilio.com:3478"] }],
};

type Sinal =
  | { tipo: "oferta"; de: string; sdp: RTCSessionDescriptionInit }
  | { tipo: "resposta"; de: string; sdp: RTCSessionDescriptionInit }
  | { tipo: "ice"; de: string; candidate: RTCIceCandidateInit }
  | { tipo: "encerrar"; de: string };

export function useAudioInterfone(unidadeId: string | null, autoAtender = true) {
  const [status, setStatus] = useState<StatusAudio>("desligado");
  const [erro, setErro] = useState<string | null>(null);
  const [mudo, setMudo] = useState(false);

  const pc = useRef<RTCPeerConnection | null>(null);
  const local = useRef<MediaStream | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const canal = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const eu = useRef(Math.random().toString(36).slice(2));

  const enviar = useCallback((sinal: Sinal) => {
    void canal.current?.send({ type: "broadcast", event: "sinal", payload: sinal });
  }, []);

  const limpar = useCallback(() => {
    pc.current?.getSenders().forEach((s) => s.track?.stop());
    pc.current?.close();
    pc.current = null;
    local.current?.getTracks().forEach((t) => t.stop());
    local.current = null;
    if (audio.current) {
      audio.current.srcObject = null;
      audio.current.remove();
      audio.current = null;
    }
    setStatus("desligado");
    setMudo(false);
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
          if (!autoAtender) return;
          const conexao = pc.current ?? (await criarPeer());
          setStatus("conectando");
          await conexao.setRemoteDescription(new RTCSessionDescription(s.sdp));
          const resposta = await conexao.createAnswer();
          await conexao.setLocalDescription(resposta);
          enviar({ tipo: "resposta", de: eu.current, sdp: resposta });
        } else if (s.tipo === "resposta" && pc.current && !pc.current.currentRemoteDescription) {
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
      const oferta = await conexao.createOffer({ offerToReceiveAudio: true });
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

  return { status, erro, mudo, conectar, desconectar, alternarMudo };
}
