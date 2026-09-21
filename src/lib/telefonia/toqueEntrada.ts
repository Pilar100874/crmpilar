/**
 * Campainha de chamada recebida, gerada no próprio computador (WebAudio).
 *
 * Dois toques distintos:
 * - "padrao":   campainha clássica de telefone (dois tons alternados, toque longo).
 * - "discador": três bipes curtos e agudos — indica que a ligação veio do
 *               discador (click-to-call): ao atender, o PABX já disca o cliente.
 */

export type TipoToqueEntrada = "padrao" | "discador";

let contexto: AudioContext | null = null;
let oscilador: OscillatorNode | null = null;
let ganho: GainNode | null = null;
let ciclo: number | null = null;

function garantirContexto(): AudioContext | null {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!contexto || contexto.state === "closed") contexto = new Ctor();
    if (contexto.state === "suspended") void contexto.resume();
    return contexto;
  } catch {
    return null;
  }
}

function pulso(freq: number, inicio: number, duracao: number, volume = 0.14) {
  if (!ganho || !oscilador) return;
  oscilador.frequency.setValueAtTime(freq, inicio);
  ganho.gain.setValueAtTime(0, inicio);
  ganho.gain.linearRampToValueAtTime(volume, inicio + 0.03);
  ganho.gain.setValueAtTime(volume, inicio + duracao - 0.04);
  ganho.gain.linearRampToValueAtTime(0, inicio + duracao);
}

/** Padrão clássico: 1,2 s de tom duplo e 2,8 s de silêncio (ciclo de 4 s). */
function padrao(ctx: AudioContext) {
  const t = ctx.currentTime;
  pulso(440, t, 0.6);
  pulso(480, t + 0.6, 0.6);
}

/** Padrão do discador: três bipes curtos e agudos e pausa (ciclo de 2,5 s). */
function discador(ctx: AudioContext) {
  const t = ctx.currentTime;
  pulso(880, t, 0.16, 0.16);
  pulso(880, t + 0.26, 0.16, 0.16);
  pulso(1040, t + 0.52, 0.3, 0.16);
}

const DURACAO_CICLO: Record<TipoToqueEntrada, number> = { padrao: 4000, discador: 2500 };

/** Começa a tocar a campainha de entrada. Seguro chamar mais de uma vez. */
export function iniciarToqueEntrada(tipo: TipoToqueEntrada = "padrao") {
  pararToqueEntrada();
  const ctx = garantirContexto();
  if (!ctx) return;

  ganho = ctx.createGain();
  ganho.gain.value = 0;
  ganho.connect(ctx.destination);

  oscilador = ctx.createOscillator();
  oscilador.type = "sine";
  oscilador.connect(ganho);
  oscilador.start();

  const tocar = tipo === "discador" ? discador : padrao;
  tocar(ctx);
  ciclo = window.setInterval(() => {
    if (contexto) tocar(contexto);
  }, DURACAO_CICLO[tipo]);
}

/** Para a campainha de entrada. */
export function pararToqueEntrada() {
  if (ciclo !== null) {
    window.clearInterval(ciclo);
    ciclo = null;
  }
  try {
    oscilador?.stop();
  } catch {
    /* já parado */
  }
  oscilador?.disconnect();
  ganho?.disconnect();
  oscilador = null;
  ganho = null;
}
