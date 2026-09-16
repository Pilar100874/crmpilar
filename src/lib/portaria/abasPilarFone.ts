import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Abas disponíveis no Pilar Fone (web e APK). */
export const ABAS_PILAR_FONE = [
  { id: "ramais", rotulo: "Ramais" },
  { id: "cadastros", rotulo: "Cadastros" },
  { id: "whatsapp", rotulo: "WhatsApp" },
  { id: "chamadas", rotulo: "Interfone" },
] as const;

export type AbaPilarFoneId = (typeof ABAS_PILAR_FONE)[number]["id"];

function filtrar(lista: string[] | null | undefined): AbaPilarFoneId[] {
  return (lista ?? []).filter((a): a is AbaPilarFoneId =>
    ABAS_PILAR_FONE.some((x) => x.id === a),
  );
}

/**
 * Abas liberadas para o usuário logado.
 * `undefined` = ainda carregando. Lista vazia = nenhuma aba liberada
 * (o telefone fica indisponível e o botão lateral não aparece na web).
 * Assina atualizações em tempo real: ao salvar as abas no cadastro do
 * usuário, o telefone passa a exibir as novas abas sem recarregar.
 */
export function useAbasPermitidas(): AbaPilarFoneId[] | undefined {
  const [abas, setAbas] = useState<AbaPilarFoneId[] | undefined>(undefined);

  useEffect(() => {
    let cancelado = false;
    let canal: ReturnType<typeof supabase.channel> | null = null;

    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user || cancelado) return;

      const { data: usuario } = await supabase
        .from("usuarios")
        .select("id, pilarfone_abas")
        .eq("auth_user_id", auth.user.id)
        .maybeSingle();
      if (cancelado || !usuario) return;

      const registro = usuario as { id: string; pilarfone_abas?: string[] | null };
      setAbas(filtrar(registro.pilarfone_abas));

      canal = supabase
        .channel(`pilarfone-abas-${registro.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "usuarios",
            filter: `id=eq.${registro.id}`,
          },
          (payload) => {
            const nova = (payload.new as { pilarfone_abas?: string[] | null })
              ?.pilarfone_abas;
            setAbas(filtrar(nova));
          },
        )
        .subscribe();
    })();

    return () => {
      cancelado = true;
      if (canal) void supabase.removeChannel(canal);
    };
  }, []);

  return abas;
}
