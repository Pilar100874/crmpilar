// Executa a MergeConfig (mesma lógica do MergeBuilderDialog) e devolve as linhas
// já com os campos calculados aplicados. Usado pelo preview para navegar
// registro a registro.
import { supabase } from "@/integrations/supabase/client";
import { evalCalculados } from "@/lib/editores/mergeEngine";
import type { MergeConfig } from "@/components/editores/MergeBuilderDialog";

export async function runMergeConfig(cfg: MergeConfig | null | undefined): Promise<any[]> {
  if (!cfg?.tabela) return [];
  try {
    let q = supabase.from(cfg.tabela as any).select("*").limit(Math.min(cfg.limite || 50, 500));
    for (const f of cfg.filtros ?? []) {
      if (!f.campo || !f.valor) continue;
      if (f.op === "ilike") q = q.ilike(f.campo, `%${f.valor}%`);
      else q = (q as any)[f.op](f.campo, f.valor);
    }
    const { data, error } = await q;
    if (error) throw error;
    const calcs = cfg.calculados ?? [];
    return ((data ?? []) as any[]).map((r) => (calcs.length ? evalCalculados(r, calcs) : r));
  } catch (e) {
    console.error("[runMergeConfig]", e);
    return [];
  }
}
