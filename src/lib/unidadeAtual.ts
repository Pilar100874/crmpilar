import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UnidadeAtual {
  unidadeId: string | null;
  unidadeNome: string | null;
  isAdmin: boolean;
  carregando: boolean;
}

/**
 * Retorna a unidade/filial vinculada ao usuário logado.
 * Todos os módulos de portaria são restritos a essa unidade (regra aplicada no banco).
 * Administradores têm acesso a todas as unidades.
 */
export function useUnidadeAtual(): UnidadeAtual {
  const [estado, setEstado] = useState<UnidadeAtual>({
    unidadeId: null,
    unidadeNome: null,
    isAdmin: false,
    carregando: true,
  });

  useEffect(() => {
    let ativo = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const authId = auth?.user?.id;
      if (!authId) {
        if (ativo) setEstado({ unidadeId: null, unidadeNome: null, isAdmin: false, carregando: false });
        return;
      }

      const [{ data: usuario }, { data: admin }] = await Promise.all([
        supabase
          .from("usuarios")
          .select("unidade_id, unidades(nome)")
          .eq("auth_user_id", authId)
          .maybeSingle(),
        supabase.from("administradores").select("id").eq("id", authId).maybeSingle(),
      ]);

      let isAdmin = !!admin;
      if (!isAdmin) {
        const { data: temRole } = await supabase.rpc("has_role", {
          _user_id: authId,
          _role: "admin",
        });
        isAdmin = !!temRole;
      }

      if (!ativo) return;
      setEstado({
        unidadeId: (usuario as { unidade_id?: string | null } | null)?.unidade_id ?? null,
        unidadeNome:
          (usuario as { unidades?: { nome?: string } | null } | null)?.unidades?.nome ?? null,
        isAdmin,
        carregando: false,
      });
    })();
    return () => {
      ativo = false;
    };
  }, []);

  return estado;
}
