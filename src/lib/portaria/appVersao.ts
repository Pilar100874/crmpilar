/** Versão embarcada no APK (mantida igual a portaria-app/VERSION). */
export const APP_VERSAO = "1.7.5";

const ORIGENS = [
  "/coletor/interfone-version.json",
  "https://crmpilar.lovable.app/coletor/interfone-version.json",
];

export interface VersaoRemota {
  version: string;
  downloadUrl: string;
  filename?: string;
  notas?: string;
}

/** Compara versões no formato x.y.z (a > b ? 1 : ...). */
export function compararVersoes(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}

/** Busca o manifesto de versão publicado (tenta local e depois o site publicado). */
export async function buscarVersaoRemota(): Promise<VersaoRemota | null> {
  for (const url of ORIGENS) {
    try {
      const r = await fetch(`${url}?t=${Date.now()}`, { cache: "no-store" });
      if (!r.ok) continue;
      const j = (await r.json()) as VersaoRemota;
      if (j?.version && j?.downloadUrl) return j;
    } catch {
      // tenta a próxima origem
    }
  }
  return null;
}

/** Retorna a versão remota apenas quando ela for mais nova que a instalada. */
export async function verificarAtualizacao(): Promise<VersaoRemota | null> {
  const remota = await buscarVersaoRemota();
  if (!remota) return null;
  return compararVersoes(remota.version, APP_VERSAO) > 0 ? remota : null;
}
