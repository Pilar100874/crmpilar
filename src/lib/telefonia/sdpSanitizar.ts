/**
 * Alguns PABX (Grandstream UCM) enviam o mesmo número de payload duas vezes
 * com codecs diferentes (ex.: "a=rtpmap:2 G726-32/8000"), o que faz o Chrome
 * recusar a chamada com "Duplicate statically assigned payload type".
 * Aqui removemos os payloads repetidos/conflitantes antes de entregar o SDP.
 */

/** Payloads estáticos reservados pelo padrão RTP (RFC 3551). */
const ESTATICOS: Record<string, string> = {
  "0": "PCMU/8000",
  "2": "G721/8000",
  "3": "GSM/8000",
  "4": "G723/8000",
  "5": "DVI4/8000",
  "6": "DVI4/16000",
  "7": "LPC/8000",
  "8": "PCMA/8000",
  "9": "G722/8000",
  "10": "L16/44100",
  "11": "L16/44100",
  "12": "QCELP/8000",
  "13": "CN/8000",
  "14": "MPA/90000",
  "15": "G728/8000",
  "16": "DVI4/11025",
  "17": "DVI4/22050",
  "18": "G729/8000",
};

function normalizar(valor: string) {
  return valor.trim().toUpperCase().replace(/\/1$/, "");
}

export function sanitizarSdp(sdp: string): string {
  if (!sdp || !sdp.includes("a=rtpmap:")) return sdp;

  const linhas = sdp.split(/\r\n|\n/);
  const vistos = new Map<string, string>();
  const remover = new Set<string>();

  for (const linha of linhas) {
    const m = /^a=rtpmap:(\d+)\s+(.+)$/.exec(linha);
    if (!m) continue;
    const [, pt, codec] = m;
    const atual = normalizar(codec);
    const esperado = ESTATICOS[pt];

    if (esperado && normalizar(esperado) !== atual) {
      // payload estático usado com outro codec: o navegador rejeita
      remover.add(pt);
      continue;
    }
    const anterior = vistos.get(pt);
    if (anterior && anterior !== atual) {
      remover.add(pt);
      continue;
    }
    vistos.set(pt, atual);
  }

  if (remover.size === 0) return sdp;

  const resultado: string[] = [];
  for (const linha of linhas) {
    const atributo = /^a=(?:rtpmap|fmtp|rtcp-fb):(\d+)\b/.exec(linha);
    if (atributo && remover.has(atributo[1])) continue;

    const midia = /^m=(audio|video)\s+(\S+)\s+(\S+)\s+(.*)$/.exec(linha);
    if (midia) {
      const pts = midia[4].split(/\s+/).filter((pt) => !remover.has(pt));
      if (pts.length > 0) {
        resultado.push(`m=${midia[1]} ${midia[2]} ${midia[3]} ${pts.join(" ")}`);
        continue;
      }
    }
    resultado.push(linha);
  }

  return resultado.join("\r\n");
}
