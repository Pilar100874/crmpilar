/**
 * Toque de chamando (ringback) gerado no próprio computador.
 * Usado enquanto a ligação está discando, caso o PABX não envie áudio antecipado.
 * Padrão brasileiro: 1 segundo de tom em 425 Hz e 4 segundos de silêncio.
 */

let contexto: AudioContext | null = null;
let oscilador: OscillatorNode | null = null;
let ganho: GainNode | null = null;
let ciclo: number | null = null;

const FREQUENCIA = 425;
const TOM_MS = 1000;
const PAUSA_MS = 4000;

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

/** Começa a tocar o "chamando" na caixa de som. Seguro chamar mais de uma vez. */
export function iniciarToqueChamando() {
  if (oscilador) return;
  const ctx = garantirContexto();
  if (!ctx) return;

  ganho = ctx.createGain();
  ganho.gain.value = 0;
  ganho.connect(ctx.destination);

  oscilador = ctx.createOscillator();
  oscilador.type = "sine";
  oscilador.frequency.value = FREQUENCIA;
  oscilador.connect(ganho);
  oscilador.start();

  const bipe = () => {
    if (!ganho || !contexto) return;
    const agora = contexto.currentTime;
    ganho.gain.cancelScheduledValues(agora);
    ganho.gain.setValueAtTime(0, agora);
    ganho.gain.linearRampToValueAtTime(0.12, agora + 0.05);
    ganho.gain.setValueAtTime(0.12, agora + TOM_MS / 1000 - 0.05);
    ganho.gain.linearRampToValueAtTime(0, agora + TOM_MS / 1000);
  };

  bipe();
  ciclo = window.setInterval(bipe, TOM_MS + PAUSA_MS);
}

/** Para o toque de "chamando". */
export function pararToqueChamando() {
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
