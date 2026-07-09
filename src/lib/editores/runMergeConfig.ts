// Executa a MergeConfig e devolve as linhas prontas (com relações resolvidas
// e campos calculados aplicados). Suporta modo "visual" (tabela principal +
// relações) e modo "sql" (SELECT livre via edge function).
import { supabase } from "@/integrations/supabase/client";
import { evalCalculados } from "@/lib/editores/mergeEngine";
import { getDataset } from "@/lib/editores/importedDatasetStore";
import type { MergeConfig, MergeRelation, MergeConfigFiltro } from "@/components/editores/MergeBuilderDialog";

function applyFilter(r: any, f: MergeConfigFiltro): boolean {
  if (!f.campo || !f.valor) return true;
  const campo = f.campo.includes(".") ? f.campo.split(".").slice(1).join(".") : f.campo;
  const v = r?.[campo];
  const val = f.valor;
  switch (f.op) {
    case "eq": return String(v) === val;
    case "neq": return String(v) !== val;
    case "ilike": return String(v ?? "").toLowerCase().includes(val.toLowerCase());
    case "gt": return Number(v) > Number(val);
    case "gte": return Number(v) >= Number(val);
    case "lt": return Number(v) < Number(val);
    case "lte": return Number(v) <= Number(val);
    default: return true;
  }
}

async function resolveRelations(
  rows: any[],
  relations: MergeRelation[] | undefined,
): Promise<any[]> {
  if (!relations || relations.length === 0 || rows.length === 0) return rows;

  for (const rel of relations) {
    if (!rel.tabela || !rel.localKey || !rel.foreignKey || !rel.alias) continue;
    const ids = Array.from(new Set(rows.map((r) => r?.[rel.localKey]).filter((v) => v != null)));
    if (ids.length === 0) {
      rows.forEach((r) => { r[rel.alias] = rel.cardinality === "1:N" ? [] : null; });
      continue;
    }
    try {
      const { data, error } = await supabase
        .from(rel.tabela as any)
        .select("*")
        .in(rel.foreignKey, ids as any);
      if (error) throw error;
      const groups = new Map<any, any[]>();
      for (const r of (data ?? []) as any[]) {
        const k = r?.[rel.foreignKey];
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k)!.push(r);
      }
      rows.forEach((r) => {
        const list = groups.get(r?.[rel.localKey]) ?? [];
        r[rel.alias] = rel.cardinality === "1:N" ? list : (list[0] ?? null);
      });
    } catch (e) {
      console.warn("[runMergeConfig] relação falhou:", rel, e);
      rows.forEach((r) => { r[rel.alias] = rel.cardinality === "1:N" ? [] : null; });
    }
  }
  return rows;
}

export async function runMergeConfig(cfg: MergeConfig | null | undefined): Promise<any[]> {
  if (!cfg) return [];
  try {
    let rows: any[] = [];

    if (cfg.mode === "sql" && cfg.sql?.trim()) {
      const { data, error } = await supabase.functions.invoke("execute-merge-sql", {
        body: { sql: cfg.sql },
      });
      if (error) throw error;
      rows = Array.isArray(data?.rows) ? data.rows : [];
    } else if (cfg.tabela) {
      let q = supabase.from(cfg.tabela as any).select("*").limit(Math.min(cfg.limite || 50, 500));
      for (const f of cfg.filtros ?? []) {
        if (!f.campo || !f.valor) continue;
        if (f.op === "ilike") q = q.ilike(f.campo, `%${f.valor}%`);
        else q = (q as any)[f.op](f.campo, f.valor);
      }
      const { data, error } = await q;
      if (error) throw error;
      rows = (data ?? []) as any[];
      rows = await resolveRelations(rows, cfg.relations);
    }

    const calcs = cfg.calculados ?? [];
    return calcs.length ? rows.map((r) => evalCalculados(r, calcs)) : rows;
  } catch (e) {
    console.error("[runMergeConfig]", e);
    return [];
  }
}
