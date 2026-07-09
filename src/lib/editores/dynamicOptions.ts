import { supabase } from "@/integrations/supabase/client";

const DYN_PREFIX = "__DYN__:";

export function isDynamicOpcoes(opcoes?: string[]): boolean {
  return !!opcoes && opcoes.length === 1 && opcoes[0].startsWith(DYN_PREFIX);
}

export function parseDynamic(opcoes: string[]): { tabela: string; coluna: string } | null {
  if (!isDynamicOpcoes(opcoes)) return null;
  const rest = opcoes[0].slice(DYN_PREFIX.length);
  const [tabela, coluna] = rest.split(":");
  if (!tabela || !coluna) return null;
  return { tabela, coluna };
}

export function makeDynamicMarker(tabela: string, coluna: string): string {
  return `${DYN_PREFIX}${tabela}:${coluna}`;
}

const cache = new Map<string, Promise<string[]>>();

export function fetchDynamicOptions(tabela: string, coluna: string): Promise<string[]> {
  const key = `${tabela}:${coluna}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const p = (async () => {
    try {
      const { data, error } = await supabase
        .from(tabela as any)
        .select(coluna)
        .not(coluna, "is", null)
        .limit(2000);
      if (error) throw error;
      const set = new Set<string>();
      for (const row of (data ?? []) as any[]) {
        const v = row?.[coluna];
        if (v == null) continue;
        const s = String(v).trim();
        if (s) set.add(s);
      }
      return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
    } catch (e) {
      console.error("[fetchDynamicOptions]", e);
      return [];
    }
  })();
  cache.set(key, p);
  // expire cache after 30s so it truly reflects "tempo real"
  setTimeout(() => cache.delete(key), 30_000);
  return p;
}
