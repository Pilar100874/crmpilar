/** Leitura dos manifestos de versão dos aplicativos publicados. */

export interface AppVersaoInfo {
  versao?: string;
  url?: string;
  arquivo?: string;
  atualizadoEm?: string;
  notas?: string;
}

const cache = new Map<string, AppVersaoInfo | null>();

/** Busca um manifesto (formato GitHub Actions ou coletor) e normaliza os campos. */
export async function buscarVersaoApp(manifestUrl: string): Promise<AppVersaoInfo | null> {
  if (cache.has(manifestUrl)) return cache.get(manifestUrl) ?? null;
  try {
    const r = await fetch(`${manifestUrl}?_=${Date.now()}`, { cache: "no-store" });
    if (!r.ok) throw new Error("indisponível");
    const d = await r.json();
    const info: AppVersaoInfo = {
      versao: d?.versionName || d?.version || undefined,
      url: d?.url || d?.downloadUrl || undefined,
      arquivo: d?.asset || d?.filename || (d?.url || d?.downloadUrl || "").split("/").pop() || undefined,
      atualizadoEm: d?.updated_at || d?.created_at || undefined,
      notas: d?.notas || undefined,
    };
    cache.set(manifestUrl, info);
    return info;
  } catch {
    cache.set(manifestUrl, null);
    return null;
  }
}

/** Data no formato dd/mm/aaaa (vazio quando não houver). */
export function formatarDataVersao(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("pt-BR");
}
