/**
 * Resposta manual ao desafio de autenticação (401/407) em chamadas SIP.
 *
 * O SIP.js só responde a desafios de autenticação no REGISTER. Quando o PABX
 * pede senha na hora de discar (401 Unauthorized / 407 Proxy Authentication
 * Required), a ligação era recusada mesmo com a senha correta. Aqui calculamos
 * o digest (RFC 2617, MD5) e reenviamos a chamada com o cabeçalho de
 * autorização preenchido.
 */
import CryptoJS from "crypto-js";

export interface DesafioSip {
  /** Cabeçalho a usar na resposta: Authorization (401) ou Proxy-Authorization (407). */
  tipo: "Authorization" | "Proxy-Authorization";
  realm: string;
  nonce: string;
  opaque?: string;
  qop?: string;
}

type CabecalhosSip = Record<string, Array<{ raw?: string }>> | undefined;

/** Lê o desafio WWW-Authenticate/Proxy-Authenticate da resposta do PABX. */
export function extrairDesafio(cabecalhos: CabecalhosSip, statusCode: number): DesafioSip | null {
  const nome = statusCode === 407 ? "Proxy-Authenticate" : "WWW-Authenticate";
  const bruto = cabecalhos?.[nome]?.[0]?.raw ?? "";
  if (!/digest/i.test(bruto)) return null;

  const campo = (chave: string) => bruto.match(new RegExp(`${chave}="?([^",]+)"?`, "i"))?.[1];
  const realm = campo("realm");
  const nonce = campo("nonce");
  if (!realm || !nonce) return null;

  return {
    tipo: statusCode === 407 ? "Proxy-Authorization" : "Authorization",
    realm,
    nonce,
    opaque: campo("opaque"),
    qop: campo("qop"),
  };
}

/** Monta o valor do cabeçalho Authorization/Proxy-Authorization (digest MD5). */
export function calcularCabecalhoAuth(
  desafio: DesafioSip,
  metodo: string,
  uri: string,
  username: string,
  password: string,
): string {
  const md5 = (valor: string) => CryptoJS.MD5(valor).toString();
  const ha1 = md5(`${username}:${desafio.realm}:${password}`);
  const ha2 = md5(`${metodo}:${uri}`);

  let response: string;
  let sufixo = "";
  const qop = desafio.qop?.split(",")[0]?.trim();
  if (qop) {
    const cnonce = Math.random().toString(16).slice(2, 14);
    const nc = "00000001";
    response = md5(`${ha1}:${desafio.nonce}:${nc}:${cnonce}:${qop}:${ha2}`);
    sufixo = `, qop=${qop}, nc=${nc}, cnonce="${cnonce}"`;
  } else {
    response = md5(`${ha1}:${desafio.nonce}:${ha2}`);
  }

  const opaco = desafio.opaque ? `, opaque="${desafio.opaque}"` : "";
  return `Digest username="${username}", realm="${desafio.realm}", nonce="${desafio.nonce}", uri="${uri}", response="${response}"${opaco}, algorithm=MD5${sufixo}`;
}
