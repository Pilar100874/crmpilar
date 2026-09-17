import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Ramal do usuário logado. Sem ramal, o Click-to-Call fica indisponível. */
export function useRamalUsuario() {
  const [ramal, setRamal] = useState<string>("");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        if (ativo) setCarregando(false);
        return;
      }
      const { data } = await supabase
        .from("usuarios")
        .select("ramal")
        .eq("auth_user_id", auth.user.id)
        .maybeSingle();
      if (!ativo) return;
      setRamal(String((data as { ramal?: string | null } | null)?.ramal || "").trim());
      setCarregando(false);
    })();
    return () => {
      ativo = false;
    };
  }, []);

  return { ramal, temRamal: Boolean(ramal), carregando };
}
