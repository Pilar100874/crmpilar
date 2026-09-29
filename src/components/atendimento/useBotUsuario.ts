import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BotOpcao {
  id: string;
  nome: string;
}

/** Bot de atendimento escolhido pelo próprio usuário (salvo no cadastro dele). */
export function useBotUsuario() {
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [bots, setBots] = useState<BotOpcao[]>([]);
  const [botId, setBotId] = useState<string | null>(null);
  const [ativo, setAtivo] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data: u } = await (supabase as any)
        .from("usuarios")
        .select("id, estabelecimento_id, bot_atendimento_id, bot_atendimento_ativo")
        .eq("auth_user_id", auth.user.id)
        .maybeSingle();
      if (!vivo || !u) return;
      setUsuarioId(u.id);
      setBotId(u.bot_atendimento_id ?? null);
      setAtivo(!!u.bot_atendimento_ativo);
      let q = (supabase as any).from("bot_flows").select("id, nome:name").eq("active", true).order("name");
      if (u.estabelecimento_id) q = q.eq("estabelecimento_id", u.estabelecimento_id);
      const { data: lista } = await q;
      if (vivo) setBots((lista ?? []) as BotOpcao[]);
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const salvar = useCallback(
    async (campos: { bot_atendimento_id?: string | null; bot_atendimento_ativo?: boolean }) => {
      if (!usuarioId) return false;
      const { error } = await (supabase as any).from("usuarios").update(campos).eq("id", usuarioId);
      if (error) {
        toast.error("Não foi possível salvar o bot de atendimento");
        return false;
      }
      return true;
    },
    [usuarioId],
  );

  const escolherBot = async (id: string | null) => {
    const novoAtivo = id ? ativo : false;
    if (await salvar({ bot_atendimento_id: id, bot_atendimento_ativo: novoAtivo })) {
      setBotId(id);
      setAtivo(novoAtivo);
      toast.success(id ? "Bot de atendimento vinculado" : "Bot de atendimento removido");
    }
  };

  const alternarAtivo = async (valor: boolean) => {
    if (await salvar({ bot_atendimento_ativo: valor })) {
      setAtivo(valor);
      toast.success(valor ? "Bot ativado" : "Bot desativado");
    }
  };

  const botAtual = bots.find((b) => b.id === botId) ?? null;
  return { bots, botId, botAtual, ativo, escolherBot, alternarAtivo };
}
