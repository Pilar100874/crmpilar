import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimento";
import { toast } from "sonner";

export interface AipNotificacao {
  id: string;
  estabelecimento_id: string;
  evento: string;
  nivel: string;
  titulo: string;
  mensagem: string | null;
  execution_id: string | null;
  approval_id: string | null;
  payload: Record<string, unknown>;
  lida: boolean;
  created_at: string;
}

const db = supabase as any;

/**
 * Notificações em tempo real da Plataforma de Agentes IA
 * (início/fim de execução e aprovações humanas pendentes).
 */
export function useAipNotificacoes(options: { toasts?: boolean } = {}) {
  const { toasts = true } = options;
  const [notificacoes, setNotificacoes] = useState<AipNotificacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);

  const carregar = useCallback(async (estabId: string) => {
    const { data } = await db
      .from("aip_notifications")
      .select("*")
      .eq("estabelecimento_id", estabId)
      .order("created_at", { ascending: false })
      .limit(50);
    setNotificacoes((data ?? []) as AipNotificacao[]);
    setCarregando(false);
  }, []);

  useEffect(() => {
    let ativo = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const estabId = await getEstabelecimentoId();
      if (!ativo || !estabId) {
        setCarregando(false);
        return;
      }
      setEstabelecimentoId(estabId);
      await carregar(estabId);

      channel = supabase
        .channel(`aip-notificacoes-${estabId}-${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "aip_notifications",
            filter: `estabelecimento_id=eq.${estabId}`,
          },
          (payload) => {
            const nova = payload.new as AipNotificacao;
            setNotificacoes((prev) => [nova, ...prev].slice(0, 50));
            if (!toasts) return;
            const descricao = nova.mensagem ?? undefined;
            if (nova.nivel === "erro") toast.error(nova.titulo, { description: descricao });
            else if (nova.nivel === "aviso") toast.warning(nova.titulo, { description: descricao });
            else if (nova.nivel === "sucesso") toast.success(nova.titulo, { description: descricao });
            else toast(nova.titulo, { description: descricao });
          },
        )
        .subscribe();
    })();

    return () => {
      ativo = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [carregar, toasts]);

  const marcarLida = useCallback(async (id: string) => {
    setNotificacoes((prev) => prev.map((n) => (n.id === id ? { ...n, lida: true } : n)));
    await db.from("aip_notifications").update({ lida: true }).eq("id", id);
  }, []);

  const marcarTodasLidas = useCallback(async () => {
    if (!estabelecimentoId) return;
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
    await db
      .from("aip_notifications")
      .update({ lida: true })
      .eq("estabelecimento_id", estabelecimentoId)
      .eq("lida", false);
  }, [estabelecimentoId]);

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  return { notificacoes, naoLidas, carregando, marcarLida, marcarTodasLidas, recarregar: () => estabelecimentoId && carregar(estabelecimentoId) };
}
