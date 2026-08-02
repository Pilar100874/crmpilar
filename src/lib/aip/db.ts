import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimento";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

/**
 * Acesso genérico às tabelas da Plataforma de Agentes IA (prefixo aip_).
 * Usamos um client "solto" de tipos porque as tabelas são acessadas
 * dinamicamente por nome em hooks genéricos de CRUD.
 */
export const db = supabase as any;

export type AipTable =
  | "aip_agents"
  | "aip_agent_versions"
  | "aip_skills"
  | "aip_skill_versions"
  | "aip_skill_files"
  | "aip_tools"
  | "aip_mcps"
  | "aip_resources"
  | "aip_workflows"
  | "aip_workflow_versions"
  | "aip_wizards"
  | "aip_executions"
  | "aip_execution_steps"
  | "aip_approvals"
  | "aip_assets"
  | "aip_asset_versions"
  | "aip_api_keys"
  | "aip_usage_limits"
  | "aip_permissions"
  | "aip_audit_log"
  | "aip_rotinas"
  | "aip_rotina_runs"
  | "aip_conectores"
  | "aip_credenciais"
  | "aip_credencial_versoes"
  | "aip_receitas";

export function useEstabelecimento() {
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  useEffect(() => {
    getEstabelecimentoId().then(setEstabelecimentoId);
  }, []);
  return estabelecimentoId;
}

export async function registrarAuditoria(
  estabelecimentoId: string,
  acao: string,
  recursoTipo?: string,
  recursoId?: string,
  detalhes: Record<string, unknown> = {},
) {
  try {
    const { data: auth } = await supabase.auth.getUser();
    await db.from("aip_audit_log").insert({
      estabelecimento_id: estabelecimentoId,
      usuario_id: auth?.user?.id ?? null,
      acao,
      recurso_tipo: recursoTipo ?? null,
      recurso_id: recursoId ?? null,
      detalhes,
    });
  } catch (e) {
    console.warn("Falha ao registrar auditoria", e);
  }
}

interface UseAipTableOptions {
  orderBy?: string;
  ascending?: boolean;
  filter?: Record<string, unknown>;
  incluirPadrao?: boolean;
}

export function useAipTable<T extends { id: string }>(
  table: AipTable,
  options: UseAipTableOptions = {},
) {
  const estabelecimentoId = useEstabelecimento();
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const {
    orderBy = "created_at",
    ascending = false,
    filter,
    incluirPadrao = false,
  } = options;
  const filterKey = JSON.stringify(filter ?? {});

  const fetchItems = useCallback(async () => {
    if (!estabelecimentoId) return;
    setLoading(true);
    let query = db.from(table).select("*");
    if (!incluirPadrao) query = query.eq("estabelecimento_id", estabelecimentoId);
    const parsed = JSON.parse(filterKey) as Record<string, unknown>;
    Object.entries(parsed).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") query = query.eq(k, v);
    });
    const { data, error } = await query.order(orderBy, { ascending });
    if (error) {
      console.error(`Erro ao carregar ${table}`, error);
      toast.error(`Erro ao carregar dados: ${error.message}`);
    } else {
      setItems((data ?? []) as T[]);
    }
    setLoading(false);
  }, [estabelecimentoId, table, orderBy, ascending, filterKey, incluirPadrao]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const create = async (payload: Partial<T>) => {
    if (!estabelecimentoId) return null;
    const { data, error } = await db
      .from(table)
      .insert({ ...payload, estabelecimento_id: estabelecimentoId })
      .select()
      .single();
    if (error) {
      toast.error(`Erro ao criar: ${error.message}`);
      return null;
    }
    toast.success("Registro criado");
    registrarAuditoria(estabelecimentoId, "criar", table, data?.id);
    await fetchItems();
    return data as T;
  };

  const update = async (id: string, payload: Partial<T>) => {
    if (!estabelecimentoId) return false;
    const { error } = await db.from(table).update(payload).eq("id", id);
    if (error) {
      toast.error(`Erro ao salvar: ${error.message}`);
      return false;
    }
    toast.success("Alterações salvas");
    registrarAuditoria(estabelecimentoId, "editar", table, id);
    await fetchItems();
    return true;
  };

  const remove = async (id: string) => {
    if (!estabelecimentoId) return false;
    const { error } = await db.from(table).delete().eq("id", id);
    if (error) {
      toast.error(`Erro ao excluir: ${error.message}`);
      return false;
    }
    toast.success("Registro excluído");
    registrarAuditoria(estabelecimentoId, "excluir", table, id);
    await fetchItems();
    return true;
  };

  return { items, loading, estabelecimentoId, create, update, remove, refetch: fetchItems };
}
