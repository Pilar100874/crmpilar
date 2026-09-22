/**
 * Gravação de chamadas do Pilar Fone.
 *
 * O áudio da conversa passa pelo navegador (WebRTC), então gravamos localmente:
 * misturamos o microfone local e a voz da outra ponta num único fluxo e
 * gravamos com MediaRecorder. Nada é enviado ao PABX nem altera a ligação.
 */

export interface GravadorChamada {
  mimeType: string;
  /** Encerra a gravação e devolve o áudio final (null se ficou curto/vazio demais). */
  parar: () => Promise<Blob | null>;
}

const MIMES_TENTATIVOS = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
];

/** Tamanho mínimo para considerar que há conteúdo real (evita arquivos vazios). */
const TAMANHO_MINIMO_BYTES = 800;

/**
 * Começa a gravar uma chamada WebRTC a partir da conexão de mídia dela.
 * Retorna null quando não há trilhas de áudio vivas para gravar.
 */
export function iniciarGravador(pc: RTCPeerConnection): GravadorChamada | null {
  const ctx = new AudioContext();
  const destino = ctx.createMediaStreamDestination();
  let fontes = 0;

  const adicionarTrilha = (track: MediaStreamTrack | null | undefined) => {
    if (!track || track.kind !== "audio" || track.readyState !== "live") return;
    try {
      ctx.createMediaStreamSource(new MediaStream([track])).connect(destino);
      fontes += 1;
    } catch {
      // Alguma trilha pode não ser capturável; seguimos com as demais.
    }
  };

  // Minha voz (o que envio) e a voz da outra pessoa (o que recebo).
  pc.getSenders().forEach((s) => adicionarTrilha(s.track));
  pc.getReceivers().forEach((r) => adicionarTrilha(r.track));

  if (fontes === 0) {
    void ctx.close().catch(() => undefined);
    return null;
  }

  const mimeEscolhido =
    typeof MediaRecorder !== "undefined"
      ? MIMES_TENTATIVOS.find((m) => MediaRecorder.isTypeSupported(m)) ?? ""
      : "";

  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(destino.stream, mimeEscolhido ? { mimeType: mimeEscolhido } : undefined);
  } catch {
    void ctx.close().catch(() => undefined);
    return null;
  }

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  recorder.start(1000);

  const mimeType = recorder.mimeType || mimeEscolhido || "audio/webm";

  return {
    mimeType,
    parar: () =>
      new Promise<Blob | null>((resolve) => {
        const finalizar = () => {
          void ctx.close().catch(() => undefined);
          const blob = new Blob(chunks, { type: mimeType });
          resolve(blob.size >= TAMANHO_MINIMO_BYTES ? blob : null);
        };
        if (recorder.state === "inactive") {
          finalizar();
          return;
        }
        recorder.onstop = finalizar;
        try {
          recorder.stop();
        } catch {
          finalizar();
        }
      }),
  };
}

/** Extensão de arquivo adequada para o formato gravado. */
export function extensaoDoMime(mime: string): string {
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}
