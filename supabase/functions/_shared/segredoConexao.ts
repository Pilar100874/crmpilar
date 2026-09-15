// Cifra/decifra senhas de conexões externas (AES-GCM) usando CONEXOES_CRYPTO_KEY.
const PREFIXO = "enc:v1:";

async function chave(): Promise<CryptoKey> {
  const bruta = Deno.env.get("CONEXOES_CRYPTO_KEY");
  if (!bruta) throw new Error("CONEXOES_CRYPTO_KEY ausente");
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(bruta));
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function b64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

function deB64(texto: string) {
  return Uint8Array.from(atob(texto), (c) => c.charCodeAt(0));
}

export function estaCifrado(valor?: string | null): boolean {
  return typeof valor === "string" && valor.startsWith(PREFIXO);
}

export async function cifrarSegredo(valor: string): Promise<string> {
  if (!valor) return "";
  if (estaCifrado(valor)) return valor;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cifrado = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await chave(),
    new TextEncoder().encode(valor),
  );
  return `${PREFIXO}${b64(iv)}:${b64(new Uint8Array(cifrado))}`;
}

export async function decifrarSegredo(valor?: string | null): Promise<string> {
  if (!valor) return "";
  if (!estaCifrado(valor)) return valor; // compatibilidade com registros antigos
  const [, , ivB64, dadosB64] = valor.split(":");
  if (!ivB64 || !dadosB64) return "";
  const aberto = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: deB64(ivB64) },
    await chave(),
    deB64(dadosB64),
  );
  return new TextDecoder().decode(aberto);
}
