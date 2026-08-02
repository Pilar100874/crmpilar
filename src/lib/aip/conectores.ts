import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { db, useEstabelecimento } from "@/lib/aip/db";
import { CATALOGO_RECURSOS } from "@/lib/aip/catalog";

/**
 * Registro unificado de conectores disponíveis para rotinas, agentes e
 * Claude Code. Combina o catálogo fixo do sistema com o que foi sincronizado
 * do banco (ferramentas, MCPs externos e o MCP do próprio CRM).
 */

export interface ConectorRegistro {
  id?: string;
  tipo: "tool" | "mcp" | "app_mcp" | "recurso";
  ref: string;
  nome: string;
  descricao?: string | null;
  icone?: string | null;
  categoria?: string | null;
  status?: string;
  disponivel: boolean;
  ferramentas?: { name?: string; nome?: string; description?: string }[];
  ultima_sync?: string | null;
  ultimo_erro?: string | null;
}

/** Intervalo a partir do qual a sincronização é disparada automaticamente. */
const VALIDADE_MS = 30 * 60 * 1000;

const catalogoFixo = (): ConectorRegistro[] =>
  CATALOGO_RECURSOS.flatMap((cat) =>
    cat.itens.map((item) => ({
      tipo: "recurso" as const,
      ref: `${cat.slug}/${item.slug}`,
      nome: item.nome,
      descricao: item.descricao,
      icone: item.icone,
      categoria: cat.nome,
      disponivel: true,
    })),
  );

export function useConectores(autoSync = true) {
  const estabelecimentoId = useEstabelecimento();
  const [registros, setRegistros] = useState<ConectorRegistro[]>([]);
  const [loading, setLoading] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);

  const carregar = useCallback(async () => {
    if (!estabelecimentoId) return;
    setLoading(true);
    const { data, error } = await db
      .from("aip_conectores")
      .select("*")
      .eq("estabelecimento_id", estabelecimentoId)
      .order("nome");
    if (error) console.error("Erro ao carregar conectores", error);
    setRegistros((data ?? []) as ConectorRegistro[]);
    setLoading(false);
  }, [estabelecimentoId]);

  const sincronizar = useCallback(
    async (silencioso = false) => {
      setSincronizando(true);
      try {
        const { data, error } = await supabase.functions.invoke("aip-sync-conectores", { body: {} });
        if (error) throw error;
        if (!silencioso) {
          toast.success(`Conectores atualizados (${(data as any)?.disponiveis ?? 0} disponíveis)`);
        }
        await carregar();
      } catch (e) {
        if (!silencioso) toast.error(`Falha ao atualizar conectores: ${(e as Error).message}`);
      } finally {
        setSincronizando(false);
      }
    },
    [carregar],
  );

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Atualização automática quando o registro está velho (ou vazio).
  useEffect(() => {
    if (!autoSync || loading || sincronizando || !estabelecimentoId) return;
    const maisRecente = registros.reduce<number>((acc, r) => {
      const t = r.ultima_sync ? new Date(r.ultima_sync).getTime() : 0;
      return t > acc ? t : acc;
    }, 0);
    if (Date.now() - maisRecente > VALIDADE_MS) void sincronizar(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSync, loading, estabelecimentoId, registros.length]);

  // Reflete inserções/alterações em tempo real.
  useEffect(() => {
    if (!estabelecimentoId) return;
    const canal = supabase
      .channel(`aip-conectores-${estabelecimentoId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "aip_conectores" },
        () => void carregar(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [estabelecimentoId, carregar]);

  /** Catálogo fixo + sincronizados, sem duplicar referências. */
  const conectores = useMemo(() => {
    const chaves = new Set(registros.map((r) => `${r.tipo}:${r.ref}`));
    const extras = catalogoFixo().filter((c) => !chaves.has(`${c.tipo}:${c.ref}`));
    return [...registros, ...extras];
  }, [registros]);

  const ultimaSync = useMemo(() => {
    const t = registros
      .map((r) => (r.ultima_sync ? new Date(r.ultima_sync).getTime() : 0))
      .reduce((a, b) => (b > a ? b : a), 0);
    return t ? new Date(t) : null;
  }, [registros]);

  return { conectores, registros, loading, sincronizando, sincronizar, recarregar: carregar, ultimaSync };
}
