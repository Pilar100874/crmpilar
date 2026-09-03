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

/**
 * Abas liberadas para o usuário logado.
 * `undefined` = ainda carregando. Lista vazia = nenhuma aba liberada
 * (o telefone fica indisponível e o botão lateral não aparece na web).
 */
export function useAbasPermitidas(): AbaPilarFoneId[] | undefined {
  const [abas, setAbas] = useState<AbaPilarFoneId[] | undefined>(undefined);

  useEffect(() => {
    let cancelado = false;
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;
      const { data } = await supabase
        .from("usuarios")
        .select("pilarfone_abas")
        .eq("auth_user_id", auth.user.id)
        .maybeSingle();
      if (cancelado) return;
      const lista = (data as { pilarfone_abas?: string[] } | null)?.pilarfone_abas;
      setAbas((lista ?? []).filter((a): a is AbaPilarFoneId => ABAS_PILAR_FONE.some((x) => x.id === a)));
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  return abas;
}
